"""Pydantic schemas and models for routing and travel feasibility."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class CalculationMethod(StrEnum):
    STRAIGHT_LINE = "straight_line"
    TERRAIN_ADJUSTED = "terrain_adjusted"
    ROAD_NETWORK = "road_network"


class RouteEstimate(BaseModel):
    """Estimated route details between two geographic points."""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
    )

    origin_lat: float = Field(..., ge=-90.0, le=90.0)
    origin_lon: float = Field(..., ge=-180.0, le=180.0)
    dest_lat: float = Field(..., ge=-90.0, le=90.0)
    dest_lon: float = Field(..., ge=-180.0, le=180.0)
    straight_line_distance_km: float = Field(..., ge=0.0)
    estimated_road_distance_km: float = Field(..., ge=0.0)
    duration_minutes: int = Field(..., ge=0)
    calculation_method: CalculationMethod = CalculationMethod.TERRAIN_ADJUSTED
    is_approximation: bool = True
    winding_factor_applied: float = Field(1.35, ge=1.0)
    feasibility_warnings: list[str] = Field(default_factory=list)
