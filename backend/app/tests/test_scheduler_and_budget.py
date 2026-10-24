"""Unit and integration tests for DeterministicScheduler and BudgetCalculator."""

from app.schemas.destinations import Coordinates, DestinationCategory, LanguageCode
from app.schemas.planning import (
    CostStatus,
    PlanningRequest,
    RecommendedDestination,
    StopType,
)
from app.services.budget import BudgetCalculator
from app.services.scheduler import DeterministicScheduler, haversine_distance_km


def create_mock_destination(
    dest_id: str,
    slug: str,
    name: str,
    day_number: int,
    order: int,
    lat: float,
    lon: float,
    fee_min: float | None = 50.0,
    fee_max: float | None = 50.0,
) -> RecommendedDestination:
    return RecommendedDestination(
        id=dest_id,
        slug=slug,
        name=name,
        category=DestinationCategory.HERITAGE,
        district_code="KA-MYS",
        district_name="Mysuru",
        coordinates=Coordinates(lat=lat, lon=lon),
        day_number=day_number,
        order=order,
        rationale="Historic monument",
        entry_fee_min_inr=fee_min,
        entry_fee_max_inr=fee_max,
        access_status="open_reported",
        is_offbeat=False,
    )


def test_haversine_distance():
    # Mysuru Palace (12.3051, 76.6551) to Chamundi Hill (12.2743, 76.6710) ~4.1 km
    c1 = Coordinates(lat=12.3051, lon=76.6551)
    c2 = Coordinates(lat=12.2743, lon=76.6710)
    dist = haversine_distance_km(c1, c2)
    assert 3.5 <= dist <= 5.0


def test_scheduler_two_day_balanced_trip():
    """Scenario A: 2-day balanced trip with multiple stops, meals, and overnight lodging."""
    request = PlanningRequest(
        language=LanguageCode.EN,
        duration_days=2,
        pace="balanced",
        travelers_count=2,
    )
    dests = [
        create_mock_destination(
            "1", "mysore-palace", "Mysore Palace", 1, 1, 12.3051, 76.6551, 100.0, 100.0
        ),
        create_mock_destination(
            "2", "chamundi-hill", "Chamundi Hill", 1, 2, 12.2743, 76.6710, 0.0, 0.0
        ),
        create_mock_destination(
            "3", "st-philomenas", "St. Philomena Church", 1, 3, 12.3210, 76.6580, 0.0, 0.0
        ),
        create_mock_destination(
            "4", "srirangapatna", "Srirangapatna Fort", 2, 1, 12.4225, 76.6936, 25.0, 25.0
        ),
        create_mock_destination(
            "5", "ranganathittu", "Ranganathittu Bird Sanctuary", 2, 2, 12.4244, 76.6570, 75.0, 75.0
        ),
    ]

    days, warnings, assumptions = DeterministicScheduler.build_schedule(request, dests)

    assert len(days) == 2
    assert len(assumptions) > 0

    # Day 1 checks
    day1 = days[0]
    assert day1.day_number == 1
    stop_types = [s.stop_type for s in day1.stops]

    assert StopType.MEAL in stop_types  # Breakfast & Lunch & Dinner
    assert StopType.ATTRACTION in stop_types
    assert StopType.ACCOMMODATION in stop_types  # Day 1 of 2 must have overnight stay

    meal_stops = [s for s in day1.stops if s.stop_type == StopType.MEAL]
    assert len(meal_stops) == 3  # Breakfast, Lunch, Dinner

    # Day 2 checks
    day2 = days[1]
    assert day2.day_number == 2
    day2_types = [s.stop_type for s in day2.stops]
    assert StopType.ACCOMMODATION not in day2_types  # Final day does not force accommodation


def test_scheduler_relaxed_vs_packed_pace():
    """Verify pace guidelines: relaxed (2 stops), packed (4 stops)."""
    relaxed_req = PlanningRequest(duration_days=1, pace="relaxed")
    packed_req = PlanningRequest(duration_days=1, pace="packed")

    assert relaxed_req.pace == "relaxed"
    assert packed_req.pace == "packed"


def test_budget_calculation_unknown_fee_integrity():
    """Verify missing fee is flagged as unknown and never silently counted as ₹0."""
    request = PlanningRequest(duration_days=1, travelers_count=2)
    dests = [
        create_mock_destination(
            "1", "place-a", "Place A", 1, 1, 12.0, 76.0, fee_min=None, fee_max=None
        ),
        create_mock_destination(
            "2", "place-b", "Place B", 1, 2, 12.1, 76.1, fee_min=50.0, fee_max=50.0
        ),
    ]

    days, _, _ = DeterministicScheduler.build_schedule(request, dests)
    budget = BudgetCalculator.calculate_budget(request, days, dests)

    assert budget.has_unknown_costs is True
    assert any("unverified entry fees" in w for w in budget.warnings)

    entry_fee_cat = next(c for c in budget.categories if c.category_name == "Attraction Entry Fees")
    assert entry_fee_cat.cost_status == CostStatus.ESTIMATED
    # Place B (50 * 2 = 100)
    assert entry_fee_cat.estimated_min_inr == 100.0


def test_budget_multi_travelers_and_nights():
    """Verify accommodation multiplied by nights and rooms, and meals by travelers."""
    request = PlanningRequest(duration_days=3, travelers_count=4)
    dests = [
        create_mock_destination("1", "p1", "Place 1", 1, 1, 12.0, 76.0, 100.0, 100.0),
        create_mock_destination("2", "p2", "Place 2", 2, 1, 12.0, 76.0, 100.0, 100.0),
        create_mock_destination("3", "p3", "Place 3", 3, 1, 12.0, 76.0, 100.0, 100.0),
    ]

    days, _, _ = DeterministicScheduler.build_schedule(request, dests)
    budget = BudgetCalculator.calculate_budget(request, days, dests)

    # 4 travelers = 2 rooms; 3 days = 2 nights
    lodging_cat = next(c for c in budget.categories if c.category_name == "Overnight Accommodation")
    assert lodging_cat.cost_status == CostStatus.ESTIMATED
    # 2 nights * 2 rooms * 1800 = 7200 min
    assert lodging_cat.estimated_min_inr == 7200.0

    # Per person total is grand total / 4
    assert budget.per_person_min_inr == round(budget.grand_total_min_inr / 4, 2)
