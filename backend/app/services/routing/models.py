"""Pydantic schemas and models for routing, road directions, and travel feasibility."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class Waypoint(BaseModel):
    """Geographic point in a multi-stop itinerary route."""

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    name: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    stop_id: str | None = None
    stop_order: int | None = None
    day_number: int | None = None


class RouteStep(BaseModel):
    """Single turn or travel instruction within a road route leg."""

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    instruction: str
    distance_meters: float
    duration_seconds: float
    name: str | None = None


class RouteLeg(BaseModel):
    """Road route segment connecting consecutive itinerary stops."""

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    origin: Waypoint
    destination: Waypoint
    distance_meters: float
    distance_km: float
    duration_seconds: float
    duration_minutes: int
    steps: list[RouteStep] = Field(default_factory=list)
    geometry_coordinates: list[list[float]] = Field(
        default_factory=list, description="Array of [lat, lon] coordinates along the road"
    )
    calculation_method: CalculationMethod = CalculationMethod.ROAD_NETWORK
    warnings: list[str] = Field(default_factory=list)


class DirectionsRequest(BaseModel):
    """Request payload to calculate road route and directions across itinerary waypoints."""

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    origin: Waypoint
    destination: Waypoint
    waypoints: list[Waypoint] = Field(default_factory=list, max_length=25)
    travel_mode: str = Field("driving")
    day_number: int | None = None

    @field_validator("travel_mode", mode="before")
    @classmethod
    def normalize_travel_mode(cls, v: str | None) -> str:
        if not v:
            return "driving"
        clean = str(v).lower().strip()
        if clean in ("driving", "driving_car", "car", "cab_taxi", "cab", "taxi"):
            return "driving"
        elif clean in ("transit", "public_transit", "bus", "train"):
            return "transit"
        elif clean in ("walking", "walk", "pedestrian"):
            return "walking"
        return "driving"


class DirectionsResponse(BaseModel):
    """Complete road route response with geometry, per-leg directions, and map navigation link."""

    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
    )

    provider: str = Field(
        "osrm", description="Routing provider used e.g. 'osrm', 'google_routes', 'fallback'"
    )
    calculation_method: CalculationMethod = CalculationMethod.ROAD_NETWORK
    travel_mode: str = "driving"
    total_distance_km: float
    total_duration_minutes: int
    legs: list[RouteLeg] = Field(default_factory=list)
    all_coordinates: list[list[float]] = Field(
        default_factory=list, description="Full polyline coordinates as [[lat, lon], ...]"
    )
    google_maps_url: str
    is_live_traffic: bool = False
    warnings: list[str] = Field(default_factory=list)
