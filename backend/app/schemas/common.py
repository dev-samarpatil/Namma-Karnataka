"""Common and core API schemas for Namma Karnataka."""

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Detailed error object within the standardized error envelope."""

    code: str = Field(..., description="Stable machine-readable error code")
    message: str = Field(..., description="Safe human-readable error description")
    request_id: str | None = Field(None, description="Correlation identifier for request tracing")
    details: list[dict[str, Any]] | None = Field(
        None, description="Optional structured validation or contextual details"
    )


class ErrorResponse(BaseModel):
    """Standardized top-level error envelope for all non-2xx responses."""

    error: ErrorDetail


class HealthResponse(BaseModel):
    """Process liveness response schema."""

    status: str = Field("healthy", description="Current liveness status")
    service: str = Field("namma-karnataka-api", description="Service identifier")
    version: str = Field(..., description="Current semantic release version")
    environment: str = Field(..., description="Active runtime environment")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
        description="UTC ISO-8601 server timestamp",
    )


class ReadinessResponse(BaseModel):
    """Service operational readiness response schema."""

    status: str = Field("ready", description="Readiness status")
    service: str = Field("namma-karnataka-api", description="Service identifier")
    ready: bool = Field(True, description="Whether the service can serve traffic")
    checks: dict[str, str] = Field(
        default_factory=lambda: {
            "configuration": "valid",
            "runtime": "ready",
        },
        description="Individual subsystem readiness checks",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(UTC).isoformat(),
        description="UTC ISO-8601 server timestamp",
    )
