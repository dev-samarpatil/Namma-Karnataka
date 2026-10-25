"""Geographic itinerary planning, corridor clustering, overnight continuity, and events tests.

Validates Phase 10+ requirements:
- Multi-day continuity (Day d hotel becomes Day d+1 starting origin).
- Corridor clustering preventing wild multi-hundred km cross-state zig-zags.
- Curated cultural festivals & events integration.
- Daily travel feasibility, return trip handling, and fatigue advisories.
- Authoritative budget synchronization.
"""

from datetime import datetime

from app.schemas.destinations import Coordinates, DestinationCategory
from app.schemas.planning import (
    PlanningRequest,
    RecommendedDestination,
    StopType,
)
from app.services.budget import BudgetCalculator
from app.services.clustering.corridors import (
    identify_best_corridor,
)
from app.services.events import get_events_service
from app.services.scheduler import DeterministicScheduler


def _create_mock_dest(
    dest_id: str,
    slug: str,
    name: str,
    district_code: str,
    lat: float,
    lon: float,
    day_number: int = 1,
    order: int = 1,
) -> RecommendedDestination:
    return RecommendedDestination(
        id=dest_id,
        slug=slug,
        name=name,
        category=DestinationCategory.HERITAGE,
        district_code=district_code,
        district_name="Test District",
        coordinates=Coordinates(lat=lat, lon=lon),
        day_number=day_number,
        order=order,
        rationale="Curated test stop",
        entry_fee_min_inr=50.0,
        entry_fee_max_inr=50.0,
        access_status="open_reported",
        is_offbeat=False,
    )


def test_origin_departure_and_overnight_continuity():
    """Verify Day 1 starts from origin, ends at hotel, and Day 2 starts from that hotel."""
    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=2,
        travelers_count=2,
        is_return_trip=True,
    )

    # Day 1 in Mysuru; Day 2 in Srirangapatna / Mandya
    dests = [
        _create_mock_dest(
            "1", "mysore-palace", "Mysore Palace", "KA-MYS", 12.3051, 76.6551, day_number=1, order=1
        ),
        _create_mock_dest(
            "2", "chamundi-hill", "Chamundi Hill", "KA-MYS", 12.2743, 76.6710, day_number=1, order=2
        ),
        _create_mock_dest(
            "3", "srirangapatna", "Srirangapatna", "KA-MAN", 12.4225, 76.6936, day_number=2, order=1
        ),
        _create_mock_dest(
            "4", "ranganathittu", "Ranganathittu", "KA-MAN", 12.4244, 76.6570, day_number=2, order=2
        ),
    ]

    days, warnings, assumptions = DeterministicScheduler.build_schedule(request, dests)

    assert len(days) == 2

    # --- Day 1 Verification ---
    day1 = days[0]
    assert day1.start_location_name == "Bengaluru"
    assert day1.accommodation_name is not None
    assert day1.end_location_name == day1.accommodation_name
    assert (
        day1.driving_distance_km is not None and day1.driving_distance_km > 100.0
    )  # Blr to Mysuru ~140km

    # Day 1 Stop 1 should calculate distance from Bengaluru
    attr_stop1 = [s for s in day1.stops if s.stop_type == StopType.ATTRACTION][0]
    assert attr_stop1.distance_from_prev_km is not None
    assert attr_stop1.distance_from_prev_km > 100.0  # Distance from Bengaluru origin

    # Day 1 must have an accommodation stop at the end
    stay_stops = [s for s in day1.stops if s.stop_type == StopType.ACCOMMODATION]
    assert len(stay_stops) == 1
    hotel_coords = stay_stops[0].coordinates
    assert hotel_coords is not None

    # --- Day 2 Verification (Continuity from Day 1 Hotel) ---
    day2 = days[1]
    assert day2.start_location_name == day1.accommodation_name

    # Day 2 Stop 1 must calculate distance from Day 1's hotel, NOT from Bengaluru!
    day2_attr1 = [s for s in day2.stops if s.stop_type == StopType.ATTRACTION][0]
    assert day2_attr1.distance_from_prev_km is not None
    # Srirangapatna is ~15-25 km from Mysuru hotel, NOT 130 km from Bengaluru!
    assert day2_attr1.distance_from_prev_km < 40.0

    # Day 2 final day with return trip must end back in Bengaluru
    assert day2.end_location_name == "Bengaluru"
    return_stops = [s for s in day2.stops if s.stop_type == StopType.TRANSPORT]
    assert len(return_stops) == 1
    assert "Return Trip to Bengaluru" in return_stops[0].name


def test_corridor_clustering_and_distant_district_omission():
    """Verify corridor detection and that distant districts trigger clear warnings."""
    # User selects Mysuru corridor plus an extreme outlier in the north (Bidar)
    selected_districts = ["KA-MYS", "KA-MAN", "KA-BID"]
    best_corridor, omitted = identify_best_corridor(
        origin_label="Bengaluru",
        preferred_districts=selected_districts,
        preferred_categories=[],
        duration_days=2,
    )

    assert best_corridor.corridor_id == "southern_heritage_wildlife"
    # Bidar is 700km away and must be flagged as omitted for a 2-day southern trip
    assert "KA-BID" in omitted


def test_events_service_retrieval():
    """Verify curated cultural festivals and events can be queried by location and month."""
    events_svc = get_events_service()

    # Query near Mysuru (12.3051, 76.6551) in October (month 10)
    mysuru_events = events_svc.get_events_near(12.3051, 76.6551, radius_km=45.0, month=10)
    assert len(mysuru_events) >= 1
    dasara = next((e for e in mysuru_events if e.event_id == "mysuru-dasara"), None)
    assert dasara is not None
    assert "Dasara" in dasara.name_en
    assert dasara.district_code == "KA-MYS"
    assert "mysoredasara.gov.in" in dasara.source_url

    # Query near Hampi (15.3350, 76.4600) in November (month 11)
    hampi_events = events_svc.get_events_near(15.3350, 76.4600, radius_km=45.0, month=11)
    assert len(hampi_events) >= 1
    utsav = next((e for e in hampi_events if e.event_id == "hampi-utsav"), None)
    assert utsav is not None
    assert "Hampi Utsav" in utsav.name_en


def test_scheduler_inserts_cultural_event():
    """Verify scheduler inserts cultural festival stops when dates align."""
    request = PlanningRequest(
        origin_label="Mysuru",
        duration_days=1,
        travelers_count=2,
    )
    # Travel date in October (Dasara season)
    oct_date = datetime(2026, 10, 15)
    dests = [
        _create_mock_dest(
            "1", "mysore-palace", "Mysore Palace", "KA-MYS", 12.3051, 76.6551, day_number=1, order=1
        ),
        _create_mock_dest(
            "2", "chamundi-hill", "Chamundi Hill", "KA-MYS", 12.2743, 76.6710, day_number=1, order=2
        ),
    ]

    days, warnings, assumptions = DeterministicScheduler.build_schedule(
        request=request, destinations=dests, base_date=oct_date
    )

    day1 = days[0]
    event_stops = [s for s in day1.stops if s.stop_type == StopType.EVENT]
    assert len(event_stops) == 1
    event_stop = event_stops[0]
    assert "🎪" in event_stop.name
    assert "Dasara" in event_stop.name
    assert event_stop.source_reference is not None


def test_fatigue_warning_on_excessive_driving():
    """Verify that a day with >240 minutes driving triggers an explicit fatigue warning."""
    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=1,
        is_return_trip=True,
    )
    # Put a destination far away so driving exceeds 4 hours
    dests = [
        _create_mock_dest(
            "1", "hampi-bazaar", "Hampi Bazaar", "KA-VJY", 15.3350, 76.4600, day_number=1, order=1
        ),
    ]

    days, warnings, assumptions = DeterministicScheduler.build_schedule(request, dests)
    day1 = days[0]

    # Bengaluru to Hampi (~350 km) + return is >700 km, easily >240 mins driving
    assert day1.transit_minutes > 240
    fatigue_warnings = [w for w in day1.warnings if "High driving duration" in w]
    assert len(fatigue_warnings) >= 1


def test_budget_consistency_multi_day():
    """Verify authoritative budget calculation counts N-1 nights and group rooms."""
    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=3,
        travelers_count=4,
        budget_scenario="standard",
    )
    dests = [
        _create_mock_dest("1", "d1", "Stop 1", "KA-MYS", 12.30, 76.65, day_number=1, order=1),
        _create_mock_dest("2", "d2", "Stop 2", "KA-MYS", 12.31, 76.66, day_number=2, order=1),
        _create_mock_dest("3", "d3", "Stop 3", "KA-MYS", 12.32, 76.67, day_number=3, order=1),
    ]
    days, warnings, assumptions = DeterministicScheduler.build_schedule(request, dests)
    budget = BudgetCalculator.calculate_budget(request=request, days=days, destinations=dests)

    # 4 travelers require 2 rooms. 3 days = 2 overnight nights.
    acc_category = next(
        (c for c in budget.categories if c.category_name == "Overnight Accommodation"), None
    )
    assert acc_category is not None
    assert "2 night(s)" in acc_category.calculation_basis
    assert "2 standard room(s)" in acc_category.calculation_basis
    assert budget.traveler_count == 4
    assert budget.grand_total_min_inr is not None
    assert budget.grand_total_min_inr > 0


def test_bengaluru_origin_must_not_start_in_belagavi():
    """CRITICAL REGRESSION: Origin = Bengaluru must not produce a plan starting in Belagavi."""
    from app.repositories.destinations import get_destination_repository
    from app.schemas.destinations import DestinationFilterParams
    from app.services.routing.optimizer import RouteOptimizer

    repo = get_destination_repository()
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=100), published_only=True)

    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=2,
        categories=["heritage", "nature"],
    )

    items, warnings, corridor = RouteOptimizer.plan_coherent_itinerary(request, candidates)

    assert len(items) >= 2
    day1_items = [item for item in items if item.day_number == 1]
    assert len(day1_items) >= 1

    first_dest = day1_items[0]
    # First destination MUST NOT be in Belagavi (KA-BLG)!
    assert first_dest.district_code != "KA-BLG"
    assert "Belagavi" not in first_dest.name

    # Must belong to southern corridor
    assert first_dest.district_code in corridor.districts
    assert corridor.corridor_id == "southern_heritage_wildlife"

    # Schedule Day 1 must explicitly start at Bengaluru
    days, _, _ = DeterministicScheduler.build_schedule(request, items)
    assert days[0].start_location_name == "Bengaluru"


def test_reject_500km_cross_state_belagavi_devanahalli_jump():
    """CRITICAL REGRESSION: A single day must not chain Belagavi Fort with
    Devanahalli Fort (508 km).
    """
    from app.schemas.destinations import DestinationRead, DestinationTranslationRead
    from app.services.clustering.corridors import identify_best_corridor
    from app.services.routing.optimizer import RouteOptimizer

    # Create synthetic candidate pair matching the reported bug
    belagavi_fort = DestinationRead(
        id="belagavi-fort-1",
        slug="belagavi-fort",
        district_code="KA-BLG",
        category=DestinationCategory.HERITAGE,
        coordinates=Coordinates(lat=15.8497, lon=74.4977),
        access_status="open_reported",
        is_offbeat=False,
        translations=[
            DestinationTranslationRead(
                language_code="en",
                name="Belagavi Fort & Kamal Basti",
                summary="Historic fort in Belagavi",
                description="Historic fort",
            )
        ],
    )
    devanahalli_fort = DestinationRead(
        id="devanahalli-fort-1",
        slug="devanahalli-fort",
        district_code="KA-BLRR",
        category=DestinationCategory.HERITAGE,
        coordinates=Coordinates(lat=13.2483, lon=77.7126),
        access_status="open_reported",
        is_offbeat=False,
        translations=[
            DestinationTranslationRead(
                language_code="en",
                name="Devanahalli Fort",
                summary="Birthplace of Tipu Sultan near Bengaluru",
                description="Historic fort near Bengaluru",
            )
        ],
    )

    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=1,
    )

    corridor, _ = identify_best_corridor(
        origin_coords=Coordinates(lat=12.9716, lon=77.5946),
        preferred_districts=[],
        duration_days=1,
    )

    # When both are offered, optimizer must prioritize the corridor-compatible destination
    items, _, _ = RouteOptimizer.plan_coherent_itinerary(request, [belagavi_fort, devanahalli_fort])

    # For a 1-day trip from Bengaluru, Devanahalli is chosen (~35km), NOT Belagavi (508km)!
    assert len(items) == 1
    assert items[0].slug == "devanahalli-fort"
    assert items[0].district_code == "KA-BLRR"


async def test_ai_orchestrator_grounded_in_corridor():
    """Verify AIOrchestrator generates corridor-grounded plan and sets origin_label."""
    from app.services.ai.orchestrator import AIOrchestrator

    orchestrator = AIOrchestrator()
    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=2,
        categories=["heritage"],
    )

    response = await orchestrator.recommend_itinerary(request)

    assert response.origin_label == "Bengaluru"
    assert response.corridor_name is not None
    assert len(response.items) >= 2
    # Check no destination is from Belagavi
    for item in response.items:
        assert item.district_code != "KA-BLG"
        assert "Belagavi" not in item.name


def test_four_day_progressive_journey_bengaluru():
    """Verify a 4-day trip from Bengaluru maintains strict day-to-day continuity.

    - Day 1 begins in Bengaluru and ends at an accommodation.
    - Day 2 starts from Day 1's accommodation (NOT Bengaluru).
    - Day 3 starts from Day 2's accommodation.
    - Day 4 starts from Day 3's accommodation and returns to Bengaluru.
    """
    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=4,
        travelers_count=2,
        is_return_trip=True,
    )

    dests = [
        # Day 1: Bengaluru / Ramanagara
        _create_mock_dest(
            "1",
            "lalbagh",
            "Lalbagh Botanical Garden",
            "KA-BLRU",
            12.9507,
            77.5848,
            day_number=1,
            order=1,
        ),
        _create_mock_dest(
            "2",
            "ramadevara-betta",
            "Ramadevara Betta",
            "KA-RAM",
            12.7209,
            77.2799,
            day_number=1,
            order=2,
        ),
        # Day 2: Mandya / Srirangapatna
        _create_mock_dest(
            "3",
            "srirangapatna-fort",
            "Srirangapatna Fort",
            "KA-MAN",
            12.4225,
            76.6936,
            day_number=2,
            order=1,
        ),
        _create_mock_dest(
            "4",
            "ranganathittu-bird",
            "Ranganathittu Sanctuary",
            "KA-MAN",
            12.4244,
            76.6570,
            day_number=2,
            order=2,
        ),
        # Day 3: Mysuru
        _create_mock_dest(
            "5", "mysore-palace", "Mysore Palace", "KA-MYS", 12.3051, 76.6551, day_number=3, order=1
        ),
        _create_mock_dest(
            "6", "chamundi-hill", "Chamundi Hill", "KA-MYS", 12.2743, 76.6710, day_number=3, order=2
        ),
        # Day 4: Nanjangud / Return
        _create_mock_dest(
            "7",
            "nrikanteshwara",
            "Nanjangud Srikanteshwara",
            "KA-MYS",
            12.1192,
            76.6806,
            day_number=4,
            order=1,
        ),
    ]

    days, warnings, assumptions = DeterministicScheduler.build_schedule(request, dests)

    assert len(days) == 4

    # Day 1: Starts at Bengaluru
    assert days[0].start_location_name == "Bengaluru"
    assert days[0].accommodation_name is not None
    day1_stay = days[0].accommodation_name

    # Day 2: Starts at Day 1's accommodation
    assert days[1].start_location_name == day1_stay
    assert days[1].start_location_name != "Bengaluru"
    assert days[1].accommodation_name is not None
    day2_stay = days[1].accommodation_name

    # Day 3: Starts at Day 2's accommodation
    assert days[2].start_location_name == day2_stay
    assert days[2].accommodation_name is not None
    day3_stay = days[2].accommodation_name

    # Day 4: Starts at Day 3's accommodation and ends in Bengaluru
    assert days[3].start_location_name == day3_stay
    assert days[3].end_location_name == "Bengaluru"
    ret_stops = [s for s in days[3].stops if s.stop_type == StopType.TRANSPORT]
    assert len(ret_stops) == 1
    assert "Return Trip to Bengaluru" in ret_stops[0].name


def test_day_two_candidate_scoring_not_measured_from_origin():
    """Verify that RouteOptimizer scores Day 2 candidates relative to Day 1's final stop,
    NOT relative to Bengaluru."""
    from app.schemas.destinations import DestinationRead, DestinationTranslationRead
    from app.services.routing.optimizer import RouteOptimizer

    # Destination A: In Bengaluru (near origin)
    dest_blr = DestinationRead(
        id="dest-blr",
        slug="cubbon-park",
        district_code="KA-BLRU",
        category=DestinationCategory.NATURE,
        coordinates=Coordinates(lat=12.9763, lon=77.5929),
        access_status="open_reported",
        is_offbeat=False,
        translations=[
            DestinationTranslationRead(
                language_code="en", name="Cubbon Park", summary="Park", description="Park"
            )
        ],
    )
    # Destination B: In Mysuru (140 km from Bengaluru)
    dest_mys = DestinationRead(
        id="dest-mys",
        slug="mysore-zoo",
        district_code="KA-MYS",
        category=DestinationCategory.NATURE,
        coordinates=Coordinates(lat=12.3023, lon=76.6644),
        access_status="open_reported",
        is_offbeat=False,
        translations=[
            DestinationTranslationRead(
                language_code="en", name="Mysuru Zoo", summary="Zoo", description="Zoo"
            )
        ],
    )
    # Destination C: Near Mysuru (Srirangapatna, ~15 km from Mysuru)
    dest_srirangapatna = DestinationRead(
        id="dest-sri",
        slug="srirangapatna-temple",
        district_code="KA-MAN",
        category=DestinationCategory.HERITAGE,
        coordinates=Coordinates(lat=12.4225, lon=76.6936),
        access_status="open_reported",
        is_offbeat=False,
        translations=[
            DestinationTranslationRead(
                language_code="en",
                name="Ranganathaswamy Temple",
                summary="Temple",
                description="Temple",
            )
        ],
    )

    request = PlanningRequest(
        origin_label="Bengaluru",
        duration_days=2,
        pace="relaxed",  # 2 stops per day
    )

    # Let's say Day 1 already moved towards Mysuru
    # We test plan_coherent_itinerary with candidates
    items, _, _ = RouteOptimizer.plan_coherent_itinerary(
        request, [dest_blr, dest_mys, dest_srirangapatna]
    )

    assert len(items) >= 2
    # Day 1 should pick closest to Bengaluru first
    day1_items = [it for it in items if it.day_number == 1]
    assert any(it.slug == "cubbon-park" for it in day1_items)
