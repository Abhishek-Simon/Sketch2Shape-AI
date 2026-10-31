"""
Integration test simulating frontend interactions with the backend:
1. Canvas sketch upload (PNG blob in FormData with key 'file')
2. Image file upload (JPG file in FormData with key 'file')
3. Polling GET /api/status/{job_id}
4. Simulating backend completion when 3D asset is available and verifying GET /api/model/{job_id}
"""
import io
import sys
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))

import httpx
from app.main import app

def make_test_png():
    buf = io.BytesIO()
    img = Image.new("RGBA", (128, 128), (102, 85, 232, 255))
    img.save(buf, format="PNG")
    return buf.getvalue()

def make_test_jpg():
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 200), (32, 184, 166))
    img.save(buf, format="JPEG")
    return buf.getvalue()

async def test_frontend_backend_flow():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1:8000") as client:
        print("\n=== STEP 1: Canvas Sketch Flow (PNG Blob via FormData) ===")
        canvas_blob = make_test_png()
        res_sketch = await client.post(
            "/api/generate",
            files={"file": ("sketch.png", canvas_blob, "image/png")},
            data={"prompt": "Futuristic mechanical drone with metallic shell", "mode": "draw"}
        )
        assert res_sketch.status_code == 202, f"Failed: {res_sketch.text}"
        sketch_job = res_sketch.json()
        print("[Frontend received] job_id:", sketch_job["job_id"], "status:", sketch_job["status"])
        assert sketch_job["status"] == "queued"
        job_id_1 = sketch_job["job_id"]

        print("\n=== STEP 2: Status Polling (queued state) ===")
        res_poll_1 = await client.get(f"/api/status/{job_id_1}")
        assert res_poll_1.status_code == 200
        poll_data_1 = res_poll_1.json()
        print("[Polling response] Status:", poll_data_1["status"], "Model URL:", poll_data_1["model_url"])
        assert poll_data_1["status"] == "queued"
        assert poll_data_1["model_url"] is None

        print("\n=== STEP 3: Uploaded Image Flow (JPG File via FormData) ===")
        jpg_file = make_test_jpg()
        res_upload = await client.post(
            "/api/generate",
            files={"file": ("concept_armchair.jpg", jpg_file, "image/jpeg")},
            data={"prompt": "Minimalist ergonomic lounge armchair", "mode": "upload"}
        )
        assert res_upload.status_code == 202
        upload_job = res_upload.json()
        print("[Frontend received] job_id:", upload_job["job_id"], "filename:", upload_job["filename"])
        job_id_2 = upload_job["job_id"]

        print("\n=== STEP 4: Model Delivery & GLB Stream Flow ===")
        # Check model endpoint before model exists (should be 404 pending)
        res_model_pending = await client.get(f"/api/model/{job_id_1}")
        assert res_model_pending.status_code == 404
        print("[Model endpoint] Pending check: 404 Not Ready as expected.")

        # Simulate completed GLB output in backend/outputs/
        outputs_dir = Path(__file__).parent / "outputs"
        sample_glb = outputs_dir / f"{job_id_1}.glb"
        sample_glb.write_bytes(b"glTF\x02\x00\x00\x00\x00\x00\x00\x00REAL_GLB_BYTES")

        try:
            # Poll status after completion
            res_poll_ready = await client.get(f"/api/status/{job_id_1}")
            assert res_poll_ready.status_code == 200
            ready_data = res_poll_ready.json()
            print("[Polling response after bake] Status:", ready_data["status"], "Model URL:", ready_data["model_url"])
            assert ready_data["status"] == "completed"
            assert ready_data["model_url"] == f"/api/model/{job_id_1}"

            # Fetch actual GLB binary stream
            res_glb = await client.get(ready_data["model_url"])
            assert res_glb.status_code == 200
            assert res_glb.headers["content-type"] == "model/gltf-binary"
            assert len(res_glb.content) > 0
            print("[GLB Download] Successfully fetched binary model file. Length:", len(res_glb.content), "bytes")
        finally:
            if sample_glb.exists():
                sample_glb.unlink()

        print("\n=== STEP 5: Duplicate Submission & Validation Handling ===")
        # Missing image
        res_empty = await client.post("/api/generate", data={"prompt": "empty input"})
        assert res_empty.status_code == 400
        print("[Validation] Missing input rejected with 400:", res_empty.json()["detail"])

        print("\n>>> ALL FRONTEND-TO-BACKEND INTEGRATION TESTS PASSED! <<<\n")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_frontend_backend_flow())

