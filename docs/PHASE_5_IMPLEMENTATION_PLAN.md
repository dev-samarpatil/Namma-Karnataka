# Namma Karnataka --- Phase 5 Implementation Plan

**Document:** `PHASE_5_IMPLEMENTATION_PLAN.md`\
**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)\
**Phase objective:** Move from locally verified functionality with
prepared cloud integration to a safely validated cloud-ready release.\
**Starting status:** Phase 4 was reported as *Complete with
Limitations*. Remote Supabase migrations and live cloud-persistence/RLS
verification remain outstanding.

## 1. Phase 5 Goal

Phase 5 closes the gap between local implementation and verified cloud
operation. It must establish that the intended Supabase project has the
correct schema and seed data, authenticated users can access only their
own trips, and the frontend can use cloud persistence without breaking
guest planning.

Phase 5 is complete only when its acceptance criteria are demonstrated
by tests or live checks. Code presence, generated SQL, mocked tests, or
a successful frontend build do not alone prove cloud readiness.

## 2. Known Starting Point

Based on the Phase 4 closure notes:

-   Frontend: React 18, Vite, TypeScript and Tailwind CSS.
-   Backend: FastAPI and Pydantic v2.
-   Data/auth: Supabase PostgreSQL and Supabase Auth.
-   Guest trips use browser `localStorage` key `nk_saved_trips`.
-   Cloud trip API/client operations have reportedly been prepared for
    list, get, save and delete.
-   Supabase migrations and seed SQL exist locally, but the remote
    database was reported to return `PGRST205` for missing tables.
-   RLS policy definitions exist, but live RLS behavior has not been
    proven.
-   Gemini `gemini-2.5-flash` was reported to pass a live request.
-   Groq model `llama-3.3-70b-versatile` was reported to return HTTP
    404.
-   Deterministic fallback is intended to keep planning usable when an
    AI provider fails.
-   Earlier reports may contain inconsistent migration filenames and
    integration-check counts. Inspect the actual repository and remote
    state rather than treating summaries as authoritative.

### Non-negotiable constraints

1.  AI recommendations may use only destination IDs from the curated
    catalogue. Render destination metadata from trusted application
    data.
2.  Budget arithmetic must be deterministic. Unknown costs remain `null`
    or explicitly unknown, never silently become ₹0.
3.  Do not invent road distances, driving times, routes, opening hours
    or availability.
4.  "Offbeat" is an editorial classification, not a safety guarantee.
5.  Guest planning must remain available without mandatory sign-in.
6.  Cloud trip ownership must be enforced by the server and database.
7.  `localStorage` is device/browser-local, not cloud sync.
8.  Never expose service-role keys, provider secrets or JWTs in frontend
    bundles or logs.
9.  English and Kannada must remain supported across persisted and newly
    loaded states.
10. Do not enable cloud sync in the UI until live schema,
    authentication, RLS and ownership tests pass.

## 3. Phase 5 Workstreams

### Phase 5A --- Repository and Environment Preflight

**Purpose:** Understand the actual repository and target environment
before remote changes.

Tasks: - Inspect the current branch, working tree, recent commits and
repository structure. - Read the actual Supabase configuration and every
migration in execution order. - Compare migration filenames and contents
against previous reports; record discrepancies instead of silently
renaming files. - Inspect remote migration history and relevant schema
using read-only operations first. - Confirm the intended Supabase
project and whether it is development, staging or production. - The
earlier notes mention project reference `ayqwlxpaollxghdnbsqo`; treat it
as a candidate, not proof that it is the correct target. - Check the
installed Supabase CLI version and supported command syntax. - Identify
required environment-variable names without printing their values. -
Check that secrets are not tracked by Git or embedded in frontend
configuration. - Run the existing baseline tests before edits.

**Guardrails:** Do not reset the remote database, run destructive SQL,
overwrite migration history, or apply migrations until the target and
environment are confirmed. If the target or remote schema is ambiguous,
stop and report the ambiguity.

**Deliverable:** `docs/PHASE_5A_ENVIRONMENT_PREFLIGHT_REPORT.md`

**Exit criteria:** Target project and environment confirmed; migration
order and remote state understood; destructive-change risks resolved;
baseline tests completed or failures documented.

### Phase 5B --- Supabase Schema Deployment

**Purpose:** Apply reviewed migrations safely to the confirmed target.

Tasks: - Validate migration syntax and dependencies locally where
possible. - Confirm changes are safe for existing data. - Review
required extensions, tables, foreign keys, indexes, constraints and
defaults. - Review RLS policies for user-owned tables, especially
`trips` and `itinerary_snapshots`. - Confirm user identity mapping
matches Supabase Auth (`auth.uid()` and the stored `user_id` type). -
Apply migrations using a supported workflow for the installed CLI
version, only after preflight passes. - Capture migration identifiers
and execution results without exposing credentials. - Verify the actual
remote schema after applying migrations; do not rely on exit codes
alone.

**Expected schema areas to inspect against the actual repository:**
districts, destinations, destination translations, source references,
trips, itinerary snapshots, and any PostGIS/geographic objects actually
used.

**Guardrails:** Do not invent filenames or schema to make reports
consistent. Do not seed before the schema is verified. If remote
migration history diverges, stop and reconcile. If a migration fails,
inspect the resulting state and prepare a recovery plan before retrying.

**Deliverable:** `docs/PHASE_5B_SUPABASE_MIGRATION_REPORT.md`

**Exit criteria:** Required migrations are recorded as applied; remote
tables, constraints and indexes match expectations; applicable RLS is
enabled; no unexplained schema changes occurred.

### Phase 5C --- Catalogue Seed and Data Integrity

**Purpose:** Populate the remote curated catalogue and verify its
integrity.

Tasks: - Inspect `backend/scripts/generate_sql_seed.py` and
`supabase/seed/seed.sql`. - Regenerate seed SQL from the canonical
source only if that generator remains the source of truth. - Review
idempotency, conflict handling and accidental-delete risks. - Apply seed
SQL using a supported method for the installed tooling. - Verify actual
remote row counts and relationships. - Validate destination/district
references, translation locales and source references. - Check duplicate
IDs/slugs, missing required fields and invalid district codes. - Compare
actual counts to generated counts and explain differences. - Test public
catalogue reads separately from private trip access.

Previously reported seed expectations---verify against current canonical
data before treating them as acceptance targets: - 31 districts - 12
destinations - 24 translations - 12 source records

**Deliverable:** `docs/PHASE_5C_CATALOGUE_SEED_VALIDATION.md`

**Exit criteria:** Seed execution is repeatable and safe; counts and
relationships pass; public catalogue access does not expose private trip
data.

### Phase 5D --- Live Authentication, RLS and Tenant Isolation

**Purpose:** Prove that the deployed system enforces ownership in the
real environment.

Tasks: - Verify JWT validation against the intended Supabase Auth
configuration. - Confirm signature, issuer, expiry and relevant claims
are validated appropriately. - Derive identity from the validated token;
never trust a client-supplied `user_id`. - Test all trip
read/create/update/delete paths for ownership enforcement. - Confirm
missing, malformed, expired and invalid tokens are rejected. - Use two
approved test accounts in a non-production environment. - Verify User A
can create and retrieve their own trip. - Verify User B cannot list,
retrieve, update or delete User A's trip. - Verify anonymous users
cannot read or modify private trips. - Test RLS through the real
user/client context. A service-role connection can bypass RLS and is not
proof of RLS behavior. - Check errors for private-data disclosure. -
Remove or disable test data/accounts safely according to project policy.

**Deliverable:** `docs/PHASE_5D_AUTH_RLS_LIVE_VERIFICATION.md`,
including a matrix of identity, operation, expected result, observed
result and pass/fail.

**Exit criteria:** Invalid/anonymous access is denied; cross-user reads
and mutations are denied; live RLS behavior is verified through a
non-bypass path; discrepancies between API authorization and database
RLS are resolved.

### Phase 5E --- Cloud Saved Trips Integration

**Purpose:** Enable cloud persistence for signed-in users while
preserving guest functionality.

Tasks: - Inspect the existing frontend API client and trip state
management before editing. - Connect existing list/get/save/delete
operations to the actual UI. - Keep guest trips in `nk_saved_trips`. -
For signed-in users, provide clear cloud save/load behavior and loading,
success, empty and error states. - Never present a failed cloud save as
successful. - Never silently overwrite guest trips when a user signs
in. - If guest-to-account migration is implemented, require a clear user
action, define duplicate handling, and preserve local data until cloud
writes are confirmed. - Define session behavior: - Signed out:
guest/local trips remain available. - Signed in: load trips for the
authenticated account. - Sign out: clear private cloud data from
in-memory UI state; preserve separate guest data. - Account switch: do
not display cached trips from the previous account. - Handle network
failure, expired sessions and duplicate requests. - Preserve
English/Kannada labels and errors. - Keep cloud sync disabled or
feature-flagged until Phase 5D passes.

**Deliverable:** `docs/PHASE_5E_CLOUD_TRIPS_INTEGRATION_REPORT.md`

**Exit criteria:** Guest planning works without login; cloud trips
persist across refresh/session; no cross-user data appears; errors are
visible; account switching clears stale private data.

### Phase 5F --- AI Provider Reliability and Grounding

**Purpose:** Keep planning resilient, grounded and testable without
depending on a single provider.

Tasks: - Inspect provider adapters, orchestration and settings before
changing configuration. - Keep provider selection centralized and
environment-driven. - Confirm the configured Gemini model identifier
matches the installed SDK/API. - Investigate the reported Groq 404
against current supported models; update only after confirming support
and testing a live request. - Ensure provider failure invokes
deterministic fallback. - Add bounded timeouts/retries where appropriate
and safe logging that excludes secrets and private prompts. - Validate
output against a strict Pydantic schema. - Reject or safely repair
destination IDs not in the curated catalogue. - Keep budget calculations
in deterministic application code. - Represent unknown costs as unknown;
do not fabricate routes, distances, travel durations or availability. -
Test English and Kannada output. - Add tests for timeout, rate limits,
invalid JSON, unsupported destination IDs, missing costs and fallback
behavior.

**Deliverable:** `docs/PHASE_5F_AI_RELIABILITY_REPORT.md` with
provider/model, test date, result and fallback behavior.

**Exit criteria:** At least one provider passes a live test;
deterministic fallback works; output is schema-validated and
catalogue-grounded.

### Phase 5G --- End-to-End Regression and Release Hardening

Required scenarios: 1. Open as a guest. 2. Browse and filter
destinations. 3. Switch English/Kannada. 4. Build and edit an itinerary.
5. Check budgets, including unknown costs. 6. Save, refresh and reload a
guest trip. 7. Sign in and save a cloud trip. 8. Refresh and restore the
cloud trip. 9. Confirm another account cannot access that trip. 10.
Delete a cloud trip and verify UI/database consistency. 11. Simulate AI
provider failure and verify fallback. 12. Simulate API/network failure
and verify error handling. 13. Sign out and verify private cloud data is
no longer displayed. 14. Switch accounts and verify no cross-account
cache leakage. 15. Check responsive layouts and keyboard navigation for
core flows.

Run and record the backend test suite, backend lint checks, frontend
tests, frontend lint, production build, API integration tests, live
Supabase checks and existing dependency/security checks.

**Guardrails:** Record exact commands and observed results. Separate
local, mocked, ASGI/integration and live checks. Do not count skipped
tests as passing. Reconcile discrepancies between summary counts and
detailed logs.

**Deliverable:** `docs/PHASE_5G_RELEASE_REGRESSION_REPORT.md`

### Phase 5H --- Documentation and Release Decision

Tasks: - Update architecture, environment setup and deployment
documentation to match actual implementation. - Document migration and
seed procedures using commands verified for the installed tooling
version. - Document environment-variable names and purpose only, never
values. - Document guest vs. cloud persistence and account-switch
behavior. - Document AI provider configuration and fallback behavior. -
Record the exact branch/commit used for verification. - Separate
verified facts from assumptions and limitations. - Produce the final
Phase 5 closure report and release recommendation.

**Deliverables:** - `docs/PHASE_5_IMPLEMENTATION_PLAN.md` -
`docs/PHASE_5_FINAL_CLOSURE_REPORT.md`

**Exit criteria:** Documentation matches the repository and deployed
environment; release blockers are resolved or explicitly block release;
status is evidence-based.

## 4. Recommended Execution Order

  -----------------------------------------------------------------------
  Order             Workstream        Dependency        Required gate
  ----------------- ----------------- ----------------- -----------------
  1                 5A --- Preflight  Phase 4 baseline  Target and
                                                        migration state
                                                        confirmed

  2                 5B --- Schema     5A                Remote schema
                    deployment                          verified

  3                 5C --- Seed       5B                Catalogue
                    validation                          integrity
                                                        verified

  4                 5D --- Auth/RLS   5B, 5C            Live ownership
                    verification                        tests pass

  5                 5E --- Cloud      5D                Enable only after
                    trips UI                            security gate

  6                 5F --- AI         Existing AI       Live provider or
                    reliability       implementation    fallback verified

  7                 5G --- Regression 5B--5F            End-to-end suite
                                                        passes

  8                 5H --- Closure    All previous      Evidence-based
                                      phases            release decision
  -----------------------------------------------------------------------

Do not begin with a broad rewrite. Complete the read-only preflight
first. Do not parallelize remote deployment and frontend enablement.

## 5. Release Gates

### Gate A --- Safe to migrate

-   [ ] Correct Supabase project/environment confirmed.
-   [ ] Actual migration filenames and order verified.
-   [ ] Remote migration history inspected.
-   [ ] No unexplained schema drift.
-   [ ] No unapproved destructive operations.

### Gate B --- Safe to enable cloud persistence

-   [ ] Required remote tables and constraints exist.
-   [ ] Catalogue seed and integrity checks pass.
-   [ ] Authentication is live-tested.
-   [ ] RLS is tested through a non-bypass context.
-   [ ] Two-account isolation tests pass for reads and mutations.
-   [ ] Client-supplied ownership IDs are not trusted.

### Gate C --- Safe for controlled release

-   [ ] Guest/local planning still works.
-   [ ] Cloud trips persist across refresh and sessions.
-   [ ] Sign-out and account switching clear stale private data.
-   [ ] AI output is grounded and schema-validated.
-   [ ] Provider failure invokes deterministic fallback.
-   [ ] Backend/frontend tests, lint and production build pass.
-   [ ] Live and mocked results are clearly separated.
-   [ ] Known limitations are documented.

## 6. Security and Environment Rules

-   Keep secrets in ignored local environment files or an approved
    secrets manager.
-   Expose only intentionally public configuration to the browser; never
    expose service-role or AI provider keys.
-   Do not log authorization headers, JWTs, API keys, private trip
    content or sensitive prompts.
-   Do not commit test credentials or unredacted environment output.
-   Use approved test accounts and a non-production environment for live
    security tests where possible.
-   Do not use service-role access to prove user-level RLS.
-   Before every remote write, confirm the target and inspect the
    operation.
-   If unexpected data or schema state is found, stop and request review
    instead of resetting or overwriting it.

## 7. Final Acceptance Criteria

Mark Phase 5 **COMPLETE** only when:

1.  The confirmed Supabase target has the expected migrations applied
    and verified.
2.  Seed data matches the approved canonical catalogue and passes
    integrity checks.
3.  Live authentication and RLS tests prove user-level isolation.
4.  Authenticated cloud trips work end-to-end.
5.  Guest planning remains available without mandatory login.
6.  Account switching and sign-out do not leak cached private data.
7.  At least one live AI provider works and deterministic fallback is
    verified.
8.  AI recommendations use known catalogue IDs and budget calculations
    remain deterministic.
9.  Backend/frontend tests, lint and build pass with exact results
    recorded.
10. Documentation distinguishes live verification from local/mocked
    tests.
11. No unresolved release-blocking security or data-integrity issue
    remains.

If a cloud or security gate fails, use **COMPLETE WITH LIMITATIONS** or
**BLOCKED** as appropriate. Do not describe the app as fully cloud-ready
while remote schema, RLS or ownership checks remain unverified.

## 8. Required Final Report Format

The closure report must include: 1. Executive status: `COMPLETE`,
`COMPLETE WITH LIMITATIONS`, or `BLOCKED`. 2. Repository branch and
commit used for verification. 3. Environment and target project
reference only; no secrets. 4. Migration inventory with filename,
version, applied status and evidence. 5. Seed counts and integrity
results. 6. Authentication/RLS test matrix, including two-user
isolation. 7. Cloud trips behavior and guest fallback. 8. AI provider
live test and fallback results. 9. Exact test commands and observed
backend/frontend counts. 10. Lint, build and security-check results. 11.
Known limitations and their impact. 12. Release recommendation and
remaining actions.

Evidence rules: - Reference actual command output, query results or test
logs where appropriate. - Label checks `LOCAL`, `MOCKED`,
`ASGI/INTEGRATION` or `LIVE`. - Never invent metrics, counts, requests
or completed work. - Mark unavailable checks `NOT VERIFIED` and explain
why. - Reconcile inconsistent counts or filenames before finalizing.

## 9. Immediate Next Action

Start with **Phase 5A --- Repository and Environment Preflight**.
Inspect the repository and target Supabase state read-only, run baseline
tests, and write `docs/PHASE_5A_ENVIRONMENT_PREFLIGHT_REPORT.md`. During
this first task, do not apply remote migrations, seed data, enable cloud
sync or make destructive changes. Any later remote write must follow the
project's authorization and environment safeguards.

------------------------------------------------------------------------

**End of plan**
