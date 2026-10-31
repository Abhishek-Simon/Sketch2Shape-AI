from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.core.config import settings
from app.routes.generation import router as generation_router

# Initialize storage directories on startup
settings.init_directories()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "FastAPI Backend for Sketch2Shape AI Studio. "
        "Accepts sketches/images and manages 3D model generation pipelines."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)


def custom_openapi():
    """
    Custom OpenAPI schema generator ensuring file upload fields in multipart/form-data
    are declared directly as type: string, format: binary instead of anyOf with null,
    enabling Swagger UI to render the native file input chooser (Choose File button).
    """
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Normalize anyOf unions for binary upload parameters across request body schemas
    for schema_name, schema in openapi_schema.get("components", {}).get("schemas", {}).items():
        properties = schema.get("properties", {})
        for prop_name, prop in properties.items():
            if "anyOf" in prop:
                for variant in prop["anyOf"]:
                    if variant.get("format") == "binary":
                        prop["type"] = "string"
                        prop["format"] = "binary"
                        del prop["anyOf"]
                        break

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# Configure CORS Middleware for React frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes under /api
app.include_router(generation_router, prefix=settings.API_PREFIX)


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint verifying backend availability."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
    }


@app.get(f"{settings.API_PREFIX}/health", tags=["Health"])
async def health_check():
    """Health check endpoint for status monitoring."""
    return {
        "status": "healthy",
        "uploads_dir_exists": settings.UPLOADS_DIR.is_dir(),
        "outputs_dir_exists": settings.OUTPUTS_DIR.is_dir(),
    }
