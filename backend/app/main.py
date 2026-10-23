"""FastAPI main application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestIdMiddleware

# Initialize secret-safe structured logging
setup_logging(settings.LOG_LEVEL)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Namma Karnataka travel discovery and itinerary planning.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# 1. Register Request ID Middleware (first in stack so all responses and logs receive request ID)
app.add_middleware(RequestIdMiddleware)

# 2. Register CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Register Centralized Error Handlers
register_error_handlers(app)

# 4. Mount versioned API router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Root welcoming endpoint indicating scaffold status."""
    return {
        "service": "namma-karnataka-api",
        "message": "Namma Karnataka API Foundation is running",
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_STR}/health",
        "ready_url": f"{settings.API_V1_STR}/ready",
    }
