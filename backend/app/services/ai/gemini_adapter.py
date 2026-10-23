"""Google Gemini AI provider adapter using Generative Language REST API."""

from __future__ import annotations

import httpx

from app.core.config import settings
from app.schemas.destinations import DestinationRead
from app.schemas.planning import PlanningRequest
from app.services.ai.base import (
    AIProviderAuthError,
    AIProviderRateLimitError,
    AIProviderResponseError,
    AIProviderTimeoutError,
    AIProviderUnavailableError,
    build_candidate_prompt_context,
    build_system_prompt,
)


class GeminiAdapter:
    """Adapter for Google Gemini 1.5 Flash API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key or settings.GEMINI_API_KEY
        self._model = model or settings.GEMINI_MODEL
        self._client = client

    @property
    def provider_name(self) -> str:
        return "gemini"

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
        """Call Gemini generateContent endpoint asynchronously with JSON response mime-type."""
        if not self._api_key:
            raise AIProviderAuthError("Missing Gemini API key", provider=self.provider_name)

        catalog_context = build_candidate_prompt_context(candidates, language=request.language)
        system_prompt = build_system_prompt(language=request.language)

        dist_str = ", ".join(request.preferred_districts) if request.preferred_districts else "Any"
        cat_str = ", ".join(request.categories) if request.categories else "Any"

        user_content = (
            f"Trip Request:\n"
            f"- Origin: {request.origin_label}\n"
            f"- Duration: {request.duration_days} days\n"
            f"- Preferred Districts: {dist_str}\n"
            f"- Preferred Categories: {cat_str}\n"
            f"- Travel Pace: {request.pace}\n"
            f"- Prioritize Offbeat: {request.is_offbeat_preferred}\n"
            f"- Notes: {request.notes or 'None'}\n\n"
            f"{catalog_context}\n\n"
            f"Generate a {request.duration_days}-day itinerary choosing ONLY from the catalog."
        )

        full_prompt = f"{system_prompt}\n\nUser Request & Permitted Catalog:\n{user_content}"

        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self._model}:generateContent"
        )

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

        try:
            if self._client is not None:
                response = await self._client.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=timeout_seconds,
                )
            else:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    response = await client.post(
                        endpoint,
                        headers=headers,
                        json=payload,
                    )

            if response.status_code in (400, 401, 403):
                raise AIProviderAuthError(
                    f"Gemini authentication/permission error: HTTP {response.status_code}",
                    provider=self.provider_name,
                )
            if response.status_code == 429:
                raise AIProviderRateLimitError(
                    "Gemini quota exhausted or rate limit hit",
                    provider=self.provider_name,
                )
            if response.status_code >= 500:
                err_detail = ""
                try:
                    err_json = response.json()
                    err_msg = err_json.get("error", {}).get("message", "")
                    if err_msg:
                        err_detail = f" - {err_msg}"
                except Exception:
                    pass
                raise AIProviderUnavailableError(
                    f"Gemini server error: HTTP {response.status_code}{err_detail}",
                    provider=self.provider_name,
                )
            if response.status_code != 200:
                err_detail = ""
                try:
                    err_json = response.json()
                    err_msg = err_json.get("error", {}).get("message", "")
                    if err_msg:
                        err_detail = f" - {err_msg}"
                except Exception:
                    pass
                raise AIProviderUnavailableError(
                    f"Unexpected HTTP status {response.status_code}{err_detail}",
                    provider=self.provider_name,
                )

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

            return text_content.strip()

        except httpx.TimeoutException as exc:
            raise AIProviderTimeoutError(
                f"Request timed out after {timeout_seconds:.1f}s",
                provider=self.provider_name,
            ) from exc
        except httpx.RequestError as exc:
            raise AIProviderUnavailableError(
                f"Network communication failed: {exc}",
                provider=self.provider_name,
            ) from exc
