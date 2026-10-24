"""Base protocols, exception classes, and shared contracts for AI providers."""

from __future__ import annotations

from typing import Protocol

from app.schemas.destinations import DestinationRead
from app.schemas.planning import PlanningRequest

# ============================================================================
# Normalized Provider Exceptions
# ============================================================================


class AIProviderError(Exception):
    """Base exception for all AI provider integration failures."""

    def __init__(self, code: str, message: str, provider: str, status_code: int = 502) -> None:
        super().__init__(f"[{provider}] {code}: {message}")
        self.code = code
        self.message = message
        self.provider = provider
        self.status_code = status_code


class AIProviderAuthError(AIProviderError):
    """Provider authentication or API key failure."""

    def __init__(self, message: str, provider: str) -> None:
        super().__init__(
            code="AI_PROVIDER_AUTH_ERROR",
            message=message,
            provider=provider,
            status_code=502,
        )


class AIProviderRateLimitError(AIProviderError):
    """Provider quota exhausted or rate limit hit."""

    def __init__(self, message: str, provider: str) -> None:
        super().__init__(
            code="AI_PROVIDER_RATE_LIMIT",
            message=message,
            provider=provider,
            status_code=503,
        )


class AIProviderTimeoutError(AIProviderError):
    """Provider call exceeded allocated timeout."""

    def __init__(self, message: str, provider: str) -> None:
        super().__init__(
            code="AI_PROVIDER_TIMEOUT",
            message=message,
            provider=provider,
            status_code=504,
        )


class AIProviderUnavailableError(AIProviderError):
    """Provider upstream service error or network drop."""

    def __init__(self, message: str, provider: str) -> None:
        super().__init__(
            code="AI_PROVIDER_UNAVAILABLE",
            message=message,
            provider=provider,
            status_code=503,
        )


class AIProviderResponseError(AIProviderError):
    """Provider returned empty, refusal/blocked, or malformed content."""

    def __init__(self, message: str, provider: str) -> None:
        super().__init__(
            code="AI_PROVIDER_RESPONSE_ERROR",
            message=message,
            provider=provider,
            status_code=502,
        )


# ============================================================================
# Provider Interface Protocol
# ============================================================================


class AIProvider(Protocol):
    """Contract that all AI provider adapters must implement."""

    @property
    def provider_name(self) -> str:
        """Normalized lowercase provider identifier (e.g. 'groq', 'gemini')."""
        ...

    @property
    def is_configured(self) -> bool:
        """Whether the provider has valid credentials and is enabled in settings."""
        ...

    async def generate_plan(
        self,
        request: PlanningRequest,
        candidates: list[DestinationRead],
        timeout_seconds: float,
    ) -> str:
        """Call provider model asynchronously and return raw JSON string response.

        Must raise a normalized AIProviderError subclass on failure.
        """
        ...


def build_candidate_prompt_context(candidates: list[DestinationRead], language: str = "en") -> str:
    """Format candidate destinations as a concise allowlisted catalog for the LLM prompt."""
    lines: list[str] = [
        "PERMITTED DESTINATION CATALOG (You MUST select ONLY from this list using the exact slug):"
    ]
    for c in candidates:
        name = c.slug
        summary = ""
        for t in c.translations:
            if t.language_code == language:
                name = t.name
                summary = t.summary or ""
                break
        lines.append(
            f'- slug: "{c.slug}" | name: "{name}" | category: {c.category} | '
            f"district: {c.district_code} | offbeat: {c.is_offbeat} | summary: {summary}"
        )
    return "\n".join(lines)


def build_system_prompt(language: str = "en") -> str:
    """Build the system instructions enforcing catalog grounding and JSON response."""
    lang_name = "Kannada" if language == "kn" else "English"
    return (
        f"You are the expert Karnataka travel planning engine for Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ).\n"
        f"Your role is to recommend destinations and arrange them into day-by-day itineraries.\n\n"
        f"CRITICAL RULES:\n"
        f"1. STRICT CATALOG GROUNDING: You MUST choose destinations ONLY from the\n"
        f"   PERMITTED DESTINATION CATALOG provided in the user prompt.\n"
        f"2. Under NO circumstance should you invent or recommend any place not in the catalog.\n"
        f"3. Every item must have:\n"
        f'   - "destination_id": the EXACT slug of the permitted destination\n'
        f'   - "day_number": integer from 1 to total duration\n'
        f'   - "order": sequence order integer (1, 2, 3...)\n'
        f'   - "rationale": 1-2 sentences explaining why this destination fits in {lang_name}.\n'
        f"4. Output MUST be valid JSON adhering to:\n"
        f'   {{"items": [{{"destination_id": "...", "day_number": 1, '
        f'"order": 1, "rationale": "..."}}], "notes": "..."}}\n'
        f"Do not include markdown fences or extra commentary. Return only valid JSON.\n"
    )
