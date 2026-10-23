"""Integration tests for POST /api/v1/planning/recommendations endpoint."""

from fastapi.testclient import TestClient

from app.core import config
from app.main import app

client = TestClient(app)


def test_planning_api_disabled_by_default(monkeypatch):
    """Verify endpoint returns 403 when AI_PLANNING_ENABLED is False."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", False)

    payload = {
        "language": "en",
        "origin_label": "Bengaluru",
        "duration_days": 2,
        "pace": "balanced",
    }
    response = client.post("/api/v1/planning/recommendations", json=payload)
    assert response.status_code == 403
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "AI_PLANNING_DISABLED"
    assert "X-Request-ID" in response.headers


def test_planning_api_success_with_fallback(monkeypatch):
    """Verify endpoint returns 200 with deterministic fallback when live providers disabled."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "GROQ_ENABLED", False)
    monkeypatch.setattr(config.settings, "GEMINI_ENABLED", False)

    payload = {
        "language": "en",
        "origin_label": "Bengaluru",
        "duration_days": 2,
        "pace": "relaxed",
    }
    response = client.post("/api/v1/planning/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["generation_mode"] == "fallback"
    assert data["provider_used"] == "deterministic_fallback"
    assert data["duration_days"] == 2
    assert len(data["items"]) == 4  # 2 days * 2 stops
    assert "X-Request-ID" in response.headers


def test_planning_api_kannada_language(monkeypatch):
    """Verify Kannada language preference is preserved in fallback response."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "GROQ_ENABLED", False)
    monkeypatch.setattr(config.settings, "GEMINI_ENABLED", False)

    payload = {
        "language": "kn",
        "duration_days": 1,
        "pace": "relaxed",
    }
    response = client.post("/api/v1/planning/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "kn"
    assert len(data["items"]) == 2


def test_planning_api_input_validation_errors(monkeypatch):
    """Verify invalid input parameters are cleanly rejected with 422."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)

    # Invalid language code
    bad_lang = client.post("/api/v1/planning/recommendations", json={"language": "fr"})
    assert bad_lang.status_code == 422

    # Negative / out-of-range duration days
    bad_duration = client.post("/api/v1/planning/recommendations", json={"duration_days": 0})
    assert bad_duration.status_code == 422

    excessive_duration = client.post("/api/v1/planning/recommendations", json={"duration_days": 15})
    assert excessive_duration.status_code == 422

    # Invalid pace
    bad_pace = client.post("/api/v1/planning/recommendations", json={"pace": "hyperactive"})
    assert bad_pace.status_code == 422


def test_destination_endpoints_remain_unaffected():
    """Verify existing Phase 1 and Phase 2 destination endpoints still function perfectly."""
    res = client.get("/api/v1/destinations")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] > 0
