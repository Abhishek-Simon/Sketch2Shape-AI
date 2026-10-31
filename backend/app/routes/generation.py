import json
import uuid
from typing import Optional

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    Request,
    HTTPException,
    status,
)
from fastapi.responses import FileResponse

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

