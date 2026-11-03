"""Comprehensive Test Suite for Destination Uniqueness and Canonical Identity Engine.

Tests:
- Test A: Multi-day trip uniqueness (no attraction appears on multiple days).
- Test B: Day regeneration strictly excludes attractions present on other days.
- Test C: Canonical alias and geodesic coordinate proximity deduplication.
- Test D: validate_trip_destination_uniqueness detection and automatic deterministic repair.
- Test E: Sparse catalogue honest handling (no duplicates or fabricated stops when candidates run out).
- Test F: Filter candidate pool for uniqueness and proximity.
"""

from __future__ import annotations

import pytest

from app.repositories.destinations import get_destination_repository
from app.schemas.destinations import Coordinates, DestinationFilterParams
from app.schemas.planning import (
    DayPlan,
    ItineraryStop,
    PlanningRecommendationResponse,
    PlanningRequest,
    StopType,
)
from app.services.ai.orchestrator import AIOrchestrator
from app.services.destination_uniqueness import (
    _haversine_distance_m,
    are_same_destination,
    filter_candidate_pool_for_uniqueness,
    get_canonical_destination_id,
    validate_trip_destination_uniqueness,
)
from app.services.routing.optimizer import RouteOptimizer
from app.services.scheduler import DeterministicScheduler


def test_canonical_alias_and_proximity_deduplication():
    """Test C: Canonical alias resolution and geodesic proximity (<500m)."""
    # 1. Alias ID mappings
    mysore_canon = "11111111-1111-4111-8111-111111111101"
    assert get_canonical_destination_id("kstdc-mysore-palace") == mysore_canon
    assert get_canonical_destination_id("mysore-palace-official") == mysore_canon
    assert get_canonical_destination_id("mysore-palace") == mysore_canon

    # 2. Geodesic proximity matching: Coordinates 120m away from Mysore Palace (12.3051, 76.6551)
    dist = _haversine_distance_m(12.3051, 76.6551, 12.3055, 76.6560)
    assert dist <= 500.0
    resolved_by_coords = get_canonical_destination_id(
        "random-unregistered-id",
        name="Amba Vilas Grand Palace",
        coordinates=(12.3055, 76.6560),
    )
    assert resolved_by_coords == mysore_canon

    # 3. are_same_destination helper
    stop1 = ItineraryStop(
        stop_id="s1",
        destination_id="kstdc-mysore-palace",
        stop_type=StopType.ATTRACTION,
        name="Mysore Palace (Amba Vilas)",
        coordinates=Coordinates(lat=12.3051, lon=76.6551),
        start_time="09:30",
        end_time="11:00",
        duration_minutes=90,
    )
    stop2 = ItineraryStop(
        stop_id="s2",
        destination_id=mysore_canon,
        stop_type=StopType.ATTRACTION,
        name="Mysuru Palace",
        coordinates=Coordinates(lat=12.3051, lon=76.6551),
        start_time="09:30",
        end_time="11:00",
        duration_minutes=90,
    )
    assert are_same_destination(stop1, stop2) is True


def test_validate_and_repair_trip_destination_uniqueness():
    """Test D: validate_trip_destination_uniqueness detects duplicates and repairs."""
    # Build a simulated 3-day itinerary with Mysore Palace on Day 1 AND Day 3
    day1 = DayPlan(
        day_number=1,
        theme="Mysuru Heritage",
        stops=[
            ItineraryStop(
                stop_id="s-d1-1",
                destination_id="11111111-1111-4111-8111-111111111101",
                stop_type=StopType.ATTRACTION,
                name="Mysuru Palace",
                coordinates=Coordinates(lat=12.3051, lon=76.6551),
                start_time="09:30",
                end_time="11:00",
                duration_minutes=90,
            ),
            ItineraryStop(
                stop_id="s-d1-2",
                destination_id="11111111-1111-4111-8111-111111111115",
                stop_type=StopType.ATTRACTION,
                name="Chamundi Hills",
                coordinates=Coordinates(lat=12.2725, lon=76.6710),
                start_time="11:30",
                end_time="13:00",
                duration_minutes=90,
            ),
        ],
    )
    day2 = DayPlan(
        day_number=2,
        theme="Srirangapatna & Mandya",
        stops=[
            ItineraryStop(
                stop_id="s-d2-1",
                destination_id="22222222-2222-4222-8222-222222222204",
                stop_type=StopType.ATTRACTION,
                name="Ranganathaswamy Temple",
                coordinates=Coordinates(lat=12.4230, lon=76.6950),
                start_time="10:00",
                end_time="11:15",
                duration_minutes=75,
            ),
        ],
    )
    day3 = DayPlan(
        day_number=3,
        theme="Mysuru Extensions",
        stops=[
            # Duplicate of Day 1 under provider alias ID
            ItineraryStop(
                stop_id="s-d3-dup",
                destination_id="kstdc-mysore-palace",
                stop_type=StopType.ATTRACTION,
                name="Mysore Palace (Amba Vilas)",
                coordinates=Coordinates(lat=12.3051, lon=76.6551),
                start_time="09:30",
                end_time="11:00",
                duration_minutes=90,
            ),
            ItineraryStop(
                stop_id="s-d3-2",
                destination_id="22222222-2222-4222-8222-222222222217",
                stop_type=StopType.ATTRACTION,
                name="St Philomena's Cathedral",
                coordinates=Coordinates(lat=12.3210, lon=76.6575),
                start_time="11:30",
                end_time="12:30",
                duration_minutes=60,
            ),
        ],
    )

    req = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=3,
        pace="balanced",
    )

    mock_resp = PlanningRecommendationResponse(
        request_id="test-req-1",
        language="en",
        generation_mode="fallback",
        provider_used="test",
        items=[],
        total_destinations=4,
        duration_days=3,
        days=[day1, day2, day3],
        budget_breakdown=None,
        origin_label="Bengaluru",
        corridor_name="Mysuru Heritage Corridor",
        recommended_festivals=[],
        assumptions=[],
        data_limitations=[],
        warnings=[],
    )

    # 1. Validation without repair should report error
    is_valid, errors, _ = validate_trip_destination_uniqueness(mock_resp, repair=False, request=req)
    assert is_valid is False
    assert len(errors) == 1
    assert "Mysore Palace" in errors[0]
    assert "Day 3 is a duplicate" in errors[0]

    # 2. Validation with repair should remove duplicate stop from Day 3
    is_valid, errors, repaired = validate_trip_destination_uniqueness(
        mock_resp, repair=True, request=req
    )
    repaired_d3_attractions = [
        s for s in repaired.days[2].stops if s.stop_type in (StopType.ATTRACTION, StopType.ACTIVITY)
    ]
    repaired_d3_ids = [s.destination_id for s in repaired_d3_attractions]
    assert "kstdc-mysore-palace" not in repaired_d3_ids
    assert len(repaired_d3_attractions) == 1
    assert repaired_d3_attractions[0].destination_id == "22222222-2222-4222-8222-222222222217"


@pytest.mark.asyncio
async def test_multi_day_itinerary_generation_uniqueness():
    """Test A: Generated multi-day itineraries produce 100% unique destinations."""
    orchestrator = AIOrchestrator()
    req = PlanningRequest(
        origin_label="Bengaluru",
        preferred_districts=["MYS", "HSS", "CKM"],
        duration_days=3,
        pace="balanced",
        budget_limit_inr=15000.0,
    )

    result = await orchestrator.recommend_itinerary(req)
    assert result.days is not None
    assert len(result.days) == 3

    # Collect all attraction destination canonical identities across all days
    seen_canons: set[str] = set()
    for day in result.days:
        for stop in day.stops:
            if stop.stop_type not in (StopType.ATTRACTION, StopType.ACTIVITY):
                continue
            canon = get_canonical_destination_id(
                stop.destination_id or getattr(stop, "slug", None) or stop.stop_id,
                name=stop.name,
                coordinates=stop.coordinates,
            )
            assert canon not in seen_canons, (
                f"Duplicate canonical stop '{stop.name}' ({canon}) found on Day {day.day_number}!"
            )
            seen_canons.add(canon)


@pytest.mark.asyncio
async def test_day_regeneration_excludes_other_days():
    """Test B: Regenerating a day strictly excludes all attractions scheduled on other days."""
    orchestrator = AIOrchestrator()
    req = PlanningRequest(
        origin_label="Bengaluru",
        preferred_districts=["MYS", "MND"],
        duration_days=3,
        pace="balanced",
    )
    plan = await orchestrator.recommend_itinerary(req)

    # Collect other days' (Day 1 & Day 2) canonical IDs
    other_day_canons: set[str] = set()
    for d in plan.days:
        if d.day_number != 3:
            for s in d.stops:
                if s.stop_type in (StopType.ATTRACTION, StopType.ACTIVITY):
                    other_day_canons.add(
                        get_canonical_destination_id(
                            s.destination_id, name=s.name, coordinates=s.coordinates
                        )
                    )

    # Regenerate Day 3
    regenerated_day = DeterministicScheduler.regenerate_day(
        request=req,
        current_plan=plan,
        day_number=3,
    )

    # Ensure no regenerated stop on Day 3 matches any stop from Day 1 or Day 2
    for s in regenerated_day.stops:
        if s.stop_type in (StopType.ATTRACTION, StopType.ACTIVITY):
            s_canon = get_canonical_destination_id(
                s.destination_id, name=s.name, coordinates=s.coordinates
            )
            assert s_canon not in other_day_canons, (
                f"Regenerated stop '{s.name}' ({s_canon}) on Day 3 duplicates an attraction from another day!"
            )


def test_sparse_catalogue_honest_handling():
    """Test E: Sparse catalogue does not repeat destinations or hallucinate when unique spots run out."""
    repo = get_destination_repository()
    # Mock small candidate list of only 2 destinations
    dests, _ = repo.list_destinations(
        DestinationFilterParams(limit=10, offset=0), published_only=True
    )
    small_pool = dests[:2]

    req = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=3,  # Needs ~9 stops at balanced pace, but pool only has 2
        pace="balanced",
    )

    scheduled, warnings, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=small_pool,
    )

    # Must only schedule the 2 unique destinations, no repeats
    scheduled_ids = [s.id for s in scheduled]
    assert len(scheduled_ids) == len(set(scheduled_ids))
    assert len(scheduled) <= 2
    # Must have an honest warning about limited unique destinations
    assert any(
        "limited" in w.lower() or "unique" in w.lower() or "repetition" in w.lower()
        for w in warnings
    )


def test_filter_candidate_pool_for_uniqueness():
    """Test F: filter_candidate_pool_for_uniqueness excludes used destinations and proximity neighbors."""
    repo = get_destination_repository()
    dests, _ = repo.list_destinations(
        DestinationFilterParams(limit=100, offset=0), published_only=True
    )

    mysore_dest = next(d for d in dests if "mysore-palace" in d.slug)
    # Filter with Mysore Palace already in existing
    filtered = filter_candidate_pool_for_uniqueness(
        candidates=dests,
        existing_destinations=[mysore_dest],
    )

    filtered_ids = {d.id for d in filtered}
    assert mysore_dest.id not in filtered_ids
    # Also verify no candidate within 500m of Mysore Palace is returned
    for cand in filtered:
        if cand.coordinates and mysore_dest.coordinates:
            dist = _haversine_distance_m(
                cand.coordinates.lat,
                cand.coordinates.lon,
                mysore_dest.coordinates.lat,
                mysore_dest.coordinates.lon,
            )
            assert dist > 500.0
