"""
Automated test suite for Sketch2Shape AI FastAPI Backend.
Uses httpx.AsyncClient with ASGITransport for pure in-process async testing.
"""
import asyncio
import base64
import io
import sys
from pathlib import Path
from PIL import Image

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import httpx
from app.main import app


def create_test_image(format="PNG", color=(50, 100, 200)) -> bytes:
    """Create a minimal valid test image in memory."""
    buf = io.BytesIO()
    img = Image.new("RGB", (64, 64), color=color)
    img.save(buf, format=format)
    return buf.getvalue()


async def run_tests():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        print("\n--- 1. Testing Root & Health Endpoints ---")
        res = await client.get("/")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()
        print("GET / ->", data)
        assert data["status"] == "online"

        res = await client.get("/api/health")
        assert res.status_code == 200
        health = res.json()
        print("GET /api/health ->", health)
        assert health["status"] == "healthy"

        print("\n--- 2. Testing POST /api/generate with File Upload (PNG & JPG) ---")
        png_bytes = create_test_image(format="PNG")

        res = await client.post(
            "/api/generate",
            files={"file": ("sketch.png", png_bytes, "image/png")},
            data={"prompt": "Futuristic mechanical drone with glowing core", "mode": "upload"}
        )
        assert res.status_code == 202, f"Expected 202, got {res.status_code}: {res.text}"
        data = res.json()
        print("POST /api/generate (PNG) ->", data)
        assert "job_id" in data
        assert data["status"] == "queued"
        assert data["prompt"] == "Futuristic mechanical drone with glowing core"
        job_id = data["job_id"]

        # Verify status endpoint
        res_status = await client.get(f"/api/status/{job_id}")
        assert res_status.status_code == 200
        status_data = res_status.json()
        print(f"GET /api/status/{job_id} ->", status_data)
        assert status_data["status"] == "queued"

        # Upload JPG
        jpg_bytes = create_test_image(format="JPEG")
        res_jpg = await client.post(
            "/api/generate",
            files={"file": ("sketch.jpg", jpg_bytes, "image/jpeg")},
            data={"prompt": "Ceramic teapot"}
        )
        assert res_jpg.status_code == 202
        print("POST /api/generate (JPG) ->", res_jpg.json()["filename"])

        print("\n--- 3. Testing POST /api/generate with Canvas Data URL ---")
        png_canvas = create_test_image(format="PNG", color=(255, 0, 100))
        b64_str = base64.b64encode(png_canvas).decode("utf-8")
        data_url = f"data:image/png;base64,{b64_str}"

        # Multipart form with data URL
        res_form = await client.post(
            "/api/generate",
            data={"image": data_url, "prompt": "Neon cyberpunk helmet", "mode": "draw"}
        )
        assert res_form.status_code == 202
        print("POST /api/generate (Form data URL) ->", res_form.json()["job_id"])

        # JSON body with data URL
        res_json = await client.post(
            "/api/generate",
            json={"image": data_url, "prompt": "Minimalist chair"}
        )
        assert res_json.status_code == 202
        print("POST /api/generate (JSON payload) ->", res_json.json()["job_id"])

        print("\n--- 4. Testing Input Validations & Errors ---")
        # Missing image
        res_missing = await client.post("/api/generate", data={"prompt": "No image provided"})
        assert res_missing.status_code == 400
        print("Missing image rejected: 400 ->", res_missing.json()["detail"])

        # Unsupported format (plain text file)
        res_unsupported = await client.post(
            "/api/generate",
            files={"file": ("notes.txt", b"Plain text file", "text/plain")}
        )
        assert res_unsupported.status_code == 400
        print("Unsupported format rejected: 400 ->", res_unsupported.json()["detail"])

        # Nonexistent job status
        fake_id = "00000000-0000-0000-0000-000000000000"
        res_not_found = await client.get(f"/api/status/{fake_id}")
        assert res_not_found.status_code == 404
        print("Nonexistent job status: 404 ->", res_not_found.json()["detail"])

        print("\n--- 5. Testing GET /api/model/{job_id} ---")
        # Pending model returns 404
        res_pending_model = await client.get(f"/api/model/{job_id}")
        assert res_pending_model.status_code == 404
        print("Pending model download: 404 ->", res_pending_model.json()["detail"])

        # When a model exists in outputs directory
        outputs_dir = backend_dir / "outputs"
        sample_glb = outputs_dir / f"{job_id}.glb"
        sample_glb.write_bytes(b"glTF\x02\x00\x00\x00\x00\x00\x00\x00SAMPLE_GLB_DATA")

        try:
            res_ready_model = await client.get(f"/api/model/{job_id}")
            assert res_ready_model.status_code == 200
            assert res_ready_model.headers["content-type"] == "model/gltf-binary"
            print("Ready model delivered: 200 OK ->", res_ready_model.headers["content-type"])

            # Status endpoint now reflects completed and provides model_url
            res_completed_status = await client.get(f"/api/status/{job_id}")
            assert res_completed_status.status_code == 200
            status_obj = res_completed_status.json()
            print("Completed job status ->", status_obj["status"], "model_url:", status_obj["model_url"])
            assert status_obj["status"] == "completed"
            assert status_obj["model_url"] == f"/api/model/{job_id}"
        finally:
            if sample_glb.exists():
                sample_glb.unlink()

        print("\n--- 6. Testing Swagger UI & OpenAPI Specification ---")
        res_docs = await client.get("/docs")
        assert res_docs.status_code == 200
        print("GET /docs (Swagger UI) -> 200 OK")

        res_openapi = await client.get("/openapi.json")
        assert res_openapi.status_code == 200
        openapi_spec = res_openapi.json()
        paths = list(openapi_spec.get("paths", {}).keys())
        print("OpenAPI Paths detected:", paths)
        assert "/api/generate" in paths
        assert "/api/status/{job_id}" in paths
        assert "/api/model/{job_id}" in paths

        print("\n>>> ALL 6 BACKEND TEST SUITES PASSED! <<<\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
