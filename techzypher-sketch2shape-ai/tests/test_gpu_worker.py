import io
import json
import time
from pathlib import Path
from threading import Event
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from gpu_worker import app as worker_module


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("ML_WORKER_TOKEN", "test-shared-token")
    monkeypatch.setenv("ML_WORKER_OUTPUT_DIR", str(tmp_path))
    with worker_module.JOBS_LOCK:
        worker_module.JOBS.clear()
    return TestClient(worker_module.app)


def png_bytes():
    out = io.BytesIO()
    Image.new("RGB", (64, 64), "#ee88cc").save(out, format="PNG")
    return out.getvalue()


def post(client, mode="color", token="test-shared-token", image=None):
    return client.post(
        "/jobs", headers={"X-ML-Worker-Token": token},
        data={"prompt": "a pink controller", "mode": mode},
        files={"image": ("controller.png", png_bytes() if image is None else image, "image/png")},
    )


def status(client, job_id):
    return client.get(f"/jobs/{job_id}", headers={"X-ML-Worker-Token": "test-shared-token"})


def wait_for_status(client, job_id):
    for _ in range(200):
        response = status(client, job_id)
        if response.json()["status"] in {"completed", "failed"}:
            return response.json()
        time.sleep(0.01)
    raise AssertionError("Timed out waiting for test job")


def test_authentication(client):
    assert post(client, token="wrong").status_code == 401
    assert post(client, token="").status_code == 401
    assert client.get("/jobs/abc").status_code == 401


def test_validation(client):
    assert post(client, mode="invalid").status_code == 422
    assert post(client, image=b"not an image").status_code == 415
    assert post(client, image=b"x" * (10 * 1024 * 1024 + 1)).status_code == 413


@pytest.mark.parametrize("mode,preview", [("sketch", "generated.png"), ("color", "conditioned.png")])
def test_job_and_bundle(client, monkeypatch, mode, preview):
    def fake_generation(input_path, prompt, output_dir, received_mode):
        assert received_mode == mode
        assert Path(input_path).is_file()
        assert Image.open(input_path).size == (64, 64)
        target = Path(output_dir) / "fake-run"
        target.mkdir(parents=True)
        (target / preview).write_bytes(png_bytes())
        (target / "model.glb").write_bytes(b"glTF-test-model")
        return str(target / "model.glb")

    monkeypatch.setattr(worker_module, "_run_generation", fake_generation)
    response = post(client, mode=mode)
    assert response.status_code == 202, response.text
    job_id = response.json()["job_id"]
    outcome = wait_for_status(client, job_id)
    assert outcome["status"] == "completed"
    result = client.get(outcome["bundle_url"], headers={"X-ML-Worker-Token": "test-shared-token"})
    assert result.status_code == 200
    with ZipFile(io.BytesIO(result.content)) as archive:
        assert set(archive.namelist()) == {"model.glb", "preview.png", "manifest.json"}
        assert archive.read("model.glb") == b"glTF-test-model"
        assert json.loads(archive.read("manifest.json"))["mode"] == mode


def test_failure_sanitizes_exception(client, monkeypatch):
    def fail(*args):
        raise RuntimeError("private /content/secret")
    monkeypatch.setattr(worker_module, "_run_generation", fail)
    response = post(client)
    outcome = wait_for_status(client, response.json()["job_id"])
    assert outcome["status"] == "failed"
    assert "secret" not in str(outcome)


def test_queue_limit(client, monkeypatch):
    waiting = Event()
    release = Event()

    def slow(*args):
        waiting.set()
        release.wait(timeout=3)
        raise RuntimeError("test")

    monkeypatch.setattr(worker_module, "_run_generation", slow)
    try:
        first = post(client)
        assert first.status_code == 202
        assert waiting.wait(timeout=2)
        second = post(client)
        assert second.status_code == 202
        assert post(client).status_code == 429
    finally:
        release.set()
        wait_for_status(client, first.json()["job_id"])
        wait_for_status(client, second.json()["job_id"])
