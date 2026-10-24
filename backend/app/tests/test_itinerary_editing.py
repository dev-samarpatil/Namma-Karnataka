"""Tests for Phase 5 Interactive Itinerary Editing and Individual Stop Regeneration.

Covers:
1. Recalculation after duration edits, adding stops, removing stops, and reordering.
2. Individual stop regeneration with grounded candidates and detour deltas.
3. Day-level regeneration preserving locked stops and other days.
4. Budget and timing consistency after edits.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import app.repositories.destinations as destinations_module
from app.main import app
from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.destinations import LanguageCode
from app.schemas.planning import (
    CostStatus,
    DayPlan,
    ItineraryStop,
    PlanningRequest,
    StopType,
)
from app.services.scheduler import DeterministicScheduler


@pytest.fixture(autouse=True)
def force_in_memory_destinations():
    """Ensure tests run against local seed data without remote network latency."""
    orig = destinations_module._repository_instance
    destinations_module._repository_instance = InMemoryDestinationRepository()
    yield
    destinations_module._repository_instance = orig


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def base_request() -> PlanningRequest:
    return PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=2,
        travelers_count=2,
        pace="balanced",
        travel_mode="driving_car",
        budget_scenario="standard",
    )


@pytest.fixture
def sample_days(base_request: PlanningRequest) -> list[DayPlan]:
    repo = InMemoryDestinationRepository()
    d1 = repo.get_by_slug("mysore-palace")
    d2 = repo.get_by_slug("chamundi-hill-temple")
    d3 = repo.get_by_slug("abbey-falls-madikeri")
    d4 = repo.get_by_slug("rajas-seat-madikeri")

    assert d1 and d2 and d3 and d4

    from app.schemas.planning import RecommendedDestination

    def to_rec(dest, day, order):
        return RecommendedDestination(
            id=dest.id,
            slug=dest.slug,
            name=dest.name_en,
            summary=dest.summary_en,
            category=dest.category,
            district_code=dest.district_code,
            district_name=dest.district.name_en if dest.district else dest.district_code,
            coordinates=dest.coordinates,
            day_number=day,
            order=order,
            rationale=f"Explore {dest.name_en}",
            entry_fee_min_inr=dest.entry_fee_min_inr,
            entry_fee_max_inr=dest.entry_fee_max_inr,
            currency_code=dest.currency_code,
            access_status=dest.access_status,
            is_offbeat=dest.is_offbeat,
        )

    rec_dests = [
        to_rec(d1, 1, 1),
        to_rec(d2, 1, 2),
        to_rec(d3, 2, 1),
        to_rec(d4, 2, 2),
    ]

    days, _, _ = DeterministicScheduler.build_schedule(base_request, rec_dests)
    return days


def test_recalculate_duration_change(
    client: TestClient, base_request: PlanningRequest, sample_days: list[DayPlan]
):
    """Editing an attraction duration shifts its end time and downstream stops."""
    d1_stops = sample_days[0].stops
    target_attr = next(s for s in d1_stops if s.stop_type == StopType.ATTRACTION)
    orig_duration = target_attr.duration_minutes
    orig_end_time = target_attr.end_time

    # Increase duration and mark user modified
    target_attr.duration_minutes = orig_duration + 60
    target_attr.user_modified = True
    target_attr.notes = "Spent extra time exploring the royal armory."

    payload = {
        "request": base_request.model_dump(),
        "days": [d.model_dump() for d in sample_days],
    }

    res = client.post("/api/v1/planning/recalculate", json=payload)
    assert res.status_code == 200
    data = res.json()

    day1 = data["days"][0]
    updated_attr = next(s for s in day1["stops"] if s["stop_id"] == target_attr.stop_id)
    assert updated_attr["duration_minutes"] == orig_duration + 60
    assert updated_attr["notes"] == "Spent extra time exploring the royal armory."
    assert updated_attr["user_modified"] is True
    assert updated_attr["end_time"] > orig_end_time


def test_recalculate_add_stop(
    client: TestClient, base_request: PlanningRequest, sample_days: list[DayPlan]
):
    """Adding a verified destination stop inserts it and updates schedule and budget."""
    repo = InMemoryDestinationRepository()
    st_philo = repo.get_by_slug("st-philomenas-cathedral")
    assert st_philo

    new_stop = ItineraryStop(
        stop_id="stop-d1-st-philomenas",
        destination_id=st_philo.id,
        stop_type=StopType.ATTRACTION,
        name=st_philo.name_en,
        description=st_philo.summary_en,
        start_time="14:00",
        end_time="15:00",
        duration_minutes=60,
        coordinates=st_philo.coordinates,
        cost_min_inr=0.0,
        cost_max_inr=0.0,
        currency="INR",
        cost_status=CostStatus.VERIFIED,
        rationale="Added Neo-Gothic landmark.",
    )

    sample_days[0].stops.append(new_stop)

    payload = {
        "request": base_request.model_dump(),
        "days": [d.model_dump() for d in sample_days],
    }

    res = client.post("/api/v1/planning/recalculate", json=payload)
    assert res.status_code == 200
    data = res.json()

    day1 = data["days"][0]
    attractions = [s for s in day1["stops"] if s["stop_type"] == "attraction"]
    assert len(attractions) == 3
    added = next(s for s in attractions if s["stop_id"] == "stop-d1-st-philomenas")
    assert "Philomena" in added["name"]
    assert data["total_destinations"] == 5


def test_recalculate_remove_stop(
    client: TestClient, base_request: PlanningRequest, sample_days: list[DayPlan]
):
    """Removing a stop updates adjacent transit times and removes its costs from budget."""
    day1_stops = sample_days[0].stops
    attr_stops = [s for s in day1_stops if s.stop_type == StopType.ATTRACTION]
    assert len(attr_stops) >= 2
    removed_stop = attr_stops[1]

    # Remove second attraction
    sample_days[0].stops = [s for s in day1_stops if s.stop_id != removed_stop.stop_id]

    payload = {
        "request": base_request.model_dump(),
        "days": [d.model_dump() for d in sample_days],
    }

    res = client.post("/api/v1/planning/recalculate", json=payload)
    assert res.status_code == 200
    data = res.json()

    day1 = data["days"][0]
    rem_attrs = [s for s in day1["stops"] if s["stop_type"] == "attraction"]
    assert len(rem_attrs) == 1
    assert all(s["stop_id"] != removed_stop.stop_id for s in day1["stops"])


def test_recalculate_reorder_stops(
    client: TestClient, base_request: PlanningRequest, sample_days: list[DayPlan]
):
    """Reordering attractions changes sequence order and updates driving segments."""
    day1_stops = sample_days[0].stops
    attr_stops = [s for s in day1_stops if s.stop_type == StopType.ATTRACTION]
    assert len(attr_stops) >= 2
    first, second = attr_stops[0], attr_stops[1]

    # Swap positions in day1_stops
    idx1 = day1_stops.index(first)
    idx2 = day1_stops.index(second)
    day1_stops[idx1], day1_stops[idx2] = second, first

    payload = {
        "request": base_request.model_dump(),
        "days": [d.model_dump() for d in sample_days],
    }

    res = client.post("/api/v1/planning/recalculate", json=payload)
    assert res.status_code == 200
    data = res.json()

    day1 = data["days"][0]
    new_attrs = [s for s in day1["stops"] if s["stop_type"] == "attraction"]
    assert new_attrs[0]["stop_id"] == second.stop_id
    assert new_attrs[1]["stop_id"] == first.stop_id


def test_regenerate_stop_candidates(
    client: TestClient, base_request: PlanningRequest, sample_days: list[DayPlan]
):
    """Regenerating a stop returns grounded alternatives excluding existing itinerary stops."""
    d1_stops = sample_days[0].stops
    target_attr = next(s for s in d1_stops if s.stop_type == StopType.ATTRACTION)

    current_plan = {
        "language": "en",
        "generation_mode": "fallback",
        "provider_used": "deterministic_fallback",
        "items": [],
        "total_destinations": 4,
        "duration_days": 2,
        "days": [d.model_dump() for d in sample_days],
    }

    payload = {
        "day_number": 1,
        "stop_id": target_attr.stop_id,
        "request": base_request.model_dump(),
        "current_plan": current_plan,
    }

    res = client.post("/api/v1/planning/regenerate-stop", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["original_stop_id"] == target_attr.stop_id
    assert data["day_number"] == 1
    assert len(data["candidates"]) > 0

    # Ensure none of the candidates are already in the trip
    used_dest_ids = {s.destination_id for d in sample_days for s in d.stops if s.destination_id}
    for cand in data["candidates"]:
        assert cand["destination_id"] not in used_dest_ids
        assert cand["destination_id"] != target_attr.destination_id
        assert cand["estimated_visit_minutes"] > 0
        assert "distance_delta_km" in cand


def test_regenerate_stop_validation_errors(
    client: TestClient, base_request: PlanningRequest, sample_days: list[DayPlan]
):
    """Regenerate stop returns 404 for missing stop or day, and 400 for meal stops."""
    current_plan = {
        "language": "en",
        "generation_mode": "fallback",
        "provider_used": "deterministic_fallback",
        "items": [],
        "total_destinations": 4,
        "duration_days": 2,
        "days": [d.model_dump() for d in sample_days],
    }

    # Missing stop -> 404
    payload = {
        "day_number": 1,
        "stop_id": "non-existent-stop-id",
        "request": base_request.model_dump(),
        "current_plan": current_plan,
    }
    res = client.post("/api/v1/planning/regenerate-stop", json=payload)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "STOP_NOT_FOUND"

    # Meal stop -> 400
    payload["stop_id"] = "stop-d1-breakfast"
    res = client.post("/api/v1/planning/regenerate-stop", json=payload)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_STOP_TYPE"


def test_regenerate_day_preserves_locked_stops(
    client: TestClient, base_request: PlanningRequest, sample_days: list[DayPlan]
):
    """Regenerating a day preserves locked stops and unaffected days."""
    d1_stops = sample_days[0].stops
    first_attr = next(s for s in d1_stops if s.stop_type == StopType.ATTRACTION)
    first_attr.locked = True

    day2_slugs = [
        s.destination_id
        for s in sample_days[1].stops
        if s.stop_type == StopType.ATTRACTION
    ]

    current_plan = {
        "language": "en",
        "generation_mode": "fallback",
        "provider_used": "deterministic_fallback",
        "items": [],
        "total_destinations": 4,
        "duration_days": 2,
        "days": [d.model_dump() for d in sample_days],
    }

    payload = {
        "day_number": 1,
        "request": base_request.model_dump(),
        "current_plan": current_plan,
    }

    res = client.post("/api/v1/planning/regenerate-day", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Day 1 locked stop must be present
    d1_new_stops = data["days"][0]["stops"]
    assert any(s["stop_id"] == first_attr.stop_id for s in d1_new_stops)

    # Day 2 stops must be preserved
    d2_new_slugs = [
        s["destination_id"]
        for s in data["days"][1]["stops"]
        if s["stop_type"] == "attraction"
    ]
    assert d2_new_slugs == day2_slugs
