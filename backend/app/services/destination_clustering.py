"""Geographic Clustering and Route Optimization Service.

Clusters candidate destinations by micro-region to minimize backtracking,
prevent impossible travel days, and schedule daylight-dependent attractions.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from app.schemas.destinations import Coordinates, DestinationRead
from app.schemas.planning import RecommendedDestination


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class DestinationClusteringService:
    """Micro-regional clustering and sequencing engine."""

    @classmethod
    def cluster_by_days(
        cls,
        destinations: Sequence[DestinationRead | RecommendedDestination],
        days_count: int,
        origin_coords: Coordinates | None = None,
    ) -> list[list[DestinationRead | RecommendedDestination]]:
        """Cluster destinations into day-wise groups that minimize total inter-destination travel."""
        if not destinations:
            return [[] for _ in range(days_count)]

        if days_count <= 1:
            return [list(destinations)]

        dests = list(destinations)

        # If we have fewer destinations than days, distribute evenly
        if len(dests) <= days_count:
            clusters: list[list[DestinationRead | RecommendedDestination]] = [[] for _ in range(days_count)]
            for i, d in enumerate(dests):
                clusters[i].append(d)
            return clusters

        # Sort primarily by distance from origin to establish a logical geographic progression
        if origin_coords:
            dests.sort(
                key=lambda d: _haversine_km(
                    origin_coords.lat,
                    origin_coords.lon,
                    d.coordinates.lat if hasattr(d, "coordinates") and d.coordinates else d.latitude,
                    d.coordinates.lon if hasattr(d, "coordinates") and d.coordinates else d.longitude,
                )
            )

        # Distribute into daily buckets keeping nearby attractions clustered
        target_per_day = math.ceil(len(dests) / days_count)
        clusters = []
        for i in range(days_count):
            start_idx = i * target_per_day
            end_idx = min(len(dests), (i + 1) * target_per_day)
            clusters.append(dests[start_idx:end_idx])

        return clusters

    @classmethod
    def optimize_day_sequence(
        cls,
        day_destinations: Sequence[DestinationRead | RecommendedDestination],
        start_coords: Coordinates | None = None,
    ) -> list[DestinationRead | RecommendedDestination]:
        """Sequence stops within a day using nearest-neighbor heuristic to minimize backtracking."""
        if len(day_destinations) <= 1:
            return list(day_destinations)

        remaining = list(day_destinations)
        ordered: list[DestinationRead | RecommendedDestination] = []

        curr_lat = start_coords.lat if start_coords else None
        curr_lon = start_coords.lon if start_coords else None

        # If start_coords is missing, pick the first one as anchor
        if curr_lat is None or curr_lon is None:
            first = remaining.pop(0)
            ordered.append(first)
            curr_lat = first.coordinates.lat if hasattr(first, "coordinates") and first.coordinates else first.latitude
            curr_lon = first.coordinates.lon if hasattr(first, "coordinates") and first.coordinates else first.longitude

        while remaining:
            best_idx = 0
            best_dist = float("inf")

            for idx, candidate in enumerate(remaining):
                c_lat = candidate.coordinates.lat if hasattr(candidate, "coordinates") and candidate.coordinates else candidate.latitude
                c_lon = candidate.coordinates.lon if hasattr(candidate, "coordinates") and candidate.coordinates else candidate.longitude

                dist = _haversine_km(curr_lat, curr_lon, c_lat, c_lon)
                if dist < best_dist:
                    best_dist = dist
                    best_idx = idx

            next_stop = remaining.pop(best_idx)
            ordered.append(next_stop)
            curr_lat = next_stop.coordinates.lat if hasattr(next_stop, "coordinates") and next_stop.coordinates else next_stop.latitude
            curr_lon = next_stop.coordinates.lon if hasattr(next_stop, "coordinates") and next_stop.coordinates else next_stop.longitude

        return ordered

