"""Google Gemini AI provider adapter using Generative Language REST API."""

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

logger = get_logger("app.services.ai.gemini_adapter")


class GeminiAdapter:
    """Adapter for Google Gemini models with automatic Flash-class model fallback."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        models: list[str] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key or settings.GEMINI_API_KEY
        if models:
            self._models = list(models)
        elif model:
            self._models = [model]
        else:
            primary = getattr(settings, "GEMINI_PRIMARY_MODEL", None) or settings.GEMINI_MODEL
            fallbacks = getattr(settings, "GEMINI_FALLBACK_MODELS", [])
            seen: set[str] = set()
            ordered: list[str] = []
            for m in [primary, *fallbacks]:
                if m and m not in seen:
                    seen.add(m)
                    ordered.append(m)
            self._models = ordered or ["gemini-2.0-flash", "gemini-1.5-flash"]

        self._model = self._models[0]
        self._last_model_used: str | None = None
        self._client = client

    @property
    def provider_name(self) -> str:
        return "gemini"

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
            and settings.GEMINI_ENABLED
        )

    async def generate_plan(
        self,
        request: PlanningRequest,
        candidates: list[DestinationRead],
        timeout_seconds: float,
    ) -> str:
        """Call Gemini generateContent endpoint with automatic model failover."""
        if not self._api_key:
            raise AIProviderAuthError("Missing Gemini API key", provider=self.provider_name)

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

        full_prompt = f"{system_prompt}\n\nUser Request & Permitted Catalog:\n{user_content}"
        headers = {
            "x-goog-api-key": self._api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": full_prompt}],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }

        start_time = time.monotonic()
        last_error: Exception | None = None

        for idx, model_id in enumerate(self._models):
            elapsed = time.monotonic() - start_time
            remaining_time = timeout_seconds - elapsed
            if remaining_time <= 1.5:
                logger.warning(
                    "Gemini overall timeout exhausted before trying model '%s' (%.1fs remaining)",
                    model_id,
                    remaining_time,
                )
                break

            model_timeout = min(remaining_time, float(settings.AI_PROVIDER_TIMEOUT_SECONDS))
            endpoint = (
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent"
            )

            logger.info(
                "Calling Gemini model [%d/%d]: '%s' (timeout=%.1fs)",
                idx + 1,
                len(self._models),
                model_id,
                model_timeout,
            )

            max_retries = max(0, settings.AI_MAX_RETRIES)
            for attempt in range(max_retries + 1):
                try:
                    if self._client is not None:
                        response = await self._client.post(
                            endpoint,
                            headers=headers,
                            json=payload,
                            timeout=model_timeout,
                        )
                    else:
                        async with httpx.AsyncClient(timeout=model_timeout) as client:
                            response = await client.post(
                                endpoint,
                                headers=headers,
                                json=payload,
                            )

                    # 1. Authentication / Permission Error (401 / 403 / 400 invalid key)
                    if response.status_code in (401, 403) or (
                        response.status_code == 400 and ("API_KEY" in response.text or "key" in response.text.lower())
                    ):
                        logger.error(
                            "Gemini authentication/permission failure: HTTP %d for model '%s'",
                            response.status_code,
                            model_id,
                        )
                        raise AIProviderAuthError(
                            f"Gemini authentication/permission error: HTTP {response.status_code}",
                            provider=self.provider_name,
                        )

                    # 2. Rate Limit or Quota Exhaustion (429)
                    if response.status_code == 429:
                        logger.warning(
                            "Gemini model '%s' quota exhausted or rate limit reached (HTTP 429). Attempting fallback model.",
                            model_id,
                        )
                        last_error = AIProviderRateLimitError(
                            f"Gemini model '{model_id}' quota exhausted (HTTP 429)",
                            provider=self.provider_name,
                        )
                        break  # Advance to next eligible model in self._models

                    # 3. Model Not Found / Unsupported (404)
                    if response.status_code == 404:
                        logger.warning(
                            "Gemini model '%s' is unavailable or not found (HTTP 404). Attempting fallback model.",
                            model_id,
                        )
                        last_error = AIProviderModelError(
                            f"Gemini model '{model_id}' not found or unsupported (HTTP 404)",
                            provider=self.provider_name,
                        )
                        break  # Advance to next eligible model

                    # 4. Upstream Server Error (5xx)
                    if response.status_code >= 500:
                        err_detail = ""
                        try:
                            err_json = response.json()
                            err_msg = err_json.get("error", {}).get("message", "")
                            if err_msg:
                                err_detail = f" - {err_msg}"
                        except Exception:
                            pass
                        logger.warning(
                            "Gemini server error on model '%s': HTTP %d%s (attempt %d/%d)",
                            model_id,
                            response.status_code,
                            err_detail,
                            attempt + 1,
                            max_retries + 1,
                        )
                        last_error = AIProviderUnavailableError(
                            f"Gemini server error: HTTP {response.status_code}{err_detail}",
                            provider=self.provider_name,
                        )
                        if attempt < max_retries:
                            await asyncio.sleep(0.5)
                            continue
                        break  # Advance to next eligible model

                    # 5. Other unexpected HTTP codes
                    if response.status_code != 200:
                        err_detail = ""
                        try:
                            err_json = response.json()
                            err_msg = err_json.get("error", {}).get("message", "")
                            if err_msg:
                                err_detail = f" - {err_msg}"
                        except Exception:
                            pass
                        logger.warning(
                            "Gemini unexpected status %d on model '%s'%s",
                            response.status_code,
                            model_id,
                            err_detail,
                        )
                        last_error = AIProviderUnavailableError(
                            f"Unexpected HTTP status {response.status_code}{err_detail}",
                            provider=self.provider_name,
                        )
                        break

                    data = response.json()
                    candidates_list = data.get("candidates")
                    if not candidates_list or not isinstance(candidates_list, list):
                        raise AIProviderResponseError(
                            "No candidate responses generated by Gemini",
                            provider=self.provider_name,
                        )

                    first_candidate = candidates_list[0]
                    finish_reason = first_candidate.get("finishReason")
                    if finish_reason in ("SAFETY", "RECITATION", "BLOCKLIST"):
                        raise AIProviderResponseError(
                            f"Gemini content generation refused: finishReason={finish_reason}",
                            provider=self.provider_name,
                        )

                    content_obj = first_candidate.get("content", {})
                    parts = content_obj.get("parts", [])
                    if not parts or not isinstance(parts, list):
                        raise AIProviderResponseError(
                            "Empty parts in candidate content", provider=self.provider_name
                        )

                    text_content = parts[0].get("text")
                    if not text_content or not isinstance(text_content, str):
                        raise AIProviderResponseError(
                            "No text content found in parts", provider=self.provider_name
                        )

                    self._last_model_used = model_id
                    self._model = model_id
                    logger.info("Gemini model '%s' successfully generated plan response", model_id)
                    return text_content.strip()

                except (AIProviderAuthError, AIProviderResponseError):
                    raise
                except httpx.TimeoutException:
                    logger.warning(
                        "Gemini model '%s' timed out after %.1fs (attempt %d/%d)",
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
                        "Gemini network communication failed for model '%s': %s",
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
            f"All eligible Gemini models failed: {self._models}",
            provider=self.provider_name,
        )
