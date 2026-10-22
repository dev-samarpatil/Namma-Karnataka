"""Basic health check and root endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify that root endpoint returns operational scaffold message."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Namma Karnataka API Scaffold is running" in data["message"]


def test_health_endpoint():
    """Verify that /api/v1/health returns healthy status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "Namma Karnataka API"
    assert data["environment"] == "development"
