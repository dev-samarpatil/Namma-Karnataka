"""Unit and API integration tests for Destination Repository and endpoints."""

from fastapi.testclient import TestClient

from app.main import app
from app.repositories.destinations import (
    InMemoryDestinationRepository,
    haversine_distance_meters,
)
from app.schemas.destinations import (
    DestinationCategory,
    DestinationFilterParams,
)

client = TestClient(app)


def test_haversine_distance():
    # Distance between Bengaluru (12.9716, 77.5946) and Mysuru (12.3051, 76.6551) is ~128 km
    dist = haversine_distance_meters(12.9716, 77.5946, 12.3051, 76.6551)
    assert 125_000 < dist < 135_000  # meters


def test_repo_loads_curated_destinations():
    repo = InMemoryDestinationRepository()
    params = DestinationFilterParams(limit=20, offset=0)
    items, total = repo.list_destinations(params, published_only=True)

    assert total >= 10
    assert len(items) >= 10
    # Mysore Palace should be in the seed
    palace = repo.get_by_slug("mysore-palace")
    assert palace is not None
    assert palace.district_code == "KA-MYS"
    assert palace.category == DestinationCategory.ARCHITECTURE


def test_repo_filter_by_district():
    repo = InMemoryDestinationRepository()
    params = DestinationFilterParams(district="KA-MYS", limit=10)
    items, total = repo.list_destinations(params)

    assert total >= 1
    for item in items:
        assert item.district_code == "KA-MYS"


def test_repo_filter_by_category():
    repo = InMemoryDestinationRepository()
    params = DestinationFilterParams(category=DestinationCategory.WATERFALL, limit=10)
    items, total = repo.list_destinations(params)

    assert total >= 2
    for item in items:
        assert item.category == DestinationCategory.WATERFALL


def test_repo_filter_by_is_offbeat():
    repo = InMemoryDestinationRepository()
    params = DestinationFilterParams(is_offbeat=True, limit=10)
    items, total = repo.list_destinations(params)

    assert total >= 1
    for item in items:
        assert item.is_offbeat is True


def test_repo_search_keyword():
    repo = InMemoryDestinationRepository()
    params = DestinationFilterParams(q="Hampi", limit=10)
    items, total = repo.list_destinations(params)

    assert total >= 1
    assert any("hampi" in item.slug for item in items)


def test_repo_pagination_bounds():
    repo = InMemoryDestinationRepository()
    params_page1 = DestinationFilterParams(limit=3, offset=0)
    items1, total = repo.list_destinations(params_page1)
    assert len(items1) == 3

    params_page2 = DestinationFilterParams(limit=3, offset=3)
    items2, _ = repo.list_destinations(params_page2)
    assert len(items2) == 3

    # Check distinct pages
    ids1 = {d.id for d in items1}
    ids2 = {d.id for d in items2}
    assert ids1.isdisjoint(ids2)


def test_repo_list_nearby():
    repo = InMemoryDestinationRepository()
    # Near Mysuru center (12.30, 76.65) within 30 km
    nearby = repo.list_nearby(lat=12.30, lon=76.65, radius_meters=30_000, limit=5)
    assert len(nearby) >= 1
    closest_dest, dist = nearby[0]
    assert closest_dest.slug == "mysore-palace"
    assert dist < 5_000  # Less than 5 km from center


def test_repo_published_only_filter():
    mock_destinations = [
        {
            "id": "22222222-2222-4222-8222-222222222201",
            "slug": "published-site",
            "district_code": "KA-MYS",
            "category": "nature",
            "content_status": "published",
            "access_status": "open_reported",
            "verification_status": "source_checked",
            "active": True,
            "translations": [
                {
                    "language_code": "en",
                    "name": "Published Site",
                    "translation_status": "human_reviewed",
                },
                {
                    "language_code": "kn",
                    "name": "ಪ್ರಕಟಿತ ತಾಣ",
                    "translation_status": "human_reviewed",
                },
            ],
            "sources": [],
        },
        {
            "id": "22222222-2222-4222-8222-222222222202",
            "slug": "draft-site",
            "district_code": "KA-MYS",
            "category": "nature",
            "content_status": "draft",
            "access_status": "unknown",
            "verification_status": "needs_review",
            "active": True,
            "translations": [
                {
                    "language_code": "en",
                    "name": "Draft Site",
                    "translation_status": "needs_review",
                },
                {
                    "language_code": "kn",
                    "name": "ಕರಡು ತಾಣ",
                    "translation_status": "needs_review",
                },
            ],
            "sources": [],
        },
    ]
    repo = InMemoryDestinationRepository(destinations_data=mock_destinations, districts_data=[])
    params = DestinationFilterParams(limit=10)

    # When published_only=True, draft-site must NOT be returned
    items, total = repo.list_destinations(params, published_only=True)
    assert total == 1
    assert items[0].slug == "published-site"

    # When published_only=False, both are returned
    items_all, total_all = repo.list_destinations(params, published_only=False)
    assert total_all == 2


def test_api_list_destinations():
    response = client.get("/api/v1/destinations?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 5
    assert data["limit"] == 5
    assert data["offset"] == 0


def test_api_get_destination_by_slug():
    response = client.get("/api/v1/destinations/mysore-palace")
    assert response.status_code == 200
    data = response.json()
    assert data["slug"] == "mysore-palace"
    assert data["district_code"] == "KA-MYS"


def test_api_get_destination_not_found():
    response = client.get("/api/v1/destinations/non-existent-place")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "DESTINATION_NOT_FOUND"
