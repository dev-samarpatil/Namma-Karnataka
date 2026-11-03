"""FastAPI main application entrypoint."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.v1 import api_v1_router
from app.api.v1.health import check_health, check_readiness
from app.core.config import settings
from app.core.errors import register_error_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestIdMiddleware
from app.schemas.common import HealthResponse, ReadinessResponse

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

# 2. Register CORS Middleware with explicit production and localhost origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "X-Request-ID"],
    max_age=600,
)

# 3. Register Centralized Error Handlers
register_error_handlers(app)

# 4. Mount versioned API router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


# 5. Root-level Health and Readiness Endpoints (for Render, Docker, and external probes)
@app.api_route("/health", methods=["GET", "HEAD"], response_model=HealthResponse, tags=["Health"])
async def root_health() -> HealthResponse:
    """Root liveness probe indicating process availability."""
    return await check_health()


@app.get("/ready", response_model=ReadinessResponse, tags=["Health"])
async def root_ready() -> ReadinessResponse:
    """Root readiness probe indicating subsystem and database connectivity."""
    return await check_readiness()


@app.get("/destinations", include_in_schema=False)
async def redirect_destinations() -> RedirectResponse:
    """Redirect versionless destinations requests to canonical versioned endpoint."""
    return RedirectResponse(url=f"{settings.API_V1_STR}/destinations", status_code=307)


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Root welcoming endpoint indicating service status."""
    return {
        "service": "namma-karnataka-api",
        "message": "Namma Karnataka API Foundation is running",
        "docs_url": "/docs",
        "health_url": "/health",
        "ready_url": "/ready",
        "api_v1_health": f"{settings.API_V1_STR}/health",
        "api_v1_ready": f"{settings.API_V1_STR}/ready",
    }
