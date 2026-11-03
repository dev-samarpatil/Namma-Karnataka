"""Health and readiness endpoint tests."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint returns service identification and scaffold message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "namma-karnataka-api"
    assert "running" in data["message"].lower()
    assert "X-Request-ID" in response.headers


def test_health_endpoints():
    """Verify both /health and /api/v1/health liveness probes with GET and HEAD."""
    for path in ["/health", "/api/v1/health"]:
        response = client.get(path)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "namma-karnataka-api"
        assert "version" in data
        assert "environment" in data
        assert "timestamp" in data
        assert "X-Request-ID" in response.headers

        # Verify HEAD request also succeeds
        head_res = client.head(path)
        assert head_res.status_code == 200


def test_readiness_endpoints():
    """Verify both /ready and /api/v1/ready readiness probes."""
    for path in ["/ready", "/api/v1/ready"]:
        response = client.get(path)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["ready"] is True
        assert "checks" in data
        assert data["checks"]["configuration"] == "valid"
        assert data["checks"]["runtime"] == "ready"
        assert "catalog" in data["checks"]
        assert "X-Request-ID" in response.headers


def test_readiness_missing_optional_ai():
    """Verify missing optional AI integrations does not mark readiness false."""
    with patch.object(settings, "AI_PLANNING_ENABLED", False):
        response = client.get("/health")
        assert response.status_code == 200
        ready_res = client.get("/ready")
        assert ready_res.status_code == 200
        ready_data = ready_res.json()
        assert ready_data["ready"] is True
        assert ready_data["checks"]["ai_providers"] == "disabled"


def test_readiness_database_unavailable():
    """Verify that when the destination catalog/database is empty, status reports degraded."""
    mock_repo = MagicMock()
    mock_repo.list_destinations.return_value = ([], 0)

    with patch("app.api.v1.health.get_destination_repository", return_value=mock_repo):
        response = client.get("/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["ready"] is False
        assert data["status"] == "degraded"
        assert data["checks"]["catalog"] == "empty"


def test_root_destinations_redirect():
    """Verify root /destinations and subpaths redirect with 307 to canonical /api/v1/destinations preserving queries."""
    response = client.get("/destinations", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == f"{settings.API_V1_STR}/destinations"

    # Query parameters preserved
    response_with_query = client.get("/destinations?limit=100&offset=0", follow_redirects=False)
    assert response_with_query.status_code == 307
    assert (
        response_with_query.headers["location"]
        == f"{settings.API_V1_STR}/destinations?limit=100&offset=0"
    )

    # Subpath and query preserved (e.g. media/proxy)
    response_proxy = client.get(
        "/destinations/media/proxy?url=https%3A%2F%2Fexample.com%2Fimg.jpg",
        follow_redirects=False,
    )
    assert response_proxy.status_code == 307
    assert (
        response_proxy.headers["location"]
        == f"{settings.API_V1_STR}/destinations/media/proxy?url=https%3A%2F%2Fexample.com%2Fimg.jpg"
    )

    # Events catchall redirect
    response_events = client.get("/events?district_code=KA-MYS", follow_redirects=False)
    assert response_events.status_code == 307
    assert (
        response_events.headers["location"] == f"{settings.API_V1_STR}/events?district_code=KA-MYS"
    )


def test_custom_request_id_propagation():
    """Verify incoming X-Request-ID header is sanitized and preserved."""
    custom_id = "test-req-id-12345678"
    response = client.get("/api/v1/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom_id
