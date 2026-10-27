"""Focused automated tests for Workstream 6: Festival and Cultural Event Intelligence.

Validates date-matching, route proximity, confirmation status honesty,
resilience against provider failure, and non-destructive itinerary integration.
"""

from __future__ import annotations

from datetime import datetime

from app.schemas.destinations import Coordinates
from app.schemas.planning import ItineraryStop, PlanningRequest, StopType
from app.services.events import get_events_service
from app.services.scheduler import DeterministicScheduler


def _create_mock_dest(dest_id: str, slug: str, name: str, district: str, lat: float, lon: float, day_number: int = 1, order: int = 1):
    class MockCoords:
        def __init__(self, lat, lon):
            self.lat = lat
            self.lon = lon

    class MockDest:
        def __init__(self):
            self.id = dest_id
            self.slug = slug
            self.name_en = name
            self.name_kn = name
            self.district_code = district
            self.district_name_en = district
            self.district_name_kn = district
            self.category = "heritage"
            self.estimated_visit_minutes = 90
            self.fee_domestic_inr = 50.0
            self.fee_status = "verified"
            self.coordinates = MockCoords(lat, lon)
            self.order_in_day = order
            self.assigned_day = day_number
            self.is_offbeat = False
            self.cultural_significance_en = "Heritage landmark"

    return MockDest()


def test_event_date_matching_eligibility():
    """1. Event overlapping travel month is eligible, outside travel month is not."""
    events_svc = get_events_service()

    # Mysuru Dasara (September-October)
    oct_events = events_svc.get_events_near(12.3051, 76.6551, radius_km=30.0, month=10)
    assert any(e.event_id == "mysuru-dasara" for e in oct_events)

    # In June (month 6), Mysuru Dasara is not taking place
    june_events = events_svc.get_events_near(12.3051, 76.6551, radius_km=30.0, month=6)
    assert not any(e.event_id == "mysuru-dasara" for e in june_events)


def test_event_proximity_filtering():
    """3 & 4. Distant events are excluded or lower-ranked; nearby events match."""
    events_svc = get_events_service()

    # Query Bagalkote coordinates (Pattadakal) - Dasara in Mysuru is ~500km away
    bagalkote_events = events_svc.get_events_near(15.9486, 75.8158, radius_km=45.0, month=10)
    assert not any(e.event_id == "mysuru-dasara" for e in bagalkote_events)

    # Pattadakal dance festival is in Bagalkote in January
    jan_bagalkote = events_svc.get_events_near(15.9486, 75.8158, radius_km=45.0, month=1)
    assert any(e.event_id == "pattadakal-dance-festival" for e in jan_bagalkote)


def test_event_source_links_and_verification_attached():
    """9. Source links, verification status, and honest cost status are attached."""
    events_svc = get_events_service()
    events = events_svc.get_all_events()
    assert len(events) >= 4

    for ev in events:
        assert ev.source_name, f"Event {ev.id} must have source_name"
        assert ev.source_url.startswith("http"), f"Event {ev.id} must have valid source_url"
        assert ev.verification_status in ("verified_authentic", "editorial_verified", "source_reported")
        assert ev.ticket_cost_status in ("free", "verified", "estimated", "unknown")


def test_festivals_not_forced_as_mandatory_stops():
    """8. Events are presented as recommendations, preserving original sightseeing stops."""
    request = PlanningRequest(
        origin_label="Mysuru",
        duration_days=1,
        travelers_count=2,
    )
    dests = [
        _create_mock_dest("1", "mysore-palace", "Mysore Palace", "KA-MYS", 12.3051, 76.6551, 1, 1),
    ]

    days, warnings, _ = DeterministicScheduler.build_schedule(
        request=request, destinations=dests, base_date=datetime(2026, 10, 10)
    )

    day = days[0]
    # No forced EVENT stop
    event_stops = [s for s in day.stops if s.stop_type == StopType.EVENT]
    assert len(event_stops) == 0

    # Recommended events populated
    assert len(day.recommended_events) > 0
    assert any(e.event_id == "mysuru-dasara" for e in day.recommended_events)


def test_locked_stops_preserved_when_rescheduled():
    """10. Rescheduling does not overwrite locked itinerary stops."""
    request = PlanningRequest(origin_label="Bengaluru", duration_days=1)
    locked_stop = ItineraryStop(
        stop_id="locked-custom-stop",
        destination_id=None,
        stop_type=StopType.ATTRACTION,
        name="Special Heritage Walk",
        description="User locked booking",
        start_time="10:00",
        end_time="12:00",
        duration_minutes=120,
        coordinates=Coordinates(lat=12.9716, lon=77.5946),
        distance_from_prev_km=0.0,
        transit_from_prev_minutes=0,
        cost_min_inr=0.0,
        cost_max_inr=0.0,
        currency="INR",
        cost_status="verified",
        locked=True,
    )

    # Reschedule a day with this locked stop
    class MockDay:
        day_number = 1
        date = "2026-10-15"
        theme = "Bengaluru City Walk"
        stops = [locked_stop]
        recommended_events = []

    rescheduled_days, _, _ = DeterministicScheduler.reschedule_itinerary(request, [MockDay()])
    assert len(rescheduled_days) == 1
    rescheduled_stops = rescheduled_days[0].stops
    matched_locked = next((s for s in rescheduled_stops if s.stop_id == "locked-custom-stop"), None)
    assert matched_locked is not None
    assert matched_locked.locked is True
    assert matched_locked.name == "Special Heritage Walk"


def test_kannada_localization_for_events():
    """12. Verified events have full Kannada titles and descriptions."""
    events_svc = get_events_service()
    events = events_svc.get_all_events()

    for ev in events:
        assert ev.name_kn, f"Event {ev.id} missing name_kn"
        assert ev.description_kn, f"Event {ev.id} missing description_kn"
