import io
import json
import uuid
import zipfile
from typing import Optional

import trimesh
from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Request,
    HTTPException,
    status,
)
from fastapi.responses import FileResponse, Response

from app.schemas.generation import (
    GenerateResponse,
    JobStatusResponse,
    ErrorResponse,
    JobStatus,
)
from app.services.image_service import ImageService
from app.services.generation_service import generation_service

router = APIRouter(prefix="", tags=["3D Generation"])


@router.post(
    "/generate",
    response_model=GenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue a 3D model generation job",
    description=(
        "Accepts either an uploaded sketch/image file (multipart/form-data) "
        "or a canvas-generated PNG base64 string (form-data or JSON body)."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input, unsupported format, or missing image"},
        413: {"model": ErrorResponse, "description": "Image exceeds 25 MB limit"},
    },
)
async def generate_model(
    request: Request,
    file: UploadFile | None = File(None, description="Uploaded PNG, JPG, or WebP image"),
    image: str | None = Form(None, description="Base64 data URL from sketch canvas"),
    prompt: str | None = Form("", description="Optional text prompt for style/materials"),
    mode: str | None = Form("draw", description="Input mode: 'draw' or 'upload'"),
) -> GenerateResponse:
    """
    1. POST /api/generate
    - Accept either an uploaded sketch/image or a canvas-generated PNG.
    - Accept an optional text prompt.
    - Validate supported image formats (PNG, JPG, JPEG, WebP) and file size (≤ 25MB).
    - Save input image inside backend/uploads/.
    - Generate a unique job_id and return queued status.
    """
    job_id = str(uuid.uuid4())
    content_type = request.headers.get("content-type", "")

    # Handle application/json payload if provided
    if content_type.startswith("application/json"):
        try:
            body = await request.json()
            image = body.get("image") or body.get("image_base64")
            prompt = body.get("prompt", prompt or "")
            mode = body.get("mode", mode or "draw")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed JSON body.",
            )

    # Process either uploaded binary file or canvas base64 image
    saved_path = None
    metadata = {}

    if file is not None and file.filename:
        saved_path, metadata = await ImageService.save_upload_file(file=file, job_id=job_id)
    elif image:
        saved_path, metadata = ImageService.save_base64_image(base64_str=image, job_id=job_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing image input. Provide either a file upload or a canvas-generated image string.",
        )

    # Register job in generation service with queued status
    job_record = generation_service.create_job(
        job_id=job_id,
        input_path=saved_path,
        prompt=prompt,
        metadata={**metadata, "mode": mode},
    )

    return GenerateResponse(
        job_id=job_id,
        status=job_record["status"],
        message="Image received and generation job queued successfully.",
        filename=metadata.get("saved_filename", saved_path.name),
        prompt=prompt,
        created_at=job_record["created_at"],
    )


@router.get(
    "/status/{job_id}",
    response_model=JobStatusResponse,
    summary="Get generation job status",
    description="Check the current pipeline status of a specific 3D generation job.",
    responses={
        404: {"model": ErrorResponse, "description": "Job not found"},
    },
)
async def get_job_status(job_id: str) -> JobStatusResponse:
    """
    2. GET /api/status/{job_id}
    - Return the actual job status (e.g. queued, processing, completed, failed).
    - Returns model_url when output asset is ready.
    """
    job = generation_service.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation job with ID '{job_id}' was not found.",
        )

    model_url = None
    if job["status"] == JobStatus.COMPLETED:
        model_url = f"/api/model/{job_id}"

    return JobStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        prompt=job.get("prompt", ""),
        created_at=job["created_at"],
        model_url=model_url,
        error=job.get("error"),
    )


@router.get(
    "/model/{job_id}",
    summary="Download or stream generated 3D model",
    description="Returns the generated 3D GLB/OBJ model file when generation has completed.",
    responses={
        200: {"content": {"model/gltf-binary": {}}, "description": "Binary GLB model file"},
        404: {"model": ErrorResponse, "description": "Model not ready or job not found"},
    },
)
async def get_model(job_id: str):
    """
    3. GET /api/model/{job_id}
    - Return the generated model when a valid output file exists.
    - Return 404 error if generation has not completed.
    """
    job = generation_service.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation job '{job_id}' not found.",
        )

    model_path = generation_service.get_model_file(job_id)
    if not model_path or not model_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"3D model asset for job '{job_id}' is not ready yet. "
                f"Current status: {job['status']}."
            ),
        )

    # Determine media type based on model file extension
    media_types = {
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
        ".obj": "text/plain",
    }
    media_type = media_types.get(model_path.suffix.lower(), "application/octet-stream")

    return FileResponse(
        path=str(model_path),
        media_type=media_type,
        filename=f"model_{job_id}{model_path.suffix}",
    )


@router.get(
    "/export/{job_id}",
    summary="Export generated 3D model in multiple formats",
    description="Converts and exports the generated 3D model into GLB, GLTF, OBJ, STL, or PLY format.",
    responses={
        200: {"description": "Exported model file or bundle"},
        404: {"model": ErrorResponse, "description": "Model not ready or job not found"},
    },
)
async def export_model(job_id: str, format: str = "glb"):
    """
    Export the generated 3D model asset in one of the supported formats:
    glb, gltf, obj, stl, ply.
    """
    job = generation_service.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Generation job '{job_id}' not found.",
        )

    model_path = generation_service.get_model_file(job_id)
    if not model_path or not model_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"3D model asset for job '{job_id}' is not ready yet.",
        )

    fmt = format.lower().strip()
    if fmt == "glb":
        return FileResponse(
            path=str(model_path),
            media_type="model/gltf-binary",
            filename=f"model_{job_id}.glb",
        )

    try:
        scene_or_mesh = trimesh.load(str(model_path))

        if fmt == "stl":
            data = scene_or_mesh.export(file_type="stl")
            content_bytes = data if isinstance(data, bytes) else data.encode("utf-8")
            return Response(
                content=content_bytes,
                media_type="model/stl",
                headers={"Content-Disposition": f'attachment; filename="model_{job_id}.stl"'},
            )
        elif fmt == "ply":
            data = scene_or_mesh.export(file_type="ply")
            content_bytes = data if isinstance(data, bytes) else data.encode("utf-8")
            return Response(
                content=content_bytes,
                media_type="application/octet-stream",
                headers={"Content-Disposition": f'attachment; filename="model_{job_id}.ply"'},
            )
        elif fmt == "obj":
            exported = scene_or_mesh.export(file_type="obj")
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
                if isinstance(exported, dict):
                    for fname, content in exported.items():
                        c_bytes = content if isinstance(content, bytes) else content.encode("utf-8")
                        z.writestr(fname, c_bytes)
                else:
                    obj_str = exported if isinstance(exported, str) else exported.decode("utf-8")
                    z.writestr(f"model_{job_id}.obj", obj_str)
                    z.writestr(
                        f"model_{job_id}.mtl",
                        "# Wavefront Material File\nnewmtl material_0\nKa 0.2 0.2 0.2\nKd 0.8 0.8 0.8\nKs 0.2 0.2 0.2\nNs 20\nd 1.0\nillum 2\n",
                    )
            buf.seek(0)
            return Response(
                content=buf.getvalue(),
                media_type="application/zip",
                headers={"Content-Disposition": f'attachment; filename="model_{job_id}_obj.zip"'},
            )
        elif fmt == "gltf":
            exported = scene_or_mesh.export(file_type="gltf")
            if isinstance(exported, dict):
                buf = io.BytesIO()
                with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
                    for fname, content in exported.items():
                        c_bytes = content if isinstance(content, bytes) else content.encode("utf-8")
                        z.writestr(fname, c_bytes)
                buf.seek(0)
                return Response(
                    content=buf.getvalue(),
                    media_type="application/zip",
                    headers={"Content-Disposition": f'attachment; filename="model_{job_id}_gltf.zip"'},
                )
            else:
                c_bytes = exported if isinstance(exported, bytes) else exported.encode("utf-8")
                return Response(
                    content=c_bytes,
                    media_type="model/gltf+json",
                    headers={"Content-Disposition": f'attachment; filename="model_{job_id}.gltf"'},
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format '{format}'. Supported formats: glb, gltf, obj, stl, ply.",
            )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model conversion to {format} failed: {exc}",
        )

