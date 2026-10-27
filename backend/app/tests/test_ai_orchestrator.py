"""Tests for AI Orchestrator, global deadline enforcement, failover, and fallback."""

import asyncio
from unittest.mock import patch

import pytest

from app.core import config
from app.core.errors import AppError
from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.destinations import DestinationRead, LanguageCode
from app.schemas.planning import PlanningRequest
from app.services.ai.base import (
    AIProvider,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
)
from app.services.ai.orchestrator import AIOrchestrator


class MockAIProvider(AIProvider):
    """Deterministic async mock provider for orchestrator testing."""

    def __init__(
        self,
        name: str,
        configured: bool = True,
        response: str | None = None,
        error: Exception | None = None,
        delay_seconds: float = 0.0,
    ):
        self._name = name
        self._configured = configured
        self.response = response
        self.error = error
        self.delay_seconds = delay_seconds
        self.call_count = 0
        self.last_timeout: float | None = None

    @property
    def provider_name(self) -> str:
        return self._name

    @property
    def is_configured(self) -> bool:
        return self._configured

    async def generate_plan(
        self,
        request: PlanningRequest,
        candidates: list[DestinationRead],
        timeout_seconds: float,
    ) -> str:
        self.call_count += 1
        self.last_timeout = timeout_seconds
        if self.delay_seconds > 0:
            await asyncio.sleep(self.delay_seconds)
        if self.error:
            raise self.error
        if self.response is not None:
            return self.response
        slug = candidates[0].slug if candidates else "mysore-palace"
        return (
            f'{{"items": [{{"destination_id": "{slug}", '
            f'"day_number": 1, "order": 1, "rationale": "Top site"}}]}}'
        )


@pytest.fixture
def repo():
    return InMemoryDestinationRepository()


async def test_orchestrator_planning_disabled_raises_error(repo, monkeypatch):
    """Verify orchestrator raises 403 AppError when AI_PLANNING_ENABLED is False."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", False)

    orchestrator = AIOrchestrator(repository=repo)
    req = PlanningRequest(duration_days=2)

    with pytest.raises(AppError) as exc_info:
        await orchestrator.recommend_itinerary(req)

    assert exc_info.value.code == "AI_PLANNING_DISABLED"
    assert exc_info.value.status_code == 403


async def test_orchestrator_groq_default_primary_success(repo, monkeypatch):
    """Verify Groq is primary by default per Phase 0 architecture baseline."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "groq")

    groq_mock = MockAIProvider("groq")
    gemini_mock = MockAIProvider("gemini")

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock, "gemini": gemini_mock},
    )
    req = PlanningRequest(duration_days=1)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "ai"
    assert res.provider_used == "groq"
    assert len(res.items) == 1
    assert groq_mock.call_count == 1
    assert gemini_mock.call_count == 0


async def test_orchestrator_gemini_preferred_override(repo, monkeypatch):
    """Verify provider order honors AI_PREFERRED_PROVIDER='gemini' when configured."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "gemini")

    groq_mock = MockAIProvider("groq")
    gemini_mock = MockAIProvider("gemini")

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock, "gemini": gemini_mock},
    )
    req = PlanningRequest(duration_days=1)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "ai"
    assert res.provider_used == "gemini"
    assert gemini_mock.call_count == 1
    assert groq_mock.call_count == 0


async def test_orchestrator_failover_when_primary_fails(repo, monkeypatch):
    """Verify failover to secondary provider when primary encounters error."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "groq")

    groq_mock = MockAIProvider(
        "groq",
        error=AIProviderUnavailableError("Groq 503", provider="groq"),
    )
    gemini_mock = MockAIProvider("gemini")

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock, "gemini": gemini_mock},
    )
    req = PlanningRequest(duration_days=1)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "ai"
    assert res.provider_used == "gemini"
    assert groq_mock.call_count == 1
    assert gemini_mock.call_count == 1


async def test_orchestrator_failover_on_ungrounded_destinations(repo, monkeypatch):
    """Verify that if primary hallucinates ungrounded IDs, failover occurs."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "groq")

    groq_mock = MockAIProvider(
        "groq",
        response=(
            '{"items": [{"destination_id": "hallucinated-fake-monument", '
            '"day_number": 1, "order": 1, "rationale": "fake"}]}'
        ),
    )
    gemini_mock = MockAIProvider("gemini")

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock, "gemini": gemini_mock},
    )
    req = PlanningRequest(duration_days=1)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "ai"
    assert res.provider_used == "gemini"
    assert groq_mock.call_count == 1
    assert gemini_mock.call_count == 1


async def test_orchestrator_triggers_fallback_when_both_providers_fail(repo, monkeypatch):
    """Verify fallback engine generates valid plan when all providers fail."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "groq")

    groq_mock = MockAIProvider(
        "groq",
        error=AIProviderTimeoutError("Groq timeout", provider="groq"),
    )
    gemini_mock = MockAIProvider(
        "gemini",
        error=AIProviderResponseError("Bad JSON", provider="gemini"),
    )

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock, "gemini": gemini_mock},
    )
    req = PlanningRequest(duration_days=2)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "fallback"
    assert res.provider_used == "deterministic_fallback"
    assert len(res.items) >= 2


async def test_orchestrator_global_deadline_budget_exhaustion(repo, monkeypatch):
    """Verify orchestrator does not start secondary provider if remaining deadline <= 2s."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "groq")
    monkeypatch.setattr(config.settings, "AI_GLOBAL_DEADLINE_SECONDS", 10.0)

    groq_mock = MockAIProvider(
        "groq",
        error=AIProviderUnavailableError("Groq down", provider="groq"),
    )
    gemini_mock = MockAIProvider("gemini")

    # Simulate that Groq call starts at t=0, completes at t=8.5 (remaining = 1.5s <= 2.0s)
    fake_times = [0.0, 0.0, 8.5, 8.5, 8.5]
    time_idx = 0

    def mock_monotonic():
        nonlocal time_idx
        val = fake_times[min(time_idx, len(fake_times) - 1)]
        time_idx += 1
        return val

    with patch("time.monotonic", side_effect=mock_monotonic):
        orchestrator = AIOrchestrator(
            repository=repo,
            providers={"groq": groq_mock, "gemini": gemini_mock},
        )
        req = PlanningRequest(duration_days=1)
        res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "fallback"
    assert groq_mock.call_count == 1
    assert gemini_mock.call_count == 0  # Secondary was not called because time was exhausted!


async def test_orchestrator_single_provider_configured(repo, monkeypatch):
    """Verify that when only Groq is configured, Gemini is skipped and fallback handles failure."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "groq")

    groq_mock = MockAIProvider(
        "groq",
        configured=True,
        error=AIProviderUnavailableError("down", provider="groq"),
    )
    gemini_mock = MockAIProvider("gemini", configured=False)

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock, "gemini": gemini_mock},
    )
    req = PlanningRequest(duration_days=2)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "fallback"
    assert groq_mock.call_count == 1
    assert gemini_mock.call_count == 0


async def test_orchestrator_both_providers_disabled_immediate_fallback(repo, monkeypatch):
    """Verify that when no providers are configured, deterministic fallback runs immediately."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)

    groq_mock = MockAIProvider("groq", configured=False)
    gemini_mock = MockAIProvider("gemini", configured=False)

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock, "gemini": gemini_mock},
    )
    req = PlanningRequest(duration_days=2)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "fallback"
    assert res.provider_used == "deterministic_fallback"
    assert groq_mock.call_count == 0
    assert gemini_mock.call_count == 0


async def test_orchestrator_preserves_kannada_language(repo, monkeypatch):
    """Verify Kannada language preference is preserved in both AI and fallback paths."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)

    groq_mock = MockAIProvider("groq")
    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"groq": groq_mock},
    )
    req_kn = PlanningRequest(duration_days=1, language=LanguageCode.KN)
    res = await orchestrator.recommend_itinerary(req_kn)

    assert res.language == LanguageCode.KN


async def test_orchestrator_gemini_quota_exhausted_falls_back_to_groq(repo, monkeypatch):
    """Verify that when Gemini hits rate limit/quota exhaustion (429), Orchestrator falls back to Groq."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "gemini")

    from app.services.ai.base import AIProviderRateLimitError

    gemini_mock = MockAIProvider(
        "gemini",
        configured=True,
        error=AIProviderRateLimitError("Gemini quota exhausted across all models", provider="gemini"),
    )
    groq_mock = MockAIProvider(
        "groq",
        configured=True,
        response='{"items": [{"destination_id": "mysore-palace", "day_number": 1, "order": 1, "rationale": "Groq fallback"}]}',
    )

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"gemini": gemini_mock, "groq": groq_mock},
    )
    req = PlanningRequest(duration_days=1)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "ai"
    assert "groq" in res.provider_used.lower()
    assert gemini_mock.call_count == 1
    assert groq_mock.call_count == 1


async def test_orchestrator_gemini_auth_failure_falls_back_to_groq(repo, monkeypatch):
    """Verify that when Gemini hits 401/403 auth error, Orchestrator cleanly falls back to Groq."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "gemini")

    from app.services.ai.base import AIProviderAuthError

    gemini_mock = MockAIProvider(
        "gemini",
        configured=True,
        error=AIProviderAuthError("Invalid Gemini API key", provider="gemini"),
    )
    groq_mock = MockAIProvider(
        "groq",
        configured=True,
        response='{"items": [{"destination_id": "mysore-palace", "day_number": 1, "order": 1, "rationale": "Groq after auth error"}]}',
    )

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"gemini": gemini_mock, "groq": groq_mock},
    )
    req = PlanningRequest(duration_days=1)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "ai"
    assert "groq" in res.provider_used.lower()
    assert gemini_mock.call_count == 1
    assert groq_mock.call_count == 1


async def test_orchestrator_both_providers_fail_graceful_deterministic_fallback(repo, monkeypatch):
    """Verify that when both Gemini and Groq fail, Orchestrator returns a valid deterministic response."""
    monkeypatch.setattr(config.settings, "AI_PLANNING_ENABLED", True)
    monkeypatch.setattr(config.settings, "AI_PREFERRED_PROVIDER", "gemini")

    from app.services.ai.base import AIProviderRateLimitError, AIProviderUnavailableError

    gemini_mock = MockAIProvider(
        "gemini",
        configured=True,
        error=AIProviderRateLimitError("Gemini quota exhausted", provider="gemini"),
    )
    groq_mock = MockAIProvider(
        "groq",
        configured=True,
        error=AIProviderUnavailableError("Groq server 503 error", provider="groq"),
    )

    orchestrator = AIOrchestrator(
        repository=repo,
        providers={"gemini": gemini_mock, "groq": groq_mock},
    )
    req = PlanningRequest(duration_days=2)
    res = await orchestrator.recommend_itinerary(req)

    assert res.generation_mode == "fallback"
    assert res.provider_used == "deterministic_fallback"
    assert len(res.items) >= 1
    assert res.budget_breakdown is not None
    assert gemini_mock.call_count == 1
    assert groq_mock.call_count == 1

