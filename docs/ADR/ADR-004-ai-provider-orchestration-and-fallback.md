# ADR-004: AI Provider Orchestration, Failover, and Deterministic Fallback

* **Status:** `ACCEPTED`
* **Date:** October 2026
* **Deciders:** Lead Architect, AI Systems Engineer

## Context
Relying on a single AI vendor introduces unacceptable availability and latency risks. Furthermore, LLMs are probabilistic engines prone to hallucinating non-existent destinations, returning malformed JSON, or violating budget constraints. The system requires vendor independence, automated failover, strict output validation, and a deterministic offline fallback.

## Options Considered
1. **Single LLM Provider (Groq or Gemini only):** High single point of failure; vulnerable to provider rate limits or regional outages.
2. **Parallel Dual-Provider Querying on Every Request:** Calls Groq and Gemini simultaneously and reconciles outputs. Doubles operational API spend and token usage on 100% of user requests.
3. **Primary-Then-Fallback Orchestrator with Deterministic Rule-Based Fallback:**
   - Call Primary Provider (Groq for high throughput / low cost).
   - If Groq fails (HTTP 429, timeout, network error, or schema validation failure), invoke Secondary Provider (Gemini).
   - If both providers fail or timeout, invoke the local Deterministic Fallback Planner.

## Decision
Adopt **Primary-Then-Fallback Orchestrator with Deterministic Rule-Based Fallback**:
1. **Interface Abstraction:** Define `AIProviderAdapter` protocol with methods `generate_itinerary(candidates, constraints, language) -> RawItineraryPayload`.
2. **Execution Timing Budget:**
   - Groq timeout: 12 seconds.
   - Gemini timeout: 15 seconds.
   - Global deadline: 28 seconds.
3. **Strict Validation Pipeline:**
   - Pydantic schema validation (`ItineraryResponse`).
   - Catalog ID integrity: Every destination ID must be found in the pre-filtered candidate list. Any unregistered ID immediately fails validation.
4. **Deterministic Rule-Based Fallback:**
   - Implemented in `app/services/fallback.py`.
   - Groups verified destinations matching the user's origin, interests, and pace into day-wise clusters using geographic proximity.
   - Sets `generation_mode = "deterministic_fallback"` and displays a transparent user advisory.
   - If insufficient curated data exists to fulfill the duration, returns an explicit, localized, recoverable error (`INSUFFICIENT_DESTINATION_DATA`) rather than hallucinating stops.

## Consequences & Mitigations
- **Pros:** Maximum uptime; 50% lower API cost compared to parallel calling; zero hallucinated stops reach users.
- **Cons:** Sequential failover can take up to 27s if primary hangs until timeout.
- **Mitigation:** Aggressive 12s timeout on primary provider and real-time client loading progress messages.
