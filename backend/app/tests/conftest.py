"""Pytest fixtures and environment configuration."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from app.core.config import settings
from app.repositories.trips import InMemoryTripRepository

# Add project root to sys.path so data/ and other root packages are importable
REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

TEST_JWT_SECRET = "test-secret-key-1234567890-test-secret-32bytes"


@pytest.fixture(autouse=True)
def configure_test_environment(monkeypatch):
    """Ensure consistent, predictable test settings independent of developer .env files."""
    monkeypatch.setattr(settings, "APP_ENV", "test")
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", TEST_JWT_SECRET)
    monkeypatch.setattr(settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(settings, "AI_ENABLE_LIVE_PROVIDERS", False)
    monkeypatch.setattr(settings, "GEMINI_ENABLED", False)
    monkeypatch.setattr(settings, "GROQ_ENABLED", False)

    import app.repositories.trips as trips_module

    trips_module._trip_repository_instance = InMemoryTripRepository()
    yield
    trips_module._trip_repository_instance = None
