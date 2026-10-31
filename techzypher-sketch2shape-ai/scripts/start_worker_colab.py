"""Start the Sketch2Shape worker and a temporary Cloudflare Quick Tunnel on Colab."""

import json
import os
import re
import secrets
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
CONNECTION_FILE = Path("/content/ml_worker_connection.json")
WORKER_LOG = Path("/content/ml_worker.log")
TUNNEL_LOG = Path("/content/ml_tunnel.log")
PORT = 8001


def local_health():
    try:
        with urlopen(f"http://127.0.0.1:{PORT}/health", timeout=2) as response:
            return json.load(response)
    except (OSError, URLError, ValueError):
        return None


def start():
    if not Path("/content/cloudflared").is_file():
        raise RuntimeError("Run bash setup/setup_colab.sh before starting the worker")
    for path in ["/content/controlnet-env/bin/python", "/content/triposr-env/bin/python", "/content/TripoSR/run.py"]:
        if not Path(path).is_file():
            raise RuntimeError(f"Missing prerequisite: {path}")

    if CONNECTION_FILE.is_file() and local_health():
        connection = json.loads(CONNECTION_FILE.read_text())
        print("Existing worker (verify the tunnel URL is still reachable):")
        print("ML_WORKER_URL=" + connection["url"])
        print("ML_WORKER_TOKEN=" + connection["token"])
        print("ML_WORKER_TIMEOUT_SECONDS=900")
        return
    if local_health():
        raise RuntimeError(f"Port {PORT} is already occupied by another worker; do not start a duplicate")

    token = os.environ.get("ML_WORKER_TOKEN") or secrets.token_urlsafe(32)
    env = dict(os.environ)
    env["ML_WORKER_TOKEN"] = token
    env["PYTHONPATH"] = str(ROOT) + os.pathsep + env.get("PYTHONPATH", "")

    with WORKER_LOG.open("w") as log:
        worker = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "gpu_worker.app:app", "--host", "127.0.0.1", "--port", str(PORT)],
            cwd=str(ROOT), env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
        )

    for _ in range(30):
        if worker.poll() is not None:
            raise RuntimeError(f"Worker exited unexpectedly. Check {WORKER_LOG}")
        status = local_health()
        if status:
            if status["status"] != "ready":
                raise RuntimeError(f"Worker prerequisites missing: {status['checks']}")
            break
        time.sleep(1)
    else:
        raise RuntimeError(f"Worker did not start. Check {WORKER_LOG}")

    with TUNNEL_LOG.open("w") as log:
        tunnel = subprocess.Popen(
            ["/content/cloudflared", "tunnel", "--no-autoupdate", "--protocol", "http2",
             "--url", f"http://127.0.0.1:{PORT}"],
            stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
        )

    url = None
    for _ in range(90):
        if tunnel.poll() is not None:
            raise RuntimeError(f"Cloudflare tunnel exited unexpectedly. Check {TUNNEL_LOG}")
        match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", TUNNEL_LOG.read_text())
        if match:
            url = match.group(0)
            break
        time.sleep(1)

    if not url:
        raise RuntimeError(f"Cloudflare URL not detected. Check {TUNNEL_LOG}")

    CONNECTION_FILE.write_text(json.dumps({
        "url": url, "token": token, "worker_pid": worker.pid, "tunnel_pid": tunnel.pid,
    }, indent=2))
    CONNECTION_FILE.chmod(0o600)
    print("ML_WORKER_URL=" + url)
    print("ML_WORKER_TOKEN=" + token)
    print("ML_WORKER_TIMEOUT_SECONDS=900")
    print("Keep this Colab runtime running. Share these values privately with your backend developer.")


if __name__ == "__main__":
    start()
