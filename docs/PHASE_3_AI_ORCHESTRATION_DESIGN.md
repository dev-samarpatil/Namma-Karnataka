# NAMMA KARNATAKA
## Phase 3 AI Orchestration Design Specification — Adapters, Validation, and Fallback Engine

**Document ID:** NK-PH3-DES-001  
**Version:** 1.0  
**Status:** Approved Architecture Baseline  
**Prerequisites:** Phase 0 ADR-004, Phase 2 Database Design & Curated Destination Repository  
**Primary Language/Framework:** Python 3.11+, FastAPI, Pydantic v2  

---

## 1. Executive Summary & Purpose

This document defines the architectural specification for **Phase 3 of Namma Karnataka**. It establishes the multi-provider AI orchestration foundation that powers personalized Karnataka travel recommendations while strictly enforcing data truthfulness, anti-hallucination boundaries, and deterministic offline resilience.

### Core Non-Negotiable Rules
1. **AI Proposes, Repository Grounding Validates:** LLMs may only recommend destinations that exist within the curated catalogue provided in the prompt context. Any destination ID or slug produced by the model that is unrecognized is rejected.
2. **Authoritative Catalogue Metadata:** The model is never the source of truth for coordinates, entry fees, operating hours, district names, or summaries. All returned destination metadata is reconstructed from the trusted destination repository.
3. **Honest Unknowns:** Missing fees remain `NULL` (never fabricated as ₹0). Missing operating hours remain `NULL`. Straight-line distances are never misrepresented as driving routes or travel times.
4. **Independent Providers & Bounded Failover:** Groq and Google Gemini operate as independent adapters behind a unified `AIProvider` Protocol. A global deadline of 28 seconds enforces per-call remaining-time budgeting.
5. **Deterministic Offline Fallback:** If both AI providers fail, time out, or produce invalid responses, a local deterministic fallback engine groups curated destinations using stable sorting and clustering rules, returning a transparently tagged `generation_mode: "fallback"` response.
6. **Bilingual Parity:** English (`en`) and Kannada (`kn`) are first-class citizens. Language selection is strictly preserved across success, failover, fallback, and error envelopes.

---

## 2. Architecture & Data Flow

```
                      +----------------------------------+
                      | POST /api/v1/planning/recommendations
                      +----------------------------------+
                                       |
                                       v
                      +----------------------------------+
                      |     PlanningRequest Validation    | (Language, Duration, Districts,
                      |          (Pydantic v2)           |  Categories, Pace, Offbeat)
                      +----------------------------------+
                                       |
                                       v
                      +----------------------------------+
                      |      AIOrchestrator Service      | Starts Global Deadline Timer
                      |   (Global Deadline: 28 seconds)  | (Checks Remaining Seconds Budget)
                      +----------------------------------+
                                       |
                      +----------------+----------------+
                      | Fetch Curated Destination Candidates
                      | from DestinationRepository
                      | (Filter active & published items)
                      +----------------+----------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v (Attempt Primary: Groq)               v (Attempt Secondary: Gemini)
         +-------------------+                   +-------------------+
         |    GroqAdapter    |                   |   GeminiAdapter   |
         | (Timeout <= 12s)  |                   | (Timeout <= 15s)  |
         +-------------------+                   +-------------------+
                   |                                       |
                   +-------------------+-------------------+
                                       | Raw AI Output
                                       v
                      +----------------------------------+
                      |      OutputParsing & Grounding   |
                      |   1. Strip JSON Markdown fences  |
                      |   2. Validate Pydantic schema    |
                      |   3. Enforce Catalog Grounding:  |
                      |      Reject unrecognized IDs     |
                      |   4. Reconstruct trusted metadata|
                      |      from DestinationRepository  |
                      +----------------------------------+
                                       |
                       +---------------+---------------+
                       |                               |
              [Validation Success]            [All Providers Failed / Timeout]
                       |                               |
                       v                               v
         +---------------------------+   +---------------------------+
         | PlanningRecommendationResponse | DeterministicFallbackEngine |
         | generation_mode: "ai"     |   | - Filter curated catalog  |
         | provider_used: "groq"     |   | - Stable cluster & order  |
         +---------------------------+   | - generation_mode: fallback|
                       |                 +---------------------------+
                       |                               |
                       +---------------+---------------+
                                       |
                                       v
                      +----------------------------------+
                      |    FastAPI JSON HTTP Response    |
                      +----------------------------------+
```

---

## 3. Provider Protocol & Interface Specification

### 3.1 Interface Definition
All AI providers implement a common Python `Protocol`:

```python
class AIProvider(Protocol):
    @property
    def provider_name(self) -> str:
        """Machine-readable name: 'groq' or 'gemini'."""
        ...

    @property
    def is_configured(self) -> bool:
        """True if the provider has valid API credentials configured."""
        ...

    async def generate_recommendations(
        self,
        request: PlanningRequest,
        candidates: list[DestinationRead],
        timeout_seconds: float,
    ) -> RawAIPlanResponse:
        """Generate structured destination recommendations using provider LLM."""
        ...
```

### 3.2 Normalized Provider Exceptions
All vendor-specific HTTP and SDK exceptions are caught within the adapter and mapped to normalized provider exceptions:
- `AIProviderError` — Base exception for provider failures.
- `AIProviderAuthError` — Invalid or missing API key (HTTP 401/403).
- `AIProviderRateLimitError` — Rate limit or quota exhausted (HTTP 429).
- `AIProviderTimeoutError` — Call exceeded the remaining deadline budget.
- `AIProviderUnavailableError` — Upstream server error or network connection drop (HTTP 500/502/503).
- `AIProviderResponseError` — Response was empty, refusal/blocked, or malformed unparseable text.

---

## 4. Bounded Execution Budget & Global Deadline

To protect against cascading timeouts, Namma Karnataka implements a **Global Deadline** pattern:

| Parameter | Default Value | Purpose |
|---|---|---|
| `AI_GLOBAL_DEADLINE_SECONDS` | 28 seconds | Absolute wall-clock ceiling for entire request lifecycle |
| `AI_PROVIDER_TIMEOUT_SECONDS` | 12 seconds | Maximum timeout allocated to a single provider call |
| `AI_MAX_RETRIES` | 0 | Prohibits indefinite retries; failover to secondary provider takes precedence |

### Deadline Accounting Formula
Before invoking any provider:
$$\text{remaining\_time} = \text{deadline\_timestamp} - \text{current\_time}$$
$$\text{call\_timeout} = \min(\text{remaining\_time}, \text{AI\_PROVIDER\_TIMEOUT\_SECONDS})$$

If $\text{remaining\_time} \le 2.0\text{ seconds}$, the orchestrator halts remote calls immediately and triggers the deterministic fallback engine to guarantee client response within deadline.

---

## 5. Output Validation, Parsing, and Grounding Pipeline

The output validation service operates as an adversarial defense boundary:

1. **Defensive Normalization:** Trims whitespace and strips surrounding markdown code blocks (```` ```json ... ``` ````) if present.
2. **Schema Validation:** Parses JSON into `RawAIPlanResponse`. Validates that items list is non-empty, contains valid day numbers ($1 \le \text{day} \le \text{duration}$), and has non-empty rationale.
3. **Strict Catalog Grounding:** Every item’s identifier (`destination_id` or `slug`) is checked against the allowlist of candidates passed in the prompt context.
   - If an identifier is ungrounded (hallucinated), the provider output is marked invalid (`AI_DESTINATION_NOT_GROUNDED`).
4. **Authoritative Hydration:** The server hydrates each item from the `DestinationRepository`:
   - Title and summary resolved in requested language (`en` or `kn`).
   - Verified coordinates, district code, district name.
   - Real admission fees (`NULL` if unknown; ₹0 if confirmed free).
   - Real accessibility notes and official source citations.

---

## 6. Deterministic Fallback Engine

When both remote providers fail, the fallback engine provides transparent continuity:
1. **Curated Pool Selection:** Filters catalog records matching requested `preferred_districts`, `categories`, and `is_offbeat_preferred`.
2. **Deterministic Sort & Ranking:** Sorts by `(category, district_code, slug)` to guarantee identical outputs across repeated requests.
3. **Day-wise Distribution:** Allocates items evenly across days:
   - Relaxed: 2 destinations per day.
   - Balanced: 3 destinations per day.
   - Packed: 4 destinations per day.
4. **Insufficient Data Protection:** If the curated catalog cannot fulfill at least 1 destination per day, the engine raises `INSUFFICIENT_DESTINATION_DATA` (HTTP 422) with localized message, rather than inventing destinations.
5. **Transparency:** Response explicitly specifies:
   - `generation_mode = "fallback"`
   - `provider_used = "deterministic_fallback"`
   - `warnings = ["AI generation was temporarily unavailable. Itinerary curated using verified regional catalog."]`

---

## 7. Error Codes and HTTP Status Mapping

All errors conform to the established `ErrorResponse` envelope:

| Error Code | HTTP Status | Description |
|---|---|---|
| `AI_PLANNING_DISABLED` | 403 Forbidden | AI planning feature flag is turned off |
| `VALIDATION_ERROR` | 422 Unprocessable | Request payload failed schema validation |
| `INSUFFICIENT_DESTINATION_DATA` | 422 Unprocessable | Not enough catalog items to satisfy constraints |
| `AI_PROVIDER_UNAVAILABLE` | 503 Service Unavailable | All providers and fallback failed |

---

## 8. Security & Privacy Boundaries

- **Zero Client Keys:** `GROQ_API_KEY` and `GEMINI_API_KEY` exist exclusively server-side.
- **Prompt Sanitization:** User notes and parameters are validated and treated as untrusted data.
- **No SQL Execution:** Models are strictly text completion / JSON generators and have zero access to database connections or tools.
- **Safe Structured Logging:** Logs record request correlation ID (`X-Request-ID`), provider name, latency, and status. API keys, authorization tokens, and raw prompt payloads are never logged.
