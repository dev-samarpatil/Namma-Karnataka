"""Destination repository layer for Namma Karnataka.

Provides an injectable repository interface with an InMemory implementation
(backed by validated seed data for deterministic offline/test execution)
and a Supabase PostgREST implementation for live environments.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Protocol

import httpx

from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger
from app.schemas.destinations import (
    Coordinates,
    DestinationFilterParams,
    DestinationRead,
    DistrictSummary,
)

logger = get_logger("app.repositories.destinations")


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the geodesic (great-circle) distance in meters between two coordinates.

    Note: This is straight-line ellipsoidal/spherical distance, NOT road distance or driving time.
    """
    earth_radius_m = 6371000.0  # Mean radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_m * c


class DestinationRepository(Protocol):
    """Protocol defining the repository contract for destination reads."""

    def get_by_id(self, destination_id: str) -> DestinationRead | None:
        """Fetch a destination by stable UUID."""
        ...

    def get_by_slug(self, slug: str) -> DestinationRead | None:
        """Fetch a destination by URL-safe slug."""
        ...

    def list_destinations(
        self,
        params: DestinationFilterParams,
        published_only: bool = True,
    ) -> tuple[list[DestinationRead], int]:
        """List destinations with bounded pagination and filtering."""
        ...

    def list_nearby(
        self,
        lat: float,
        lon: float,
        radius_meters: float,
        limit: int = 10,
        published_only: bool = True,
    ) -> list[tuple[DestinationRead, float]]:
        """List destinations within a geodesic radius (meters), ordered by distance."""
        ...


class InMemoryDestinationRepository:
    """In-memory destination repository backed by verified seed datasets.

    Enables hermetic unit testing, offline development, and CI without requiring
    external Supabase credentials or database instances.
    """

    def __init__(
        self,
        destinations_data: list[dict] | None = None,
        districts_data: list[dict] | None = None,
    ) -> None:
        self._destinations: list[DestinationRead] = []
        self._by_id: dict[str, DestinationRead] = {}
        self._by_slug: dict[str, DestinationRead] = {}
        self._districts: dict[str, DistrictSummary] = {}

        if districts_data is not None:
            for dist in districts_data:
                summary = DistrictSummary(
                    code=dist["code"],
                    name_en=dist["name_en"],
                    name_kn=dist["name_kn"],
                )
                self._districts[dist["code"]] = summary
        else:
            self._load_default_districts()

        if destinations_data is not None:
            self._load_records(destinations_data)
        else:
            self._load_default_destinations()

    def _load_default_districts(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent.parent.parent
        path = repo_root / "data" / "seed" / "districts.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            for d in data:
                self._districts[d["code"]] = DistrictSummary(
                    code=d["code"],
                    name_en=d["name_en"],
                    name_kn=d["name_kn"],
                )

    def _load_default_destinations(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent.parent.parent
        path = repo_root / "data" / "seed" / "destinations.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            self._load_records(data)

    def _load_records(self, data: list[dict]) -> None:
        for item in data:
            dest_copy = dict(item)
            # Reconstruct coordinates if present as numeric
            if "latitude" in dest_copy and "longitude" in dest_copy:
                lat = dest_copy.pop("latitude", None)
                lon = dest_copy.pop("longitude", None)
                if lat is not None and lon is not None:
                    dest_copy["coordinates"] = {"lat": lat, "lon": lon}

            dist_code = dest_copy.get("district_code")
            if dist_code and dist_code in self._districts:
                dest_copy["district"] = self._districts[dist_code]

            record = DestinationRead.model_validate(dest_copy)
            self._destinations.append(record)
            self._by_id[record.id] = record
            self._by_slug[record.slug] = record

    def get_by_id(self, destination_id: str) -> DestinationRead | None:
        return self._by_id.get(destination_id)

    def get_by_slug(self, slug: str) -> DestinationRead | None:
        return self._by_slug.get(slug)

    def list_destinations(
        self,
        params: DestinationFilterParams,
        published_only: bool = True,
    ) -> tuple[list[DestinationRead], int]:
        filtered: list[DestinationRead] = []

        for dest in self._destinations:
            if not dest.active:
                continue

            if published_only and dest.content_status != "published":
                continue

            if params.district and dest.district_code != params.district:
                continue

            if params.category and dest.category != params.category:
                continue

            if params.is_offbeat is not None and dest.is_offbeat != params.is_offbeat:
                continue

            if params.q:
                query = params.q.lower()
                matches_slug = query in dest.slug.lower()
                matches_trans = any(
                    (query in t.name.lower() or (t.summary and query in t.summary.lower()))
                    for t in dest.translations
                )
                if not (matches_slug or matches_trans):
                    continue

            filtered.append(dest)

        # Deterministic sorting: by slug ascending, then id
        filtered.sort(key=lambda d: (d.slug, d.id))

        total = len(filtered)
        start = params.offset
        end = start + params.limit
        paginated = filtered[start:end]

        return paginated, total

    def list_nearby(
        self,
        lat: float,
        lon: float,
        radius_meters: float,
        limit: int = 10,
        published_only: bool = True,
    ) -> list[tuple[DestinationRead, float]]:
        nearby: list[tuple[DestinationRead, float]] = []

        for dest in self._destinations:
            if not dest.active or dest.coordinates is None:
                continue

            if published_only and dest.content_status != "published":
                continue

            dist = haversine_distance_meters(
                lat, lon, dest.coordinates.lat, dest.coordinates.lon
            )
            if dist <= radius_meters:
                nearby.append((dest, dist))

        # Order by distance ascending, then slug
        nearby.sort(key=lambda item: (item[1], item[0].slug))
        return nearby[:limit]


class SupabaseDestinationRepository:
    """PostgREST-based repository connecting securely to Supabase.

    Uses parameterized HTTP queries with the server-side service role key,
    safely handling errors without leaking connection details or tracebacks.
    """

    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        clean_url = supabase_url.rstrip("/")
        if clean_url.endswith("/rest/v1"):
            clean_url = clean_url[: -len("/rest/v1")]
        self._base_url = clean_url
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        self._fallback_repo = InMemoryDestinationRepository()

    def get_by_id(self, destination_id: str) -> DestinationRead | None:
        try:
            with httpx.Client(timeout=10.0) as client:
                select_fields = (
                    "*,destination_translations(*),destination_sources(*),districts(*)"
                )
                res = client.get(
                    f"{self._base_url}/rest/v1/destinations",
                    headers=self._headers,
                    params={
                        "id": f"eq.{destination_id}",
                        "select": select_fields,
                    },
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    logger.warning(
                        "Supabase table 'destinations' not yet migrated; using in-memory dataset."
                    )
                    return self._fallback_repo.get_by_id(destination_id)
                if res.status_code != 200:
                    raise AppError(
                        code="DATABASE_ERROR",
                        message="Failed to query destination by ID",
                        status_code=502,
                    )
                rows = res.json()
                if not rows:
                    return None
                return self._map_row(rows[0])
        except httpx.RequestError as exc:
            raise AppError(
                code="PERSISTENCE_UNAVAILABLE",
                message="Destination database is temporarily unreachable",
                status_code=503,
            ) from exc

    def get_by_slug(self, slug: str) -> DestinationRead | None:
        try:
            with httpx.Client(timeout=10.0) as client:
                select_fields = (
                    "*,destination_translations(*),destination_sources(*),districts(*)"
                )
                res = client.get(
                    f"{self._base_url}/rest/v1/destinations",
                    headers=self._headers,
                    params={
                        "slug": f"eq.{slug}",
                        "select": select_fields,
                    },
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    logger.warning(
                        "Supabase table 'destinations' not yet migrated; using in-memory dataset."
                    )
                    return self._fallback_repo.get_by_slug(slug)
                if res.status_code != 200:
                    raise AppError(
                        code="DATABASE_ERROR",
                        message="Failed to query destination by slug",
                        status_code=502,
                    )
                rows = res.json()
                if not rows:
                    return None
                return self._map_row(rows[0])
        except httpx.RequestError as exc:
            raise AppError(
                code="PERSISTENCE_UNAVAILABLE",
                message="Destination database is temporarily unreachable",
                status_code=503,
            ) from exc

    def list_destinations(
        self,
        params: DestinationFilterParams,
        published_only: bool = True,
    ) -> tuple[list[DestinationRead], int]:
        try:
            query_params: dict[str, str] = {
                "select": "*,destination_translations(*),destination_sources(*),districts(*)",
                "order": "slug.asc,id.asc",
                "limit": str(params.limit),
                "offset": str(params.offset),
                "active": "eq.true",
            }
            if published_only:
                query_params["content_status"] = "eq.published"
            if params.district:
                query_params["district_code"] = f"eq.{params.district}"
            if params.category:
                query_params["category"] = f"eq.{params.category}"
            if params.is_offbeat is not None:
                query_params["is_offbeat"] = f"eq.{str(params.is_offbeat).lower()}"

            headers = {**self._headers, "Prefer": "count=exact"}

            with httpx.Client(timeout=10.0) as client:
                res = client.get(
                    f"{self._base_url}/rest/v1/destinations",
                    headers=headers,
                    params=query_params,
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    logger.warning(
                        "Supabase table 'destinations' not yet migrated; using in-memory dataset."
                    )
                    return self._fallback_repo.list_destinations(params, published_only)

                if res.status_code not in (200, 206):
                    raise AppError(
                        code="DATABASE_ERROR",
                        message="Failed to fetch destination collection",
                        status_code=502,
                    )

                total = 0
                content_range = res.headers.get("Content-Range")
                if content_range and "/" in content_range:
                    total_str = content_range.split("/")[1]
                    if total_str.isdigit():
                        total = int(total_str)

                rows = res.json()
                items = [self._map_row(r) for r in rows]
                return items, (total or len(items))
        except httpx.RequestError as exc:
            raise AppError(
                code="PERSISTENCE_UNAVAILABLE",
                message="Destination database is temporarily unreachable",
                status_code=503,
            ) from exc

    def list_nearby(
        self,
        lat: float,
        lon: float,
        radius_meters: float,
        limit: int = 10,
        published_only: bool = True,
    ) -> list[tuple[DestinationRead, float]]:
        # PostGIS RPC call or client-side calculation on bounding box
        params = DestinationFilterParams(limit=100, offset=0)
        items, _ = self.list_destinations(params, published_only=published_only)
        nearby: list[tuple[DestinationRead, float]] = []
        for dest in items:
            if dest.coordinates:
                dist = haversine_distance_meters(
                    lat, lon, dest.coordinates.lat, dest.coordinates.lon
                )
                if dist <= radius_meters:
                    nearby.append((dest, dist))
        nearby.sort(key=lambda x: (x[1], x[0].slug))
        return nearby[:limit]

    def _map_row(self, row: dict) -> DestinationRead:
        row_copy = dict(row)
        lat = row_copy.pop("latitude", None)
        lon = row_copy.pop("longitude", None)
        if lat is not None and lon is not None:
            row_copy["coordinates"] = Coordinates(lat=float(lat), lon=float(lon))

        raw_translations = row_copy.pop("destination_translations", []) or []
        row_copy["translations"] = raw_translations

        raw_sources = row_copy.pop("destination_sources", []) or []
        row_copy["sources"] = raw_sources

        district_data = row_copy.pop("districts", None)
        if district_data and isinstance(district_data, dict):
            row_copy["district"] = DistrictSummary(
                code=district_data["code"],
                name_en=district_data["name_en"],
                name_kn=district_data["name_kn"],
            )

        return DestinationRead.model_validate(row_copy)


# Central Repository Singleton / Dependency Factory
_repository_instance: DestinationRepository | None = None


def get_destination_repository() -> DestinationRepository:
    """Return the configured DestinationRepository instance.

    Uses Supabase if valid credentials are configured; otherwise uses
    the verified in-memory dataset.
    """
    global _repository_instance
    if _repository_instance is None:
        if (
            settings.SUPABASE_URL
            and settings.SUPABASE_SERVICE_ROLE_KEY
            and not settings.SUPABASE_URL.startswith("placeholder")
        ):
            _repository_instance = SupabaseDestinationRepository(
                supabase_url=settings.SUPABASE_URL,
                service_role_key=settings.SUPABASE_SERVICE_ROLE_KEY,
            )
        else:
            _repository_instance = InMemoryDestinationRepository()
    return _repository_instance
