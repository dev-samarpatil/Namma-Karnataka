# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
# PHASE 3 — MASTER IMPLEMENTATION PLAN

**Document ID:** NK-PLAN-P3-2026-10-24  
**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Target environment:** Google Antigravity IDE  
**Suggested execution model:** Gemini 3.8 Flash — Medium  
**Prerequisite:** Phase 2 implementation and reports supplied by the project owner  
**Planning basis:** Phase 2 Master Implementation & Verification Report dated 2026-10-24, Destination Coverage Report, Provider Architecture & Provenance Design, and Baseline Audit  
**Status:** Implementation plan. All starting-state claims must be re-verified against the current repository before code changes.

---

## 1. Phase 3 Mission

Phase 2 reports that Namma Karnataka has expanded to **40 curated destinations across 18 of Karnataka's 31 districts**, introduced curated restaurant and accommodation discovery, implemented terrain-adjusted route estimates, improved itinerary scheduling and budget transparency, and passed its reported regression checks. The supplied completion report identifies three next priorities:

1. **Statewide destination expansion:** cover all 31 Karnataka districts and reach 60+ verified destinations.
2. **Public transit integration:** offer public-transport alternatives alongside existing personal/cab road estimates, beginning with suitable static GTFS data where it is legitimately available.
3. **Offline Progressive Web App (PWA):** let users access cached destination information and saved/generated itineraries in areas with weak or no connectivity.

These are the primary objectives of Phase 3. Do not let secondary feature ideas displace them.

The Phase 2 documents are project-supplied implementation reports, not independently audited proof of the current repository state. Start by inspecting the working tree and executing relevant checks; reconcile discrepancies before treating any claim as current.

## 2. Key Phase 2 Baseline to Verify

The Phase 2 reports describe the following baseline:

- 40 destinations across 18 Karnataka districts.
- 100% reported English/Kannada parity and source metadata.
- 18 attractions with verified free entry, 21 with verified paid entry, and 1 with unknown fee retained as `null`.
- 12 curated restaurant records and 10 accommodation records.
- A `PlacesProvider` abstraction and curated places provider.
- A routing abstraction with terrain-adjusted fallback estimates and method disclosure.
- A deterministic scheduler with attraction, meal, transit, rest, and lodging stops.
- A transparent budget engine with verified/estimated/unknown cost statuses.
- FastAPI backend, React/Vite/TypeScript frontend, Supabase persistence and RLS.
- Reported Phase 2 results: 97 backend tests and 19 frontend tests passing, Ruff clean, production build clean, and a destination audit with 0 reported issues.

Treat these as **reported starting values**. Re-run the tests and data audit against the actual current files. Do not copy the reported numbers into new audit results unless they are reproduced.

## 3. Phase 3 Outcomes and Success Measures

### Required outcomes
- Every Karnataka district is represented by at least one valid, traceable destination record, if reliable data can be verified for that district.
- The destination catalogue contains at least 60 verified destinations, subject to source availability and quality gates.
- Users can compare supported public-transit options with existing road estimates where legitimate, usable schedule/route data is available.
- The application remains useful offline for selected core destination and itinerary workflows.
- Online-only features clearly indicate when connectivity is required.
- All new functionality preserves English/Kannada support, provenance rules, pricing uncertainty, security, and Phase 2 regressions.

### Metrics to report
- Verified destination count.
- Districts covered out of 31.
- Count of districts with no suitable verified destination record.
- Provenance completeness and bilingual completeness.
- Data validation issues.
- Number of transit feeds/providers genuinely integrated.
- Transit coverage and feed freshness where ascertainable.
- Offline workflows supported and tested.
- Cache size and update behavior, where measurable.
- Backend/frontend test results and production build outcome.

Do not claim “statewide coverage” based only on a target number of destinations. Coverage requires validated district representation.

---

# 4. Workstream 0 — Repository Audit and Phase 2 Reconciliation

## Objective
Confirm the actual project state and preserve existing work before implementation.

## Tasks
1. Inspect Git branch, working tree, recent history, uncommitted user changes, and repository structure.
2. Read the existing Phase 2 documents, including:
   - `docs/PHASE_2_BASELINE_AUDIT.md`
   - `docs/PHASE_2_DESTINATION_COVERAGE_REPORT.md`
   - `docs/PHASE_2_DATA_PROVIDER_DESIGN.md`
   - `docs/PHASE_2_COMPLETION_REPORT.md`
3. Locate the actual destination and place seed data, validation scripts, provider adapters, routing service, scheduler, budget engine, API routers, Supabase migrations, RLS policies, frontend localization, trip persistence, package scripts, and test suites.
4. Re-run existing tests, lint, type checks, build, and `data/validation/audit_destination_quality.py` using the repository's real commands.
5. Compare observed results with the Phase 2 reports. Record discrepancies rather than silently reconciling them.
6. Verify whether routing, Supabase, Gemini/Groq, and current frontend persistence behave as documented. Do not perform destructive production data operations.

## Deliverable
Create or update `docs/PHASE_3_BASELINE_AUDIT.md` with:
- Actual repository state and branch.
- Verified Phase 2 feature inventory.
- Current district and destination counts calculated from data.
- Existing GTFS/transit code or data, if any.
- Existing PWA/service-worker/manifest support, if any.
- Storage and cache mechanisms already in use.
- Baseline tests with exact commands and outputs.
- Current blockers and safe implementation sequence.

## Acceptance criteria
- No implementation begins on unverified assumptions.
- Baseline failures are separated from later regressions.
- Existing user changes are preserved.
- Phase 3 scope follows any canonical roadmap already in the repository.

---

# 5. Workstream A — Statewide Destination Expansion

## Objective
Expand the current reported catalogue from 40 destinations across 18 districts to **60 or more verified destinations with representation across all 31 Karnataka districts**, without lowering the data-quality standard.

## A1. Coverage-gap analysis
- Load the authoritative 31-district list already present in the repository.
- Normalize destination district IDs and identify all currently covered and uncovered districts.
- Generate a gap table before adding records.
- Check for alternate spellings, duplicate IDs, historical district names, and valid district-code mappings.
- Do not invent or rename official district codes to make a record fit.
- Give priority to currently uncovered districts, including those named in the Phase 2 report such as Yadgir, Koppal, and Haveri, while verifying the actual gap list from the current data.

## A2. Destination selection
Use a balanced mix of relevant categories, based on verified availability:
- Heritage and archaeology.
- Architecture and monuments.
- Spiritual and cultural sites.
- Nature and viewpoints.
- Waterfalls and hill destinations.
- Beaches and coastal sites.
- Wildlife and ecological destinations.
- Museums and locally significant attractions.

Do not force equal category distribution. Prioritize valid geographic coverage and useful diversity.

## A3. Required destination data
Preserve or populate the actual project schema fields where supported, including:
- Stable destination ID.
- English and Kannada names.
- English and Kannada summaries/descriptions/directions where required.
- Category.
- District ID.
- WGS84 latitude/longitude.
- Visit-duration estimate.
- Entry fee and fee status.
- Opening hours only when verified.
- Source name and type.
- Source URL/reference.
- `checked_at` / `last_verified_at` following the existing schema.
- Relevant data-quality flags.

Avoid adding duplicate fields when the existing schema already represents the concept.

## A4. Provenance and pricing safeguards
- Use official government, official tourism, official site-manager, or reputable editorial sources as allowed by project policy.
- Never invent a source URL, citation, fee, operating hour, coordinate, or verification timestamp.
- Preserve unknown entry fees as `null` and retain the `unknown` status.
- Keep verified free entry distinct from unknown fees.
- When sources conflict, record the conflict for review; do not silently pick an arbitrary value.
- Follow source terms, attribution, and reuse restrictions.

## A5. Validation and reporting
Extend the existing `data/validation/audit_destination_quality.py` rather than creating a competing validator, unless the current architecture requires separation.

Validate:
- Unique destination IDs.
- District references against the 31-district master list.
- Coordinate numeric ranges and Karnataka bounds.
- Duplicate or suspiciously close duplicate destinations.
- English/Kannada field parity.
- Visit-duration validity.
- Fee amount/status consistency.
- Source metadata completeness.
- Timestamp validity.
- Required fields and malformed records.
- Coverage count by district and category.

A bounding-box check is a useful screening test but is not sufficient by itself to prove a coordinate is correctly located. Validate against reliable source coordinates or a stronger geographic check where feasible.

Create or update `docs/PHASE_3_DESTINATION_COVERAGE_REPORT.md` from the actual dataset. Include the full district table with counts, uncovered district list, categories, fee statuses, bilingual/provenance coverage, issues, and source limitations.

## Acceptance criteria
- Target is 60+ valid records and representation of all 31 districts where defensible verified records exist.
- If trustworthy data cannot be obtained for a district, clearly list the gap instead of fabricating a record.
- Audit output is generated from the live repository dataset.
- No existing valid record or unknown fee is corrupted.
- Seed loading remains idempotent and safe for the intended environment.

---

# 6. Workstream B — Public Transit Data Feasibility and Provider Design

## Objective
Add a public-transit alternative to the current terrain-adjusted personal/cab road estimates, without presenting unavailable or unverified schedules as real service.

The Phase 2 report specifically recommends static GTFS for KSRTC and BMTC. **Do not assume that either operator currently provides a public, complete, current, reusable GTFS feed.** Verify feed existence, coverage, update date, license/terms, and allowed usage before integration.

## B1. Provider discovery audit
For each potential source, verify:
- Whether a usable GTFS Static feed or equivalent official data exists.
- Which operators, routes, stops, and services it covers.
- Feed issue/update date and expected refresh cadence.
- License and redistribution/storage restrictions.
- Whether route and stop data include the geography needed by the app.
- Whether journey planning can be computed from the available data.
- Whether data is suitable for public-facing recommendations.

Use official provider portals or documented open-data sources where possible. Record evidence and access dates. Do not label an evaluated source as integrated.

If no valid feed is available for an operator, document it as `BLOCKED` or `NOT AVAILABLE`, and keep the rest of Phase 3 moving. Do not fabricate feed URLs, schedules, stops, or routes.

## B2. Transit abstraction
Follow the existing provider architecture. Introduce a dedicated transit service only if justified, for example:
- `TransitProvider` interface.
- GTFS import/validation module.
- Normalized transit query and result schemas.
- Feed metadata and freshness representation.
- Provider-specific adapters.

Do not over-engineer a generalized MaaS framework for the first implementation.

## B3. GTFS Static handling
If an appropriate feed is genuinely available and authorized:
- Validate required GTFS files and their relationships.
- Parse at least the necessary tables for supported journey planning, commonly including `agency.txt`, `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt` and `calendar_dates.txt` when present/required.
- Validate IDs, references, times, calendars, coordinates, duplicate records, and feed dates.
- Handle GTFS times after midnight correctly where supported.
- Store normalized data using a documented schema or queryable local representation appropriate to feed size.
- Make feed import repeatable and idempotent.
- Record source, license, imported-at time, feed version/date, and coverage.
- Do not mix data from different feed versions without an explicit strategy.
- Clearly label schedules as scheduled service rather than real-time vehicle positions.

If only static data is available, do not imply real-time arrivals, delays, live vehicle location, seat availability, or guaranteed connections.

## B4. Transit itinerary behavior
Where a supported feed covers the relevant locations, calculate and return appropriate options with:
- Origin and destination stops.
- Transit route/line identifiers and display names where available.
- Boarding/alighting stops.
- Scheduled departure and arrival times.
- Transfers, if calculated reliably.
- Walk segments only if supported by the data/algorithm.
- Total elapsed duration.
- Source and feed freshness.
- Service-date validity.
- Limitations and unverified legs.

If public transit data does not cover the user's itinerary, provide the existing road estimate and an honest message that public-transit routing is unavailable for that segment.

Do not combine route segments into a fictitious through-journey. Do not claim an itinerary is feasible unless the connection and schedule checks support it.

## B5. Road and transit comparison
Keep the existing routing estimate API and UI behavior backward compatible. Add a normalized mode/result type so that the UI can compare:
- Personal/cab road estimate.
- Supported scheduled public-transit option.
- Walking or transfer portions only when supported.

Explain that terrain-adjusted road distance is an estimate, not live traffic or a provider-returned road route. Do not compare road and transit estimates as if they had the same data quality.

## B6. APIs and frontend
Follow existing API versioning and client patterns. Potential functionality:
- Transit coverage or provider status.
- Stop/route search.
- Journey planning between two coordinates/stops for a date/time.
- Transit option cards in the itinerary planner.

Choose exact endpoints after inspecting the existing API design; do not blindly create duplicate or unused routes.

## Acceptance criteria
- At least one provider/feed is integrated and tested only if a suitable source is actually available.
- Feed validation, update metadata, and failure behavior are implemented.
- Unsupported coverage is clearly explained.
- No live transit claims are made from static data.
- Existing road estimates remain available when transit data is absent.

---

# 7. Workstream C — Offline-First Progressive Web App

## Objective
Let travellers access core Namma Karnataka content when connectivity is weak or unavailable, particularly when exploring remote regions.

Offline functionality must be honest and privacy-aware. It should not make unsupported claims that every part of the app is available offline.

## C1. Audit existing frontend architecture
Check whether the project already has:
- A web app manifest.
- A service worker.
- Workbox or another supported PWA tool.
- Existing offline/online detection.
- LocalStorage or IndexedDB trip persistence.
- Authentication/session persistence rules.
- API caching logic.
- Vite PWA integration.

Reuse existing infrastructure where possible. Avoid adding multiple competing service workers or cache layers.

## C2. PWA foundations
Where missing and appropriate, add:
- A valid web app manifest.
- App name and short name.
- Existing brand-consistent icons, using project assets when available.
- Display mode and launch configuration.
- Theme/background colors consistent with the current UI.
- A service worker using the frontend's Vite/build architecture.
- Installability checks and clear unsupported-browser behavior.

Do not create arbitrary icon files with misleading branding if usable project assets already exist. Ensure the production build serves the manifest and service worker correctly.

## C3. Offline caching policy
Define caching deliberately by resource type.

**Good offline candidates:**
- App shell/static assets.
- Public curated destination catalogue.
- English/Kannada destination details.
- Static district/category metadata.
- Explicitly saved/downloaded trip itineraries.
- User-selected trip data cached locally for offline view, subject to privacy rules.
- Static content and icons needed to render cached screens.

**Do not indiscriminately cache:**
- Authentication secrets or service-role credentials.
- Sensitive user account data.
- Arbitrary API responses containing other users' data.
- Provider data whose licensing or retention terms forbid offline caching.
- Google Places content unless storage/offline use is permitted under the applicable terms.
- Live availability or time-sensitive data as though current.
- Error responses as durable success cache entries.

Respect source terms and current provider caching rules. Curated project-owned data may have a different caching policy from third-party place records.

## C4. Cache strategy
Choose an explicit strategy by asset/data class:
- Cache-first for versioned static app assets.
- Stale-while-revalidate or network-first for appropriate public catalogue responses, only where safe.
- Explicit “save for offline” or carefully bounded local caching for itineraries.
- Network-only for sensitive or unsuitable endpoints.

Set cache versioning and expiration limits where appropriate. Handle:
- App updates.
- Cache invalidation.
- Storage quota errors.
- Corrupted local records.
- Partial downloads.
- Offline first launch.
- User logout and account switch.
- Removed or updated trips.
- Browser storage being cleared.

Do not cache every API response just to advertise offline support.

## C5. Offline destination catalogue
Allow a user to view cached public destination records with:
- Names and descriptions.
- English/Kannada content.
- District and category.
- Coordinates where present.
- Visit-duration and fee-status information.
- Provenance and last-checked information where available.

Clearly indicate that cached content may be stale and show a last-updated timestamp when available.

Do not show cached prices or operating hours as guaranteed current.

## C6. Offline trip access and editing
At minimum, support viewing explicitly cached/saved itineraries offline.

If offline editing is implemented:
- Define a local data model and queue of pending changes.
- Track local versus server version and sync state.
- Resolve conflicts explicitly; never silently overwrite server edits.
- Use stable IDs and idempotent sync operations.
- Preserve locked stops and user-entered values.
- Show pending/failed sync status.
- Avoid claiming a trip is synchronised until the server confirms it.

If robust sync is too large or unsafe for Phase 3, implement read-only offline trip access first and explicitly defer offline mutation/synchronization.

## C7. Offline UX
Implement visible states such as:
- Online.
- Offline.
- Content saved for offline use.
- Cached content may be stale.
- Changes pending sync, if editing exists.
- Sync successful.
- Sync failed.
- Storage/download unavailable.

When offline, hide, disable, or clearly mark features that require a live provider, such as new live place searches or current booking availability.

## C8. Accessibility and performance
- Keep the app usable at narrow widths.
- Provide accessible status announcements where appropriate.
- Avoid repeatedly showing intrusive offline alerts.
- Avoid excessive initial downloads.
- Lazy-load nonessential assets.
- Measure build size before and after PWA integration.
- Avoid caching large map tiles or external imagery unless terms and technical constraints permit it.

## Acceptance criteria
- The app is installable on supported browsers when deployed over HTTPS or a valid localhost development context.
- Previously cached public destinations load in offline mode.
- Explicitly saved itineraries remain readable offline.
- Offline status is clear and does not imply that unavailable API actions succeeded.
- Cache invalidation and app updates are tested.
- Authentication and trip privacy remain intact.
- Provider terms are respected.

---

# 8. Workstream D — Trip Planner Integration and Fallback Behavior

## Objective
Expose expanded destination coverage, transit alternatives where available, and offline state within the existing planning workflow.

### Tasks
- Preserve the existing deterministic scheduler, budget engine, `PlacesService`, route provider abstraction, and shared Pydantic/TypeScript contracts unless changes are necessary.
- Let users choose or compare road and transit modes where supported.
- Use the selected transport mode as an explicit input rather than silently changing it.
- Keep unknown opening hours, prices, route segments, and transit schedules unknown.
- If transit coverage is unavailable, fall back to the existing road estimate and explain the limitation.
- Ensure route-mode changes trigger proper recalculation of travel duration and itinerary feasibility.
- Avoid double-counting transit/road costs in the budget.
- Distinguish scheduled transit fares from estimates or unknown costs.
- Do not invent transit fares, route names, departures, frequencies, or transfer paths.
- On offline launch, show cached trips/destinations and disable network-dependent actions clearly.

### Acceptance criteria
- Existing itinerary generation continues working when no transit feed is configured.
- When transit is supported, the itinerary uses only validated route/service data.
- Budget and timing reflect the selected mode.
- Offline and online states are consistent across the planner.

---

# 9. Workstream E — Security, Database, Privacy, and Data Operations

## Objective
Extend data storage and offline capabilities without weakening Supabase RLS or exposing private trip data.

### Tasks
- Review actual schema, migration conventions, indexes, RLS policies, and trip ownership rules.
- Use migrations for persistent backend changes.
- Avoid storing large raw feed files in relational tables if a file/object or staged-import approach is more appropriate.
- Restrict trip reads/writes to authorized owners.
- Ensure public destination data remains separated from private user-trip data.
- Verify that offline caches are scoped and cleared appropriately on logout/account switch.
- Do not rely on UI checks alone for authorization.
- Keep all provider keys server-side.
- Sanitize logs and errors.
- Validate ZIP/feed uploads if an administrative import path is added; limit compressed and uncompressed sizes to mitigate archive bombs.
- Validate CSV values and GTFS relationships.
- Avoid adding an unauthenticated feed-upload endpoint.
- Document feed licenses, retention policy, and refresh responsibilities.

### Acceptance criteria
- New migrations apply cleanly.
- Existing saved trips remain compatible.
- RLS is not weakened.
- User-specific content cannot be retrieved through shared/public caches.
- GTFS import is repeatable and validates inputs before activation.

---

# 10. Workstream F — Testing and Verification

## Baseline
Use the actual commands defined in the repository. The Phase 2 report cites 97 backend tests, 19 frontend tests, Ruff checks, a production build, and the destination audit; re-run them before development.

## Destination data tests
- All 31 district IDs exist in the authoritative district table/list.
- Coverage report matches actual data.
- IDs and district references are valid.
- Duplicate destination IDs are rejected.
- Bilingual and provenance rules hold.
- Unknown fee stays `null` and keeps its unknown status.
- No records are added solely to satisfy the count target.
- Seed import is idempotent.

## Transit tests
- Feed files and required fields validate.
- Invalid IDs/references are rejected.
- Calendar and service-date calculations behave correctly.
- Overnight GTFS times are handled if supported.
- No-service dates return a clear unavailable response.
- Transfer feasibility is validated or explicitly out of scope.
- A missing feed/provider returns an honest unavailable state.
- Static data is never described as real-time data.
- Route results include source/feed version/freshness metadata.
- Provider failures do not break road routing.

## PWA/offline tests
- Manifest is valid.
- Service worker registers only in the intended environments.
- App shell opens after an initial successful load while offline.
- Cached destination lists and details load offline.
- Cached bilingual content is correct.
- Saved itineraries load offline.
- Network-only requests fail gracefully.
- No private response leaks across user sessions.
- Logout/account switch clears or separates user-specific cache according to policy.
- Cache version changes and app updates behave correctly.
- Storage quota and partial-cache failures are handled.
- If offline edits exist: queued changes sync idempotently and conflicts are surfaced.

## Regression tests
Run existing equivalents for:
- Health/readiness.
- Destination listing/detail.
- Restaurant/accommodation discovery.
- Routing estimate.
- Recommendation generation.
- Trip create/read/update/delete where supported.
- Saved-trip persistence and guest mode.
- Budget calculations.
- English/Kannada switching.
- Existing Supabase RLS/auth behavior where testable.

Run:
- Backend tests.
- Frontend tests.
- Ruff or configured backend lint.
- TypeScript checks.
- ESLint, if configured.
- Production build.
- Destination audit.
- Migration checks.
- PWA production preview smoke tests.
- End-to-end tests where infrastructure exists.

Record exact commands, outputs, failures, and limitations. Do not write test results that were not observed.

---

# 11. Implementation Order

1. **Audit:** verify Phase 2 status, current tests, district master list, current route architecture, and existing PWA support.
2. **Coverage map:** generate an exact 31-district coverage-gap report.
3. **Data research:** identify legitimate sources for uncovered districts and validate source terms.
4. **Destination expansion:** add verified records and update the quality-audit script.
5. **Transit feasibility:** verify actual GTFS sources, licenses, coverage, and refresh requirements before coding an adapter.
6. **Transit foundation:** implement normalized models, importer, service, and tests for any confirmed feed. Document unavailable operators/areas.
7. **Planner integration:** add optional transit results and maintain road fallback.
8. **PWA foundation:** manifest, service worker, cache policy, versioning, and production build integration.
9. **Offline catalogue:** cache public catalogue content and show clear freshness/offline status.
10. **Offline saved trips:** support read-only cached itineraries first; implement offline editing/sync only if safely achievable.
11. **Security review:** inspect RLS, account switching, cache scoping, feed import validation, and licensing.
12. **Regression:** rerun all quality gates and representative scenarios.
13. **Documentation:** generate data coverage, transit-source, PWA/offline, test, and completion reports from actual implementation.
14. **Final audit:** review all changes and report complete, partial, blocked, and deferred requirements.

Adapt this sequence only when repository dependencies justify it; document the reason.

---

# 12. Required Documentation

Create or update the following files, following existing repository conventions. If an equivalent canonical file exists, update it rather than creating redundant documentation.

## `docs/PHASE_3_BASELINE_AUDIT.md`
Actual Phase 2 state, baseline quality checks, current district coverage, and existing routing/PWA capabilities.

## `docs/PHASE_3_DESTINATION_COVERAGE_REPORT.md`
Actual destinations and count by district, coverage of 31 districts, source/provenance and bilingual metrics, validation failures, and unresolved gaps.

## `docs/PHASE_3_TRANSIT_DATA_SOURCES.md`
For each transit source: actual feed availability, operator/area coverage, source URL, license/terms, feed date/version, refresh cadence, fields used, integration status, and limitations. Distinguish integrated, evaluated, unavailable, and blocked.

## `docs/PHASE_3_TRANSIT_ARCHITECTURE.md`
Provider interface, feed import/validation, data model, journey-planning approach, APIs, fallback rules, freshness, and test coverage.

## `docs/PHASE_3_PWA_OFFLINE_DESIGN.md`
Manifest and service-worker choices, cache classes, offline workflows, privacy rules, freshness, invalidation, storage limitations, sync behavior if any, and test approach.

## `docs/PHASE_3_TEST_REPORT.md`
Exact commands and actual results for destination audit, transit tests, offline/PWA tests, regression, lint, type checks, and build.

## `docs/PHASE_3_COMPLETION_REPORT.md`
Workstream-by-workstream status, files changed, data counts, providers actually integrated, security review, test evidence, known limitations, and next steps.

---

# 13. Explicit Out-of-Scope Items Unless the Canonical Roadmap Requires Them

Do not automatically introduce:
- Live vehicle tracking or real-time arrival predictions.
- Live traffic integration.
- Ticket booking, reservations, or payments.
- Hotel room inventory.
- Full multimodal commercial journey planning beyond supported feed coverage.
- Offline editing and conflict-free synchronization if safe synchronization is not feasible.
- Photo/video/reel-based landmark recognition.
- Social feeds, public reviews, or collaborative editing.
- A new database or frontend framework.
- Unrelated redesigns or AI features.

If the current canonical roadmap assigns any such item to Phase 3, document the scope decision before implementation.

---

# 14. Non-Negotiable Rules

1. Do not fabricate destination facts, sources, public-transit routes, departures, prices, coordinates, or feed URLs.
2. Do not describe static GTFS schedules as real-time data.
3. Do not claim a provider is integrated when only an interface or mock exists.
4. Do not claim all 31 districts are covered unless the current validated dataset confirms it.
5. Do not reduce provenance or bilingual quality to meet a destination-count target.
6. Do not mislabel the terrain-adjusted fallback as a provider-supplied road route.
7. Do not cache third-party content contrary to its license or service terms.
8. Do not cache private user content in a public/shared cache.
9. Do not claim offline actions succeeded when changes have not reached the server.
10. Do not weaken RLS or authorization to simplify implementation.
11. Do not expose API keys in frontend bundles, logs, or documentation.
12. Do not erase unrelated user changes or force-reset the working tree.
13. Do not mark a test as passing without executing it.
14. Do not stop after producing designs or documentation; implement and test all feasible in-scope workstreams.
15. Preserve Phase 2 contracts and behavior unless a justified, tested change is necessary.

---

# 15. Definition of Done

## Destination expansion
- [ ] Actual current coverage has been audited.
- [ ] The 31-district gap list is generated from data.
- [ ] At least 60 verified destinations are present where sufficient valid sources exist.
- [ ] Every district has verified representation, or remaining gaps are explicitly documented with evidence.
- [ ] The destination quality audit passes or all failures are explained.
- [ ] Unknown prices and hours remain unknown.
- [ ] Seed loading is idempotent.

## Public transit
- [ ] Actual feed availability and licensing have been checked.
- [ ] Every integrated feed has recorded source/version/freshness.
- [ ] Import and schema validation are tested.
- [ ] Supported transit alternatives are available in the planner.
- [ ] Unsupported coverage is reported honestly.
- [ ] Static data is not presented as real-time information.
- [ ] Existing road fallback still works.

## PWA/offline
- [ ] Manifest and service worker work in production build/preview.
- [ ] Public destination content is readable offline after caching.
- [ ] Saved itineraries are readable offline.
- [ ] Cache rules comply with provider restrictions.
- [ ] Offline/stale/sync states are visible and accessible.
- [ ] Cache invalidation, app update, logout, account switch, and storage failure are tested.
- [ ] Private trip data is not exposed between users.
- [ ] Offline editing is implemented only if conflicts and sync are safely handled.

## Regression and evidence
- [ ] Existing Phase 2 routes/features remain functional.
- [ ] Backend/frontend tests have been executed.
- [ ] Lint/type checks/build have actual recorded outcomes.
- [ ] Security/RLS implications are reviewed.
- [ ] Required documentation is updated.
- [ ] Every workstream is labelled `VERIFIED COMPLETE`, `PARTIALLY COMPLETE`, `BLOCKED`, `NOT IMPLEMENTED`, or `DEFERRED BY SCOPE`.
- [ ] Remaining blockers and their evidence are clearly reported.

---

# 16. Final Handoff

When implementation is finished, provide:

1. Overall status: complete, partial, or blocked.
2. Actual destination count and district coverage.
3. List of uncovered districts, if any.
4. Verified sources used to add new destinations.
5. Transit providers/feeds genuinely integrated, with coverage and limitations.
6. PWA/offline features actually supported.
7. Important files created or modified.
8. Database/API changes.
9. Security, RLS, and cache privacy checks.
10. Exact test, lint, type-check, audit, and build commands with results.
11. Known limitations and blocked tasks.
12. Documentation created or updated.
13. Recommended next action.

**Final instruction:** Implement Phase 3 against the real Namma Karnataka repository. Prioritize state-wide verified destination coverage, supported public-transit alternatives, and safe offline PWA access. Audit first, preserve existing functionality, verify provider/source availability, test every feasible workstream, and report only evidence-backed results.
