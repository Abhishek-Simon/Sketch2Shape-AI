import torch
from PIL import Image
from diffusers import (
    ControlNetModel,
    StableDiffusionControlNetPipeline,
    UniPCMultistepScheduler
)


def generate_image(control_path, prompt, output_path):
    control = Image.open(control_path).convert("RGB")

    controlnet = ControlNetModel.from_pretrained(
        "lllyasviel/control_v11p_sd15_scribble",
        torch_dtype=torch.float16
    )

    pipe = StableDiffusionControlNetPipeline.from_pretrained(
        "stable-diffusion-v1-5/stable-diffusion-v1-5",
        controlnet=controlnet,
        torch_dtype=torch.float16,
        safety_checker=None,
        requires_safety_checker=False
    )

    pipe.scheduler = UniPCMultistepScheduler.from_config(
        pipe.scheduler.config
    )

    pipe.enable_model_cpu_offload()
    pipe.enable_vae_slicing()

    image = pipe(
        prompt=prompt,
        negative_prompt="multiple objects, people, text, watermark, cropped, distorted",
        image=control,
        num_inference_steps=20,
        guidance_scale=7.0,
        controlnet_conditioning_scale=1.1,
        generator=torch.Generator(device="cpu").manual_seed(42)
    ).images[0]

    image.save(output_path)
    return str(output_path)
