from pathlib import Path

import numpy as np
from PIL import Image, ImageOps


def preprocess_sketch(sketch_path, output_path):
    sketch = ImageOps.autocontrast(Image.open(sketch_path).convert("L"))
    mask = np.asarray(sketch) < 200

    if not mask.any():
        raise ValueError("No sketch lines detected")

    ys, xs = np.where(mask)
    cropped = sketch.crop((
        int(xs.min()), int(ys.min()),
        int(xs.max()) + 1, int(ys.max()) + 1
    ))
    cropped.thumbnail((440, 440), Image.Resampling.LANCZOS)

    canvas = Image.new("L", (512, 512), 255)
    x = (512 - cropped.width) // 2
    y = (512 - cropped.height) // 2
    canvas.paste(cropped, (x, y))

    control = Image.fromarray(
        np.where(np.asarray(canvas) < 200, 255, 0).astype(np.uint8)
    ).convert("RGB")

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    control.save(output_path)
    return str(output_path)
