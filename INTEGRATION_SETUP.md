# Sketch2Shape GPU integration

## Backend
In `backend/.env`, configure:
```env
ML_WORKER_URL=https://<current-colab-quick-tunnel>.trycloudflare.com
ML_WORKER_TOKEN=<the-token-printed-by-the-Colab-launcher>
ML_WORKER_TIMEOUT_SECONDS=900
```
Do not commit this file. Install backend requirements, then run:
```powershell
cd D:\Hypertune\backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

## Frontend
The API client default is now `http://127.0.0.1:8001`. If using Vite env configuration, set `VITE_API_BASE_URL=http://127.0.0.1:8001` in the project-root `.env.local`, then restart Vite.

## API translation
The frontend keeps `/api/generate`, `/api/status/{job_id}`, and `/api/model/{job_id}`. The backend submits to the Colab worker's `/jobs`, polls `/jobs/{worker_job_id}`, downloads `/jobs/{worker_job_id}/bundle`, extracts `model.glb`, and serves it locally.

## Important
Start the Colab worker before testing. The Quick Tunnel URL changes when its Colab runtime restarts. Keep the Colab runtime alive. Never commit or share the worker token publicly.
