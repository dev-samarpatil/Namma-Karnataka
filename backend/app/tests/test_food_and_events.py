"""Tests for Karnataka Regional Food Guide, Authenticity Verification, and Events Calendar."""

import pytest
from app.services.local_food_guide import (
    LocalFoodGuideService,
    get_local_food_guide_service,
)
from app.services.karnataka_events import (
    KarnatakaEventsCalendarService,
    get_karnataka_events_service,
)
from app.schemas.planning import PlanningRequest
from app.services.scheduler import DeterministicScheduler
from app.repositories.destinations import InMemoryDestinationRepository
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_food_guide_specialities_by_district():
    """Verify regional dishes are accurately mapped to Karnataka districts."""
    service = get_local_food_guide_service()

    # Bengaluru
    blr_dishes = service.get_specialities_for_district("Bengaluru Urban")
    assert len(blr_dishes) > 0
    names = [d.name_en for d in blr_dishes]
    assert any("Benne Masala Dosa" in n for n in names)

    # Mysuru
    mys_dishes = service.get_specialities_for_district("Mysuru")
    assert len(mys_dishes) > 0
    mys_names = [d.name_en for d in mys_dishes]
    assert any("Mylari" in n or "Pak" in n for n in mys_names)

    # Mandya
    mandya_dishes = service.get_specialities_for_district("Mandya")
    assert len(mandya_dishes) > 0
    assert any("Ragi Mudde" in d.name_en for d in mandya_dishes)

    # Coastal Karavali / Mangaluru / Udupi
    udupi_dishes = service.get_specialities_for_district("Udupi")
    assert len(udupi_dishes) > 0
    assert any("Neer Dosa" in d.name_en for d in udupi_dishes)


def test_food_guide_dietary_filter():
    """Verify dietary preferences exclude non-conforming items."""
    service = get_local_food_guide_service()

    # Vegetarian only in Dakshina Kannada
    veg_dishes = service.get_specialities_for_district("Dakshina Kannada", dietary_preference="vegetarian")
    for d in veg_dishes:
        assert d.is_vegetarian is True
        assert d.contains_seafood is False
        assert d.contains_meat is False


def test_verified_eateries_provenance():
    """Verify verified restaurants have real addresses, hours, ratings, and no fabricated data."""
    service = get_local_food_guide_service()
    eateries = service.get_all_eateries()
    assert len(eateries) >= 15

    for e in eateries:
        assert e.id
        assert e.name_en
        assert e.name_kn
        assert e.district
        assert 11.0 <= e.latitude <= 19.0
        assert 74.0 <= e.longitude <= 79.0
        assert e.opening_hours
        assert e.average_cost_for_two_inr > 0
        assert e.google_maps_query
        assert e.verification_status == "VERIFIED_AUTHENTIC"
        assert e.source_name


def test_meal_recommendation_contextual():
    """Verify contextual meal recommendation with venue and maps action."""
    service = get_local_food_guide_service()

    # Breakfast in Gandhi Bazaar Bengaluru
    rec = service.recommend_meal(
        district="Bengaluru Urban",
        meal_type="breakfast",
        latitude=12.9423,
        longitude=77.5681,
        dietary_preference="vegetarian",
    )
    assert rec.meal_type == "Breakfast"
    assert rec.dish_name_en
    assert rec.restaurant_name_en
    assert "https://www.google.com/maps" in rec.map_search_url
    assert rec.estimated_cost_inr > 0
    assert rec.is_verified_eatery is True


def test_karnataka_events_calendar():
    """Verify canonical cultural events calendar contains key festivals with real metadata."""
    service = get_karnataka_events_service()
    all_events = service.get_all_events()
    assert len(all_events) >= 10

    event_ids = {e.id for e in all_events}
    assert "mysuru-dasara" in event_ids
    assert "dakshina-kannada-kambala" in event_ids
    assert "bhoota-kola-yakshagana-season" in event_ids
    assert "hampi-utsav" in event_ids

    dasara = next(e for e in all_events if e.id == "mysuru-dasara")
    assert dasara.image_url
    assert "wikimedia.org" in dasara.image_url
    assert dasara.start_month == 10
    assert dasara.district == "Mysuru"
    assert dasara.date_confidence == "CONFIRMED"


def test_date_aware_event_matching():
    """Verify date-aware matching returns festivals only when trip overlaps festival dates."""
    service = get_karnataka_events_service()

    # Trip overlapping Mysuru Dasara (2026-10-11 to 2026-10-20)
    dasara_trip = service.match_trip_events(
        start_date="2026-10-12",
        duration_days=4,
        corridor_districts=["KA-MYS", "KA-BLR"],
    )
    dasara_ids = {e.id for e in dasara_trip}
    assert "mysuru-dasara" in dasara_ids

    # Trip in June (should NOT include Mysuru Dasara)
    june_trip = service.match_trip_events(
        start_date="2026-06-15",
        duration_days=3,
        corridor_districts=["KA-MYS"],
    )
    june_ids = {e.id for e in june_trip}
    assert "mysuru-dasara" not in june_ids


def test_discovered_destinations_verified_images():
    """Verify discovered destinations like Tonnur Kere have verified authentic images."""
    from app.services.destination_image_service import get_destination_image_service
    svc = get_destination_image_service()
    meta = svc.get_verified_media_for_id("gaz-tonnur-kere")
    assert meta is not None
    assert meta.image_url is not None
    assert "wikimedia.org" in meta.image_url
    assert meta.verification_status == "VERIFIED_AUTHENTIC"

    kavale = svc.get_verified_media_for_id("gaz-kavaledurga-fort")
    assert kavale is not None
    assert kavale.image_url is not None


def test_api_food_endpoints():
    """Verify /food/specialities, /food/eateries, and /food/recommendation endpoints."""
    # Specialities
    res_spec = client.get("/api/v1/food/specialities?district=Mysuru")
    assert res_spec.status_code == 200
    data_spec = res_spec.json()
    assert len(data_spec) > 0
    assert any("Mylari" in d["name_en"] or "Pak" in d["name_en"] for d in data_spec)

    # Eateries
    res_eat = client.get("/api/v1/food/eateries?district=Bengaluru Urban")
    assert res_eat.status_code == 200
    data_eat = res_eat.json()
    assert len(data_eat) > 0
    assert any("Vidyarthi Bhavan" in e["name_en"] or "MTR" in e["name_en"] for e in data_eat)

    # Recommendation
    res_rec = client.get("/api/v1/food/recommendation?district=Mysuru&meal_type=breakfast")
    assert res_rec.status_code == 200
    data_rec = res_rec.json()
    assert data_rec["dish_name_en"]
    assert data_rec["map_search_url"]


def test_api_events_calendar_endpoints():
    """Verify /events/calendar and /events/happening-during-trip endpoints."""
    # Calendar
    res_cal = client.get("/api/v1/events/calendar?month=10")
    assert res_cal.status_code == 200
    data_cal = res_cal.json()
    assert any(e["id"] == "mysuru-dasara" for e in data_cal)

    # Happening during trip
    res_trip = client.get("/api/v1/events/happening-during-trip?start_date=2026-10-12&duration_days=3&districts=KA-MYS")
    assert res_trip.status_code == 200
    data_trip = res_trip.json()
    assert any(e["id"] == "mysuru-dasara" for e in data_trip)
    dasara_item = next(e for e in data_trip if e["id"] == "mysuru-dasara")
    assert dasara_item["image_url"] is not None
