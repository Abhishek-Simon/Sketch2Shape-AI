from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """Lifecycle statuses for 3D model generation jobs."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerateJsonRequest(BaseModel):
    """JSON schema for generation request using base64 image input."""
    image: str = Field(
        ...,
        description="Base64-encoded image string or data URL (PNG, JPG, or WebP)",
    )
    prompt: Optional[str] = Field(
        default="",
        description="Optional text prompt specifying materials, detailing, or aesthetics",
    )
    mode: Optional[str] = Field(
        default="draw",
        description="Input mode indicator: 'draw' or 'upload'",
    )


class GenerateResponse(BaseModel):
    """Response returned upon successfully receiving and queueing a generation job."""
    job_id: str = Field(..., description="Unique UUID identifier for this generation job")
    status: JobStatus = Field(default=JobStatus.QUEUED, description="Initial lifecycle status")
    message: str = Field(..., description="Descriptive status message")
    filename: str = Field(..., description="Saved input image filename")
    prompt: Optional[str] = Field(default="", description="Provided generation prompt")
    created_at: datetime = Field(..., description="ISO 8601 creation timestamp")


class JobStatusResponse(BaseModel):
    """Response model for querying job status."""
    model_config = {"protected_namespaces": ()}

    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Current lifecycle status")
    prompt: Optional[str] = Field(default="", description="Generation prompt")
    created_at: datetime = Field(..., description="ISO 8601 creation timestamp")
    model_url: Optional[str] = Field(
        default=None,
        description="Relative URL to download or preview the generated 3D asset when ready",
    )
    error: Optional[str] = Field(
        default=None,
        description="Failure details if status is failed",
    )


class ErrorResponse(BaseModel):
    """Standardized error response model."""
    detail: str = Field(..., description="Error message description")
