"""Health and readiness check endpoints."""

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.common import HealthResponse, ReadinessResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def check_health() -> HealthResponse:
    """Process liveness probe reporting whether the application process is running."""
    return HealthResponse(
        status="ok",
        service="namma-karnataka-api",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )


@router.get("/ready", response_model=ReadinessResponse, tags=["Health"])
async def check_readiness() -> ReadinessResponse:
    """Service readiness probe checking whether the application can serve requests."""
    # During Phase 1 scaffold, configuration validation and runtime are verified.
    # Future phases will add Supabase connection pool and AI adapter health checks here.
    return ReadinessResponse(
        status="ready",
        service="namma-karnataka-api",
        ready=True,
        checks={
            "configuration": "valid",
            "runtime": "ready",
            "environment": settings.APP_ENV,
        },
    )
