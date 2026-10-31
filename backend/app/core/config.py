from pathlib import Path
from typing import List, Set
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration settings for Sketch2Shape AI Backend."""

    PROJECT_NAME: str = "Sketch2Shape AI Backend"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    ML_WORKER_URL: str = ""
    ML_WORKER_TOKEN: str = ""
    ML_WORKER_TIMEOUT_SECONDS: int = 900

    # Directory Paths using pathlib
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOADS_DIR: Path = BASE_DIR / "uploads"
    OUTPUTS_DIR: Path = BASE_DIR / "outputs"

    # Upload constraints
    MAX_FILE_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 Megabytes
    ALLOWED_EXTENSIONS: Set[str] = {".png", ".jpg", ".jpeg", ".webp"}
    ALLOWED_MIME_TYPES: Set[str] = {
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
    }

    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=(Path(__file__).resolve().parents[2] / ".env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def init_directories(self) -> None:
        """Ensure uploads and outputs directories exist."""
        self.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        self.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()

