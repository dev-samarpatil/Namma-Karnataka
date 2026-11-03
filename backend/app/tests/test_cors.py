"""CORS security and regression tests for production and development origins."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app

client = TestClient(app)

VERCEL_ORIGIN = "https://namma-karnataka-eight.vercel.app"
LOCALHOST_ORIGIN = "http://localhost:5173"
DISALLOWED_ORIGIN = "https://unauthorized-travel-site.example.com"


def test_cors_allowed_vercel_origin():
    """Verify production Vercel frontend origin receives access-control-allow-origin."""
    headers = {"Origin": VERCEL_ORIGIN}
    response = client.get("/api/v1/destinations", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == VERCEL_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_allowed_localhost_origin():
    """Verify local development origin receives access-control-allow-origin."""
    headers = {"Origin": LOCALHOST_ORIGIN}
    response = client.get("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == LOCALHOST_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_disallowed_origin():
    """Verify unauthorized external origins do not receive access-control-allow-origin."""
    headers = {"Origin": DISALLOWED_ORIGIN}
    response = client.get("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


def test_cors_options_preflight():
    """Verify HTTP OPTIONS preflight returns status 200 with allowed methods and headers."""
    headers = {
        "Origin": VERCEL_ORIGIN,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
    }
    response = client.options("/api/v1/planning/recommendations", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == VERCEL_ORIGIN
    assert "POST" in response.headers.get("access-control-allow-methods", "")
    assert "OPTIONS" in response.headers.get("access-control-allow-methods", "")
    assert response.headers.get("access-control-allow-credentials") == "true"


def test_cors_authenticated_requests_header_exposure():
    """Verify authenticated requests expose required pagination and tracing headers."""
    headers = {
        "Origin": VERCEL_ORIGIN,
        "Authorization": "Bearer mock-auth-token",
    }
    response = client.get("/api/v1/destinations", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == VERCEL_ORIGIN
    assert response.headers.get("access-control-allow-credentials") == "true"
    exposed = response.headers.get("access-control-expose-headers", "")
    assert "Content-Range" in exposed
    assert "X-Request-ID" in exposed


def test_cors_origins_settings_parsing():
    """Verify Settings._parse_cors_origins handles comma-separated, JSON, and list formats."""
    # Test comma-separated string
    s1 = Settings(CORS_ORIGINS="https://site1.com, https://site2.com")
    assert s1.CORS_ORIGINS == ["https://site1.com", "https://site2.com"]

    # Test JSON string
    s2 = Settings(CORS_ORIGINS='["https://site1.com", "https://site2.com"]')
    assert s2.CORS_ORIGINS == ["https://site1.com", "https://site2.com"]

    # Test native list
    s3 = Settings(CORS_ORIGINS=["https://site1.com", "https://site2.com"])
    assert s3.CORS_ORIGINS == ["https://site1.com", "https://site2.com"]
