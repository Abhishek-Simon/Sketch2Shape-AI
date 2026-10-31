#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d /content ]]; then
  echo 'This setup targets Google Colab (/content) on Linux.' >&2
  exit 1
fi

python -m pip install -q uv 'fastapi>=0.115,<1' 'uvicorn>=0.30,<1' \
  'python-multipart>=0.0.20,<1' 'trimesh>=4,<5' 'requests>=2.32,<3'

uv python install 3.10
uv venv --allow-existing /content/controlnet-env --python 3.10
uv venv --allow-existing /content/triposr-env --python 3.10

for env in /content/controlnet-env /content/triposr-env; do
  uv pip install --python "$env/bin/python" \
    torch==2.1.2 torchvision==0.16.2 \
    --index-url https://download.pytorch.org/whl/cu121
done

uv pip install --python /content/controlnet-env/bin/python \
  numpy==1.26.4 Pillow==10.2.0 diffusers==0.27.2 \
  transformers==4.38.2 accelerate==0.29.3 \
  huggingface-hub==0.25.2 safetensors

if [[ ! -f /content/TripoSR/run.py ]]; then
  git clone https://github.com/VAST-AI-Research/TripoSR.git /content/TripoSR
fi

python - <<'PY'
from pathlib import Path
source = Path('/content/TripoSR/requirements.txt').read_text().splitlines()
filtered = [
    line for line in source
    if line.strip() and not line.strip().startswith('#')
    and 'torchmcubes' not in line.lower()
    and not line.strip().lower().startswith('gradio')
    and not line.strip().lower().startswith('huggingface-hub')
    and not line.strip().lower().startswith('rembg')
]
filtered.extend([
    'rembg==2.0.61',
    'huggingface-hub==0.17.3',
    'numpy==1.26.4',
    'scikit-image==0.22.0',
    'onnxruntime==1.19.2',
])
Path('/content/triposr-requirements.txt').write_text('\n'.join(filtered) + '\n')
PY

uv pip install --python /content/triposr-env/bin/python \
  -r /content/triposr-requirements.txt

python "$ROOT/setup/patch_triposr.py"

/content/controlnet-env/bin/python -c 'import torch, diffusers; assert torch.cuda.is_available(); print("ControlNet environment ready")'
(cd /content/TripoSR && /content/triposr-env/bin/python -c 'import torch, rembg, trimesh, skimage; from tsr.models.isosurface import marching_cubes; assert torch.cuda.is_available(); print("TripoSR environment ready")')

if [[ ! -x /content/cloudflared ]]; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -o /content/cloudflared
  chmod +x /content/cloudflared
fi

printf '\nColab ML dependencies installed.\n'
