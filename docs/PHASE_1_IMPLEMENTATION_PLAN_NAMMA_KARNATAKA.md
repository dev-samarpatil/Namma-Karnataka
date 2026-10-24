# Namma Karnataka — Phase 1 Implementation Plan
## Destination Data Quality and Complete Itinerary Foundation

**Document type:** Implementation plan  
**Product:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Status:** Proposed — audit the existing repository before modifying code  
**Primary objective:** Establish reliable destination data and the planning foundation required to generate complete, practical, multi-day travel itineraries.

---

## 1. Executive Summary

The current application already presents a destination explorer, a trip-preference form, an itinerary view with a map, budget summaries, and saved trips. However, the visible itinerary experience is too sparse: a two-day trip can return only two attractions, and the plan does not consistently organise accommodation, meals, local activities, transport, breaks, and return travel.

Phase 1 establishes the **data and planning foundation** for fixing this. It should not be treated as a cosmetic redesign or as a request to make the language model return more places. The application must retrieve suitable destinations from structured data, build a feasible schedule, calculate transparent estimates, and validate the itinerary before displaying it.

This phase must preserve working functionality and the existing architecture unless the repository audit demonstrates a concrete reason to change it.

### Phase 1 outcomes

1. Audit the current code and map existing capabilities to the canonical roadmap.
2. Inspect and improve the destination catalogue and its factual metadata.
3. Define consistent structured models for destinations, itinerary stops, estimates, and itinerary validation.
4. Implement a deterministic itinerary scheduling and validation layer.
5. Improve the itinerary-generation service so AI providers explain and personalise a plan without inventing operational facts.
6. Return useful, structured day-by-day itineraries with activities, meals, accommodation needs, travel gaps, and breaks represented appropriately.
7. Add automated tests for schedule feasibility, data quality, fallback behaviour, and regression protection.
8. Document remaining gaps and the hand-off to the next phase.

---

## 2. Scope and Non-Goals

### In scope

- Read-only audit of the existing repository, roadmap documents, APIs, database schema/migrations, destination data, and tests.
- Destination data validation and provenance fields.
- A shared itinerary data contract between frontend and backend.
- Day-by-day itinerary construction and schedule validation.
- Travel-time/distance handling with explicit confidence and source status.
- Structured accommodation and food recommendations where supported by available data.
- Budget categories and transparent cost statuses.
- Integration with the existing Gemini/Groq provider adapters and deterministic fallback.
- Frontend rendering of the structured itinerary using the existing design system.
- Unit, integration, and regression tests.
- Documentation of implementation, limitations, and verification evidence.

### Not in scope for this phase

- Live hotel, restaurant, bus, train, or flight booking.
- Payments or booking transactions.
- Turn-by-turn navigation or live traffic.
- Claiming live availability or real-time prices without an integrated source.
- Replacing the frontend framework, backend framework, or database without an evidence-based need.
- Building the photo/video place-recognition feature; plan it as a later, separate workstream.
- Native mobile applications.
- Large-scale visual redesign unrelated to itinerary usability.
- Introducing a new official roadmap numbering scheme.

---

## 3. Mandatory First Step: Repository Audit

Before editing code, inspect the current implementation. Do not assume that a visible feature is absent simply because it is not visible in the supplied screenshots.

### Audit checklist

- [ ] Read the canonical PRD, TRD, implementation plan, roadmap mapping, and latest completion/audit reports.
- [ ] Check `git status`, current branch, latest commit, and uncommitted changes.
- [ ] Identify frontend routes, page components, state management, API client, and itinerary types.
- [ ] Identify FastAPI routes, Pydantic request/response models, service modules, and provider adapters.
- [ ] Inspect destination catalogue files/tables, seed scripts, database schema, and migrations.
- [ ] Inspect the current itinerary generation prompt and deterministic fallback.
- [ ] Identify how entry fees, visit duration, coordinates, opening hours, transport estimates, and provenance are represented.
- [ ] Inspect saved-trip persistence and distinguish device-local guest storage from verified Supabase persistence.
- [ ] Run the existing backend and frontend test suites and record the actual results.
- [ ] Record failing tests and baseline build/lint/type-check results before making changes.

### Audit deliverable

Create or update `docs/PHASE_1_BASELINE_AUDIT.md` containing:

- Existing feature and implementation status: **Verified / Partial / Missing / Not verified**.
- Relevant file paths, API routes, and database objects.
- Baseline test/build results, including exact commands and counts.
- Data-quality problems and missing fields.
- Roadmap mapping using the existing canonical phase numbers.
- Risks, dependencies, and recommended implementation sequence.

**Do not report a check as passed unless it was actually run and its result was observed.**

---

## 4. Workstream A — Destination Data Quality

### 4.1 Establish a canonical destination record

Reuse the existing schema if it already covers these fields. Add or migrate fields only when justified by the audit.

A destination record should support, where known:

- Stable destination ID.
- Canonical name and local-language name.
- Short and detailed descriptions.
- District, locality, and destination category.
- Latitude and longitude, with coordinate provenance.
- Recommended visit duration.
- Opening hours or schedule notes.
- Entry-fee amount, currency, and fee status.
- Accessibility and visitor-facility notes, when available.
- Best-season guidance, when supported.
- Nearby destination IDs.
- Image URLs and image attribution/licensing metadata, where applicable.
- Source URL/name, last-verified date, and verification status.
- Active/inactive status and data-quality notes.

Use explicit values or statuses for unknown information. Do not silently convert missing fees to ₹0, unknown hours to “open,” or missing coordinates to invented coordinates.

### 4.2 Data-quality validation

Implement reusable validation checks for:

- Duplicate destination IDs and likely duplicate destinations.
- Missing required names, categories, districts, or descriptions.
- Invalid latitude/longitude ranges.
- Invalid or negative durations and prices.
- Unsupported category values.
- Contradictory fee fields, such as “free” and a positive fee.
- Invalid or malformed source metadata.
- References to non-existent nearby destination IDs.
- Unclear distinction between verified facts and estimates.

Validation should report problems clearly. Avoid automatically deleting or fabricating records to make checks pass.

### 4.3 Minimum useful catalogue coverage

The catalogue must support realistic example itineraries in multiple regions of Karnataka rather than repeatedly selecting the same two places.

- Inspect the actual current catalogue size and geographic/category coverage first.
- Define a coverage matrix for districts/regions, destination categories, and common travel clusters.
- Identify data gaps and add records only when their facts can be sourced or appropriately marked as unverified.
- Include relevant attraction, nature, heritage, food/culture, and activity records where the available evidence supports them.
- Keep source and verification status visible in the data model even if all metadata is not displayed in every card.

**Acceptance criterion:** The planner can retrieve several suitable candidates for each planned day when the catalogue has sufficient data, and can explain when it cannot.

---

## 5. Workstream B — Shared Itinerary Contract

Define a single typed contract used by the backend response, frontend types, itinerary renderer, and tests. Reuse existing models if possible.

### 5.1 Itinerary-level fields

The itinerary should include:

- Itinerary ID, title, and generation timestamp.
- Origin and destination/region preferences.
- Start/end dates or duration.
- Traveller count and relevant preferences.
- Selected travel pace.
- Day-by-day schedule.
- Budget summary and itemised estimates.
- Data-source/verification summary.
- Generation mode: AI-assisted or deterministic fallback.
- Validation warnings and unresolved assumptions.

### 5.2 Day-level fields

Each day should include:

- Day number and date, if provided.
- Day title or theme.
- Planned stops in sequence.
- Total planned activity duration.
- Estimated travel duration where available.
- Meal and break coverage.
- Day-level cost estimate.
- Feasibility warnings, if any.

### 5.3 Stop-level fields

Each stop should support:

- Stable stop ID and destination ID where applicable.
- Stop type: attraction, meal, accommodation, transport, break, or activity.
- Name and description.
- Start and end time, where scheduled.
- Estimated visit/duration time.
- Coordinates when verified.
- Distance/travel-time estimate from the previous stop, with method and status.
- Cost amount and cost status.
- Source/provenance reference.
- Recommendation rationale.
- Optional user-edit state and ordering.

Use strict Pydantic validation on backend boundaries. Keep frontend types aligned with the API contract. Avoid maintaining separate, conflicting versions of itinerary types.

---

## 6. Workstream C — Deterministic Itinerary Scheduler

The scheduler is the core of this phase. The AI may personalise the explanation, but the scheduler must enforce basic feasibility.

### 6.1 Inputs

- Trip duration and dates, if supplied.
- Origin and preferred districts/regions.
- Selected categories and interests.
- Travel pace.
- Traveller count.
- Budget and currency.
- Available destination, food, accommodation, and activity records.
- Known opening hours and durations.
- Travel-time estimates and their source/status.
- User-mandated or excluded places.

### 6.2 Scheduling rules

1. Group destinations geographically to reduce unnecessary backtracking.
2. Rank candidates using user interests, data quality, geographic relevance, and suitability for the selected pace.
3. Respect verified opening hours and known seasonal closures.
4. Reserve time for travel, meals, breaks, and accommodation check-in/check-out when relevant.
5. Do not schedule overlapping activities.
6. Do not treat unknown travel time as zero.
7. Avoid adding a stop when its duration plus travel would make the day infeasible.
8. Avoid repeating the same destination unless the user explicitly requests it.
9. Respect user-selected places and exclusions where feasible; explain any conflict.
10. Prefer fewer feasible stops over a longer but unrealistic schedule.
11. If a full day cannot be planned from available data, return a partial itinerary with clear warnings instead of fabricating stops.
12. If transport or opening information is unavailable, mark the limitation and use conservative estimates only where a documented method exists.

### 6.3 Pace defaults

Use the existing product definitions if they are already established. The current UI indicates:

- Relaxed: approximately 2 stops/day.
- Balanced: approximately 3 stops/day.
- Packed: approximately 4 stops/day.

These should be **starting guidelines, not unconditional quotas**. A stop count must never override travel-time feasibility, opening hours, safety, or user preferences. Meal, accommodation, and transport entries should be modelled separately from sightseeing-stop counts where practical.

### 6.4 Travel estimates

- Reuse an existing configured routing provider if present and verified.
- If only coordinates are available, calculate straight-line distance and label it explicitly as such.
- Do not present straight-line distance as road distance.
- Do not claim live traffic, real-time routing, or turn-by-turn directions.
- Keep the calculation method and uncertainty in the returned data so the UI can explain the estimate.

### 6.5 Validation pass

After scheduling, validate:

- Time ordering and overlaps.
- Day boundaries and total durations.
- Travel buffers between stops.
- Verified opening-hour constraints.
- Required meal/break opportunities for the planned day.
- Accommodation needs for overnight trips.
- Budget totals and missing-cost handling.
- Duplicate stops and invalid destination references.
- Requested preferences and exclusions.
- The difference between confirmed facts and estimated values.

Return machine-readable warnings as well as user-readable messages.

---

## 7. Workstream D — AI Provider and Fallback Integration

Preserve the existing Gemini and Groq adapters/orchestrator unless the audit reveals a defect.

### Required behaviour

1. Retrieve candidate destinations and known factual metadata first.
2. Pass structured, retrieved facts and user preferences to the AI provider.
3. Ask the model to produce structured recommendations or explanations, not unsupported factual claims.
4. Validate model output against the shared schema.
5. Reject or repair malformed output using a bounded retry strategy.
6. Run the deterministic scheduler and validation rules regardless of provider choice.
7. If a provider fails, use the existing alternate-provider strategy.
8. If both providers fail, use deterministic planning when enough curated data exists.
9. If there is insufficient data, return an explicit limitation and ask for a useful preference or offer a partial plan.
10. Identify whether the result used AI-assisted generation or deterministic fallback.

### AI grounding rules

- Do not invent destination names, hotel/restaurant listings, prices, opening hours, coordinates, transport availability, or booking links.
- Do not present recommendations as live availability.
- Do not label an unverified fee as confirmed or free.
- Do not use model-generated text as the sole source for operational facts.
- Keep user-provided preferences distinct from retrieved facts and model-generated suggestions.
- Keep API keys and provider secrets on the backend; never expose them in frontend code or logs.

---

## 8. Workstream E — Budget Model

Expand the current entrance-fee-only summary into a transparent estimate model, using available data only.

### Categories

- Intercity transport.
- Local transport.
- Accommodation.
- Breakfast.
- Lunch.
- Dinner.
- Attraction entry.
- Activities.
- Optional shopping/miscellaneous allowance.
- Optional contingency buffer.

### Cost statuses

Every cost should have a clear status, such as:

- `verified`: supported by a current, identifiable source.
- `estimated`: calculated using a documented assumption or method.
- `user_provided`: entered by the traveller.
- `unknown`: insufficient data to estimate responsibly.
- `not_applicable`: no cost applies to that item.

Use the existing enum/naming conventions if the repository already has an equivalent.

### Calculation rules

- Multiply per-night accommodation estimates by the number of nights.
- Multiply per-person costs by the traveller count where appropriate.
- Avoid double-counting costs across stops and days.
- Do not count unknown prices as zero.
- Show excluded costs and assumptions.
- If the plan exceeds budget, suggest lower-cost alternatives without silently changing user constraints.

**Phase 1 does not require live commerce or booking integrations.** Estimates must be transparent and must not imply real-time pricing.

---

## 9. Workstream F — Frontend Itinerary Experience

Use the existing React/Vite/TypeScript/Tailwind structure and current design language. Do not replace working components merely for stylistic consistency.

### Itinerary results should show

- Trip summary: duration, origin, traveller count, pace, and generation mode.
- One clearly separated section per day.
- Chronological stop cards with time, stop type, duration, description, and cost status.
- Travel-time/distance information between stops where available.
- Meal and accommodation entries.
- Daily and overall budget summaries.
- Data/estimate disclaimers.
- Validation warnings for incomplete or uncertain schedules.
- Map/list toggle, preserving current functionality.
- Loading, empty, error, partial-result, and fallback states.

### Interaction requirements

Where the existing architecture supports safe updates, provide or preserve:

- Remove a stop.
- Replace a stop with a suitable alternative.
- Reorder stops.
- Adjust trip preferences and regenerate.
- Save the itinerary.
- Reopen a saved itinerary.

If editing a stop makes the schedule invalid, revalidate it and show the consequences. Do not leave stale time or budget totals after edits.

### Accessibility and responsive behaviour

- Ensure controls have accessible labels and keyboard support.
- Preserve readable contrast and visible focus states.
- Verify small-screen layouts; itinerary cards must not overflow horizontally.
- Avoid relying on emoji alone to communicate a stop type or error.
- Ensure the interface remains usable if a destination image fails to load.

---

## 10. API and Persistence Considerations

Inspect the existing API before deciding whether to add or change routes. Avoid creating duplicate endpoints.

The API must be able to:

- Accept validated trip preferences.
- Return the structured itinerary contract.
- Return validation warnings and estimate statuses.
- Report the generation mode.
- Handle provider failure and insufficient-data cases predictably.

If existing request/response schemas are inadequate, document the compatibility plan before changing them.

For persistence:

- Reuse the existing guest/device storage behaviour.
- Do not claim cloud sync is enabled unless the live Supabase schema, migrations, auth, RLS policies, and end-to-end save/load path have been verified.
- Preserve user ownership and RLS protections.
- Keep secrets out of source code and logs.
- Do not store uploaded media as part of this phase unless already required by existing functionality.

---

## 11. Testing and Verification Plan

Run the repository's existing commands first and retain the baseline. Use the actual commands documented by the project rather than inventing package scripts.

### Unit tests

- Destination record/schema validation.
- Duplicate and invalid catalogue data detection.
- Candidate ranking and preference matching.
- Geographic grouping and distance-method labelling.
- Schedule generation for 1-, 2-, 3-, and multi-day trips.
- Time overlap and day-boundary detection.
- Opening-hour handling when data is known.
- Meal and overnight accommodation handling.
- Cost aggregation and per-person calculations.
- Unknown prices never becoming zero by default.
- Duplicate-stop prevention.
- Infeasible schedule warnings.
- AI response schema validation.
- Provider timeout/error handling.
- Deterministic fallback behaviour.

### Integration tests

- Valid preferences produce a structured itinerary.
- A two-day trip produces multiple suitable activities when data permits.
- A multi-day trip does not repeat destinations unnecessarily.
- Provider output is grounded in retrieved records.
- Malformed provider output is rejected or safely repaired.
- Both AI providers failing triggers deterministic fallback when possible.
- Insufficient catalogue data produces an honest partial result.
- Frontend API types match backend responses.
- Saved-trip behaviour remains intact.
- Existing authentication and RLS behaviour remains intact where applicable.

### Frontend tests

- Trip form validation and preference submission.
- Day-wise itinerary rendering.
- Meal, accommodation, transport, and activity stop rendering.
- Estimate/unknown status display.
- Warning and fallback states.
- Budget totals update after stop changes.
- Map/list switching remains functional.
- Mobile viewport and long-content layout.
- English/Kannada text does not break layout.

### Regression and quality gates

- Backend tests pass.
- Frontend tests pass.
- Linting and type checks pass.
- Production frontend build passes.
- Existing API contracts and saved trips remain compatible or are migrated deliberately.
- No secrets are committed.
- No unsupported factual claims are introduced.
- All reported test counts and commands are recorded in the completion report.

Do not weaken, delete, or skip tests just to obtain a green result. Explain any known failures.

---

## 12. Suggested Implementation Sequence

### Step 1 — Baseline and audit
Produce `docs/PHASE_1_BASELINE_AUDIT.md`, record the clean/dirty Git state, inspect existing tests, and map current code to the roadmap.

### Step 2 — Data contract and catalogue checks
Define/reuse typed models, add catalogue validation, identify missing fields, and document data coverage gaps.

### Step 3 — Scheduler and feasibility validator
Implement the deterministic scheduler and validation rules independently of the AI provider.

### Step 4 — Provider orchestration
Integrate retrieved catalogue data, schema validation, Gemini/Groq handling, and deterministic fallback.

### Step 5 — Cost estimates
Implement transparent cost categories, statuses, totals, and budget warnings.

### Step 6 — Frontend rendering
Render the full structured itinerary with daily sections, meal/accommodation/activity entries, estimate statuses, warnings, and responsive layouts.

### Step 7 — Automated verification
Add and run unit, integration, frontend, and regression tests.

### Step 8 — Documentation and hand-off
Produce the completion report, update roadmap mapping without renumbering canonical phases, and list unresolved items for the next phase.

---

## 13. Definition of Done

Phase 1 is complete only when all applicable criteria below have evidence:

- [ ] Existing implementation and roadmap were audited before code changes.
- [ ] Baseline and final test/build results are documented.
- [ ] Destination catalogue validation runs and reports actionable errors.
- [ ] Unknown destination facts remain unknown rather than being fabricated.
- [ ] A shared, validated itinerary contract is used across API and UI.
- [ ] A two-day itinerary includes multiple suitable sightseeing/activity stops when catalogue coverage and trip constraints allow.
- [ ] The itinerary accounts for meals, travel gaps, breaks, and overnight accommodation needs.
- [ ] Scheduling avoids overlapping times and respects known opening hours.
- [ ] Stops are not added solely to meet a target stop count.
- [ ] Budget totals are consistent, transparent, and do not count unknown costs as zero.
- [ ] Gemini/Groq failures are handled safely.
- [ ] Deterministic fallback produces a useful result when sufficient data exists.
- [ ] Insufficient data results in a clear partial plan or explanation.
- [ ] Frontend supports day-wise itinerary rendering and visibly communicates uncertainty.
- [ ] Existing destination exploration, map/list switching, and saved-trip flows still work.
- [ ] Backend and frontend regression tests pass, or remaining failures are explicitly documented.
- [ ] Security, authentication, and RLS protections have not been weakened.
- [ ] No claims of live prices, availability, or road navigation are made without the corresponding integration.
- [ ] The final report identifies what is verified, partial, missing, and deferred.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Catalogue lacks enough destinations | Measure coverage first; add sourced records; return a clear partial plan when needed. |
| AI invents places or operational facts | Retrieve facts first; validate IDs and fields; use deterministic scheduling and source metadata. |
| Itinerary is long but unrealistic | Validate time, travel, opening hours, and breaks; prefer fewer feasible stops. |
| Estimates appear to be confirmed prices | Attach explicit cost statuses and source/assumption metadata. |
| Provider outage breaks planning | Use alternate-provider handling and deterministic fallback. |
| Schema changes break saved trips | Inspect existing data and add deliberate, backward-compatible migrations. |
| UI and API types diverge | Maintain shared documented contracts and contract tests. |
| Scope expands into booking/navigation | Keep live booking, payments, live traffic, and turn-by-turn routing out of scope. |
| Existing functionality regresses | Preserve baseline tests and add regression coverage before replacing components. |

---

## 15. Phase 1 Deliverables

Expected deliverables:

1. `docs/PHASE_1_BASELINE_AUDIT.md`
2. `docs/PHASE_1_IMPLEMENTATION_PLAN.md` — this document
3. Destination schema/data validation and coverage report.
4. Shared itinerary API contract and validation rules.
5. Deterministic itinerary scheduler and feasibility validator.
6. AI provider integration updates, if needed, with safe fallback behaviour.
7. Transparent budget-estimation model.
8. Frontend day-wise itinerary rendering improvements.
9. Unit, integration, frontend, and regression tests.
10. `docs/PHASE_1_COMPLETION_REPORT.md` with files changed, commands run, actual results, limitations, and next-phase recommendations.

---

## 16. Antigravity Execution Instructions

Use this plan as an implementation contract.

1. Start with a repository audit. Do not immediately rewrite files.
2. Read the existing project documentation and inspect the actual source tree.
3. Preserve current architecture and working functionality unless evidence justifies a change.
4. Keep changes incremental and scoped to Phase 1.
5. Before schema/API changes, explain compatibility and migration implications.
6. Do not fabricate test results, catalogue facts, live availability, prices, or implementation status.
7. Do not mark a feature complete based only on a UI element or mocked response.
8. Run the relevant tests after each workstream and the full regression suite at the end.
9. If a required external source or credential is unavailable, implement a safe interface/fallback and document the limitation rather than simulating live data.
10. Do not begin photo/video place discovery, live booking, payments, or turn-by-turn navigation in this phase.
11. Update the existing roadmap mapping using its established canonical phase numbers; do not create conflicting phase numbering.
12. Finish by presenting a concise implementation summary, exact files changed, tests actually run, observed results, remaining risks, and a clear verified/partial/missing status.

**Completion rule:** Phase 1 is not complete merely because the application renders or the AI returns JSON. It is complete when the itinerary is structured, reasonably feasible, grounded in available data, transparent about uncertainty, covered by tests, and integrated without regressing existing functionality.
