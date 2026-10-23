# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 4 Implementation Plan

**Phase:** 4 — MVP Experience & Trip Planning  
**Status:** Planned  
**Prepared:** 23 October 2026  
**Target environment:** Google Antigravity IDE  
**Recommended model:** Gemini 3.8 Flash — Medium  
**Predecessor:** Phase 3.1 Verification & Hardening

---

## 1. Purpose

Phase 4 connects the existing destination catalogue, API foundation, and AI itinerary recommendation engine into a coherent MVP experience. Users should be able to discover Karnataka destinations, enter trip preferences, generate and review a grounded itinerary, understand the budget, explore destinations on a map, and save trips when authenticated.

This plan is a scope and execution guide. Begin by inspecting the actual repository and existing PRD, TRD, app flow, schema, implementation decisions, and Phase 3.1 report. Do not assume a feature is missing merely because it appears below. Reuse working implementation and build only genuine gaps.

**Phase 4 is not a backend rewrite.** Preserve the existing architecture.

## 2. Phase 3.1 baseline and known limitations

The Phase 3.1 report records:
- Backend tests: 76 passed.
- Frontend tests: 7 passed.
- Backend lint, frontend lint, frontend production build, and seed validation: passed.
- Gemini live smoke test: passed.
- Groq adapter executed, but configured `llama-3.3-70b-versatile` returned a model/account access error; `openai/gpt-oss-120b` returned HTTP 200 in a separate check.
- Supabase live migration/database verification: unverified; remote migration was intentionally not run.

These are reported results, not an independent rerun. Re-run relevant local checks before changes. Keep Groq model configuration and Supabase live verification as explicit follow-ups until verified.

## 3. Target user journey

At completion, a user should be able to:
1. Open the app and choose English or Kannada.
2. Browse and filter curated Karnataka destinations.
3. View trusted destination details and available location information.
4. Enter supported trip preferences, such as duration, budget, pace, interests, and starting location where supported by the current contract.
5. Request an itinerary through the existing planning API.
6. Review itinerary days and stops with clear loading, empty, fallback, and error states.
7. Understand budget estimates, known versus unknown fees, and assumptions.
8. Explore destinations on a map where valid coordinates exist.
9. Plan as a guest without mandatory early registration.
10. Sign in and save/retrieve their own trips if authentication, database policies, and endpoints are available and verified.
11. Continue in the selected language across success, fallback, and error paths.

The UI must not promise data or behavior the backend cannot support.

## 4. Architecture to preserve

Use the actual repository as the authority. Expected architecture:
- Frontend: React 18, Vite, TypeScript, Tailwind CSS and the existing UI system; Leaflet for maps if already adopted.
- Backend: FastAPI, Pydantic v2, versioned API routes, normalized errors, request IDs.
- Data: Supabase PostgreSQL, Supabase Auth, RLS, and PostGIS where configured.
- AI: existing independent Groq and Gemini adapters, orchestrator, curated-destination grounding, validation, and deterministic fallback.
- Languages: English (`en`) and Kannada (`kn`) first-class.
- Tests: existing backend tests and frontend Vitest/lint/build pipeline.

Do not introduce another framework, state-management library, mapping provider, or database without a demonstrated need and documented decision. Reuse the existing typed API client and components.

## 5. Non-negotiable rules

1. **Grounding:** AI may recommend only curated destination IDs. Render trusted API metadata, not raw model-generated facts.
2. **Budget integrity:** Calculations remain deterministic. Unknown costs stay `null`/unknown, never ₹0. Label estimates and assumptions.
3. **Distance integrity:** Never fabricate road distances or driving times. Label straight-line distances accurately; show road data only when supplied by a verified routing source.
4. **Fallback clarity:** Indicate deterministic fallback when the API provides source/mode metadata.
5. **Offbeat semantics:** “Offbeat” is editorial, not a safety guarantee.
6. **Bilingual UX:** Language selection persists across navigation, validation, loading, fallback, and errors.
7. **Guest-first planning:** Users can try the core planning flow without mandatory early registration.
8. **Authorization:** Saved trips are user-owned. Enforce authorization on the backend and with Supabase RLS; never rely only on frontend filtering.
9. **Secrets:** No service/provider keys in browser bundles, client-side environment variables, logs, or committed files.
10. **Resilience:** Handle slow APIs, provider failures, empty results, and expired sessions with recoverable states.
11. **Accessibility:** Labels, keyboard navigation, visible focus, appropriate contrast, and useful screen-reader text.
12. **Truthful UI:** Do not show “saved”, “generated”, or “loaded” until the operation succeeds.

## 6. Workstreams

### Phase 4A — Repository and requirements audit

**Tasks**
- Inspect Git status, branch, project structure, routes, components, API client, config, tests, and current UX.
- Read the PRD, TRD, App Flow, Backend Schema, Implementation Decisions, Phase 3 design, and Phase 3.1 report.
- Map every MVP requirement to existing code, missing code, tests, or blocked dependencies.
- Run baseline backend/frontend tests, lint, build, and seed validation.
- Confirm actual request/response schemas for destinations, planning, budget, and fallback metadata.
- Check whether Supabase migrations, Auth, and RLS are available in the intended development environment.
- Record blockers without exposing secrets.

**Acceptance criteria**
- A requirements-to-code gap matrix exists.
- Existing working features are reused.
- Baseline failures are recorded before edits.
- No unrelated user changes are overwritten.

### Phase 4B — Application shell and bilingual navigation

**Tasks**
- Implement or complete app layout, navigation, page structure, and responsive behavior using existing conventions.
- Provide an accessible English/Kannada switch.
- Persist language using the project's existing i18n approach.
- Use translation keys for user-visible strings rather than scattered hard-coded text.
- Provide shared loading, empty, error, retry, and network-failure states.
- Map API errors to friendly bilingual messages without exposing internal exceptions.
- Keep navigation and forms usable on mobile and desktop.

**Acceptance criteria**
- Language survives navigation and refresh.
- Main journey works on mobile and desktop.
- Keyboard focus and form labels are present.
- Errors do not silently discard entered preferences.

### Phase 4C — Destination discovery and details

**Tasks**
- Connect the destination UI to the existing destinations API through the typed API client.
- Support only filters/sorting actually supported by the API, such as district or category.
- Add loading, empty, error, and retry states.
- Build reusable destination cards using trusted API data.
- Implement a detail page/panel with supported fields such as name, district, category, description, coordinates, known entry fee, and available visit information.
- Show “Not available” or a localized equivalent for missing fields; do not invent content.
- Use pagination or bounded loading if supported.
- Support bilingual content where translations exist.

**Acceptance criteria**
- No duplicated hard-coded frontend catalogue.
- Filters map correctly to backend parameters.
- Missing values are honest and clear.
- Empty results and server errors are handled.

### Phase 4D — Trip preference form

**Tasks**
- Inspect the actual `PlanningRequest` schema before building or modifying the form.
- Implement only supported fields: for example duration, budget, pace, interests, starting location, and other documented preferences.
- Mark required and optional fields.
- Validate client-side for usability while treating backend validation as authoritative.
- Show field-specific errors in the selected language.
- Prevent duplicate submissions and show progress.
- Preserve inputs after recoverable failures.
- Do not invent request fields or undocumented payload properties.
- Add defaults only where the product contract permits them.

**Acceptance criteria**
- Payload matches the real Pydantic schema.
- Validation errors do not erase unrelated inputs.
- Duplicate submission is prevented.
- Form is bilingual and accessible.

### Phase 4E — Planning API and itinerary review

**Tasks**
- Use the existing typed API client and `POST /api/v1/planning/recommendations`.
- Follow actual request/response schemas; do not guess field names.
- Show generation progress and prevent accidental duplicate requests.
- Render itinerary days/stops in a readable order.
- Display only trusted destination metadata.
- Show AI versus deterministic fallback status when response metadata supports it.
- Handle timeouts, provider errors, validation failures, empty plans, and network errors.
- Provide retry while preserving user preferences.
- Keep the selected language intact.
- Do not claim a plan is safe, route-optimized, or fully costed unless supported by verified services/data.

**Acceptance criteria**
- User can submit preferences and view an itinerary from the real backend.
- Fallback is clearly indicated when metadata exists.
- Errors are recoverable.
- Frontend does not invent destination details.

### Phase 4F — Budget breakdown and assumptions

**Tasks**
- Inspect the existing budget engine and response schema before implementation.
- Render only supported cost categories and calculations.
- Distinguish known, estimated, and unknown costs.
- Never convert `null` fees or missing costs to ₹0.
- Explain assumptions such as duration or travellers when supported.
- Do not invent accommodation, fuel, toll, or meal prices.
- Format INR consistently and localize explanatory text.
- If backend data cannot support a breakdown, explain limitations instead of fabricating values.

**Acceptance criteria**
- Displayed totals match deterministic backend calculations.
- Unknown values remain unknown.
- Assumptions and exclusions are visible.
- Frontend does not contradict backend calculations.

### Phase 4G — Map and geographic exploration

**Tasks**
- Inspect the existing map library and coordinate fields.
- Reuse the current mapping stack; use Leaflet if already configured.
- Plot only destinations with valid coordinates.
- Link markers to destination details and itinerary stops where feasible.
- Provide a list-based alternative.
- Handle missing coordinates and map-loading failures.
- Label straight-line distances accurately.
- Do not display fabricated routes, road distances, or travel times.
- Ensure responsive layout and accessible marker interaction as far as the chosen library permits.

**Acceptance criteria**
- Valid curated coordinates render.
- Marker selection reveals trusted destination details.
- Missing coordinates do not crash the map.
- No false implication of road routing.

### Phase 4H — Guest planning and saved trips

**Tasks**
- Verify existing authentication and Supabase configuration before wiring UI.
- Keep trip planning available to guests.
- If sign-in is required to save, prompt only when the user chooses Save and explain why.
- Implement sign-in/sign-up and session handling only as supported by the existing architecture and approved scope.
- Implement save/list/retrieve/delete actions only if endpoints, schema, and RLS support them.
- Verify ownership server-side for every saved-trip operation.
- Test that users cannot access another user's trips by changing an ID.
- Handle expired sessions and permission errors without data leakage.
- Do not use public/shared browser storage as a substitute for backend authorization.
- If migrations/Auth/RLS cannot be safely verified, gate persistence and document the blocker instead of pretending it works.

**Acceptance criteria**
- Guest planning works without registration.
- Saved-trip features are enabled only when backend and policies are ready.
- Backend ownership checks and RLS enforce isolation.
- Auth failures are recoverable.

### Phase 4I — API resilience, testing, accessibility, and release hardening

**Tasks**
- Reuse the typed API client; avoid scattered raw `fetch` calls.
- Handle request IDs, normalized errors, timeouts, and network failures according to the current contract.
- Cancel obsolete requests where appropriate.
- Prevent stale responses from overwriting newer selections.
- Keep retries bounded; avoid automatically repeating expensive AI requests.
- Preserve Phase 3.1 global-deadline behavior.
- Test language switching, destination discovery, form validation/payload, itinerary rendering, fallback indicator, null budget values, map coordinates, guest planning, saved-trip authorization where enabled, retries, duplicate submissions, API errors, and accessibility of key flows.
- Run backend/frontend tests, `ruff check`, configured formatting/type checks, `npm run lint`, `npm run build`, and seed validation.

**Acceptance criteria**
- Relevant checks pass or failures are explicitly documented.
- New behavior has regression coverage.
- No secrets are exposed.
- Production frontend build succeeds.
- Report contains actual commands and results.

## 7. Recommended execution order

1. Phase 4A — Audit and gap matrix.
2. Phase 4B — App shell, navigation, bilingual UX.
3. Phase 4C — Destination discovery and details.
4. Phase 4D — Trip preference form.
5. Phase 4E — Planning API and itinerary review.
6. Phase 4F — Budget presentation and assumptions.
7. Phase 4G — Map and geographic exploration.
8. Phase 4H — Guest planning and saved trips, subject to verified Auth/RLS readiness.
9. Phase 4I — End-to-end testing, accessibility, and release hardening.

These workstreams do not authorize duplicate implementation. After the initial audit, skip or reorder items already complete and document why.

## 8. Out of scope

Unless the existing PRD explicitly requires them for the MVP, do not add:
- A new AI orchestration architecture, provider, or LLM framework.
- Unverified road routing/navigation.
- Real-time weather or live traffic.
- Payments, bookings, or reservation integrations.
- Social feeds, reviews, or public user-generated content.
- Large-scale catalogue expansion or new recommendation models.
- Production database migrations without a confirmed target and authorization.
- Unrelated redesign or broad refactoring.

## 9. Known dependencies and risks

### Groq model configuration
The Phase 3.1 report says `llama-3.3-70b-versatile` returned an access/model availability error for the configured key, while `openai/gpt-oss-120b` returned HTTP 200 in a separate check. Verify current model access before calling Groq production-ready. Do not switch models silently; document the selected model and rationale.

### Supabase live verification
Live migration/database state remains unverified in the Phase 3.1 report. Verify the intended development project, migration status, Auth, and RLS before enabling saved-trip persistence. Do not run destructive commands against an unidentified target.

### Baseline results
The Phase 3.1 report records 76 backend tests and 7 frontend tests passing. Re-run them in the actual working tree and record the true baseline.

### API/schema drift
Frontend forms and components must follow actual Pydantic schemas and API response models. If product docs and implementation disagree, document the mismatch and follow explicit decisions rather than guessing.

## 10. Definition of Done

Phase 4 is complete when:
- The core guest journey works end-to-end against the actual backend.
- Users can browse destinations, enter supported preferences, request a plan, review the itinerary, and understand budget limitations.
- The map displays valid curated coordinates without inventing routes or travel times.
- English and Kannada work across the core journey.
- Loading, empty, validation, fallback, network, and server-error states are handled.
- Saved trips are enabled only after Auth, persistence, ownership checks, and RLS are verified.
- Relevant quality checks pass, or failures/external blockers are clearly documented.
- No secrets are exposed and no unrelated changes are lost.
- A completion report records scope, files changed, test results, manual verification evidence where available, and remaining risks.

## 11. Required completion report

Create `PHASE_4_IMPLEMENTATION_REPORT.md` in the repository's existing documentation location.

Include:
1. Executive summary and status: `PASS`, `PASS WITH LIMITATIONS`, or `BLOCKED`.
2. Requirement gap matrix: requirement, prior state, implementation, verification.
3. Completed, partial, and skipped workstreams with reasons.
4. Files changed and purpose.
5. Actual API endpoints and schemas used.
6. Bilingual and accessibility verification.
7. Guest/saved-trip behavior and Auth/RLS verification status.
8. Test matrix with command, result, actual count, and skip/failure reason.
9. Build/lint results.
10. Groq, Gemini, and Supabase statuses reported separately.
11. Remaining limitations and risks.
12. Recommended next phase/release action.

Do not mark work complete without implementation or test evidence. Distinguish local/mock verification from live integration verification.

## 12. Instructions for the implementation agent

- Inspect Git status and product/architecture docs first.
- Do not stop after producing a plan; implement the approved Phase 4 scope.
- Do not duplicate existing features.
- Work incrementally and run targeted tests after each workstream.
- Preserve existing APIs unless a change is required and documented.
- Do not modify production configuration or remote data without clear authorization.
- Never expose credentials.
- If a product decision is ambiguous, stop only that specific part, document the conflict, and continue with independent work.
- Run the full relevant regression suite and inspect the final Git diff before finishing.

**Start with the Phase 4A repository audit and gap matrix. Then implement the genuinely missing MVP experience in the recommended order, verifying each workstream before proceeding.**
