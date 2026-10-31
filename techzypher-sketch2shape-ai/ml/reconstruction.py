from pathlib import Path
import subprocess


def reconstruct_3d(image_path, output_dir, triposr_root="/content/TripoSR", python_bin="/content/triposr-env/bin/python"):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    subprocess.run([
        python_bin,
        "run.py",
        str(image_path),
        "--output-dir", str(output_dir),
        "--model-save-format", "glb",
        "--foreground-ratio", "0.95",
        "--mc-resolution", "192",
        "--chunk-size", "4096"
    ], cwd=triposr_root, check=True)

    model_path = output_dir / "0" / "mesh.glb"
    return str(model_path)
