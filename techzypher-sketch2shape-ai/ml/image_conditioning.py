import torch
from PIL import Image
from diffusers import (
    StableDiffusionImg2ImgPipeline,
    UniPCMultistepScheduler
)


def condition_image(image_path, prompt, output_path, strength=0.3):
    image = Image.open(image_path).convert("RGB").resize((512, 512))

    pipe = StableDiffusionImg2ImgPipeline.from_pretrained(
        "stable-diffusion-v1-5/stable-diffusion-v1-5",
        torch_dtype=torch.float16,
        safety_checker=None,
        requires_safety_checker=False
    )

    pipe.scheduler = UniPCMultistepScheduler.from_config(
        pipe.scheduler.config
    )

    pipe.enable_model_cpu_offload()
    pipe.enable_vae_slicing()

    result = pipe(
        prompt=prompt,
        negative_prompt="multiple objects, text, watermark, cropped, distorted, deformed",
        image=image,
        strength=strength,
        guidance_scale=7.0,
        num_inference_steps=20,
        generator=torch.Generator(device="cpu").manual_seed(42)
    ).images[0]

    result.save(output_path)
    return str(output_path)
