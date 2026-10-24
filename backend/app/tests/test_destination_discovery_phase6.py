"""Tests for Phase 6 Destination Discovery enhancements.

Verifies:
1. Destination listing supports fee_type ('free', 'paid', 'unknown').
2. Destination listing supports min_duration and max_duration.
3. Destination listing supports sort_by ('name', 'district', 'duration_asc', 'duration_desc').
4. Destination details include properly populated media array and primary_image_url.
5. GET /api/v1/destinations/{id_or_slug}/nearby returns valid nearby attractions,
   transit hubs, and places.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_destination_media_present_in_list_and_detail(client: TestClient):
    """Destinations contain verified media records and primary_image_url."""
    res = client.get("/api/v1/destinations?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) > 0

    first = data["items"][0]
    assert "primary_image_url" in first
    assert "media" in first
    assert len(first["media"]) > 0

    # Test single destination detail
    slug = first["slug"]
    detail_res = client.get(f"/api/v1/destinations/{slug}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["primary_image_url"] is not None
    assert len(detail["media"]) >= 1
    media_item = detail["media"][0]
    assert "attribution" in media_item
    assert "source_name" in media_item
    assert "caption_en" in media_item


def test_destination_fee_type_filter(client: TestClient):
    """fee_type parameter correctly filters by entry fee status."""
    free_res = client.get("/api/v1/destinations?fee_type=free&limit=50")
    assert free_res.status_code == 200
    free_items = free_res.json()["items"]
    for item in free_items:
        min_fee = item.get("entry_fee_min_inr")
        max_fee = item.get("entry_fee_max_inr")
        assert (min_fee is not None and min_fee == 0.0) or (
            max_fee is not None and max_fee == 0.0
        )

    paid_res = client.get("/api/v1/destinations?fee_type=paid&limit=50")
    assert paid_res.status_code == 200
    paid_items = paid_res.json()["items"]
    for item in paid_items:
        min_fee = item.get("entry_fee_min_inr")
        max_fee = item.get("entry_fee_max_inr")
        assert (min_fee and min_fee > 0) or (max_fee and max_fee > 0)


def test_destination_duration_filters(client: TestClient):
    """min_duration and max_duration properly filter visit duration."""
    res = client.get("/api/v1/destinations?min_duration=60&max_duration=120&limit=50")
    assert res.status_code == 200
    items = res.json()["items"]
    for item in items:
        dur = item.get("estimated_visit_minutes")
        assert dur is not None
        assert 60 <= dur <= 120


def test_destination_sorting(client: TestClient):
    """sort_by parameter sorts destinations deterministically."""
    name_res = client.get("/api/v1/destinations?sort_by=name&limit=20")
    assert name_res.status_code == 200
    names = [item["name_en"] for item in name_res.json()["items"]]
    assert names == sorted(names, key=lambda s: s.lower())

    dur_asc = client.get("/api/v1/destinations?sort_by=duration_asc&limit=20")
    assert dur_asc.status_code == 200
    durs = [item.get("estimated_visit_minutes") or 9999 for item in dur_asc.json()["items"]]
    assert durs == sorted(durs)



def test_destination_nearby_endpoint(client: TestClient):
    """GET /api/v1/destinations/{id_or_slug}/nearby returns geospatial recommendations."""
    nearby_res = client.get("/api/v1/destinations/mysore-palace/nearby?radius_km=30")
    assert nearby_res.status_code == 200
    data = nearby_res.json()
    assert data["destination_slug"] == "mysore-palace"
    assert "nearby_attractions" in data
    assert "nearby_transit" in data
    assert "nearby_restaurants" in data
    assert "nearby_accommodations" in data

    # Distance to nearby attractions should be calculated and <= radius_km
    for attr in data["nearby_attractions"]:
        assert attr["distance_km"] <= 30.0
        assert attr["slug"] != "mysore-palace"  # Does not include itself

    # Nearby transit hubs should have valid distance
    for hub in data["nearby_transit"]:
        assert hub["distance_km"] >= 0.0
        assert hub["hub_type"] in ["rail", "bus"]
