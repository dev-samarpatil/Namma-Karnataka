"""Tests for Phase 3 centralized AI configuration."""

from app.core.config import Settings


def test_ai_settings_default_safe_state(monkeypatch):
    """Verify AI planning and providers are disabled by default."""
    for key in [
        "AI_PLANNING_ENABLED",
        "GROQ_ENABLED",
        "GEMINI_ENABLED",
        "GROQ_API_KEY",
        "GEMINI_API_KEY",
        "AI_PREFERRED_PROVIDER",
    ]:
        monkeypatch.delenv(key, raising=False)
    cfg = Settings(_env_file=None)
    assert cfg.AI_PLANNING_ENABLED is False
    assert cfg.GROQ_ENABLED is False
    assert cfg.GEMINI_ENABLED is False
    assert cfg.GROQ_API_KEY is None
    assert cfg.GEMINI_API_KEY is None
    assert cfg.AI_PREFERRED_PROVIDER == "groq"
    assert cfg.AI_PROVIDER_TIMEOUT_SECONDS == 12.0
    assert cfg.AI_GLOBAL_DEADLINE_SECONDS == 28.0
    assert cfg.AI_MAX_RETRIES == 0
    assert cfg.is_groq_configured is False
    assert cfg.is_gemini_configured is False


def test_ai_provider_independent_enablement():
    """Verify that enabling one provider does not affect or disable the other."""
    # Only Groq enabled with key
    cfg_groq = Settings(
        AI_PLANNING_ENABLED=True,
        GROQ_ENABLED=True,
        GROQ_API_KEY="gsk_mock_test_key_12345",
        GEMINI_ENABLED=False,
    )
    assert cfg_groq.is_groq_configured is True
    assert cfg_groq.is_gemini_configured is False

    # Only Gemini enabled with key
    cfg_gemini = Settings(
        AI_PLANNING_ENABLED=True,
        GEMINI_ENABLED=True,
        GEMINI_API_KEY="AIzaSyMockTestKey67890",
        GROQ_ENABLED=False,
    )
    assert cfg_gemini.is_groq_configured is False
    assert cfg_gemini.is_gemini_configured is True

    # Both enabled with keys
    cfg_both = Settings(
        AI_PLANNING_ENABLED=True,
        GROQ_ENABLED=True,
        GROQ_API_KEY="gsk_mock_test_key_12345",
        GEMINI_ENABLED=True,
        GEMINI_API_KEY="AIzaSyMockTestKey67890",
    )
    assert cfg_both.is_groq_configured is True
    assert cfg_both.is_gemini_configured is True


def test_missing_keys_disable_configured_status():
    """Verify that a provider marked enabled without an API key is not considered configured."""
    cfg_empty_groq = Settings(
        GROQ_ENABLED=True,
        GROQ_API_KEY="",
        GEMINI_ENABLED=True,
        GEMINI_API_KEY="valid-key",
    )
    assert cfg_empty_groq.is_groq_configured is False
    assert cfg_empty_groq.is_gemini_configured is True

    cfg_none_gemini = Settings(
        GROQ_ENABLED=True,
        GROQ_API_KEY="valid-key",
        GEMINI_ENABLED=True,
        GEMINI_API_KEY=None,
    )
    assert cfg_none_gemini.is_groq_configured is True
    assert cfg_none_gemini.is_gemini_configured is False


def test_custom_timeouts_and_deadlines():
    """Verify timeout and deadline customization."""
    cfg = Settings(
        AI_PROVIDER_TIMEOUT_SECONDS=8,
        AI_GLOBAL_DEADLINE_SECONDS=20,
        AI_MAX_RETRIES=1,
        AI_PREFERRED_PROVIDER="groq",
    )
    assert cfg.AI_PROVIDER_TIMEOUT_SECONDS == 8
    assert cfg.AI_GLOBAL_DEADLINE_SECONDS == 20
    assert cfg.AI_MAX_RETRIES == 1
    assert cfg.AI_PREFERRED_PROVIDER == "groq"

    cfg_gemini_preferred = Settings(AI_PREFERRED_PROVIDER="gemini")
    assert cfg_gemini_preferred.AI_PREFERRED_PROVIDER == "gemini"
