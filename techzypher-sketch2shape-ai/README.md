# Sketch2Shape AI

TechZephyr 4.0 sketch / colored-image to GLB prototype.

## ML pipelines

- `ml.pipeline.generate_3d(sketch_path, prompt, output_dir)`: sketch preprocessing → SD 1.5 + ControlNet Scribble → TripoSR → GLB.
- `ml.pipeline.generate_3d_from_image(image_path, prompt, output_dir)`: colored image → SD 1.5 img2img prompt conditioning → TripoSR → GLB.

Both return a job-specific `model.glb`. Sketch mode also saves `control.png` and `generated.png`; colored-image mode saves `conditioned.png`. The prompt affects **image generation**, not TripoSR geometry directly.

**The ML models require GPU inference in Google Colab. Do not run them on the local 4 GB laptop GPU.**

## One-notebook Colab setup and worker launch

Open [notebooks/worker_colab.ipynb](notebooks/worker_colab.ipynb) in Google Colab, choose **T4 GPU**, then run all its cells. The notebook clones this branch, runs `setup/setup_colab.sh`, and launches the GPU worker via `scripts/start_worker_colab.py`.

Alternatively, in a fresh Colab T4 environment:

```python
import subprocess
subprocess.run(["git","clone","-b","sketch2shape-ai","https://github.com/arpit-thorat07/techzypher.git","/content/techzypher"],check=True)
subprocess.run(["bash","/content/techzypher/setup/setup_colab.sh"],check=True)
subprocess.run(["python","/content/techzypher/scripts/start_worker_colab.py"],check=True)
```

The setup script installs two isolated Python 3.10 environments, downloads TripoSR from its official repository, installs its dependencies, applies a scikit-image marching-cubes fallback, and downloads the Cloudflare tunnel executable. The model weights download during the first inference.

The launcher displays three values to give the backend developer **privately**:

```dotenv
ML_WORKER_URL=https://your-temporary-tunnel.trycloudflare.com
ML_WORKER_TOKEN=private-random-token
ML_WORKER_TIMEOUT_SECONDS=900
```

These are placeholders, not actual credentials. Colab resets require restarting the worker and tunnel; URL and token may change.

## GPU worker HTTP contract

See [gpu_worker/README.md](gpu_worker/README.md). Endpoints:

- `GET /health` — readiness
- `POST /jobs` — authenticated multipart `image`, `prompt`, `mode=sketch|color`; HTTP 202 with `job_id`
- `GET /jobs/{job_id}` — authenticated job status
- `GET /jobs/{job_id}/bundle` — authenticated ZIP containing `model.glb`, `preview.png`, `manifest.json`

The worker executes one GPU job at once; a second may wait in the queue. The backend stores returned GLB and preview bytes, and exposes its own frontend download endpoints. It must not expose Colab filesystem paths.

Smoke-test a running worker with `scripts/test_worker.py` (requires `requests` and the active URL/token).

## CPU-only tests

```bash
python -m pip install fastapi uvicorn python-multipart httpx pytest pillow numpy trimesh
python -m pytest -q tests/test_gpu_worker.py tests/test_mesh_utils.py
```

These mock GPU inference and test authentication, validation, queueing, job responses, and colored GLB export. They do not verify the real Colab T4 inference.

## Known quality limitations

TripoSR works from one image and may close mug cavities or flatten lamp heads. It exports **vertex-colored GLB** rather than UV texture maps. `ml/mesh_utils.py` adds an explicit material for COLOR_0 primitives to support glTF viewers without changing the existing colors. Img2img may alter colors, structure, or proportions. The established TripoSR arguments remain `--foreground-ratio 0.95 --mc-resolution 192 --chunk-size 4096`.

## Attribution

Externally pretrained dependencies:
- [Stable Diffusion v1.5](https://huggingface.co/stable-diffusion-v1-5/stable-diffusion-v1-5)
- [ControlNet Scribble](https://huggingface.co/lllyasviel/control_v11p_sd15_scribble)
- [TripoSR](https://github.com/VAST-AI-Research/TripoSR)

Check the respective licenses and terms before redistributing model weights or commercial deployment.
