# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
# PHASE 2 IMPLEMENTATION PLAN
## Verified Destination Expansion, Real Places to Eat and Stay, and Practical Travel Intelligence

**Document ID:** NK-PLAN-P2-2026-10-23  
**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Phase:** Phase 2 — Catalogue Expansion & Real-World Travel Data  
**Target environment:** Google Antigravity IDE  
**Implementation approach:** Audit-first, incremental, evidence-based, test-driven

---

# 1. PURPOSE

Phase 1 established the foundation for structured, day-by-day itinerary generation, including stop types, a deterministic scheduler, budget breakdowns, AI grounding, fallback behaviour, and frontend rendering.

The Phase 1 completion report states that the current curated pilot catalogue contains **12 destinations across 9 districts**. It also states that specific restaurants and hotels are represented by transparent placeholders rather than verified commercial listings. Road travel estimates remain approximations based on straight-line distance with a terrain factor, not actual road routing.

Phase 2 should build on that foundation by improving the real-world information available to the planner. The aim is to help a traveller answer:

- What places should I visit?
- What can I do there?
- Where can I eat nearby?
- Where could I stay overnight?
- How can I move between places?
- What will likely cost money, and what remains unknown?
- How reliable and current is each recommendation?

**Important:** The Phase 1 report is the source for the current-state statements above. Antigravity must verify the actual repository and live configuration before assuming that every reported feature is present or working.

---

# 2. PHASE 2 OBJECTIVES

1. Expand the verified destination catalogue without sacrificing data quality.
2. Add real, source-backed restaurant and accommodation recommendations where reliable data is available.
3. Introduce a consistent provider/data-source abstraction for places and travel information.
4. Improve geographic matching of food, lodging, attractions, and activities.
5. Improve travel estimates using a real routing source if one can be configured and verified.
6. Make data freshness, provenance, uncertainty, and missing information visible.
7. Improve itinerary generation using the richer catalogue.
8. Improve cost estimates without fabricating prices or availability.
9. Preserve Phase 1 scheduling, budget, AI grounding, deterministic fallback, bilingual UI, map/list view, and saved-trip workflows.
10. Add automated tests, data-quality reports, and implementation documentation.

Phase 2 is **not** complete merely because more records are added or new UI cards are visible. The underlying records, API responses, provider behaviour, fallback paths, and user workflows must be verified.

---

# 3. SOURCE-OF-TRUTH AND EXECUTION RULES

Before implementation, inspect and preserve the existing project documentation and canonical roadmap.

- Do not renumber canonical roadmap phases.
- Do not replace the original PRD/TRD with a new roadmap.
- Map each Phase 2 task to the existing canonical roadmap.
- Preserve all uncommitted user changes.
- Inspect `git status`, branch, and latest commit before editing.
- Reuse existing schemas, services, API routes, and UI patterns where appropriate.
- Do not claim a provider, API, or integration is live unless it was actually configured and tested.
- Do not fabricate business listings, opening hours, entry fees, hotel prices, availability, contact details, or booking links.
- Do not scrape websites in violation of their terms or bypass access controls.
- Prefer official tourism/government sources, destination operators' official sources, and permitted APIs or open datasets with clear licensing.
- Respect provider attribution, caching, rate limits, and usage terms.
- Keep API credentials server-side.
- Do not weaken Supabase Auth, RLS, or existing ownership checks.
- Do not delete or weaken tests to get a passing result.
- If a service or credential is unavailable, document the blocker and implement a safe interface/fallback where useful.
- Clearly separate verified facts, estimates, user-provided values, and unknown information.

---

# 4. WORKSTREAM 0 — REPOSITORY AND PHASE 1 BASELINE AUDIT

## 4.1 Inspect the actual project

Inspect:

- `docs/PHASE_1_BASELINE_AUDIT.md`
- `docs/PHASE_1_DESTINATION_DATA_QUALITY.md`
- `docs/PHASE_1_COMPLETION_REPORT.md`
- Existing PRD, TRD, implementation plan, and roadmap mapping
- Destination schemas, seed files, translations, and source records
- Existing destination quality validator
- Planning API and shared itinerary contract
- Scheduler and budget calculator
- AI orchestrator and fallback implementation
- Frontend destination explorer and detail views
- Itinerary results and map/list view
- Supabase migrations, policies, and RLS tests
- Current backend/frontend test commands
- Provider configuration and environment-variable examples

Run `git status --short` and inspect the current branch and commit. Do not overwrite uncommitted work.

Run the existing tests, lint, type-check, and production build before changes. Record any baseline failures.

## 4.2 Create the baseline document

Create or update:

`docs/PHASE_2_BASELINE_AUDIT.md`

Include:

- Actual repository structure relevant to Phase 2.
- Phase 1 features verified by code/tests.
- Features only reported in documentation but not independently verified.
- Actual destination count, district coverage, and category coverage.
- Whether restaurant/accommodation records exist.
- Whether a permitted external places provider is already configured.
- Whether routing integration exists and is usable.
- Data freshness and provenance fields available today.
- Current API contracts and database constraints.
- Baseline test and build results.
- Git state and pre-existing failures.
- Dependencies, risks, and implementation order.

**Gate 0:** Do not begin broad changes until the current implementation and constraints are understood.

---

# 5. WORKSTREAM A — DESTINATION CATALOGUE EXPANSION

## 5.1 Expansion strategy

Expand the curated destination catalogue in measured batches.

The Phase 1 report identifies a pilot catalogue of 12 destinations. Phase 2 should increase breadth while preserving quality; it must not pursue a record-count target at the expense of reliable data.

Prioritise:
1. Regions already represented in the catalogue, to make multi-stop itineraries more useful.
2. High-value destinations in underrepresented districts.
3. Geographic clusters where several suitable attractions can form realistic day trips.
4. A balanced mix of heritage, architecture, nature, waterfalls, hills, beaches, wildlife, spiritual/cultural destinations, local experiences, and activities.
5. Destinations that have enough trustworthy information to support planning.

The report mentions 31 districts in the database. Verify the current official district list and the repository's district IDs before using them. Do not hard-code district counts or names without checking the source data.

## 5.2 Record requirements

Reuse the existing destination schema. Add or improve fields only when the current schema cannot represent required information.

For each destination, retain available fields such as:

- Stable ID.
- Canonical English name.
- Kannada name.
- English and Kannada summaries/descriptions where supported by sources.
- District and locality.
- Category and tags.
- Coordinates and coordinate source.
- Recommended visit duration and whether it is estimated.
- Opening hours or explicit unknown status.
- Entry fee and explicit cost status.
- Accessibility/facility information where verified.
- Nearby destination relationships where supported.
- Image source, attribution, and licensing information where applicable.
- Source name, source type, source reference/URL, and checked-at date.
- Verification status and data-quality notes.

Do not create artificial bilingual text simply to satisfy a completeness metric. If a trustworthy Kannada translation is unavailable, mark it for editorial review rather than claiming parity.

## 5.3 Validation and coverage

Extend the existing data-quality auditor to report:

- Total active destinations.
- Unique districts and destinations per district.
- Category distribution.
- Coordinate coverage and out-of-bounds records.
- Visit-duration coverage.
- Opening-hour status.
- Entry-fee status.
- English/Kannada completeness.
- Source and verification coverage.
- Image attribution coverage where applicable.
- Duplicate or suspiciously similar records.
- Missing nearby-place relationships.
- Records needing re-verification.

The validator must produce actionable errors and warnings. It must not silently delete records or invent missing values.

## 5.4 Data sourcing and editorial controls

Use permitted and attributable sources, such as official tourism portals, government/ASI sources, destination operator sources, or suitable open datasets with explicit terms.

For each imported or manually curated record:
- Keep the source reference.
- Record the checked-at date.
- Preserve the source's meaning.
- Avoid claiming that a source confirms details it does not contain.
- Record any editorial estimate as an estimate.
- Avoid unlicensed image reuse.

Create or update:

`docs/PHASE_2_DESTINATION_COVERAGE_REPORT.md`

Include measured counts, source coverage, unresolved gaps, and a prioritized expansion queue. Do not claim complete statewide coverage unless the data supports that statement.

**Gate A:** New destination records pass validation and retain source/provenance metadata.

---

# 6. WORKSTREAM B — REAL RESTAURANT AND FOOD RECOMMENDATIONS

The goal is to move beyond generic meal placeholders where reliable venue data is available.

## 6.1 Inspect available sources first

Check whether the project already has:
- A permitted places API.
- An existing restaurant dataset.
- Local food/restaurant records.
- Provider credentials configured in backend environment.
- A suitable open dataset with clear licensing and update rules.

Do not assume Google Places, OpenStreetMap, or any other provider is already configured.

If using an external provider, document its:
- Authentication requirements.
- Usage limits and pricing where applicable.
- Attribution requirements.
- Data-retention/caching restrictions.
- Fields returned.
- Geographic coverage and known gaps.
- Failure modes.

Do not use scraping as a substitute for a permitted provider or dataset.

## 6.2 Place record model

Reuse existing models where possible. Support relevant fields:

- Stable internal place ID.
- Provider/source ID.
- Name.
- Place category or cuisine tags where available.
- Coordinates.
- Address/locality.
- District/region where available.
- Source and attribution.
- Last checked/fetched time.
- Operational status, if available from a reliable source.
- Opening hours, only when returned by a trustworthy source.
- Price range, only when supplied or transparently estimated.
- Accessibility/amenities when available.
- Source confidence/freshness metadata.
- Link to the source or official website when permitted.

Do not expose private provider credentials or internal-only metadata.

## 6.3 Food recommendation behaviour

Where real data is available:
- Recommend restaurants near planned stops or the overnight area.
- Consider meal time, geographic proximity, trip pace, and available dietary preferences.
- Avoid sending the traveller far away for an arbitrary restaurant.
- Provide multiple candidates when the provider has enough results.
- Explain why a result is recommended, using factual fields.
- Distinguish verified opening hours from missing or stale hours.
- Show source attribution when required.

When data is unavailable:
- Use a clearly labelled generic meal break or area-level suggestion.
- Do not invent restaurant names or addresses.
- Do not claim a restaurant is open now unless the provider supplies sufficiently current opening information and the time-zone logic is correct.

## 6.4 Caching and resilience

Use a backend service abstraction with:
- Timeouts.
- Bounded retries.
- Rate-limit handling.
- Safe provider error handling.
- Cache policy compliant with provider terms.
- Fallback to curated results if available.
- Clear empty-result states.

Do not return provider stack traces to users.

**Gate B:** Restaurant recommendations are real and source-backed when shown as named venues; otherwise the UI clearly indicates that venue-level data is unavailable.

---

# 7. WORKSTREAM C — ACCOMMODATION RECOMMENDATIONS

The goal is to give travellers useful stay options without pretending that a hotel has available rooms or a current price when those facts are not known.

## 7.1 Data model

Reuse the place/provider abstraction from Workstream B where practical.

Support relevant fields:

- Stable internal ID.
- Provider/source ID.
- Name.
- Coordinates and locality/address.
- Accommodation type, if known.
- Source link and attribution.
- Amenities, if supplied by a trustworthy source.
- Check-in/check-out information, if verified.
- Price/range and its source/status, if available.
- Last checked/fetched time.
- Data freshness and verification status.

## 7.2 Recommendation logic

Recommend accommodation based on:
- Geographic position relative to planned destinations.
- Overnight stop/day cluster.
- Traveller count and room assumptions.
- Budget preference.
- Accessibility/amenity preferences if captured.
- Available source data.

Do not claim live availability, reservation confirmation, or real-time prices without an actual booking/provider integration.

Do not invent a hotel or homestay. If only a locality is known, show a clearly labelled suggested stay area, not a fabricated business.

## 7.3 Itinerary integration

For multi-day trips:
- Show the planned overnight location.
- Display named accommodation options only when backed by real records.
- Distinguish an accommodation suggestion from a confirmed booking.
- Preserve a clear option for the traveller to choose their own stay.
- Keep accommodation estimates separate from confirmed charges.

**Gate C:** The itinerary communicates whether it contains a real venue recommendation, a suggested area, or only a placeholder.

---

# 8. WORKSTREAM D — PLACES DATA PROVIDER ABSTRACTION

Avoid tightly coupling business logic to one external provider.

Create a provider interface or service boundary consistent with existing architecture.

It should support:
- Search by geographic point/area.
- Search by category.
- Optional radius/region filters.
- Normalised result schema.
- Source attribution.
- Fetch timestamp.
- Provider status and error mapping.
- Timeout and rate-limit handling.
- Empty-result handling.
- Provider-specific caching policy.

Use the existing project's dependency injection/configuration style.

Keep the planner independent of the provider SDK. The scheduler should consume normalised data, not provider-specific response objects.

If no provider is available, implement and test the abstraction against the existing curated data and leave external provider activation explicitly blocked/configuration-dependent. Do not fabricate successful external calls.

Create or update:

`docs/PHASE_2_DATA_PROVIDER_DESIGN.md`

Document the chosen provider or dataset, decision rationale, licence/attribution obligations, environment configuration, data limitations, and fallback behaviour.

**Gate D:** The planner can use normalised curated/provider results without coupling its core scheduling logic to a vendor.

---

# 9. WORKSTREAM E — TRAVEL ROUTING AND GEOGRAPHIC FEASIBILITY

Phase 1 reports that travel estimates use Haversine distance, a terrain factor, and a time buffer. These are approximations, not actual road routes.

## 9.1 Audit first

Verify whether a routing provider is already implemented, configured, and permitted for use.

Potential routing options must be evaluated against current terms, availability, rate limits, deployment constraints, and cost. Do not assume any particular service is configured.

## 9.2 Routing service

If a real routing source can be configured:
- Implement a backend routing abstraction.
- Request route distance and duration.
- Preserve source/provider and fetched timestamp.
- Handle timeout, rate limit, invalid routes, and provider outage.
- Use bounded retries.
- Apply compliant caching.
- Keep credentials server-side if required.

If no routing source can be activated:
- Keep the existing straight-line estimate.
- Clearly label it as an approximation.
- Never call it road distance.
- Do not claim live traffic or turn-by-turn navigation.

## 9.3 Scheduler integration

Use travel estimates to:
- Group destinations into practical geographic day clusters.
- Avoid unrealistic inter-region travel.
- Include transit time between stops.
- Flag a day that is too long or too geographically dispersed.
- Recompute schedule feasibility when stops are changed.

Do not silently assume missing travel time is zero.

**Gate E:** Travel estimates clearly distinguish actual route data from approximate geometry, and infeasible days generate warnings.

---

# 10. WORKSTREAM F — ITINERARY INTELLIGENCE IMPROVEMENTS

Use the richer destination, food, accommodation, and routing data to improve the existing Phase 1 scheduler.

Do not rewrite the scheduler without evidence. Extend its current design and preserve tested behaviour.

## Required behaviour

- Select destinations based on user preferences and available data.
- Group attractions geographically.
- Place meal opportunities near the planned route where data permits.
- Suggest a suitable overnight area or real accommodation option.
- Use real route durations when available.
- Keep the relaxed/balanced/packed pace rules intact.
- Avoid duplicate or unnecessary repeated stops.
- Preserve required user-selected destinations.
- Respect exclusions.
- Respect known opening hours and visiting durations.
- Recalculate timing and costs when the itinerary changes.
- Explain when an itinerary is incomplete because of missing data.

## Recommendation transparency

Each recommendation should, where possible, include:
- Why it fits the traveller's preferences.
- Approximate distance from the previous stop.
- Travel estimate method.
- Source/verification status.
- Any relevant limitation.

The AI provider may personalise ranking or descriptions, but it must not create new factual venue records or bypass deterministic feasibility checks.

**Gate F:** Richer data improves the itinerary without breaking Phase 1's scheduling, validation, or fallback guarantees.

---

# 11. WORKSTREAM G — BUDGET ENGINE ENHANCEMENTS

Reuse the Phase 1 budget calculator.

Add support for new verified/provider-sourced costs where available.

Maintain explicit statuses such as:
- `verified`
- `estimated`
- `user_provided`
- `unknown`
- `not_applicable`

## Requirements

- Preserve existing cost calculations and tests.
- Add source and timestamp information for provider-sourced prices where appropriate.
- Keep accommodation rates separate from confirmed booking prices.
- Do not assume a hotel price or room availability.
- Do not infer restaurant prices from a venue name alone.
- Do not double count local transport or meal costs.
- Keep per-person and group totals consistent.
- Make unknown cost categories visible.
- Explain assumptions and estimate ranges.
- Clearly distinguish a rough planning estimate from a live quote.
- Handle missing prices without silently converting them to zero.

**Gate G:** New data improves cost estimates without creating misleading precision or breaking existing budget totals.

---

# 12. WORKSTREAM H — FRONTEND EXPERIENCE

Keep the existing design system and current visual language. Do not redesign unrelated pages.

## 12.1 Destination explorer

Where data supports it, improve:
- Destination details.
- District and category information.
- Visiting duration.
- Fee status.
- Source/verification indicator.
- Nearby destinations.
- Food and accommodation areas/options.
- Data limitations.

Do not overcrowd destination cards. Put detailed metadata in the detail view or an expandable section.

## 12.2 Itinerary results

For each day, show:
- Chronological activities and attractions.
- Meals.
- Accommodation/overnight area.
- Travel distance/time with its method/status.
- Daily budget.
- Source or freshness indicators where useful.
- Warnings for missing data or infeasible travel.
- Real named venues only when supported by actual records.

Make it visually clear whether an item is:
- A verified place.
- A provider-sourced result.
- An estimate.
- A suggested area.
- An unverified placeholder.

## 12.3 Empty and failure states

Handle:
- No nearby restaurants found.
- No accommodation data found.
- Provider unavailable.
- Provider rate limited.
- Stale information.
- Missing opening hours.
- Unknown price.
- No route result.
- Insufficient destination density.

Offer useful next actions rather than displaying broken cards or misleading claims.

## 12.4 Preserve existing features

Verify:
- English/Kannada toggle.
- Search and filters.
- Destination details.
- Plan Trip flow.
- Day-by-day itinerary.
- Map/list toggle.
- Budget summary.
- Guest saving.
- Authenticated saved trips.
- Reopening/deleting saved trips.

**Gate H:** New recommendations are understandable, attributable, and honest about their status, while existing workflows remain functional.

---

# 13. WORKSTREAM I — API, DATABASE, SECURITY, AND PRIVACY

Inspect the current schema and API before introducing changes.

- Reuse current destination tables where possible.
- Use new tables only if provider-sourced place data needs persistence and the existing design cannot support it safely.
- Add migrations only when necessary.
- Preserve RLS and ownership checks.
- Store credentials only in server-side environment variables.
- Validate and normalise all provider responses.
- Avoid storing unnecessary personal data.
- Respect provider data-retention rules.
- Do not persist provider data longer than its terms permit.
- Avoid logging API keys, tokens, or complete user prompts unnecessarily.
- Return safe, structured errors.
- Apply request timeouts and bounded retries.
- Ensure provider failures cannot break deterministic itinerary generation.
- Do not claim cloud deployment or live provider access unless verified.

If adding a provider requires configuration, document the exact environment-variable names in an example file without including real secret values.

**Gate I:** Security controls remain intact, and provider configuration is explicit and safe.

---

# 14. WORKSTREAM J — TESTING AND VERIFICATION

Use the repository's actual test commands. Do not invent scripts.

## Backend tests

Cover:
- Destination data validation and coverage report.
- New record normalisation.
- Source/provenance metadata.
- Provider interface behaviour.
- Provider timeout and rate-limit handling.
- Empty provider results.
- Provider outage fallback.
- Restaurant proximity ranking.
- Accommodation proximity and overnight-area selection.
- Routing-provider results and fallback to straight-line estimates.
- Travel-time labels.
- Schedule feasibility after routing changes.
- Cost status and unknown-price handling.
- AI grounding against the catalogue/provider records.
- Invalid provider payloads.
- API contract compatibility.
- Supabase security behaviour if database-related changes are made.

## Frontend tests

Cover:
- Destination details and provenance display.
- Real restaurant result rendering.
- Real accommodation result rendering.
- Suggested-area and placeholder distinction.
- Opening-hours uncertainty.
- Unknown prices.
- Provider outage and empty states.
- Route-estimate method display.
- English/Kannada rendering.
- Existing itinerary, map/list, and saved-trip behaviour.

## Integration and regression checks

Run:
- Full backend test suite.
- Full frontend test suite.
- Python lint/format checks.
- Frontend lint.
- TypeScript type check.
- Production build.
- Relevant migration/RLS checks.
- End-to-end scenarios where browser tooling is available.

Record exact commands and observed results.

Do not weaken tests or hide baseline failures.

**Gate J:** All relevant checks have evidence-based results, and existing workflows are not regressed.

---

# 15. REQUIRED END-TO-END SCENARIOS

## Scenario A — Destination expansion

Expected:
- New records have valid IDs, coordinates, and categories.
- Required bilingual fields are complete or explicitly flagged for editorial review.
- Sources and checked-at dates are present where required.
- Duplicate or invalid records are reported.
- Coverage report uses actual counts.

## Scenario B — Restaurant discovery

Expected:
- A nearby restaurant result comes from an actual configured provider or curated record.
- Source/attribution is preserved.
- Missing hours and prices remain unknown.
- Provider outage produces a safe fallback or clear empty state.
- No fake restaurant is returned.

## Scenario C — Accommodation discovery

Expected:
- A real accommodation result is shown only if supported by data.
- Otherwise, a suggested stay area or transparent placeholder is displayed.
- No unsupported availability or booking-price claim is made.

## Scenario D — Routing

Expected:
- If a routing provider is configured, the system returns source-backed route distance/duration.
- If not, the system labels the existing straight-line approximation clearly.
- A route failure does not crash itinerary generation.

## Scenario E — Multi-day itinerary

Expected:
- Multiple appropriate destinations per day when catalogue density and constraints permit.
- Meal opportunities are geographically reasonable.
- Overnight area/stay guidance is included.
- Travel time contributes to schedule feasibility.
- The system avoids unrealistic inter-region travel.

## Scenario F — Unknown prices

Expected:
- Unknown restaurant, hotel, and attraction costs remain unknown.
- Budget totals do not falsely imply all expenses are covered.
- Estimated values are clearly distinguished from verified values.

## Scenario G — Existing workflow regression

Expected:
- Search and filters work.
- Destination details work.
- Trip planning works.
- Map/list view works.
- Budget summary works.
- Guest and authenticated saved trips work.
- English/Kannada switching works.
- Auth and RLS protections remain intact.

---

# 16. IMPLEMENTATION ORDER

Implement in this order. Do not make all changes in one untested edit.

1. **Audit:** Inspect repository, Phase 1 reports, Git status, provider configuration, data, APIs, and tests.
2. **Catalogue:** Improve validation, source metadata, and measured coverage reporting.
3. **Provider decision:** Evaluate available sources and select only a permitted, feasible provider or dataset.
4. **Provider abstraction:** Implement a normalised backend interface with timeouts, rate limits, errors, and fallback.
5. **Food recommendations:** Integrate real source-backed restaurant data where available.
6. **Accommodation recommendations:** Integrate real source-backed stay options or clearly labelled area-level guidance.
7. **Routing:** Integrate a real routing source only if it can be configured and verified; otherwise preserve honest approximation labels.
8. **Scheduler integration:** Use new place and route data to improve day planning.
9. **Budget integration:** Add supported data to cost calculations without double counting.
10. **Frontend:** Render recommendations, sources, freshness, uncertainty, and failure states.
11. **Testing:** Run unit, integration, frontend, lint, type-check, build, and relevant security checks.
12. **Documentation:** Produce the reports described below.
13. **Final audit:** Compare actual implementation against every acceptance criterion.

---

# 17. REQUIRED DOCUMENTATION

Create or update these files:

### `docs/PHASE_2_BASELINE_AUDIT.md`
Actual starting state, verified features, gaps, baseline tests, Git state, and dependencies.

### `docs/PHASE_2_DESTINATION_COVERAGE_REPORT.md`
Actual catalogue counts, district/category coverage, provenance completeness, validation results, and expansion priorities.

### `docs/PHASE_2_DATA_PROVIDER_DESIGN.md`
Provider/dataset selection, source terms, attribution, caching, rate limits, environment configuration, limitations, and fallback behaviour.

### `docs/PHASE_2_COMPLETION_REPORT.md`
Implementation summary, exact files changed, migrations, test commands/results, verified capabilities, partial work, blocked integrations, known limitations, and roadmap mapping.

Do not claim these reports exist until they have been created and checked.

---

# 18. ACCEPTANCE CRITERIA — DEFINITION OF DONE

Phase 2 may be marked complete only when supported by evidence.

## Catalogue
- [ ] Destination catalogue expanded using reliable sources.
- [ ] Coverage metrics are generated from actual records.
- [ ] Duplicate and invalid records are detected.
- [ ] Source/provenance information is retained.
- [ ] Unknown facts are not fabricated.
- [ ] Bilingual gaps are honestly flagged.

## Places data
- [ ] A normalised provider/data-source abstraction exists.
- [ ] Named restaurant recommendations are backed by actual records.
- [ ] Named accommodation recommendations are backed by actual records.
- [ ] If real data is unavailable, UI uses clearly labelled area guidance or placeholders.
- [ ] Opening hours, prices, and availability are never invented.
- [ ] Provider attribution and data-use rules are respected.

## Routing and itinerary
- [ ] Real routing is integrated only if configured and verified.
- [ ] Straight-line estimates remain labelled as approximations.
- [ ] Travel feasibility is incorporated into day scheduling.
- [ ] Meals and accommodation are geographically sensible where data permits.
- [ ] Phase 1 scheduler and fallback continue to work.
- [ ] Insufficient data produces clear limitations.

## Budget
- [ ] Verified, estimated, user-provided, unknown, and not-applicable statuses are preserved.
- [ ] No unsupported price precision is shown.
- [ ] No double counting is introduced.
- [ ] Unknown costs do not silently become zero.

## Frontend and security
- [ ] New result states render correctly.
- [ ] English/Kannada support remains functional.
- [ ] Existing search, planning, map/list, and saved-trip workflows pass regression tests.
- [ ] RLS and ownership checks remain intact.
- [ ] Credentials remain server-side.
- [ ] Provider errors are handled safely.

## Quality and documentation
- [ ] Backend and frontend tests run.
- [ ] Lint, type checking, and production build run.
- [ ] Relevant security/migration checks run.
- [ ] All four Phase 2 documents are created/updated.
- [ ] Completion claims are evidence-based.
- [ ] Canonical roadmap numbering is preserved.

A green build alone is not enough. A populated UI alone is not enough. A provider adapter with no real successful integration test is not proof of live data.

---

# 19. OUT OF SCOPE

Unless the existing canonical roadmap explicitly assigns these to Phase 2, do not implement them opportunistically:

- Photo/video place identification and discovery.
- Live hotel/restaurant booking.
- Payment processing.
- Ticket purchases.
- Turn-by-turn navigation.
- Live traffic.
- Native mobile apps.
- Collaborative itinerary editing.
- Full review/rating/social platform.
- Unrelated visual redesign.

Do not create new canonical phase numbers. If an out-of-scope item is discovered in the existing roadmap, map it correctly instead of silently pulling it into Phase 2.

---

# 20. FINAL RESPONSE REQUIRED

At completion, report:

1. **Overall status:** Complete / Partially complete / Blocked.
2. **Verified catalogue expansion:** Actual before/after counts and coverage.
3. **Restaurant recommendations:** Which source is used and what was actually tested.
4. **Accommodation recommendations:** Which source is used and what was actually tested.
5. **Routing:** Real provider or straight-line fallback, with evidence.
6. **Itinerary improvements:** Actual observed behaviour.
7. **Budget changes:** Categories and uncertainty handling.
8. **Exact files changed:** Repository paths and purpose.
9. **Database/API changes:** Migrations and compatibility.
10. **Tests run:** Exact commands, pass/fail counts, lint/type/build results.
11. **Known limitations:** Data gaps, provider credentials, usage restrictions, and unverified integrations.
12. **Documentation created:** Exact file paths.
13. **Roadmap mapping:** Existing canonical phase numbers only.
14. **Next steps:** Genuine remaining work.

Classify each significant capability as:
- **Verified:** Confirmed by direct inspection or execution.
- **Partial:** Implemented but incompletely verified.
- **Missing/Deferred:** Not implemented.
- **Blocked:** Cannot proceed due to an explicit dependency.

Never claim live provider data, deployment, booking availability, or cloud synchronisation without actual verification.

---

# 21. START EXECUTION

Begin with the Phase 2 repository audit.

Verify the actual Phase 1 implementation and current Git state. Then proceed incrementally through the workstreams above.

The desired outcome is a travel application with broader verified Karnataka destination coverage, real and attributable food/stay recommendations where data sources allow, honest routing estimates, better geographic planning, transparent costs, safe provider failure handling, and no regression in the Phase 1 itinerary engine.

**Quality and trustworthiness take priority over destination count or visual completeness.**
