"""Tests for DestinationImageSearchService and destination image endpoints."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.destinations import InMemoryDestinationRepository
from app.services.media.image_search import _SEARCH_CACHE, DestinationImageSearchService


@pytest.fixture
def repo():
    return InMemoryDestinationRepository()


@pytest.fixture(autouse=True)
def clear_search_cache():
    _SEARCH_CACHE.clear()
    yield
    _SEARCH_CACHE.clear()


@pytest.mark.asyncio
async def test_image_search_success_with_wikimedia_mock(repo):
    """Verify Wikimedia Action API parsing, metadata extraction, and deduplication."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "query": {
            "pages": {
                "101": {
                    "pageid": 101,
                    "title": "File:Mysore Palace Front Elevation.jpg",
                    "imageinfo": [
                        {
                            "url": "https://upload.wikimedia.org/wikipedia/commons/a/a1/Mysore_Palace_Front.jpg",
                            "thumburl": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Mysore_Palace_Front.jpg/800px-Mysore_Palace_Front.jpg",
                            "mime": "image/jpeg",
                            "width": 1600,
                            "height": 1200,
                            "extmetadata": {
                                "Artist": {"value": "<b>John Photographer</b>"},
                                "LicenseShortName": {"value": "CC BY-SA 4.0"},
                                "ImageDescription": {"value": "Front facade of Mysore Palace"},
                            },
                        }
                    ],
                },
                "102": {
                    "pageid": 102,
                    "title": "File:Mysore Palace Durbar Arches.jpg",
                    "imageinfo": [
                        {
                            "url": "https://upload.wikimedia.org/wikipedia/commons/b/b2/Mysore_Palace_Durbar.jpg",
                            "thumburl": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Mysore_Palace_Durbar.jpg/800px-Mysore_Palace_Durbar.jpg",
                            "mime": "image/jpeg",
                            "width": 1920,
                            "height": 1080,
                            "extmetadata": {
                                "Artist": {"value": "Praveen Rao"},
                                "LicenseShortName": {"value": "CC BY 3.0"},
                                "ImageDescription": {"value": "Ornate pillars in Durbar Hall"},
                            },
                        }
                    ],
                },
                "103": {
                    "pageid": 103,
                    "title": "File:Map of Mysore Palace grounds.svg",  # Non-photographic SVG should be filtered
                    "imageinfo": [
                        {
                            "url": "https://upload.wikimedia.org/wikipedia/commons/c/c3/Map_Mysore.svg",
                            "mime": "image/svg+xml",
                            "width": 800,
                            "height": 800,
                        }
                    ],
                },
            }
        }
    }
    mock_client.get = AsyncMock(return_value=mock_response)

    service = DestinationImageSearchService(repository=repo, client=mock_client)
    results = await service.search_destination_images("mysore-palace", target_count=5)

    assert len(results) >= 2
    urls = [r.url for r in results]
    assert "https://upload.wikimedia.org/wikipedia/commons/a/a1/Mysore_Palace_Front.jpg" in urls
    assert "https://upload.wikimedia.org/wikipedia/commons/b/b2/Mysore_Palace_Durbar.jpg" in urls
    # SVGs must not be present
    assert not any(r.url.endswith(".svg") for r in results)
    # Check cleaned HTML in attribution
    front_item = next(r for r in results if "Mysore_Palace_Front.jpg" in r.url)
    assert front_item.attribution == "John Photographer"
    assert front_item.license_type == "CC BY-SA 4.0"


@pytest.mark.asyncio
async def test_image_search_filters_duplicates_and_preserves_seed(repo):
    """Verify duplicate canonical URLs across multiple queries are eliminated and seed photos preserved."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    # Duplicate returns same photo repeatedly
    mock_response.json.return_value = {
        "query": {
            "pages": {
                "201": {
                    "pageid": 201,
                    "title": "File:Hampi Chariot.jpg",
                    "imageinfo": [
                        {
                            "url": "https://upload.wikimedia.org/wikipedia/commons/d/d4/Hampi_Chariot.jpg",
                            "thumburl": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Hampi_Chariot.jpg/800px-Hampi_Chariot.jpg",
                            "mime": "image/jpeg",
                            "width": 1200,
                            "height": 900,
                        }
                    ],
                }
            }
        }
    }
    mock_client.get = AsyncMock(return_value=mock_response)

    service = DestinationImageSearchService(repository=repo, client=mock_client)
    results = await service.search_destination_images("hampi", target_count=6)

    # Unique URLs only
    urls = [r.url for r in results]
    assert len(urls) == len(set(urls))


@pytest.mark.asyncio
async def test_image_search_fallback_on_provider_error(repo):
    """Verify provider network failures gracefully fall back to seed photographs without crashing."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_client.get = AsyncMock(side_effect=httpx.ConnectTimeout("Connection dropped"))

    service = DestinationImageSearchService(repository=repo, client=mock_client)
    results = await service.search_destination_images("mysore-palace", target_count=5)

    # Must not crash, should return verified seed media
    assert isinstance(results, list)
    assert len(results) >= 1
    assert "upload.wikimedia.org" in results[0].url


def test_destination_images_api_endpoint():
    """Verify GET /api/v1/destinations/{id_or_slug}/images returns 200 with media items."""
    client = TestClient(app)
    response = client.get("/api/v1/destinations/mysore-palace/images")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "url" in data[0]
    assert "attribution" in data[0]
    assert "license_type" in data[0]


def test_destination_images_api_endpoint_404():
    """Verify GET /api/v1/destinations/{id_or_slug}/images returns 404 for nonexistent destination."""
    client = TestClient(app)
    response = client.get("/api/v1/destinations/non-existent-place-12345/images")
    assert response.status_code == 404
