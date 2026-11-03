"""Global Destination Uniqueness and Canonical Identity Engine.

Enforces trip-wide destination uniqueness across multi-day itineraries:
1. Normalizes destination identities across UUIDs, slugs, aliases, and provider prefixes.
2. Detects physical destination duplicates via geodesic coordinate proximity (<= 500m).
3. Provides canonical deduplication and validation for initial generation, day regeneration,
   stop alternative discovery, manual destination addition, and recalculation.
"""

from __future__ import annotations

import math
import re
from collections.abc import Sequence
from typing import Any

from app.core.logging import get_logger
from app.repositories.destinations import get_destination_repository
from app.schemas.destinations import Coordinates, DestinationFilterParams, DestinationRead
from app.schemas.planning import (
    DayPlan,
    PlanningRecommendationResponse,
    PlanningRequest,
    StopType,
)

logger = get_logger("app.services.destination_uniqueness")

# Known canonical mappings across legacy UUIDs, provider-prefixed IDs, and spelling variants
GLOBAL_CANONICAL_ID_MAPPINGS: dict[str, str] = {
    # Mysore Palace variants
    "kstdc-mysore-palace": "11111111-1111-4111-8111-111111111101",
    "mysore-palace-official": "11111111-1111-4111-8111-111111111101",
    "mysore-palace": "11111111-1111-4111-8111-111111111101",
    "mysuru-palace": "11111111-1111-4111-8111-111111111101",
    "amba-vilas-palace": "11111111-1111-4111-8111-111111111101",
    # Chamundi Hills variants
    "kstdc-chamundi-hills": "11111111-1111-4111-8111-111111111115",
    "chamundi-hills-official": "11111111-1111-4111-8111-111111111115",
    "chamundi-hill-temple": "11111111-1111-4111-8111-111111111115",
    "chamundeshwari-temple": "11111111-1111-4111-8111-111111111115",
    # Jog Falls variants
    "kstdc-jog-falls": "11111111-1111-4111-8111-111111111118",
    "jog-falls-official": "11111111-1111-4111-8111-111111111118",
    "jog-falls": "11111111-1111-4111-8111-111111111118",
    "gerusoppa-falls": "11111111-1111-4111-8111-111111111118",
    # Pattadakal variants
    "asi-pattadakal-group": "11111111-1111-4111-8111-111111111105",
    "pattadakal-group": "11111111-1111-4111-8111-111111111105",
    "pattadakal-monuments": "11111111-1111-4111-8111-111111111105",
    # Aihole variants
    "asi-aihole-durga-complex": "11111111-1111-4111-8111-111111111117",
    "aihole-durga-complex": "11111111-1111-4111-8111-111111111117",
    "aihole-temple-complex": "11111111-1111-4111-8111-111111111117",
    # Chitradurga Fort variants
    "asi-chitradurga-fort": "11111111-1111-4111-8111-111111111119",
    "chitradurga-fort-official": "11111111-1111-4111-8111-111111111119",
    "chitradurga-fort": "11111111-1111-4111-8111-111111111119",
    # Mahmud Gawan Madrasa Bidar
    "asi-mahmud-gawan-madrasa-bidar": "11111111-1111-4111-8111-111111111124",
    "mahmud-gawan-madrasa": "11111111-1111-4111-8111-111111111124",
    # Hampi variants
    "hampi": "11111111-1111-4111-8111-111111111102",
    "hampi-monuments": "11111111-1111-4111-8111-111111111102",
    "vijaya-vittala-temple-hampi": "11111111-1111-4111-8111-111111111102",
    # St Philomena's Cathedral
    "st-philomenas-cathedral": "22222222-2222-4222-8222-222222222217",
    "st-philomena-church": "22222222-2222-4222-8222-222222222217",
    # Belagavi Fort
    "belagavi-fort": "11111111-1111-4111-8111-111111111121",
    "belagavi-fort-kamal-basti": "11111111-1111-4111-8111-111111111121",
    "22222222-2222-4222-8222-222222222223": "11111111-1111-4111-8111-111111111121",
    # Murudeshwar
    "murudeshwara-temple-beach": "11111111-1111-4111-8111-111111111134",
    "murudeshwar-temple-beach": "11111111-1111-4111-8111-111111111134",
    "22222222-2222-4222-8222-222222222216": "11111111-1111-4111-8111-111111111134",
    # Kondajji Lake
    "kondajji-lake-nature-sanctuary": "kondajji-lake",
}

GLOBAL_CANONICAL_SLUG_MAPPINGS: dict[str, str] = {
    "mysore-palace-official": "mysore-palace",
    "chamundi-hills-official": "chamundi-hill-temple",
    "jog-falls-official": "jog-falls",
    "pattadakal-group": "pattadakal-monuments",
    "aihole-durga-complex": "aihole-temple-complex",
    "chitradurga-fort-official": "chitradurga-fort",
    "mahmud-gawan-madrasa-official": "mahmud-gawan-madrasa",
    "hampi": "vijaya-vittala-temple-hampi",
    "hampi-monuments": "vijaya-vittala-temple-hampi",
    "belagavi-fort": "belagavi-fort-kamal-basti",
    "murudeshwara-temple-beach": "murudeshwar-temple-beach",
    "kondajji-lake-nature-sanctuary": "kondajji-lake",
}


def _haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geodesic distance between two points in meters."""
    r = 6371000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def normalize_destination_name(name: str | None) -> str:
    """Normalize destination names to detect semantic aliases across languages and notations."""
    if not name:
        return ""
    text = name.lower()
    # Strip parenthetical annotations: e.g. "Mysuru Palace (Amba Vilas)" -> "Mysuru Palace"
    text = re.sub(r"\(.*?\)", "", text)
    # Replace common Kannada/English transliteration alternates
    text = text.replace("mysuru", "mysore").replace("bengaluru", "bangalore")
    text = text.replace("belagavi", "belgaum").replace("kalaburagi", "gulbarga")
    text = text.replace("shivamogga", "shimoga").replace("vijayapura", "bijapur")
    text = text.replace("chikkamagaluru", "chikmagalur").replace("dharwad", "hubli")
    # Strip common suffixes that don't distinguish physical attraction
    text = re.sub(
        r"\b(palace|temple|fort|lake|falls|cathedral|church|sanctuary|beach|hills|hill|complex|group|monuments|monument)\b",
        "",
        text,
    )
    # Remove non-alphanumeric characters
    cleaned = re.sub(r"[^a-z0-9]", "", text).strip()
    return cleaned if len(cleaned) >= 3 else re.sub(r"[^a-z0-9]", "", name.lower())


def get_canonical_destination_id(
    identifier: str | None,
    name: str | None = None,
    coordinates: Coordinates | tuple[float, float] | None = None,
    district_code: str | None = None,
) -> str:
    """Authoritatively resolve any destination reference to its canonical identity.

    Cross-references:
    1. Direct static canonical ID and slug maps.
    2. Curated repository records by ID, slug, and aliases.
    3. Geodesic coordinate proximity (<= 500m to known catalog landmark).
    4. Normalized name stem matching.
    """
    raw_key = (identifier or "").strip().lower()
    if raw_key in GLOBAL_CANONICAL_ID_MAPPINGS:
        return GLOBAL_CANONICAL_ID_MAPPINGS[raw_key]
    if raw_key in GLOBAL_CANONICAL_SLUG_MAPPINGS:
        canonical_slug = GLOBAL_CANONICAL_SLUG_MAPPINGS[raw_key]
        if canonical_slug in GLOBAL_CANONICAL_ID_MAPPINGS:
            return GLOBAL_CANONICAL_ID_MAPPINGS[canonical_slug]

    repo = get_destination_repository()
    # Query repository directly if identifier matches an existing record
    if raw_key:
        dest = repo.get_by_id(raw_key) or repo.get_by_slug(raw_key)
        if dest:
            return dest.id

    # Check geodesic coordinate proximity to catalog destinations (<= 500 meters)
    lat: float | None = None
    lon: float | None = None
    if coordinates:
        if isinstance(coordinates, tuple) and len(coordinates) == 2:
            lat, lon = coordinates[0], coordinates[1]
        elif hasattr(coordinates, "lat") and hasattr(coordinates, "lon"):
            lat, lon = coordinates.lat, coordinates.lon

    if lat is not None and lon is not None:
        all_dests, _ = repo.list_destinations(
            DestinationFilterParams(limit=100, offset=0), published_only=False
        )
        for cand in all_dests:
            if cand.coordinates:
                dist_m = _haversine_distance_m(lat, lon, cand.coordinates.lat, cand.coordinates.lon)
                if dist_m <= 500.0:
                    return cand.id

    # Fallback to normalized name matching if name supplied
    norm_name = normalize_destination_name(name)
    if norm_name and len(norm_name) >= 4:
        all_dests, _ = repo.list_destinations(
            DestinationFilterParams(limit=100, offset=0), published_only=False
        )
        for cand in all_dests:
            cand_norm = normalize_destination_name(cand.name_en)
            if cand_norm and (norm_name == cand_norm or norm_name in cand_norm or cand_norm in norm_name):
                if not district_code or cand.district_code == district_code:
                    return cand.id

    # If completely unresolved, return raw identifier or normalized name
    return raw_key or norm_name or "unknown"


def are_same_destination(
    dest_a: Any,
    dest_b: Any,
) -> bool:
    """Return True if two destination objects or stop representations refer to the same attraction."""
    if dest_a is dest_b:
        return True

    id_a = getattr(dest_a, "destination_id", None) or getattr(dest_a, "id", None) or getattr(dest_a, "slug", None)
    id_b = getattr(dest_b, "destination_id", None) or getattr(dest_b, "id", None) or getattr(dest_b, "slug", None)

    name_a = getattr(dest_a, "name", None) or getattr(dest_a, "name_en", None)
    name_b = getattr(dest_b, "name", None) or getattr(dest_b, "name_en", None)

    coords_a = getattr(dest_a, "coordinates", None)
    coords_b = getattr(dest_b, "coordinates", None)

    dist_a = getattr(dest_a, "district_code", None)
    dist_b = getattr(dest_b, "district_code", None)

    canon_a = get_canonical_destination_id(id_a, name=name_a, coordinates=coords_a, district_code=dist_a)
    canon_b = get_canonical_destination_id(id_b, name=name_b, coordinates=coords_b, district_code=dist_b)

    if canon_a and canon_b and canon_a != "unknown" and canon_a == canon_b:
        return True

    # Coordinate comparison (<= 500m)
    if coords_a and coords_b:
        dist_m = _haversine_distance_m(coords_a.lat, coords_a.lon, coords_b.lat, coords_b.lon)
        if dist_m <= 500.0:
            return True

    return False


def validate_trip_destination_uniqueness(
    itinerary: PlanningRecommendationResponse | list[DayPlan] | DayPlan | Any,
    repair: bool = True,
    request: PlanningRequest | None = None,
) -> tuple[bool, list[str], Any]:
    """Validate global destination uniqueness across the entire multi-day itinerary.

    Returns: (is_valid, validation_errors, repaired_itinerary)
    
    Checks:
    1. Destination IDs appearing on more than one day.
    2. Multiple stops on the same day referring to the same destination.
    3. Alias and canonical destination deduplication.
    4. Geodesic duplicate detection (<= 500m).
    
    If repair=True and duplicates are detected:
    - Retains the FIRST scheduled visit to the attraction in the trip.
    - Removes subsequent duplicate visits.
    - Deterministically reschedules the itinerary and recalculates budget.
    """
    validation_errors: list[str] = []

    # Extract days list
    if isinstance(itinerary, PlanningRecommendationResponse):
        days = list(itinerary.days or [])
    elif isinstance(itinerary, list):
        days = list(itinerary)
    elif isinstance(itinerary, DayPlan):
        days = [itinerary]
    elif hasattr(itinerary, "days"):
        days = list(getattr(itinerary, "days", []))
    else:
        return True, [], itinerary

    if not days:
        return True, [], itinerary

    seen_canon_stops: dict[str, tuple[int, str]] = {}  # canon_id -> (day_num, stop_name)
    duplicate_stop_ids: set[str] = set()

    for day in days:
        day_num = getattr(day, "day_number", 1)
        for stop in getattr(day, "stops", []):
            if stop.stop_type not in (StopType.ATTRACTION, StopType.ACTIVITY):
                continue

            stop_name = stop.name or "Attraction"
            canon_id = get_canonical_destination_id(
                identifier=stop.destination_id or getattr(stop, "slug", None) or stop.stop_id,
                name=stop_name,
                coordinates=stop.coordinates,
            )

            if canon_id in seen_canon_stops:
                orig_day, orig_name = seen_canon_stops[canon_id]
                error_msg = (
                    f"Destination '{stop_name}' (canonical ID: {canon_id}) on Day {day_num} "
                    f"is a duplicate of '{orig_name}' already scheduled on Day {orig_day}."
                )
                validation_errors.append(error_msg)
                duplicate_stop_ids.add(stop.stop_id)
            else:
                seen_canon_stops[canon_id] = (day_num, stop_name)

    is_valid = len(validation_errors) == 0

    if is_valid or not repair:
        return is_valid, validation_errors, itinerary

    # Repair: Purge duplicate stops from the itinerary and reschedule
    logger.warning(
        "Repairing itinerary with %d duplicate attraction stops: %s",
        len(duplicate_stop_ids),
        validation_errors,
    )

    repaired_days: list[DayPlan] = []
    for day in days:
        kept_stops = [s for s in day.stops if s.stop_id not in duplicate_stop_ids]
        repaired_days.append(
            day.model_copy(update={"stops": kept_stops})
            if hasattr(day, "model_copy")
            else DayPlan(
                day_number=day.day_number,
                date=day.date,
                theme=day.theme,
                stops=kept_stops,
            )
        )

    # Reschedule using DeterministicScheduler if request available
    from app.services.budget import BudgetCalculator
    from app.services.scheduler import DeterministicScheduler

    req = request or PlanningRequest(
        origin_label="Bengaluru",
        duration_days=len(repaired_days),
        pace="balanced",
    )

    rescheduled_days, items, warnings = DeterministicScheduler.reschedule_itinerary(
        req, repaired_days
    )
    budget = BudgetCalculator.calculate_budget(req, rescheduled_days, items)

    if isinstance(itinerary, PlanningRecommendationResponse):
        repaired_response = itinerary.model_copy(
            update={
                "days": rescheduled_days,
                "items": items,
                "total_destinations": len(items),
                "budget_breakdown": budget,
                "warnings": list(set(itinerary.warnings + warnings + [
                    "Duplicate destination visits were automatically consolidated to preserve itinerary variety."
                ])),
            }
        )
        return False, validation_errors, repaired_response

    return False, validation_errors, rescheduled_days


def filter_candidate_pool_for_uniqueness(
    candidates: Sequence[DestinationRead],
    existing_destinations: Sequence[Any],
) -> list[DestinationRead]:
    """Filter candidate destinations to strictly exclude any attraction already in existing_destinations."""
    used_canonical_ids: set[str] = set()
    used_coordinates: list[tuple[float, float]] = []

    for item in existing_destinations:
        ident = getattr(item, "destination_id", None) or getattr(item, "id", None) or getattr(item, "slug", None)
        name = getattr(item, "name", None) or getattr(item, "name_en", None)
        coords = getattr(item, "coordinates", None)
        district = getattr(item, "district_code", None)

        canon = get_canonical_destination_id(ident, name=name, coordinates=coords, district_code=district)
        if canon:
            used_canonical_ids.add(canon)
        if coords:
            used_coordinates.append((coords.lat, coords.lon))

    unique_candidates: list[DestinationRead] = []
    seen_in_batch: set[str] = set()

    for cand in candidates:
        cand_canon = get_canonical_destination_id(
            cand.id,
            name=cand.name_en,
            coordinates=cand.coordinates,
            district_code=cand.district_code,
        )
        if cand_canon in used_canonical_ids or cand_canon in seen_in_batch:
            continue

        # Proximity check (<= 500m)
        if cand.coordinates:
            too_close = False
            for lat, lon in used_coordinates:
                if _haversine_distance_m(cand.coordinates.lat, cand.coordinates.lon, lat, lon) <= 500.0:
                    too_close = True
                    break
            if too_close:
                continue

        seen_in_batch.add(cand_canon)
        unique_candidates.append(cand)

    return unique_candidates
