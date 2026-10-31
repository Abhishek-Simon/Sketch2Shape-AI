import io
import os
import time
import zipfile
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional

import requests
from app.core.config import settings
from app.schemas.generation import JobStatus


class GenerationService:
    """Bridges the local API to the remote Colab worker and persists returned GLBs."""

    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._executor = ThreadPoolExecutor(max_workers=4)

    def create_job(self, job_id: str, input_path: Path, prompt: Optional[str] = "",
                   metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        base = settings.ML_WORKER_URL.rstrip("/")
        token = settings.ML_WORKER_TOKEN
        if not base or not token:
            raise RuntimeError("ML_WORKER_URL and ML_WORKER_TOKEN must be configured in backend/.env")

        mode = (metadata or {}).get("mode", "draw")
        if mode in {"sketch", "color"}:
            worker_mode = mode
        else:
            worker_mode = "sketch" if mode == "draw" else "color"

        mime_lookup = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        }
        image_mime = mime_lookup.get(input_path.suffix.lower(), "image/png")

        headers = {"X-ML-Worker-Token": token}
        created = datetime.now(timezone.utc)
        record = {
            "job_id": job_id, "status": JobStatus.QUEUED,
            "input_path": str(input_path), "prompt": prompt or "",
            "created_at": created, "metadata": metadata or {},
            "model_path": None, "error": None, "worker_job_id": None,
        }
        self._jobs[job_id] = record

        try:
            with input_path.open("rb") as image_file:
                response = requests.post(
                    f"{base}/jobs",
                    headers=headers,
                    data={"mode": worker_mode, "prompt": prompt or ""},
                    files={"image": (input_path.name, image_file, image_mime)},
                    timeout=(20, 90),
                )
            response.raise_for_status()
            worker_id = response.json()["job_id"]
            record["worker_job_id"] = worker_id
            self._executor.submit(self._monitor_worker, job_id, base, headers, worker_id)
        except Exception as exc:
            record["status"] = JobStatus.FAILED
            record["error"] = f"Could not submit job to GPU worker: {exc}"
        return record

    def _monitor_worker(self, job_id, base, headers, worker_id):
        timeout = settings.ML_WORKER_TIMEOUT_SECONDS
        deadline = time.monotonic() + timeout
        record = self._jobs[job_id]
        try:
            while time.monotonic() < deadline:
                response = requests.get(f"{base}/jobs/{worker_id}", headers=headers, timeout=30)
                response.raise_for_status()
                data = response.json()
                state = data.get("status")
                if state == "processing":
                    record["status"] = JobStatus.PROCESSING
                elif state == "failed":
                    record["status"] = JobStatus.FAILED
                    record["error"] = data.get("error") or "GPU worker reported generation failure"
                    return
                elif state == "completed":
                    bundle_url = data.get("bundle_url") or f"/jobs/{worker_id}/bundle"
                    fetch_url = (
                        bundle_url
                        if bundle_url.startswith("http://") or bundle_url.startswith("https://")
                        else f"{base}{bundle_url}" if bundle_url.startswith("/") else f"{base}/{bundle_url}"
                    )
                    bundle_response = requests.get(
                        fetch_url, headers=headers, timeout=(20, 180)
                    )
                    bundle_response.raise_for_status()
                    settings.init_directories()
                    target = settings.OUTPUTS_DIR / f"{job_id}.glb"
                    with zipfile.ZipFile(io.BytesIO(bundle_response.content)) as archive:
                        if "model.glb" not in archive.namelist():
                            raise RuntimeError("Worker bundle did not contain model.glb")
                        target.write_bytes(archive.read("model.glb"))
                    if not target.is_file() or target.stat().st_size == 0:
                        raise RuntimeError("Downloaded GLB is empty")
                    record["model_path"] = str(target)
                    record["status"] = JobStatus.COMPLETED
                    return
                elif state not in {"queued", "processing"}:
                    raise RuntimeError(f"Unexpected worker status: {state}")
                time.sleep(5)
            raise TimeoutError(f"GPU generation exceeded {timeout} seconds")
        except Exception as exc:
            record["status"] = JobStatus.FAILED
            record["error"] = f"Remote GPU worker error: {exc}"

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._jobs.get(job_id)

    def get_model_file(self, job_id: str) -> Optional[Path]:
        settings.init_directories()
        candidate = settings.OUTPUTS_DIR / f"{job_id}.glb"
        return candidate if candidate.is_file() and candidate.stat().st_size > 0 else None

    @staticmethod
    def inspect_mesh_file(model_path: Path) -> Dict[str, Any]:
        return {"path": str(model_path), "size_bytes": model_path.stat().st_size}


generation_service = GenerationService()
