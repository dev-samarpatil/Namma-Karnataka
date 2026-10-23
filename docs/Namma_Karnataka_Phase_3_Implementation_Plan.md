# Namma Karnataka — Phase 3 Implementation Plan
**Phase:** 3 — AI Provider Orchestration, LLM Adapters, Output Validation, and Fallback Engine  
**Target development environment:** Google Antigravity IDE  
**Target model:** Gemini 3.8 Flash — Medium  
**Status:** Planned  
**Prerequisite:** Phase 2 database and curated destination catalogue implementation

---

## 1. Purpose

Build a reliable, testable AI orchestration layer for Namma Karnataka. The layer will accept a structured trip-planning request, call either Groq or Gemini through independent provider adapters, validate the generated response against the curated destination catalogue, and return a predictable API response.

The goal of this phase is **AI infrastructure and backend orchestration**, not the complete itinerary-planning experience. Keep the implementation focused on provider integration, configuration, validation, fallback behavior, error handling, and automated tests.

## 2. Phase 2 Baseline and Important Caveat

The Phase 2 reports describe the following baseline:

- React 18, Vite, TypeScript frontend and FastAPI/Pydantic v2 backend scaffold.
- Destination API routes:
  - `GET /api/v1/destinations`
  - `GET /api/v1/destinations/{id_or_slug}`
- Destination repository abstraction with in-memory and Supabase implementations.
- Curated seed data and seed validation.
- Database design with `districts`, `destinations`, `destination_translations`, and `destination_sources`, including PostGIS geography, constraints, coordinate synchronization, and RLS.
- Reported verification: 36 backend tests and 7 frontend tests passing; lint and frontend build passing.

**Unverified prerequisite:** The Phase 2 report says the SQL migrations received static review only; a live Supabase migration was not executed. Do not describe the database as live or production-verified. Phase 3 should remain testable with the existing repository abstraction and in-memory test doubles. Before relying on live Supabase data, run the project’s migration workflow against a controlled Supabase environment and record the result.

## 3. Goals

1. Create independent Groq and Gemini provider adapters behind a common interface.
2. Centralize provider selection, model configuration, API-key loading, timeout settings, and retry policy.
3. Implement an orchestrator with a configurable global deadline and bounded provider calls.
4. Define strict Pydantic request and response contracts for the AI-planning boundary.
5. Validate every generated destination reference against the curated catalogue.
6. Prevent the model from inventing destinations, IDs, fees, travel distances, or travel times.
7. Implement deterministic fallback behavior only when supported by curated data.
8. Return consistent, recoverable API errors when provider calls fail or output cannot be safely used.
9. Add comprehensive unit and integration-style tests using mocked providers; tests must not require paid API calls.
10. Keep secrets server-side and preserve English/Kannada language selection throughout success, fallback, and error paths.

## 4. Explicit Non-Goals

Do **not** implement these in Phase 3 unless an existing contract requires a minimal supporting type:

- Full itinerary-generation UI or trip-planner screens.
- Saved trips, user authentication flows, or account management.
- Map UI, road-routing integration, route-distance estimation, or live traffic.
- RAG, embeddings, Qdrant, Neo4j, knowledge graphs, or historical-case retrieval.
- Destination ingestion pipelines or expansion of the curated catalogue.
- Real-time weather, booking, payment, or transport-provider integrations.
- Production claims based solely on mocks or static checks.
- A provider-specific implementation spread throughout route handlers.

Keep the API and service boundaries ready for later phases without prematurely implementing those phases.

## 5. Recommended Architecture

Use the existing repository layout and conventions. Adapt names to the actual codebase instead of creating duplicate modules.

```text
Frontend / future planner
        |
        v
FastAPI route
        |
        v
Trip-planning service / orchestrator
        |
        +---- Request contract and normalization
        |
        +---- Curated destination repository
        |       +---- Supabase implementation
        |       +---- In-memory implementation for tests
        |
        +---- Provider adapter interface
        |       +---- Groq adapter
        |       +---- Gemini adapter
        |
        +---- Output parser and Pydantic validation
        |
        +---- Destination grounding / ID validation
        |
        +---- Deterministic fallback engine
        |
        v
Normalized API response or standardized recoverable error
```

Suggested modules, adjusted to match the repository:

```text
backend/app/
  core/
    config.py                 # extend existing settings; avoid duplicate config
  schemas/
    ai_planning.py            # request, validated plan, provider metadata
  services/
    ai/
      base.py                 # provider protocol/interface
      groq_provider.py
      gemini_provider.py
      orchestrator.py
      output_validator.py
      fallback.py
  api/v1/
    routes/
      planning.py             # thin route; only if API route is in scope
```

If the repository already has equivalent modules, extend them rather than duplicating them. Keep provider SDK imports isolated in their respective adapters so tests can run without requiring both SDKs to make network calls.

## 6. API and Data Contracts

### 6.1 Planning request

Define a versioned Pydantic request contract suitable for future trip planning. Include only fields that are required for this phase, for example:

- `language`: `en` or `kn`.
- `destination_ids` or a bounded set of catalogue filters, depending on the agreed API contract.
- Optional preferences such as trip duration, budget range, interests, and pace only if these are already documented in the product requirements.

Validation requirements:

- Reject unsupported language codes with a clear validation error.
- Bound numeric values and list lengths.
- Reject malformed or excessive input.
- Do not silently invent defaults that change the user’s intent.
- Avoid collecting unnecessary personal or sensitive data.

**Contract decision:** Before implementation, inspect the Phase 0/1 product docs and existing API conventions. Use the smallest request contract that fits the documented product direction. Record any material change in an ADR or phase decision note.

### 6.2 AI output contract

Use a strict, explicit schema rather than accepting arbitrary provider text as the final API response. A minimal future-oriented plan may contain:

- `language`
- `items`: a bounded list of destination references
- For each item: canonical `destination_id` or `slug`, an optional short rationale, and an optional day/order field if supported by the request contract
- `warnings`: structured, user-safe warnings
- `generation_mode`: `ai` or `fallback`
- `provider`: optional, non-secret provider identifier

Do not ask the model to provide authoritative values for destination metadata already held by the catalogue. Return catalogue-owned titles, district, coordinates, known fees, and other trusted fields by resolving validated IDs from the repository.

Never expose API keys, raw provider exceptions, hidden prompts, or internal stack traces in the public response.

## 7. Provider Adapter Requirements

### 7.1 Shared interface

Define one small provider interface, such as:

- `generate_structured(request, context, timeout) -> provider result`
- A typed provider result or normalized exception model.
- Provider health/capability metadata only if genuinely needed.

Both adapters must satisfy the same interface. Route handlers and business services must not call vendor SDKs directly.

### 7.2 Groq adapter

- Read credentials from server-side environment/settings only.
- Read model name from configuration; do not hard-code it in service logic.
- Apply per-call timeout.
- Request JSON/structured output where supported by the selected model/API.
- Normalize SDK errors into internal provider error categories.
- Do not log secrets, complete sensitive prompts, or unbounded provider responses.
- Keep SDK-specific response parsing inside the adapter.

### 7.3 Gemini adapter

- Read credentials and model name from server-side settings only.
- Use the currently supported SDK/API conventions already selected by the project.
- Isolate model aliases and SDK response parsing inside this adapter/configuration.
- Apply per-call timeout and normalize errors.
- Do not assume that one model name works across all SDK versions; validate the configured model in a controlled smoke test when credentials are available.

### 7.4 Configuration

Extend the existing settings system rather than adding a second configuration source. Support:

- Enabled/disabled state per provider.
- Provider model identifiers.
- API keys.
- Per-provider timeout.
- Global orchestration deadline (the existing proposal was approximately 28 seconds; make it configurable).
- Maximum retries (default conservatively, e.g. zero or one retry for transient failures only).
- Provider order or preferred provider.
- Feature flag for enabling the AI planning endpoint.

Requirements:

- Fail startup only for truly required configuration; optional provider keys should permit the other provider to operate.
- Never place real keys in source control, test fixtures, logs, or frontend environment variables.
- Provide `.env.example` placeholders and document required settings.
- Keep production secrets in the deployment platform’s secret manager.

## 8. Orchestration, Deadlines, and Fallback

Implement a deterministic, bounded orchestration policy.

1. Validate and normalize the incoming request.
2. Retrieve the relevant curated destination records from the repository.
3. Build a compact provider context containing only allowed catalogue IDs and factual metadata necessary for selection.
4. Call the preferred enabled provider with a bounded timeout.
5. Parse the result and validate its schema.
6. Validate every returned ID against the supplied catalogue context and repository.
7. Reject or safely repair only well-defined formatting issues; do not silently accept invented IDs or unsupported facts.
8. If the first provider fails, times out, returns malformed output, or produces invalid IDs, attempt the next enabled provider only if the global deadline permits.
9. If all enabled providers fail, use a deterministic fallback **only if** the request can be satisfied from curated data under explicit selection rules.
10. If safe fallback is impossible, return a normalized recoverable error with a request/correlation ID.

### Deadline rules

- Use a configurable global deadline (initial target approximately 28 seconds).
- Pass remaining time to each provider; do not give each provider the full global timeout.
- Ensure retries cannot exceed the global deadline.
- Avoid unbounded sequential retries.
- Make cancellation and timeout behavior testable.
- Return provider metadata without leaking internals.

### Fallback rules

- Fallback is deterministic and catalogue-grounded.
- Fallback may rank/filter by supported request fields, stable IDs, and documented metadata.
- Do not generate a fictional itinerary merely to avoid an error.
- Do not treat unknown fees as ₹0; preserve `NULL`/unknown status.
- Do not fabricate road distances, travel durations, opening hours, safety status, or availability.
- Label fallback responses clearly using `generation_mode: "fallback"` and a safe explanation.
- If the catalogue lacks sufficient data, return a recoverable error instead of fabricating a result.
- “Offbeat” is an editorial classification, not a guarantee of safety, privacy, accessibility, or lack of crowds.

## 9. Output Validation and Grounding

Validation must be a separate service with unit tests.

- Parse provider output into the expected schema.
- Enforce list-size limits and required fields.
- Reject unknown destination IDs/slugs.
- Reject duplicate destinations unless the contract explicitly permits them.
- Reject unsupported languages or a response language that conflicts with the request.
- Treat all model-produced free text as untrusted.
- Never use model-generated price, coordinates, distance, travel time, opening hours, or other authoritative facts when the catalogue is the source of truth.
- Resolve accepted IDs to catalogue records and construct the final API payload server-side.
- Handle empty, truncated, markdown-wrapped, malformed JSON, and provider refusal responses explicitly.
- Do not “repair” semantic errors by guessing what the model meant.

## 10. API Route Scope

If the product docs confirm that a planning endpoint belongs in this phase, add a thin, versioned route such as:

`POST /api/v1/planning/recommendations`

The route should:

- Validate the request schema.
- Call the orchestrator.
- Return a typed response.
- Use existing request IDs, logging, and normalized error conventions.
- Avoid provider-specific logic.
- Be feature-flagged if needed.

If the existing product documentation does not yet define the request shape, implement the provider/orchestration services and schemas first, and document the route contract as a decision rather than inventing a broad public API. Keep the existing destination endpoints unchanged.

## 11. Error Model

Reuse the Phase 1 normalized error format. Add stable internal error codes as needed, such as:

- `AI_PROVIDER_UNAVAILABLE`
- `AI_PROVIDER_TIMEOUT`
- `AI_OUTPUT_INVALID`
- `AI_DESTINATION_NOT_GROUNDED`
- `AI_FALLBACK_UNAVAILABLE`
- `AI_PLANNING_DISABLED`

Public errors should include a safe message, stable code, and request/correlation ID. Do not reveal vendor stack traces, keys, or raw provider payloads. Distinguish invalid client input from temporary provider failures.

## 12. Observability and Security

- Use structured logs with request ID, selected provider, elapsed time, outcome category, and fallback usage.
- Redact API keys and sensitive user inputs.
- Avoid storing full prompts/responses by default; if debugging capture is required, use bounded, redacted, opt-in diagnostics.
- Add counters or simple metrics only if the project already has a metrics pattern.
- Validate all external data at boundaries.
- Keep CORS, auth, and RLS policies consistent with existing project conventions.
- Never let the AI provider access Supabase credentials or execute arbitrary database queries.
- Do not expose provider keys to the React client.
- Add dependency/version notes if SDKs need pinning.

## 13. Testing Plan

Tests must be deterministic and run offline by default. Mock provider adapters; do not require actual Groq/Gemini keys in CI.

### 13.1 Provider adapter tests

- Missing optional key disables only that provider.
- Valid settings are passed to the adapter.
- Provider response normalization works.
- Authentication, rate-limit, server, malformed response, and timeout errors are normalized.
- Exceptions do not leak secrets or raw payloads.

### 13.2 Orchestrator tests

- Preferred provider succeeds.
- Preferred provider fails and secondary provider succeeds.
- Preferred provider times out and secondary provider succeeds within remaining deadline.
- Both providers disabled.
- Both providers fail.
- First provider returns invalid JSON, unknown IDs, duplicate IDs, or wrong language.
- Global deadline prevents another call when no time remains.
- Retry policy does not exceed the global deadline.
- Cancellation and timeout behavior is handled.

### 13.3 Validation and fallback tests

- Valid output with known catalogue IDs.
- Unknown ID is rejected.
- Empty/oversized output is rejected.
- Duplicate destinations are rejected unless explicitly allowed.
- Wrong-language output is rejected.
- Model-supplied fees or coordinates cannot override catalogue data.
- Unknown fees remain unknown, not zero.
- Deterministic fallback ordering is stable across runs.
- No fallback when curated data is insufficient.
- No fabricated road distance or travel time.

### 13.4 API tests

- Valid request and successful AI response.
- Successful fallback response with `generation_mode="fallback"`.
- Consistent error payload and request ID when fallback is unavailable.
- Unsupported language and invalid bounds return validation errors.
- Feature-flag-disabled endpoint returns the documented safe response.
- Existing destination endpoints continue to pass regression tests.

### 13.5 Quality gates

Run the actual repository scripts where available, including:

- Backend unit and API tests.
- Ruff/lint/type checks used by the repo.
- Frontend tests, lint, and production build.
- Seed validation.
- Full regression suite.
- CI workflow checks.

Report actual commands and actual results. Do not claim live provider or live Supabase verification when only mocks/static checks were run.

## 14. Implementation Sequence

### Step 0 — Inspect and freeze contracts
- Read the Phase 0/1 docs, Phase 2 database design, route conventions, config, error model, and tests.
- Inspect the actual repository tree before editing.
- Record the request/response contract and provider policy in a short ADR/decision note.
- Identify existing abstractions to reuse.

**Exit criteria:** No duplicate configuration, schema, or error-handling systems are introduced.

### Step 1 — Settings and provider interface
- Extend central settings and `.env.example`.
- Define provider protocol and normalized provider errors/results.
- Add tests for optional provider configuration.

**Exit criteria:** Provider availability can be configured and tested without network access.

### Step 2 — Provider adapters
- Implement Groq and Gemini adapters with isolated SDK imports.
- Add bounded timeout and response normalization.
- Add adapter unit tests with mocked SDK clients.

**Exit criteria:** Each adapter independently satisfies the shared interface.

### Step 3 — Contracts and output validator
- Add strict Pydantic request/response schemas.
- Add parsing and grounding validation.
- Resolve destination IDs through the existing repository abstraction.
- Add adversarial/invalid-output tests.

**Exit criteria:** Invalid or ungrounded model output cannot reach the public response.

### Step 4 — Orchestrator and deadline management
- Implement provider ordering, remaining-deadline accounting, bounded retry policy, fallback, and normalized errors.
- Keep provider logic out of routes.
- Add orchestration tests.

**Exit criteria:** Failover and fallback decisions are deterministic and tested.

### Step 5 — API integration (only if contract is documented)
- Add the thin planning route if supported by the current PRD/API design.
- Reuse request IDs and normalized errors.
- Keep feature flag and safe error behavior.

**Exit criteria:** API contract is documented and tests pass without live keys.

### Step 6 — Regression, security, and documentation
- Run the full suite, lint, type checks, frontend build, and seed validation.
- Review logs and error messages for secrets and sensitive content.
- Document configuration, local setup, fallback behavior, known limitations, and live-smoke-test instructions.
- Update the phase report with verified vs. unverified items.

**Exit criteria:** All quality gates pass, and remaining live-integration gaps are explicit.

## 15. Environment Variables — Example Names

Use the repository’s existing naming convention if different. Never commit real values.

```dotenv
# Provider enablement
AI_PLANNING_ENABLED=false
GROQ_ENABLED=false
GEMINI_ENABLED=false

# Provider credentials
GROQ_API_KEY=
GEMINI_API_KEY=

# Provider model IDs (set to currently supported model IDs)
GROQ_MODEL=
GEMINI_MODEL=

# Orchestration
AI_PREFERRED_PROVIDER=gemini
AI_PROVIDER_TIMEOUT_SECONDS=12
AI_GLOBAL_DEADLINE_SECONDS=28
AI_MAX_RETRIES=0
```

These are illustrative names, not a mandate to duplicate existing settings. Verify actual SDK and model compatibility before using production credentials. Optional providers must fail independently.

## 16. Documentation Deliverables

Produce or update:

- `docs/PHASE_3_IMPLEMENTATION_REPORT.md`
- `docs/PHASE_3_AI_ORCHESTRATION_DESIGN.md`
- An ADR/decision note for the request/response contract and fallback policy.
- `.env.example` with placeholders and explanations.
- Local setup and provider smoke-test instructions.
- Test report listing exact commands, counts, and outcomes.
- A clear section stating whether live Groq, Gemini, and Supabase tests were actually run.

## 17. Phase 3 Definition of Done

Phase 3 is complete when:

- [ ] Groq and Gemini adapters implement one shared interface.
- [ ] Provider credentials/model IDs/timeouts are centrally configured and server-side.
- [ ] Optional provider keys do not prevent the other provider from working.
- [ ] The global deadline is enforced across failover and retries.
- [ ] Strict Pydantic contracts exist for the agreed request/response boundary.
- [ ] Every destination reference is validated against the curated catalogue.
- [ ] Trusted destination metadata is reconstructed from catalogue records, not invented by the model.
- [ ] Deterministic fallback is catalogue-grounded and clearly labeled.
- [ ] Unsafe or impossible fallback returns a recoverable normalized error.
- [ ] English/Kannada language is preserved across success, fallback, and errors.
- [ ] No API secrets or sensitive provider payloads leak to the client or logs.
- [ ] Automated tests cover success, failover, timeouts, malformed output, invalid IDs, and fallback.
- [ ] Existing Phase 1/2 tests and quality gates still pass.
- [ ] Documentation distinguishes mock-tested behavior from live-verified behavior.
- [ ] The Phase 2 live Supabase migration caveat remains explicit until verified.

## 18. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Provider SDK/model API changes | Isolate SDK code; pin compatible versions; add smoke-test instructions |
| Both providers unavailable | Catalogue-grounded deterministic fallback or recoverable error |
| Hallucinated destinations/facts | Allowlisted IDs and server-side catalogue reconstruction |
| Timeout cascades | Global deadline and remaining-time accounting |
| Different provider output shapes | Normalize inside adapters and validate with one schema |
| Missing live Supabase environment | Keep repository abstraction and in-memory tests; record migration as unverified |
| Language inconsistency | Validate requested language and preserve it in fallback/error payloads |
| Scope creep into full trip planner | Keep this phase limited to AI orchestration and contracts |

## 19. Handoff to Phase 4

After Phase 3 is accepted, Phase 4 can implement the user-facing destination discovery and trip-planning experience against the stable API contract. The exact Phase 4 scope should be confirmed against the current PRD before implementation.

---

## Final instruction for implementation

Use this plan as a controlled implementation guide, not permission to invent new product behavior. Inspect the existing repository and documents first, preserve established conventions, implement in small verifiable steps, and report what was actually tested. If a required product/API decision is missing, record it and choose the narrowest safe implementation rather than silently broadening scope.
