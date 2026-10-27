"""Tests for Groq and Gemini AI provider adapters with mocked HTTP boundaries."""

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.repositories.destinations import InMemoryDestinationRepository
from app.schemas.destinations import DestinationFilterParams
from app.schemas.planning import PlanningRequest
from app.services.ai.base import (
    AIProviderAuthError,
    AIProviderRateLimitError,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
)
from app.services.ai.gemini_adapter import GeminiAdapter
from app.services.ai.groq_adapter import GroqAdapter


@pytest.fixture
def test_candidates():
    repo = InMemoryDestinationRepository()
    candidates, _ = repo.list_destinations(DestinationFilterParams(limit=5), published_only=True)
    return candidates


@pytest.fixture
def test_request():
    return PlanningRequest(duration_days=2, pace="balanced")


# ==============================================================================
# Groq Adapter Tests
# ==============================================================================


async def test_groq_adapter_success(test_request, test_candidates):
    """Verify Groq adapter formats prompt and returns assistant message text."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": (
                        '{"items": [{"destination_id": "mysore-palace", '
                        '"day_number": 1, "order": 1, "rationale": "Historic"}]}'
                    )
                }
            }
        ]
    }
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GroqAdapter(
        api_key="gsk_mock_valid_key",
        model="llama-3.3-70b-versatile",
        client=mock_client,
    )
    res = await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)

    assert "mysore-palace" in res
    mock_client.post.assert_awaited_once()
    call_kwargs = mock_client.post.call_args[1]
    assert call_kwargs["timeout"] == pytest.approx(5.0, abs=0.2)
    assert "Bearer gsk_mock_valid_key" in call_kwargs["headers"]["Authorization"]


async def test_groq_adapter_auth_error(test_request, test_candidates):
    """Verify Groq adapter raises AIProviderAuthError on 401."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 401
    mock_response.text = "Unauthorized: Invalid API key"
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GroqAdapter(api_key="bad_key", client=mock_client)
    with pytest.raises(AIProviderAuthError) as exc_info:
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)
    assert "bad_key" not in str(exc_info.value)


async def test_groq_adapter_rate_limit(test_request, test_candidates):
    """Verify Groq adapter raises AIProviderRateLimitError on 429."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 429
    mock_response.text = "Rate limit exceeded"
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GroqAdapter(api_key="key", client=mock_client)
    with pytest.raises(AIProviderRateLimitError):
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)


async def test_groq_adapter_timeout(test_request, test_candidates):
    """Verify Groq adapter converts httpx timeout into AIProviderTimeoutError."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("Timed out"))

    adapter = GroqAdapter(api_key="key", client=mock_client)
    with pytest.raises(AIProviderTimeoutError):
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=2.0)


async def test_groq_adapter_server_unavailable(test_request, test_candidates):
    """Verify Groq adapter raises AIProviderUnavailableError on 503 or network failure."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 503
    mock_response.text = "Service Unavailable"
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GroqAdapter(api_key="key", client=mock_client)
    with pytest.raises(AIProviderUnavailableError):
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)

    # Network failure
    mock_client.post = AsyncMock(side_effect=httpx.NetworkError("DNS lookup failed"))
    with pytest.raises(AIProviderUnavailableError):
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)


async def test_groq_adapter_empty_or_malformed_response(test_request, test_candidates):
    """Verify Groq adapter raises AIProviderResponseError when response lacks choices."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {"choices": []}
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GroqAdapter(api_key="key", client=mock_client)
    with pytest.raises(AIProviderResponseError):
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)


# ==============================================================================
# Gemini Adapter Tests
# ==============================================================================


async def test_gemini_adapter_success(test_request, test_candidates):
    """Verify Gemini adapter formats contents and returns text."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": (
                                '{"items": [{"destination_id": "hampi-monuments", '
                                '"day_number": 1, "order": 1, "rationale": "UNESCO site"}]}'
                            )
                        }
                    ]
                },
                "finishReason": "STOP",
            }
        ]
    }
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GeminiAdapter(
        api_key="AIzaSy_mock_valid_key",
        model="gemini-2.5-flash",
        client=mock_client,
    )
    res = await adapter.generate_plan(test_request, test_candidates, timeout_seconds=6.0)

    assert "hampi-monuments" in res
    mock_client.post.assert_awaited_once()
    call_args = mock_client.post.call_args
    assert "x-goog-api-key" in call_args[1]["headers"]
    assert call_args[1]["timeout"] == pytest.approx(6.0, abs=0.2)


async def test_gemini_adapter_auth_error(test_request, test_candidates):
    """Verify Gemini adapter raises AIProviderAuthError on 400 invalid key or 403."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 400
    mock_response.text = '{"error": {"message": "API_KEY_INVALID"}}'
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GeminiAdapter(api_key="invalid_gemini_key", client=mock_client)
    with pytest.raises(AIProviderAuthError) as exc_info:
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)
    assert "invalid_gemini_key" not in str(exc_info.value)


async def test_gemini_adapter_safety_blocked(test_request, test_candidates):
    """Verify Gemini adapter handles finishReason=SAFETY by raising AIProviderResponseError."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "candidates": [
            {
                "finishReason": "SAFETY",
                "content": {"parts": []},
            }
        ]
    }
    mock_client.post = AsyncMock(return_value=mock_response)

    adapter = GeminiAdapter(api_key="key", client=mock_client)
    with pytest.raises(AIProviderResponseError) as exc_info:
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=5.0)
    assert "SAFETY" in str(exc_info.value)


async def test_gemini_adapter_timeout_and_network_error(test_request, test_candidates):
    """Verify Gemini adapter converts timeout and network errors."""
    mock_client = MagicMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("Read timed out"))

    adapter = GeminiAdapter(api_key="key", client=mock_client)
    with pytest.raises(AIProviderTimeoutError):
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=3.0)

    mock_client.post = AsyncMock(side_effect=httpx.ConnectError("Connection refused"))
    with pytest.raises(AIProviderUnavailableError):
        await adapter.generate_plan(test_request, test_candidates, timeout_seconds=3.0)


async def test_gemini_adapter_model_fallback_on_429(test_request, test_candidates):
    """Verify Gemini adapter recovers from primary model 429 quota exhaustion using secondary model."""
    mock_client = MagicMock(spec=httpx.AsyncClient)

    # First call: primary model returns 429 quota exhausted
    resp_429 = MagicMock(spec=httpx.Response)
    resp_429.status_code = 429
    resp_429.text = "Quota exceeded for gemini-2.5-flash"

    # Second call: fallback model returns 200 OK
    resp_200 = MagicMock(spec=httpx.Response)
    resp_200.status_code = 200
    resp_200.json.return_value = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {
                    "parts": [{"text": '{"items": [{"destination_id": "mysore-palace", "day_number": 1, "order": 1, "rationale": "Great"}]}'}]
                },
            }
        ]
    }

    mock_client.post = AsyncMock(side_effect=[resp_429, resp_200])

    adapter = GeminiAdapter(
        api_key="valid_key",
        models=["gemini-2.5-flash", "gemini-2.0-flash"],
        client=mock_client,
    )
    res = await adapter.generate_plan(test_request, test_candidates, timeout_seconds=10.0)

    assert "mysore-palace" in res
    assert adapter.last_model_used == "gemini-2.0-flash"
    assert mock_client.post.await_count == 2


async def test_gemini_adapter_model_fallback_on_404(test_request, test_candidates):
    """Verify Gemini adapter recovers when configured model returns 404 not found."""
    mock_client = MagicMock(spec=httpx.AsyncClient)

    resp_404 = MagicMock(spec=httpx.Response)
    resp_404.status_code = 404
    resp_404.text = "Model not found"

    resp_200 = MagicMock(spec=httpx.Response)
    resp_200.status_code = 200
    resp_200.json.return_value = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {
                    "parts": [{"text": '{"items": [{"destination_id": "hampi", "day_number": 1, "order": 1, "rationale": "Ruins"}]}'}]
                },
            }
        ]
    }

    mock_client.post = AsyncMock(side_effect=[resp_404, resp_200])

    adapter = GeminiAdapter(
        api_key="valid_key",
        models=["invalid-model-name", "gemini-1.5-flash"],
        client=mock_client,
    )
    res = await adapter.generate_plan(test_request, test_candidates, timeout_seconds=10.0)

    assert "hampi" in res
    assert adapter.last_model_used == "gemini-1.5-flash"

