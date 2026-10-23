"""Health and readiness endpoint tests."""

from fastapi.testclient import TestClient

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


def test_health_endpoint():
    """Verify GET /api/v1/health liveness probe."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "namma-karnataka-api"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data
    assert "X-Request-ID" in response.headers


def test_readiness_endpoint():
    """Verify GET /api/v1/ready readiness probe."""
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["ready"] is True
    assert "checks" in data
    assert data["checks"]["configuration"] == "valid"
    assert "X-Request-ID" in response.headers


def test_custom_request_id_propagation():
    """Verify incoming X-Request-ID header is sanitized and preserved."""
    custom_id = "test-req-id-12345678"
    response = client.get("/api/v1/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == custom_id
