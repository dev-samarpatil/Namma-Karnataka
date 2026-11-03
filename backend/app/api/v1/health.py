"""Health and readiness check endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.repositories.destinations import DestinationFilterParams, get_destination_repository
from app.schemas.common import HealthResponse, ReadinessResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def check_health() -> HealthResponse:
    """Process liveness probe reporting whether the application process is running.

    Does not require external databases or AI providers to be reachable.
    Never leaks secrets or stack traces.
    """
    return HealthResponse(
        status="ok",
        service="namma-karnataka-api",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )


@router.get("/ready", response_model=ReadinessResponse, tags=["Health"])
async def check_readiness() -> ReadinessResponse:
    """Service readiness probe checking whether the application can serve requests.

    Validates database and catalog availability while distinguishing optional
    AI providers from core application availability.
    """
    checks: dict[str, str] = {
        "configuration": "valid",
        "runtime": "ready",
        "environment": settings.APP_ENV,
    }

    # 1. Database and destination catalog check
    repo = get_destination_repository()
    is_catalog_ready = False
    try:
        items, total = repo.list_destinations(DestinationFilterParams(limit=1, offset=0))
        if total > 0 or len(items) > 0:
            is_catalog_ready = True
            checks["catalog"] = f"ready ({total} destinations)"
        else:
            checks["catalog"] = "empty"
    except Exception:
        checks["catalog"] = "error"

    is_supabase_configured = bool(
        settings.SUPABASE_URL
        and settings.SUPABASE_SERVICE_ROLE_KEY
        and not settings.SUPABASE_URL.startswith("placeholder")
    )

    if is_supabase_configured:
        checks["database"] = "supabase_connected" if is_catalog_ready else "supabase_degraded"
    else:
        checks["database"] = "in_memory_ready" if is_catalog_ready else "in_memory_empty"

    # 2. AI Providers check (strictly optional: unconfigured AI does not fail readiness)
    ai_configured = settings.is_groq_configured or settings.is_gemini_configured
    if settings.AI_PLANNING_ENABLED:
        checks["ai_providers"] = "configured" if ai_configured else "optional_unconfigured"
    else:
        checks["ai_providers"] = "disabled"

    ready = is_catalog_ready

    return ReadinessResponse(
        status="ready" if ready else "degraded",
        service="namma-karnataka-api",
        ready=ready,
        checks=checks,
    )
