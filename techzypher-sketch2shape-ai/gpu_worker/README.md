# Sketch2Shape GPU worker API

The GPU worker runs on Google Colab T4 and is exposed through a temporary Cloudflare Quick Tunnel. **All job endpoints require the header `X-ML-Worker-Token`**, matching the secret printed by the worker launcher.

| Method | Path | Function |
|---|---|---|
| GET | `/health` | Returns `ready` or `not_ready` and prerequisite checks; public |
| POST | `/jobs` | Multipart `image` (PNG/JPEG/WEBP, <=10 MB / 12 MP), `prompt`, `mode` (`sketch` or `color`); returns HTTP 202, job ID |
| GET | `/jobs/{job_id}` | Poll `queued`, `processing`, `completed`, or `failed` |
| GET | `/jobs/{job_id}/bundle` | Download ZIP containing `model.glb`, `preview.png` and `manifest.json` after completion |

Only one GPU inference executes at once; one additional request may queue. Queue saturation returns 429. Jobs expire after approximately one hour and disappear if Colab restarts. The backend must store its own job state and persist downloaded files, not use Colab-local paths.

## Integration sample

```python
import io, os, time, requests
from zipfile import ZipFile

base = os.environ["ML_WORKER_URL"].rstrip("/")
headers = {"X-ML-Worker-Token": os.environ["ML_WORKER_TOKEN"]}

with open("controller.png", "rb") as image:
    response = requests.post(
        base + "/jobs", headers=headers,
        data={"mode": "color", "prompt": "a pink gaming controller"},
        files={"image": ("controller.png", image, "image/png")},
        timeout=(20, 60)
    )
response.raise_for_status()
job_id = response.json()["job_id"]

deadline = time.monotonic() + int(os.getenv("ML_WORKER_TIMEOUT_SECONDS", "900"))
while True:
    if time.monotonic() > deadline:
        raise TimeoutError("GPU job exceeded time limit")
    status_response = requests.get(f"{base}/jobs/{job_id}", headers=headers, timeout=20)
    status_response.raise_for_status()
    status = status_response.json()
    if status["status"] == "completed":
        break
    if status["status"] == "failed":
        raise RuntimeError(status["error"])
    time.sleep(5)

result = requests.get(base + status["bundle_url"], headers=headers, timeout=(20, 120))
result.raise_for_status()
with ZipFile(io.BytesIO(result.content)) as bundle:
    model_bytes = bundle.read("model.glb")
    preview_bytes = bundle.read("preview.png")
```

## Start in Colab

1. Open [worker_colab.ipynb](../notebooks/worker_colab.ipynb) in a T4 session and run all cells.
2. Copy `ML_WORKER_URL`, `ML_WORKER_TOKEN`, and `ML_WORKER_TIMEOUT_SECONDS=900` privately to the backend developer's local `.env`.
3. Keep Colab connected.
4. Run `python scripts/test_worker.py --image controller.png --mode color --prompt "a pink gaming controller"` from the backend PC with the two environment variables set.

**Security and reliability:** Quick Tunnels are public and ephemeral, not production hosting. Never publish tokens. The launcher stores them only in the Colab session. Long inference uses job polling to avoid idle HTTP request timeouts.
