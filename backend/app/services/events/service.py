"""Service for querying authentic Karnataka festivals and cultural events."""

from __future__ import annotations

import json
import logging
import math
from pathlib import Path

from app.schemas.events import EventRead

logger = logging.getLogger(__name__)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two coordinates in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class EventsService:
    """Provides querying and matching of verified Karnataka cultural events."""

    def __init__(self, seed_path: Path | None = None) -> None:
        if seed_path is None:
            # Check multiple candidate directories (repo root, backend parent, cwd)
            candidates = [
                Path(__file__).resolve().parent.parent.parent.parent.parent
                / "data"
                / "seed"
                / "events.json",
                Path(__file__).resolve().parent.parent.parent.parent
                / "data"
                / "seed"
                / "events.json",
                Path("data/seed/events.json").resolve(),
            ]
            for c in candidates:
                if c.exists():
                    seed_path = c
                    break
            else:
                seed_path = candidates[0]
        self._seed_path = seed_path
        self._events: list[EventRead] = []
        self._load_events()

    def _load_events(self) -> None:
        if not self._seed_path.exists():
            logger.warning("Events seed file not found at %s", self._seed_path)
            return

        try:
            with open(self._seed_path, encoding="utf-8") as f:
                data = json.load(f)
                raw_events = data.get("events", [])
                self._events = [EventRead(**e) for e in raw_events]
                logger.info("Loaded %d verified Karnataka events", len(self._events))
        except Exception as exc:
            logger.error("Failed to load events from %s: %s", self._seed_path, exc)
            self._events = []

    def get_all_events(self) -> list[EventRead]:
        """Return all verified cultural events."""
        return list(self._events)

    def get_events_for_districts(
        self,
        district_codes: list[str],
        month: int | None = None,
    ) -> list[EventRead]:
        """Filter events by district and optional month."""
        results: list[EventRead] = []
        for e in self._events:
            if district_codes and e.district_code not in district_codes:
                continue
            if month is not None:
                # Handle single-month and spanning-month events (e.g. Nov-March or Dec-Jan)
                if e.start_month <= e.end_month:
                    if not (e.start_month <= month <= e.end_month):
                        continue
                else:  # Spanning year-end e.g. 11 to 2
                    if not (month >= e.start_month or month <= e.end_month):
                        continue
            results.append(e)
        return results

    def get_events_near(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 60.0,
        month: int | None = None,
    ) -> list[EventRead]:
        """Discover verified cultural events near geographic coordinates."""
        matches: list[tuple[float, EventRead]] = []
        for e in self._events:
            if month is not None:
                if e.start_month <= e.end_month:
                    if not (e.start_month <= month <= e.end_month):
                        continue
                else:
                    if not (month >= e.start_month or month <= e.end_month):
                        continue

            dist = haversine_km(latitude, longitude, e.latitude, e.longitude)
            if dist <= radius_km:
                matches.append((dist, e))

        matches.sort(key=lambda x: x[0])
        return [m[1] for m in matches]


_global_events_service: EventsService | None = None


def get_events_service() -> EventsService:
    """Singleton accessor for EventsService."""
    global _global_events_service
    if _global_events_service is None:
        _global_events_service = EventsService()
    return _global_events_service
