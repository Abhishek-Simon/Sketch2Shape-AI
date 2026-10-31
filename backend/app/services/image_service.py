import base64
import io
import re
from pathlib import Path
from typing import Tuple, Dict, Any

from fastapi import UploadFile, HTTPException, status
from PIL import Image
import cv2
import numpy as np

from app.core.config import settings


class ImageService:
    """Service for handling, validating, and persisting image inputs."""

    @staticmethod
    def _validate_image_bytes(data: bytes, original_filename: str = "image.png") -> Tuple[str, int, int]:
        """
        Validate image byte payload for size, format, and integrity using PIL & OpenCV.
        Returns: (normalized_extension, width, height)
        """
        # 1. Size Validation
        size_bytes = len(data)
        if size_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty image payload. Please provide a valid sketch or image.",
            )

        if size_bytes > settings.MAX_FILE_SIZE_BYTES:
            max_mb = settings.MAX_FILE_SIZE_BYTES / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image size ({size_bytes / (1024*1024):.1f} MB) exceeds maximum allowed limit of {max_mb:.0f} MB.",
            )

        # 2. Image Header & Integrity Validation via PIL
        try:
            with Image.open(io.BytesIO(data)) as pil_img:
                pil_format = pil_img.format.upper() if pil_img.format else ""
                width, height = pil_img.size

                format_map = {
                    "PNG": ".png",
                    "JPEG": ".jpg",
                    "JPG": ".jpg",
                    "WEBP": ".webp",
                }

                if pil_format not in format_map:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Unsupported image format: '{pil_format}'. "
                            f"Allowed formats are: PNG, JPG, JPEG, and WebP."
                        ),
                    )

                ext = format_map[pil_format]
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Corrupt or unreadable image file: {str(e)}",
            )

        # 3. Secondary OpenCV verification
        try:
            np_arr = np.frombuffer(data, np.uint8)
            cv_img = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
            if cv_img is None:
                raise ValueError("OpenCV failed to decode image buffer.")
        except Exception:
            # If cv2 decode fails for any edge case WebP/RGBA, PIL verification was already completed
            pass

        return ext, width, height

    @classmethod
    async def save_upload_file(cls, file: UploadFile, job_id: str) -> Tuple[Path, Dict[str, Any]]:
        """
        Read, validate, and save an uploaded sketch/image file.
        Returns: (saved_path, metadata)
        """
        filename = file.filename or "upload.png"
        path_suffix = Path(filename).suffix.lower()

        if path_suffix and path_suffix not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"File extension '{path_suffix}' is not permitted. "
                    f"Allowed extensions: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}"
                ),
            )

        data = await file.read()
        ext, width, height = cls._validate_image_bytes(data, filename)

        settings.init_directories()
        target_filename = f"{job_id}{ext}"
        target_path = settings.UPLOADS_DIR / target_filename

        target_path.write_bytes(data)

        metadata = {
            "original_filename": filename,
            "saved_filename": target_filename,
            "width": width,
            "height": height,
            "size_bytes": len(data),
            "format": ext.lstrip(".").upper(),
        }

        return target_path, metadata

    @classmethod
    def save_base64_image(cls, base64_str: str, job_id: str) -> Tuple[Path, Dict[str, Any]]:
        """
        Decode, validate, and save a base64-encoded canvas data URL or raw string.
        Returns: (saved_path, metadata)
        """
        # Strip potential data URL prefix, e.g. "data:image/png;base64,"
        cleaned_str = base64_str.strip()
        data_url_match = re.match(r"^data:(image\/[a-zA-Z0-9\-\.]+);base64,(.*)$", cleaned_str, re.DOTALL)

        if data_url_match:
            b64_payload = data_url_match.group(2)
        else:
            b64_payload = cleaned_str

        try:
            data = base64.b64decode(b64_payload)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 encoding for image data: {str(e)}",
            )

        ext, width, height = cls._validate_image_bytes(data, f"sketch_{job_id}.png")

        settings.init_directories()
        target_filename = f"{job_id}{ext}"
        target_path = settings.UPLOADS_DIR / target_filename

        target_path.write_bytes(data)

        metadata = {
            "original_filename": f"sketch_{job_id}{ext}",
            "saved_filename": target_filename,
            "width": width,
            "height": height,
            "size_bytes": len(data),
            "format": ext.lstrip(".").upper(),
        }

        return target_path, metadata

