"""Authenticated, single-GPU job worker for Sketch2Shape (Google Colab)."""

import hmac
import io
import json
import logging
import os
import shutil
import tempfile
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)
app = FastAPI(title="Sketch2Shape GPU Worker", version="1.0")
EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="sketch2shape-gpu")
JOBS = {}
JOBS_LOCK = threading.Lock()
MAX_INFLIGHT = 2
RETENTION_SECONDS = 3600
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 12_000_000


def _authorized(x_ml_worker_token: str | None = Header(None, alias="X-ML-Worker-Token")):
    token = os.getenv("ML_WORKER_TOKEN", "")
    if not token or not x_ml_worker_token or not hmac.compare_digest(token, x_ml_worker_token):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _run_generation(image_path, prompt, output_dir, mode):
    from ml.pipeline import generate_3d, generate_3d_from_image

    if mode == "sketch":
        return generate_3d(image_path, prompt, output_dir)
    return generate_3d_from_image(image_path, prompt, output_dir)


def _normalize_image(payload, destination):
    try:
        with Image.open(io.BytesIO(payload)) as image:
            if image.format not in {"PNG", "JPEG", "WEBP"}:
                raise HTTPException(status_code=415, detail="Upload a PNG, JPEG, or WEBP image")
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=413, detail="Image dimensions too large")
            image.load()
            if image.mode in {"RGBA", "LA"} or "transparency" in image.info:
                rgba = image.convert("RGBA")
                background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
                background.alpha_composite(rgba)
                converted = background.convert("RGB")
            else:
                converted = image.convert("RGB")
            converted.save(destination, format="PNG")
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=415, detail="Invalid image data") from exc


def _expire_old_jobs():
    now = time.time()
    expired = []
    with JOBS_LOCK:
        for job_id, job in list(JOBS.items()):
            if job.get("finished_at") and now - job["finished_at"] > RETENTION_SECONDS:
                expired.append(JOBS.pop(job_id)["root"])
    for root in expired:
        shutil.rmtree(root, ignore_errors=True)


def _process_job(job_id):
    with JOBS_LOCK:
        job = JOBS[job_id]
        job["status"] = "processing"
    root = job["root"]

    try:
        model_path = Path(_run_generation(
            str(root / "input.png"), job["prompt"], str(root / "runs"), job["mode"]
        ))
        if not model_path.is_file() or model_path.stat().st_size == 0:
            raise RuntimeError("Pipeline returned no GLB")
        preview = model_path.parent / ("generated.png" if job["mode"] == "sketch" else "conditioned.png")
        if not preview.is_file():
            raise RuntimeError("Pipeline returned no intermediate preview")

        archive = root / "result.zip"
        with ZipFile(archive, "w", compression=ZIP_DEFLATED) as bundle:
            bundle.write(model_path, arcname="model.glb")
            bundle.write(preview, arcname="preview.png")
            bundle.writestr("manifest.json", json.dumps({
                "mode": job["mode"],
                "model_filename": "model.glb",
                "preview_filename": "preview.png",
            }))
        with JOBS_LOCK:
            job["status"] = "completed"
            job["archive"] = archive
            job["finished_at"] = time.time()
    except Exception:
        logger.exception("GPU inference failed for job %s", job_id)
        with JOBS_LOCK:
            job["status"] = "failed"
            job["error"] = "GPU inference failed; check worker logs"
            job["finished_at"] = time.time()
        shutil.rmtree(root, ignore_errors=True)


@app.get("/health")
def health():
    required = {
        "controlnet_python": Path("/content/controlnet-env/bin/python").is_file(),
        "triposr_python": Path("/content/triposr-env/bin/python").is_file(),
        "triposr_script": Path("/content/TripoSR/run.py").is_file(),
        "token_configured": bool(os.getenv("ML_WORKER_TOKEN")),
    }
    return {"status": "ready" if all(required.values()) else "not_ready", "checks": required}


@app.post("/jobs", dependencies=[Depends(_authorized)])
def submit_job(image: UploadFile = File(...), prompt: str = Form(""), mode: str = Form(...)):
    if mode not in {"sketch", "color"}:
        raise HTTPException(status_code=422, detail="mode must be 'sketch' or 'color'")
    if len(prompt) > 1000:
        raise HTTPException(status_code=422, detail="Prompt is too long")

    payload = image.file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB")
    if not payload:
        raise HTTPException(status_code=422, detail="Empty image")

    _expire_old_jobs()
    root = None
    try:
        output_base = Path(os.getenv("ML_WORKER_OUTPUT_DIR", "/content/outputs"))
        output_base.mkdir(parents=True, exist_ok=True)
        root = Path(tempfile.mkdtemp(prefix="worker-", dir=output_base))
        _normalize_image(payload, root / "input.png")

        job_id = uuid.uuid4().hex
        job = {
            "id": job_id, "mode": mode, "status": "queued", "root": root,
            "prompt": prompt.strip() or "a single object, realistic product photography, centered, full object visible",
            "error": None, "archive": None, "finished_at": None,
        }
        with JOBS_LOCK:
            active = sum(j["status"] in {"queued", "processing"} for j in JOBS.values())
            if active >= MAX_INFLIGHT:
                raise HTTPException(status_code=429, detail="GPU queue full; retry later")
            JOBS[job_id] = job
            EXECUTOR.submit(_process_job, job_id)
        return JSONResponse({"job_id": job_id, "status": "queued"}, status_code=202)
    except Exception:
        if root is not None and ("job_id" not in locals() or job_id not in JOBS):
            shutil.rmtree(root, ignore_errors=True)
        raise


@app.get("/jobs/{job_id}", dependencies=[Depends(_authorized)])
def job_status(job_id: str):
    _expire_old_jobs()
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Unknown or expired job")
        status = job["status"]
        error = job["error"]
    return {
        "job_id": job_id,
        "status": status,
        "bundle_url": f"/jobs/{job_id}/bundle" if status == "completed" else None,
        "error": error,
    }


@app.get("/jobs/{job_id}/bundle", dependencies=[Depends(_authorized)])
def download_bundle(job_id: str):
    _expire_old_jobs()
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Unknown or expired job")
        if job["status"] != "completed":
            raise HTTPException(status_code=409, detail="Job is not completed")
        archive = job["archive"]
    return FileResponse(archive, media_type="application/zip", filename=f"{job_id}.zip")
