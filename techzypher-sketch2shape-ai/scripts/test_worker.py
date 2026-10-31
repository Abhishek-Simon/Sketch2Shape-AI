"""Smoke-test a live GPU worker using an image and prompt."""

import argparse
import io
import json
import os
import time
from pathlib import Path
from zipfile import ZipFile

import requests


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=os.getenv("ML_WORKER_URL"))
    parser.add_argument("--image", required=True)
    parser.add_argument("--mode", choices=["sketch", "color"], required=True)
    parser.add_argument("--prompt", default="a single object, full object visible")
    parser.add_argument("--out", default="worker-test-result")
    args = parser.parse_args()

    token = os.getenv("ML_WORKER_TOKEN")
    if not args.url or not token:
        parser.error("Set ML_WORKER_URL and ML_WORKER_TOKEN environment variables")

    base = args.url.rstrip("/")
    headers = {"X-ML-Worker-Token": token}
    health = requests.get(base + "/health", timeout=20)
    health.raise_for_status()
    print("Worker health:", health.json()["status"])

    with open(args.image, "rb") as image:
        response = requests.post(
            base + "/jobs", headers=headers,
            data={"mode": args.mode, "prompt": args.prompt},
            files={"image": (Path(args.image).name, image)},
            timeout=(20, 60),
        )
    response.raise_for_status()
    job_id = response.json()["job_id"]
    print("Job:", job_id)

    start = time.monotonic()
    while True:
        if time.monotonic() - start > 900:
            raise TimeoutError("GPU job exceeded 900 seconds")
        check = requests.get(f"{base}/jobs/{job_id}", headers=headers, timeout=20)
        check.raise_for_status()
        status = check.json()
        if status["status"] in {"completed", "failed"}:
            break
        time.sleep(5)
    print("Status:", status["status"])
    if status["status"] == "failed":
        raise RuntimeError(status["error"])

    result = requests.get(base + status["bundle_url"], headers=headers, timeout=(20, 120))
    result.raise_for_status()
    output = Path(args.out)
    output.mkdir(parents=True, exist_ok=True)
    with ZipFile(io.BytesIO(result.content)) as bundle:
        for name in ("model.glb", "preview.png", "manifest.json"):
            (output / name).write_bytes(bundle.read(name))

    print("Model:", output / "model.glb")
    print("Preview:", output / "preview.png")
    print("Manifest:", json.loads((output / "manifest.json").read_text()))


if __name__ == "__main__":
    main()
