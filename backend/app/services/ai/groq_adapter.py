"""Groq AI provider adapter using OpenAI-compatible chat completions API."""

from __future__ import annotations

import asyncio
import time

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.schemas.destinations import DestinationRead
from app.schemas.planning import PlanningRequest
from app.services.ai.base import (
    AIProviderAuthError,
    AIProviderModelError,
    AIProviderRateLimitError,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
    build_candidate_prompt_context,
    build_system_prompt,
)

logger = get_logger("app.services.ai.groq_adapter")


class GroqAdapter:
    """Adapter for Groq Llama models with automatic fallback."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        models: list[str] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key or settings.GROQ_API_KEY
        if models:
            self._models = list(models)
        elif model:
            self._models = [model]
        else:
            primary = getattr(settings, "GROQ_PRIMARY_MODEL", None) or settings.GROQ_MODEL
            fallbacks = getattr(settings, "GROQ_FALLBACK_MODELS", [])
            seen: set[str] = set()
            ordered: list[str] = []
            for m in [primary, *fallbacks]:
                if m and m not in seen:
                    seen.add(m)
                    ordered.append(m)
            self._models = ordered or ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

        self._model = self._models[0]
        self._last_model_used: str | None = None
        self._client = client
        self._endpoint = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def provider_name(self) -> str:
        return "groq"

    @property
    def models(self) -> list[str]:
        return list(self._models)

    @property
    def last_model_used(self) -> str | None:
        return self._last_model_used

    @property
    def is_configured(self) -> bool:
        return (
            bool(self._api_key)
            and not str(self._api_key).startswith("placeholder")
            and settings.GROQ_ENABLED
        )

    async def generate_plan(
        self,
        request: PlanningRequest,
        candidates: list[DestinationRead],
        timeout_seconds: float,
    ) -> str:
        """Call Groq chat completions endpoint with automatic model failover."""
        if not self._api_key:
            raise AIProviderAuthError("Missing Groq API key", provider=self.provider_name)

        catalog_context = build_candidate_prompt_context(candidates, language=request.language)
        system_prompt = build_system_prompt(language=request.language)

        dist_str = ", ".join(request.preferred_districts) if request.preferred_districts else "Any"
        cat_str = ", ".join(request.categories) if request.categories else "Any"
        budget_str = (
            f"₹{request.budget_limit_inr:,.0f} ({request.budget_scope})"
            if request.budget_limit_inr
            else "No explicit cap"
        )

        user_content = (
            f"Trip Request:\n"
            f"- Origin: {request.origin_label}\n"
            f"- Duration: {request.duration_days} days\n"
            f"- Preferred Districts: {dist_str}\n"
            f"- Preferred Categories: {cat_str}\n"
            f"- Travel Pace: {request.pace}\n"
            f"- Budget Limit: {budget_str}\n"
            f"- Prioritize Offbeat: {request.is_offbeat_preferred}\n"
            f"- Notes: {request.notes or 'None'}\n\n"
            f"{catalog_context}\n\n"
            f"Generate a {request.duration_days}-day itinerary choosing ONLY from the catalog."
        )

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        start_time = time.monotonic()
        last_error: Exception | None = None

        for idx, model_id in enumerate(self._models):
            elapsed = time.monotonic() - start_time
            remaining_time = timeout_seconds - elapsed
            if remaining_time <= 1.5:
                logger.warning(
                    "Groq overall timeout exhausted before trying model '%s' (%.1fs remaining)",
                    model_id,
                    remaining_time,
                )
                break

            model_timeout = min(remaining_time, float(settings.AI_PROVIDER_TIMEOUT_SECONDS))
            logger.info(
                "Calling Groq model [%d/%d]: '%s' (timeout=%.1fs)",
                idx + 1,
                len(self._models),
                model_id,
                model_timeout,
            )

            payload = {
                "model": model_id,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            }

            max_retries = max(0, settings.AI_MAX_RETRIES)
            for attempt in range(max_retries + 1):
                try:
                    if self._client is not None:
                        response = await self._client.post(
                            self._endpoint,
                            headers=headers,
                            json=payload,
                            timeout=model_timeout,
                        )
                    else:
                        async with httpx.AsyncClient(timeout=model_timeout) as client:
                            response = await client.post(
                                self._endpoint,
                                headers=headers,
                                json=payload,
                            )

                    if response.status_code in (401, 403):
                        logger.error(
                            "Groq authentication error: HTTP %d for model '%s'",
                            response.status_code,
                            model_id,
                        )
                        raise AIProviderAuthError(
                            f"Authentication failed: HTTP {response.status_code}",
                            provider=self.provider_name,
                        )

                    if response.status_code == 429:
                        logger.warning(
                            "Groq model '%s' rate limit or quota exceeded (HTTP 429). Attempting fallback model.",
                            model_id,
                        )
                        last_error = AIProviderRateLimitError(
                            f"Rate limit or token quota exceeded on model '{model_id}'",
                            provider=self.provider_name,
                        )
                        break

                    if response.status_code == 404:
                        logger.warning(
                            "Groq model '%s' not found or unsupported (HTTP 404). Attempting fallback model.",
                            model_id,
                        )
                        last_error = AIProviderModelError(
                            f"Groq model '{model_id}' not found or unsupported (HTTP 404)",
                            provider=self.provider_name,
                        )
                        break

                    if response.status_code >= 500:
                        logger.warning(
                            "Groq server error on model '%s': HTTP %d (attempt %d/%d)",
                            model_id,
                            response.status_code,
                            attempt + 1,
                            max_retries + 1,
                        )
                        last_error = AIProviderUnavailableError(
                            f"Upstream server error: HTTP {response.status_code}",
                            provider=self.provider_name,
                        )
                        if attempt < max_retries:
                            await asyncio.sleep(0.5)
                            continue
                        break

                    if response.status_code != 200:
                        err_detail = ""
                        try:
                            err_json = response.json()
                            err_msg = err_json.get("error", {}).get("message", "")
                            if err_msg:
                                err_detail = f" - {err_msg}"
                        except Exception:
                            pass
                        last_error = AIProviderUnavailableError(
                            f"Unexpected HTTP status {response.status_code}{err_detail}",
                            provider=self.provider_name,
                        )
                        break

                    data = response.json()
                    choices = data.get("choices")
                    if not choices or not isinstance(choices, list):
                        raise AIProviderResponseError(
                            "No choices returned in response", provider=self.provider_name
                        )

                    message = choices[0].get("message", {})
                    content = message.get("content")
                    if not content or not isinstance(content, str):
                        raise AIProviderResponseError(
                            "Empty message content in response", provider=self.provider_name
                        )

                    self._last_model_used = model_id
                    self._model = model_id
                    logger.info("Groq model '%s' successfully generated plan response", model_id)
                    return content.strip()

                except (AIProviderAuthError, AIProviderResponseError):
                    raise
                except httpx.TimeoutException:
                    logger.warning(
                        "Groq model '%s' timed out after %.1fs (attempt %d/%d)",
                        model_id,
                        model_timeout,
                        attempt + 1,
                        max_retries + 1,
                    )
                    last_error = AIProviderTimeoutError(
                        f"Request for model '{model_id}' timed out after {model_timeout:.1f}s",
                        provider=self.provider_name,
                    )
                    if attempt < max_retries:
                        continue
                    break
                except httpx.RequestError as exc:
                    logger.warning(
                        "Groq network communication failed for model '%s': %s",
                        model_id,
                        exc,
                    )
                    last_error = AIProviderUnavailableError(
                        f"Network communication failed for model '{model_id}': {exc}",
                        provider=self.provider_name,
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(0.5)
                        continue
                    break

        if last_error:
            raise last_error

        raise AIProviderUnavailableError(
            f"All eligible Groq models failed: {self._models}",
            provider=self.provider_name,
        )
