"""Real road-network routing provider integrating OSRM and Google Maps deep-linking
with resilient fallback and honest calculation-method disclosure.
"""

from __future__ import annotations

import logging
import urllib.parse

import httpx

from app.core.config import settings
from app.services.routing.models import (
    CalculationMethod,
    DirectionsRequest,
    DirectionsResponse,
    RouteLeg,
    RouteStep,
    Waypoint,
)
from app.services.routing.terrain_provider import TerrainAdjustedRoutingProvider

logger = logging.getLogger(__name__)


def build_google_maps_directions_url(
    origin: Waypoint,
    destination: Waypoint,
    waypoints: list[Waypoint],
    travel_mode: str = "driving",
) -> str:
    """Build official Google Maps direction URL."""
    base = "https://www.google.com/maps/dir/?api=1"
    origin_param = f"{origin.lat:.5f},{origin.lon:.5f}"
    dest_param = f"{destination.lat:.5f},{destination.lon:.5f}"

    params = {
        "origin": origin_param,
        "destination": dest_param,
        "travelmode": travel_mode
        if travel_mode in ("driving", "transit", "walking")
        else "driving",
    }

    if waypoints:
        wp_coords = [f"{w.lat:.5f},{w.lon:.5f}" for w in waypoints]
        params["waypoints"] = "|".join(wp_coords)

    return f"{base}&{urllib.parse.urlencode(params)}"


class RoadRoutingService:
    """Calculates actual road network routes, distances, durations, and turn directions."""

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or settings.OSRM_BASE_URL).rstrip("/")
        self.terrain_fallback = TerrainAdjustedRoutingProvider()

    async def calculate_directions(self, request: DirectionsRequest) -> DirectionsResponse:
        """Calculate road route for the ordered sequence of waypoints."""
        ordered_points: list[Waypoint] = (
            [request.origin] + list(request.waypoints) + [request.destination]
        )
        gmaps_url = build_google_maps_directions_url(
            request.origin, request.destination, request.waypoints, request.travel_mode
        )

        # Coordinate string for OSRM is lon,lat;lon,lat;...
        coords_str = ";".join(f"{p.lon:.6f},{p.lat:.6f}" for p in ordered_points)
        osrm_url = (
            f"{self.base_url}/route/v1/driving/{coords_str}"
            f"?overview=full&geometries=geojson&steps=true"
        )

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(osrm_url)
                if res.status_code == 200:
                    data = res.json()
                    routes = data.get("routes", [])
                    if routes:
                        primary_route = routes[0]
                        total_dist_m = float(primary_route.get("distance", 0.0))
                        total_dur_s = float(primary_route.get("duration", 0.0))
                        total_km = round(total_dist_m / 1000.0, 1)
                        total_mins = max(5, int(total_dur_s / 60.0))

                        # Geometry in OSRM GeoJSON is [lon, lat]. Convert to [lat, lon]
                        raw_coords = primary_route.get("geometry", {}).get("coordinates", [])
                        all_lat_lons: list[list[float]] = [[pt[1], pt[0]] for pt in raw_coords]

                        legs_data = primary_route.get("legs", [])
                        legs: list[RouteLeg] = []

                        for idx, leg_item in enumerate(legs_data):
                            leg_origin = ordered_points[idx]
                            leg_dest = ordered_points[idx + 1]
                            l_dist_m = float(leg_item.get("distance", 0.0))
                            l_dur_s = float(leg_item.get("duration", 0.0))

                            steps: list[RouteStep] = []
                            for s in leg_item.get("steps", []):
                                instruction = s.get("maneuver", {}).get("instruction")
                                if not instruction:
                                    m_type = s.get("maneuver", {}).get("type", "drive")
                                    m_mod = s.get("maneuver", {}).get("modifier", "")
                                    r_name = s.get("name") or "road"
                                    instruction = (
                                        f"{m_type.capitalize()} {m_mod} on {r_name}".strip()
                                    )

                                steps.append(
                                    RouteStep(
                                        instruction=instruction,
                                        distance_meters=round(float(s.get("distance", 0.0)), 1),
                                        duration_seconds=round(float(s.get("duration", 0.0)), 1),
                                        name=s.get("name") or None,
                                    )
                                )

                            legs.append(
                                RouteLeg(
                                    origin=leg_origin,
                                    destination=leg_dest,
                                    distance_meters=l_dist_m,
                                    distance_km=round(l_dist_m / 1000.0, 1),
                                    duration_seconds=l_dur_s,
                                    duration_minutes=max(2, int(l_dur_s / 60.0)),
                                    steps=steps,
                                    geometry_coordinates=[
                                        [leg_origin.lat, leg_origin.lon],
                                        [leg_dest.lat, leg_dest.lon],
                                    ],
                                    calculation_method=CalculationMethod.ROAD_NETWORK,
                                    warnings=[],
                                )
                            )

                        return DirectionsResponse(
                            provider="osrm",
                            calculation_method=CalculationMethod.ROAD_NETWORK,
                            travel_mode="driving",
                            total_distance_km=total_km,
                            total_duration_minutes=total_mins,
                            legs=legs,
                            all_coordinates=all_lat_lons,
                            google_maps_url=gmaps_url,
                            is_live_traffic=False,
                            warnings=[],
                        )
        except Exception as exc:
            logger.warning(
                "OSRM road routing request failed or timed out: %s. Using terrain fallback.", exc
            )

        # Resilient Fallback to Terrain-Adjusted calculation
        fallback_legs: list[RouteLeg] = []
        fallback_coords: list[list[float]] = []
        cum_km = 0.0
        cum_mins = 0

        for i in range(len(ordered_points) - 1):
            p1 = ordered_points[i]
            p2 = ordered_points[i + 1]
            est = self.terrain_fallback.calculate_route(p1.lat, p1.lon, p2.lat, p2.lon)
            cum_km += est.estimated_road_distance_km
            cum_mins += est.duration_minutes

            fallback_coords.append([p1.lat, p1.lon])
            fallback_legs.append(
                RouteLeg(
                    origin=p1,
                    destination=p2,
                    distance_meters=round(est.estimated_road_distance_km * 1000.0, 1),
                    distance_km=est.estimated_road_distance_km,
                    duration_seconds=est.duration_minutes * 60.0,
                    duration_minutes=est.duration_minutes,
                    steps=[
                        RouteStep(
                            instruction=(
                                f"Travel from {p1.name} towards {p2.name} via state highway"
                            ),
                            distance_meters=est.estimated_road_distance_km * 1000.0,
                            duration_seconds=est.duration_minutes * 60.0,
                        )
                    ],
                    geometry_coordinates=[[p1.lat, p1.lon], [p2.lat, p2.lon]],
                    calculation_method=CalculationMethod.TERRAIN_ADJUSTED,
                    warnings=est.feasibility_warnings,
                )
            )

        fallback_coords.append([ordered_points[-1].lat, ordered_points[-1].lon])

        return DirectionsResponse(
            provider="terrain_fallback",
            calculation_method=CalculationMethod.TERRAIN_ADJUSTED,
            travel_mode="driving",
            total_distance_km=round(cum_km, 1),
            total_duration_minutes=cum_mins,
            legs=fallback_legs,
            all_coordinates=fallback_coords,
            google_maps_url=gmaps_url,
            is_live_traffic=False,
            warnings=[
                "Live road routing network was unreachable; road distance and durations estimated "
                "using terrain-adjusted topographic calculations."
            ],
        )


_global_road_routing_service: RoadRoutingService | None = None


def get_road_routing_service() -> RoadRoutingService:
    global _global_road_routing_service
    if _global_road_routing_service is None:
        _global_road_routing_service = RoadRoutingService()
    return _global_road_routing_service
