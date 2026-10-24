"""Deterministic terrain-adjusted routing provider with honest distance disclosure."""

from __future__ import annotations

import math

from app.services.routing.models import CalculationMethod, RouteEstimate
from app.services.routing.provider import RoutingProvider


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two GPS coordinates in kilometers."""
    radius_earth_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(radius_earth_km * c, 2)


def is_in_western_ghats_corridor(lat: float, lon: float) -> bool:
    """Detect if coordinates fall within the rugged Western Ghats terrain."""
    return 11.8 <= lat <= 15.2 and 74.2 <= lon <= 76.1


class TerrainAdjustedRoutingProvider(RoutingProvider):
    """Calculates realistic driving estimates by applying terrain winding factors."""

    def calculate_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        mode: str = "driving",
    ) -> RouteEstimate:
        straight_km = haversine_distance_km(origin_lat, origin_lon, dest_lat, dest_lon)

        # Base case: very close stops (under 500m)
        if straight_km < 0.5:
            return RouteEstimate(
                origin_lat=origin_lat,
                origin_lon=origin_lon,
                dest_lat=dest_lat,
                dest_lon=dest_lon,
                straight_line_distance_km=straight_km,
                estimated_road_distance_km=straight_km,
                duration_minutes=5,
                calculation_method=CalculationMethod.STRAIGHT_LINE,
                is_approximation=False,
                winding_factor_applied=1.0,
                feasibility_warnings=[],
            )

        # Detect terrain characteristics
        in_ghats = is_in_western_ghats_corridor(
            origin_lat, origin_lon
        ) or is_in_western_ghats_corridor(dest_lat, dest_lon)

        if in_ghats:
            winding_factor = 1.45  # Hairpin turns, hill gradients
            avg_speed_kmh = 32.0  # Slower ghat driving speed
        else:
            winding_factor = 1.30  # Standard state/national highway winding
            avg_speed_kmh = 48.0  # Moderate highway driving speed

        estimated_road_km = round(straight_km * winding_factor, 1)

        # Calculate transit duration with a 15-minute standard buffer for intersections and traffic
        transit_hours = estimated_road_km / avg_speed_kmh
        duration_minutes = max(10, int(transit_hours * 60) + 15)

        # Feasibility warnings
        warnings: list[str] = []
        if estimated_road_km > 180.0:
            warnings.append(
                f"Long transit segment ({estimated_road_km:.0f} km); "
                "consider allocating extra travel time or splitting across days."
            )
        if duration_minutes > 240:
            warnings.append(
                f"Travel duration ({duration_minutes // 60}h {duration_minutes % 60}m) "
                "exceeds 4 hours; rest stops strongly recommended."
            )

        return RouteEstimate(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            straight_line_distance_km=straight_km,
            estimated_road_distance_km=estimated_road_km,
            duration_minutes=duration_minutes,
            calculation_method=CalculationMethod.TERRAIN_ADJUSTED,
            is_approximation=True,
            winding_factor_applied=winding_factor,
            feasibility_warnings=warnings,
        )
