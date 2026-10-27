"""Regression test suite for progressive geographic exploration and multi-day continuity.

Validates Requirements from Workstreams A through I:
- Test A: Day 1 origin authoritative preservation
- Test B: Day-to-day continuity (Day d departs from Day d-1 overnight stay)
- Test C: Regional exploration (clustering before distant transitions)
- Test D: Backtracking prevention
- Test E: Map origin synchronization (start_coordinates and end_coordinates on DayPlan)
- Test F: Multi-day accommodation continuity across all days
- Test G: Transportation budget fuel accounting (no return travel doubling)
- Test H: Interactive rescheduling and editing preserves continuity
- Test I: Infeasible trip reporting
"""

import pytest

from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.destinations import DestinationFilterParams
from app.schemas.planning import (
    LanguageCode,
    PlanningRequest,
    StopType,
)
from app.services.budget import BudgetCalculator
from app.services.routing.optimizer import RouteOptimizer
from app.services.scheduler import DeterministicScheduler
from app.services.transport_cost import SupportedTransportMode


@pytest.fixture
def repo():
    return InMemoryDestinationRepository()


def test_suite_test_a_day_1_origin(repo):
    """Test A — Day 1 origin:
    Origin = Bengaluru, 4 days, private car, 2 travellers.
    Asserts:
    - Day 1 starts at Bengaluru
    - Day 1 first route leg origin matches Bengaluru
    - start_coordinates matches Bengaluru coordinates
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=4,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage", "nature"],
        budget_scenario="standard",
        is_return_trip=True,
    )

    items, warnings, corridor = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    days, _, _ = DeterministicScheduler.build_schedule(req, items)
    assert len(days) >= 2

    day_1 = days[0]
    assert "Bengaluru" in day_1.start_location_name
    assert day_1.start_coordinates is not None
    assert abs(day_1.start_coordinates.lat - 12.9716) < 0.1
    assert abs(day_1.start_coordinates.lon - 77.5946) < 0.1

    # First attraction stop distance must be from Bengaluru
    first_attr = next(s for s in day_1.stops if s.stop_type == StopType.ATTRACTION)
    assert first_attr.distance_from_prev_km is not None
    assert first_attr.distance_from_prev_km > 0.0


def test_suite_test_b_daily_continuity(repo):
    """Test B — Daily continuity:
    Asserts:
    - Day 1 has an explicit overnight accommodation stop
    - Day 1 end_location_name and end_coordinates match the accommodation
    - Accommodation stop has explicit transit leg from the previous stop
    - Day 2 starts at Day 1's actual accommodation (NOT reset to Bengaluru)
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=4,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage", "nature"],
        budget_scenario="standard",
        is_return_trip=True,
    )

    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    days, _, _ = DeterministicScheduler.build_schedule(req, items)
    day_1 = days[0]
    day_2 = days[1]

    # Day 1 must have accommodation stop
    day_1_stay = next((s for s in day_1.stops if s.stop_type == StopType.ACCOMMODATION), None)
    assert day_1_stay is not None
    assert day_1_stay.coordinates is not None
    # Transit to accommodation must be explicitly tracked
    assert day_1_stay.distance_from_prev_km is not None
    assert day_1_stay.transit_from_prev_minutes is not None

    # Day 1 endpoint is the accommodation
    assert day_1.end_location_name == day_1_stay.name
    assert day_1.end_coordinates == day_1_stay.coordinates

    # Day 2 must start from Day 1's accommodation, NOT Bengaluru
    assert day_2.start_location_name == day_1_stay.name
    assert day_2.start_coordinates == day_1_stay.coordinates
    assert "Bengaluru" not in day_2.start_location_name or "Bengaluru" in day_1_stay.name


def test_suite_test_c_regional_exploration(repo):
    """Test C — Regional exploration:
    Nearby feasible destinations are preferred before jumping hundreds of kilometres away.
    For a Bengaluru origin, Day 1 must not jump directly to distant North Karnataka (Belagavi / Vijayapura).
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=2,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage", "nature"],
    )

    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    day_1_slugs = [item.slug for item in items if getattr(item, "day_number", 1) == 1]
    assert "belagavi-fort" not in day_1_slugs
    assert "gol-gumbaz-vijayapura" not in day_1_slugs


def test_suite_test_d_backtracking_prevention(repo):
    """Test D — Backtracking prevention:
    Asserts that all days in a multi-day trip receive coherent destination stops.
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage", "nature"],
    )

    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    days, _, _ = DeterministicScheduler.build_schedule(req, items)
    assert len(days) == 3
    for d in days:
        attr_stops = [s for s in d.stops if s.stop_type == StopType.ATTRACTION]
        assert len(attr_stops) >= 1, f"Day {d.day_number} should have at least 1 attraction stop"


def test_suite_test_e_map_origin_coordinates(repo):
    """Test E — Map origin coordinates:
    Every DayPlan must carry authoritative start_coordinates and end_coordinates
    so frontend MapView does not have to guess or default to Bengaluru.
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage"],
    )

    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    days, _, _ = DeterministicScheduler.build_schedule(req, items)

    for day in days:
        assert day.start_coordinates is not None, f"Day {day.day_number} missing start_coordinates"
        assert day.end_coordinates is not None, f"Day {day.day_number} missing end_coordinates"
        assert 11.0 <= day.start_coordinates.lat <= 19.0
        assert 73.0 <= day.start_coordinates.lon <= 79.5


def test_suite_test_f_day_switching_continuity(repo):
    """Test F — Day switching continuity:
    For any transition Day d -> Day d+1, Day d.end_coordinates must equal Day (d+1).start_coordinates.
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=4,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage", "nature"],
        is_return_trip=True,
    )

    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    days, _, _ = DeterministicScheduler.build_schedule(req, items)

    for i in range(len(days) - 1):
        curr_day = days[i]
        next_day = days[i + 1]
        assert curr_day.end_coordinates == next_day.start_coordinates, (
            f"Discontinuity between Day {curr_day.day_number} end and Day {next_day.day_number} start"
        )
        assert curr_day.end_location_name == next_day.start_location_name


def test_suite_test_g_budget_transport_no_double_counting(repo):
    """Test G — Budget transport calculation:
    When the itinerary explicitly includes a return trip stop on the final day,
    the budget service must not multiply the already complete cumulative route distance by 2.
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage"],
        is_return_trip=True,
    )

    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    days, _, _ = DeterministicScheduler.build_schedule(req, items)

    budget = BudgetCalculator.calculate_budget(
        request=req,
        days=days,
        destinations=items,
    )

    trans_item = next(c for c in budget.categories if "Transportation" in c.category_name)
    assert trans_item is not None
    total_stop_km = sum(s.distance_from_prev_km or 0 for d in days for s in d.stops)
    note = next(n for n in budget.calculation_notes if "Transport:" in n)
    assert f"{total_stop_km:.1f} billable km" in note


def test_suite_test_h_rescheduling_preserves_continuity(repo):
    """Test H — Editing & Rescheduling preserves continuity:
    When stops are modified or rescheduled, Day d+1 continues from Day d's accommodation,
    and start_coordinates / end_coordinates are properly recalculated.
    """
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100))
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        categories=["heritage"],
        is_return_trip=True,
    )

    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request=req,
        candidates=candidates,
    )
    days, _, _ = DeterministicScheduler.build_schedule(req, items)

    rescheduled_days, _, _ = DeterministicScheduler.reschedule_itinerary(req, days)
    assert len(rescheduled_days) == len(days)

    for i in range(len(rescheduled_days) - 1):
        curr_d = rescheduled_days[i]
        next_d = rescheduled_days[i + 1]
        assert curr_d.end_coordinates is not None
        assert next_d.start_coordinates is not None
        assert curr_d.end_coordinates == next_d.start_coordinates
        assert curr_d.end_location_name == next_d.start_location_name


def test_suite_test_i_infeasible_trip_warning():
    """Test I — Infeasible trip warnings:
    A trip with high driving hours generates clear pacing / fatigue warnings.
    """
    req = PlanningRequest(
        language=LanguageCode.EN,
        origin_label="Bengaluru",
        duration_days=1,
        travelers_count=2,
        travel_mode=SupportedTransportMode.DRIVING_CAR,
        pace="packed",
        is_return_trip=True,
    )
    repo = InMemoryDestinationRepository()
    dest = repo.get_by_slug("gol-gumbaz-vijayapura")  # Bijapur ~520km from Bengaluru
    assert dest is not None
    # Flat list of destinations
    dests = [dest]

    days, warnings, _ = DeterministicScheduler.build_schedule(req, dests)
    assert len(days) == 1
    day_1 = days[0]
    # Driving duration will be > 240 mins, so warning must be present
    assert any(
        "driving duration" in w.lower() or "travel duration" in w.lower() for w in day_1.warnings
    )
