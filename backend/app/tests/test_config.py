"""Configuration loading and safe default tests."""

from app.core.config import Settings


def test_configuration_safe_defaults():
    """Verify settings initialize with expected defaults without requiring environment variables."""
    cfg = Settings(_env_file=None)
    assert cfg.APP_NAME == "Namma Karnataka API"
    assert cfg.APP_VERSION == "0.1.0"
    assert cfg.API_V1_STR == "/api/v1"
    assert "http://localhost:5173" in cfg.CORS_ORIGINS
    assert cfg.AI_ENABLE_LIVE_PROVIDERS is False
    assert cfg.GROQ_API_KEY is None
    assert cfg.GEMINI_API_KEY is None
    assert cfg.SUPABASE_URL is None


def test_cors_origins_parsing():
    """Verify CORS origins list configuration."""
    cfg = Settings(CORS_ORIGINS=["https://nammakarnataka.example.com"])
    assert "https://nammakarnataka.example.com" in cfg.CORS_ORIGINS
