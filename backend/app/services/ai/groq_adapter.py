"""Groq AI provider adapter using OpenAI-compatible chat completions API."""

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


class GroqAdapter:
    """Adapter for Groq Llama 3 API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key = api_key or settings.GROQ_API_KEY
        self._model = model or settings.GROQ_MODEL
        self._client = client
        self._endpoint = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def provider_name(self) -> str:
        return "groq"

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
        """Call Groq chat completions endpoint asynchronously with structured JSON mode."""
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
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        try:
            if self._client is not None:
                response = await self._client.post(
                    self._endpoint,
                    headers=headers,
                    json=payload,
                    timeout=timeout_seconds,
                )
            else:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    response = await client.post(
                        self._endpoint,
                        headers=headers,
                        json=payload,
                    )

            if response.status_code in (401, 403):
                raise AIProviderAuthError(
                    f"Authentication failed: HTTP {response.status_code}",
                    provider=self.provider_name,
                )
            if response.status_code == 429:
                raise AIProviderRateLimitError(
                    "Rate limit or token quota exceeded",
                    provider=self.provider_name,
                )
            if response.status_code >= 500:
                raise AIProviderUnavailableError(
                    f"Upstream server error: HTTP {response.status_code}",
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

            return content.strip()

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
