# NAMMA KARNATAKA
## Phase 2 Implementation Plan — Database Modeling, Supabase PostGIS Migrations, and Curated Destination Datasets

**Document ID:** NK-PH2-PLAN-001  
**Version:** 1.0  
**Status:** Proposed implementation plan  
**Prerequisite:** Phase 1 foundation reported complete  
**Target workspace:** `c:\Namma Karnataka`  
**Implementation environment:** Google Antigravity IDE with Gemini 3.8 Flash — Medium

---

## 1. Purpose

This plan defines the implementation scope, sequence, deliverables, verification steps, and acceptance criteria for Phase 2 of Namma Karnataka.

Phase 2 establishes the application's first durable data foundation:

- PostgreSQL data model through Supabase.
- PostGIS support for geographic destination queries.
- Versioned, repeatable database migrations.
- Curated and traceable Karnataka destination seed data.
- Backend repository-layer boundaries for reading destination data.
- Automated tests and documentation that make the foundation safe to extend.

Phase 2 must build on the existing Phase 1 monorepo. It must not replace working infrastructure or implement later-phase product functionality prematurely.

## 2. Baseline and Constraints

The Phase 1 completion reports describe a working React 18/Vite/TypeScript frontend and FastAPI/Pydantic backend, centralized request IDs and error handling, health/readiness endpoints, frontend and backend tests, lint/build commands, and a GitHub Actions workflow. The reports record 7 frontend tests and 10 backend tests passing.

Before implementation, inspect the actual repository and verify the report against the current files. Treat the reports as evidence of the intended baseline, not a substitute for inspecting the workspace.

### 2.1 Existing architecture to preserve

- Monorepo with separate `frontend/` and `backend/` directories.
- Python FastAPI backend with Pydantic v2.
- React/Vite/TypeScript frontend.
- Centralized API client and standardized error envelope.
- Environment-driven configuration.
- Request ID propagation and secret-safe logging.
- Existing tests, linting, build scripts, CI, and README files.
- Phase 0 specifications and Architecture Decision Records (ADRs).

### 2.2 Product and architecture rules

1. **Supabase is the source of truth** for structured destination records.
2. Use PostgreSQL with PostGIS for geographic fields and spatial queries where supported by the selected Supabase project.
3. Use migrations as the version-controlled schema history; do not rely on undocumented manual dashboard changes.
4. Keep curated destination content distinct from generated AI output.
5. Never invent destination facts, coordinates, admission fees, opening hours, accessibility details, safety guarantees, or travel times.
6. Every seeded destination must have traceable source/provenance metadata and a review status.
7. A missing fee is unknown, not zero. Store unknown values as `NULL` and represent their meaning explicitly in API/domain contracts.
8. “Offbeat” or “lesser-known” is an editorial classification, not a safety guarantee.
9. Do not put service-role keys, database passwords, or other server secrets in frontend code, seed files, logs, or committed configuration.
10. Use parameterized queries and validate inputs. Avoid building SQL by concatenating user-provided values.
11. Respect existing ADRs. If a change is required, document it as a proposed ADR amendment rather than silently overriding a decision.
12. Do not claim live Supabase connectivity unless a real, permitted integration check was performed.

---

## 3. Phase 2 Objectives

By the end of this phase, the project should have:

- A documented, normalized initial destination schema.
- A versioned migration enabling the required PostGIS capability and defining tables, constraints, indexes, and database policies appropriate to the chosen access model.
- A documented seed-data format and a small, reviewed starter dataset for Karnataka destinations.
- A repeatable seed process that is safe to rerun and does not duplicate records.
- A backend repository layer that reads destination data without embedding SQL throughout API routes.
- Tests for schema assumptions, seed validation, repository behavior, and error cases.
- Updated setup instructions for local development and Supabase.
- A Phase 2 completion report with evidence, test results, unresolved issues, and readiness status.

## 4. Explicit Scope Boundaries

### 4.1 In scope

- Inspecting and preserving the Phase 1 codebase.
- Database model design and documentation.
- Supabase/PostgreSQL migration files.
- PostGIS enablement and spatial column/index design.
- Initial destination-related tables and enums/check constraints.
- Curated destination seed data and provenance.
- Seed validation and idempotent loading.
- Backend database configuration and connection abstraction, if required by the existing architecture.
- Repository layer for destination read operations.
- Unit/integration tests with test doubles or a dedicated test database.
- Database setup, migration, seed, rollback/forward-recovery, and troubleshooting documentation.
- Updating CI only where necessary to validate Phase 2 additions.

### 4.2 Out of scope

Do not implement these in Phase 2 unless an existing specification explicitly requires a minimal prerequisite:

- AI itinerary generation or Groq/Gemini orchestration.
- Destination discovery UI or destination detail pages.
- Authentication screens, OAuth flows, or saved-trip features.
- Itinerary planner forms, itinerary editing, or trip persistence.
- Live road routing, directions, ETA calculations, or fabricated travel times.
- Budget estimation logic.
- Full-text/vector retrieval or RAG.
- Maps UI or interactive Leaflet views.
- Production deployment or external-service integrations beyond what is needed to validate the database foundation.
- A large, unreviewed catalogue of destinations.

The frontend should remain the Phase 1 scaffold. A small, typed API/repository capability is acceptable only if needed to prove the data contract and must not turn into a user-facing discovery feature.

---

## 5. Recommended Repository Structure

Inspect the existing repository first. Reuse compatible directories and conventions rather than creating duplicates. A target structure may look like:

```text
Namma Karnataka/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   └── destinations.py
│   │   ├── schemas/
│   │   │   └── destinations.py
│   │   ├── services/
│   │   │   └── destinations.py        # only if a service boundary is justified
│   │   └── tests/
│   │       ├── test_destination_schemas.py
│   │       ├── test_destination_repository.py
│   │       └── test_seed_validation.py
│   └── ...
├── data/
│   └── seed/
│       ├── destinations.json          # or another documented canonical format
│       ├── README.md
│       └── sources.md                 # if provenance is maintained separately
├── docs/
│   ├── PHASE_2_IMPLEMENTATION_PLAN.md
│   ├── PHASE_2_DATABASE_DESIGN.md
│   ├── PHASE_2_SEED_DATA_GUIDE.md
│   └── PHASE_2_COMPLETION_REPORT.md
└── supabase/
    ├── config.toml                    # only if using Supabase CLI locally
    └── migrations/
        └── <timestamp>_initial_destination_schema.sql
```

Do not create empty modules merely to match this example. Create files only when they contain purposeful, tested functionality. If the existing project already has an agreed directory convention, preserve it and document the difference.

---

## 6. Workstream A — Repository and Environment Pre-flight

### Tasks

1. Inspect the repository tree, Phase 0 specifications, ADRs, Phase 1 report, Python project metadata, frontend package files, `.gitignore`, CI workflow, and current tests.
2. Run the existing baseline checks before modifying code:
   - Backend lint.
   - Backend tests.
   - Frontend lint.
   - Frontend tests.
   - Frontend production build.
3. Record baseline outcomes and existing failures.
4. Check the Python versions declared in project metadata and CI. Resolve or document the reported local/CI version difference before adding dependencies.
5. Check whether Supabase CLI is already configured. Do not introduce it without documenting why it is needed.
6. Verify `.env.example` contains placeholders only and that local `.env` files are ignored.
7. Identify the intended database access pattern from the existing ADRs. Prefer one clear backend access strategy over mixing direct SQL, ORM, and Supabase client patterns without justification.

### Deliverables

- Short pre-flight note in the Phase 2 completion report.
- Any necessary small compatibility correction, separately described and tested.
- No unrelated refactoring.

### Exit criteria

- Baseline results are recorded.
- Existing Phase 1 behavior remains intact.
- Database access and migration approach are documented before implementation.

---

## 7. Workstream B — Data Model and Database Design

Create `docs/PHASE_2_DATABASE_DESIGN.md` before writing the final migration.

### 7.1 Destination entity

Define a destination record with only fields justified by the product requirements. A recommended initial model includes:

| Field | Suggested type | Rules / purpose |
|---|---|---|
| `id` | UUID | Stable primary key; generated by the database or migration/seed convention. |
| `slug` | text | Required, unique, URL-safe stable identifier. |
| `name_en` | text | Required English display name. |
| `name_kn` | text | Kannada display name; nullable only if editorial policy allows a temporary untranslated record. |
| `summary_en` | text | Short curated English description. |
| `summary_kn` | text | Kannada description; nullable only under a documented translation-review policy. |
| `destination_type` | enum or constrained text | Controlled taxonomy, documented and extensible. |
| `district` | text or normalized reference | Karnataka district associated with the destination. Use consistent canonical spelling. |
| `address_or_locality` | text | Optional human-readable location description; do not invent one. |
| `location` | PostGIS `geography(Point, 4326)` or justified `geometry(Point, 4326)` | Coordinates with documented CRS semantics. |
| `latitude` / `longitude` | numeric | Include only if the chosen design needs separate values; avoid redundant, inconsistent coordinate storage. |
| `is_offbeat` | boolean | Editorial classification, not a safety claim. |
| `estimated_visit_minutes` | integer | Optional editorial estimate; null when not reviewed. |
| `entry_fee_min_inr` | numeric/integer | Nullable. Never assume missing means free. |
| `entry_fee_max_inr` | numeric/integer | Nullable; enforce non-negative values and min ≤ max when both are known. |
| `currency_code` | char(3) | Default `INR` only where it is meaningful and documented. |
| `best_season` | controlled text/array or related table | Optional curated advice with provenance; do not imply guaranteed conditions. |
| `opening_hours` | JSONB or related table | Optional and nullable; structure and validation must be documented. |
| `accessibility_notes` | text/JSONB | Optional and source-backed. |
| `source_metadata` | JSONB or normalized related table | Source URL/name, retrieval date, source type, license/usage notes, and editorial verification status. |
| `content_status` | enum or constrained text | E.g. `draft`, `reviewed`, `published`, `archived`; publish policy must be explicit. |
| `created_at` | timestamptz | Database-managed creation time. |
| `updated_at` | timestamptz | Database-managed update time or updated by a documented trigger. |

This is a candidate design, not a requirement to add every field. Review the PRD/TRD/schema documents and ADRs; include only fields with a clear use. Avoid duplicating coordinates in multiple representations unless a consistency mechanism is provided.

### 7.2 Related tables: include only when justified

Consider separate tables for:

- Destination images and attribution.
- Destination tags or categories.
- Source/provenance records.
- Destination-to-tag relationships.

Use normalized related tables when data needs independent validation, querying, or many-to-many relationships. JSONB is acceptable for small, evolving metadata if its schema is documented and validated. Do not add future itinerary, user, or saved-trip tables in this phase without a direct Phase 2 requirement.

### 7.3 Database integrity

Use appropriate:

- Primary and foreign keys.
- Unique constraints for stable identifiers.
- `NOT NULL` for required data.
- `CHECK` constraints for valid fee ranges, non-negative estimates, and valid controlled values.
- Indexes for common filters and lookups.
- Spatial index (normally GiST) for PostGIS location queries.
- Timestamp handling in UTC.
- Safe delete/update semantics.
- Consistent case and slug normalization rules.

Document the behavior of unknown, unavailable, and not-yet-reviewed values. Do not encode unknown fees as zero or unknown opening hours as an empty schedule.

### 7.4 PostGIS decisions

- Enable the PostGIS extension using a migration if supported by the selected Supabase environment and permission model.
- Use SRID 4326 and explicitly document coordinate order. For common PostGIS constructors, longitude is the X coordinate and latitude is the Y coordinate.
- Add a GiST index on the spatial column if spatial searches are expected.
- Use spatial functions for proximity filtering only when supported by the chosen geography/geometry type.
- Do not calculate road distance or driving time from straight-line geometry.
- Make migration failure clear if the required extension cannot be enabled; do not silently proceed with a broken spatial schema.

### Deliverables

- `docs/PHASE_2_DATABASE_DESIGN.md`.
- Schema diagram or concise relationship description.
- Documented field definitions, nullability, units, coordinate system, provenance, and publication rules.

---

## 8. Workstream C — Versioned Supabase Migrations

### Tasks

1. Establish the project's migration workflow and naming convention.
2. Add a migration for required extensions, enums/check constraints, tables, indexes, and policies.
3. Make migration order explicit and deterministic.
4. Ensure a fresh database can be initialized from the migration history.
5. Provide a safe forward-correction migration for changes; do not rewrite an already-applied migration in a way that makes environments diverge.
6. If a destructive change is proposed, stop and document the impact and recovery plan rather than executing it automatically.
7. Ensure migration SQL is reviewed for Supabase compatibility and least privilege.
8. Avoid hard-coded secrets, production hostnames, or environment-specific connection strings in SQL files.

### Row Level Security and access model

First decide how the backend connects to Supabase:

- If using a privileged server-side service role for controlled backend operations, keep that key strictly server-side, restrict its use, and enforce authorization in backend code. Remember that a service role can bypass RLS.
- If using a restricted database role or user-scoped Supabase client, design RLS policies that match the actual request identity and data-access requirements.
- Public curated destination reads may be allowed only for published records.
- Do not add permissive write policies simply to make tests pass.
- Since Phase 2 does not implement user authentication, do not invent user ownership policies for nonexistent user data. Document the policy plan for later phases.

### Migration validation

Where feasible, validate using a disposable local Supabase/PostgreSQL environment or a dedicated test database. If no real database is available, perform static checks and mocked/unit tests, but clearly label them as such; do not claim a migration was executed successfully on Supabase.

### Deliverables

- Versioned SQL migration(s) under `supabase/migrations/`.
- Supabase/local setup instructions as appropriate.
- Migration verification evidence and recovery guidance.

---

## 9. Workstream D — Curated Destination Seed Dataset

Create a small, defensible starter dataset rather than maximizing record count.

### 9.1 Seed data principles

- Include a small initial set spanning different destination types and regions of Karnataka.
- Choose destinations only when core details can be supported by credible sources.
- Do not fabricate coordinates, districts, fees, opening hours, seasonal advice, or accessibility claims.
- Keep uncertain fields null and explain the reason in provenance or editorial notes.
- Mark records as `draft` or `reviewed` according to actual verification. Do not set all records to `published` merely to populate the app.
- Store English and Kannada content separately and track translation/review status if the schema supports it.
- Distinguish official-source facts from editorial summaries.
- Record source name/URL, source type, date checked, and applicable licensing/attribution notes.
- Do not bulk-copy third-party descriptions or images without confirming usage rights.
- Do not treat “offbeat” as a guarantee of safety, access, infrastructure, or low crowd levels.

### 9.2 Format

Use one canonical format, preferably JSON or CSV based on the selected tooling. Document:

- Required and optional fields.
- Stable identifier/slug rules.
- Coordinate format.
- Null handling.
- Source/provenance format.
- Content and translation review status.
- Validation command.
- How to add or update a destination.

Avoid maintaining the same authoritative destination records in multiple formats.

### 9.3 Idempotent seeding

The seed process must be safe to rerun:

- Use stable keys such as `slug` or a deterministic UUID.
- Upsert only on a deliberate conflict key.
- Do not create duplicates on repeated runs.
- Do not overwrite reviewed editorial content unexpectedly.
- Define whether seed data may update existing records and how manual edits are protected.
- Provide a dry-run or validation-only mode where practical.
- Report inserted, updated, skipped, and invalid records.
- Fail clearly on invalid required fields or duplicate slugs.

### Deliverables

- `data/seed/destinations.json` or the chosen canonical seed file.
- `data/seed/README.md`.
- Validation and idempotent loading command/script.
- Source/provenance records and validation report.

---

## 10. Workstream E — Backend Schemas and Repository Layer

### 10.1 Typed contracts

Create Pydantic models for destination data returned by the repository. Keep database persistence models separate from public API schemas when this avoids exposing internal fields.

Include:

- UUID and slug validation.
- Latitude/longitude or PostGIS serialization rules if coordinates are returned.
- Optional fields and explicit unknown values.
- Enumerated destination types and publication states.
- Fee validation and currency units.
- Source metadata exposure rules (do not expose private editorial notes or internal source data unless intended).

Do not return raw database rows without validation.

### 10.2 Repository responsibilities

Create a destination repository abstraction responsible for operations needed in Phase 2, such as:

- Retrieve a destination by stable ID or slug.
- List published destinations with bounded pagination.
- Filter by district or destination type only if supported by the schema and justified now.
- Optionally retrieve nearby destinations using PostGIS only if there is a concrete testable requirement.

Repository requirements:

- Keep SQL/database calls out of route handlers.
- Use parameterized queries.
- Set safe pagination defaults and maximum page sizes.
- Apply published-record filters consistently to public reads.
- Return predictable results for missing IDs.
- Translate persistence errors into the existing application error contract without leaking SQL or credentials.
- Avoid adding a public API endpoint unless required to verify the repository contract. If one is added, use the existing `/api/v1` routing and response conventions.

### 10.3 Database client/lifecycle

- Follow the chosen ADR and current backend configuration pattern.
- Keep connection setup injectable/testable.
- Avoid opening a new database connection for every row or request without pooling.
- Ensure startup/shutdown lifecycle is managed correctly if a pool is used.
- Avoid performing external database calls during module import.
- Ensure tests can run without real Supabase credentials.

### Deliverables

- Typed destination schemas.
- Repository abstraction and implementation.
- Unit tests with mocked persistence behavior.
- Optional integration tests guarded by explicit test-database configuration.

---

## 11. Workstream F — Testing and Quality Assurance

Add tests in proportion to the new code. Do not replace or weaken existing Phase 1 tests.

### 11.1 Schema and seed tests

Test:

- Valid and invalid destination records.
- Missing required fields.
- Invalid UUID/slug/category values.
- Coordinate bounds and coordinate-order conversion.
- Invalid fee ranges and negative values.
- Unknown fee remains unknown rather than zero.
- Missing provenance for records that require it.
- Duplicate slugs.
- Translation/review status rules.
- Idempotent seed behavior.
- Protection against accidental overwriting of reviewed data.

### 11.2 Repository tests

Test:

- Lookup by ID and slug.
- Missing destination behavior.
- Only published destinations returned by public read operations.
- Pagination bounds and deterministic ordering.
- District/type filters if implemented.
- Spatial query semantics if implemented.
- Persistence failures mapped to safe errors.
- SQL parameters are passed separately rather than concatenated.

### 11.3 Migration/database tests

Where a real disposable database is available, test:

- Fresh database migration.
- Required extension and spatial column.
- Constraint enforcement.
- Unique slug behavior.
- Spatial index presence.
- Seed application and repeat application.
- Query behavior with representative records.

If tests use mocks or static inspection, label them clearly and do not report them as live database integration tests.

### 11.4 Regression checks

Run all Phase 1 checks again:

Backend:
```bash
ruff check .
pytest -v
```

Frontend:
```bash
npm run lint
npm run test
npm run build
```

Run commands from the correct project directories and use the project's actual scripts. If script names differ, update the documentation rather than claiming a command passed when it does not exist.

### 11.5 CI

Update `.github/workflows/ci.yml` only as needed to run new deterministic tests and validation. CI must not require production credentials. Integration tests against a real database should use a disposable service or an explicitly configured non-production test database.

---

## 12. Workstream G — Security, Privacy, and Operational Safety

Verify the following:

- `.env` and real credentials remain excluded from Git.
- `.env.example` files contain placeholders only.
- No server key is exposed via `VITE_*` environment variables or frontend build artifacts.
- No database passwords, tokens, or sensitive connection strings appear in logs or exception messages.
- SQL uses bound parameters.
- Database roles follow least privilege.
- RLS is enabled where appropriate to the chosen access pattern.
- Any service-role use is server-side only and explicitly documented.
- Public reads expose only intended, published destination content.
- Seed data contains no personal or sensitive information.
- Provenance and image attribution requirements are respected.
- Error responses continue to use the Phase 1 normalized error contract.

Do not describe the application as production-secure solely because these baseline checks pass. Record the scope and limitations of the checks performed.

---

## 13. Workstream H — Documentation

Create or update the following documents:

### `docs/PHASE_2_DATABASE_DESIGN.md`
Must cover:
- Entity model and relationships.
- Column definitions, types, nullability, constraints, and units.
- PostGIS type, SRID, coordinate order, and spatial indexes.
- Access model, RLS strategy, and public/private field boundaries.
- Indexing rationale and future extension points.

### `docs/PHASE_2_SEED_DATA_GUIDE.md` or `data/seed/README.md`
Must cover:
- Seed format and schema.
- Provenance requirements.
- Translation and editorial review rules.
- Validation and seeding commands.
- Idempotency behavior and safe updates.
- How to add a new destination.

### Root and backend README updates
Include accurate setup steps for:
- Prerequisites.
- Environment variables.
- Starting local backend services.
- Starting/connecting to a local or hosted Supabase environment.
- Applying migrations.
- Validating and loading seed data.
- Running tests and CI-equivalent checks.
- Troubleshooting common database/PostGIS errors.

### `docs/PHASE_2_COMPLETION_REPORT.md`
Record:
- Implemented changes.
- Files created/updated.
- Migration names and actual execution evidence.
- Seed record counts and validation results.
- Test/lint/build results.
- Security checks.
- Known limitations and assumptions.
- Deviations from the plan.
- Phase 3 readiness status.

---

## 14. Suggested Implementation Sequence

Execute the work in small, reviewable stages:

1. **Pre-flight:** inspect repository and record passing/failing baseline checks.
2. **Design:** finalize data model, null semantics, PostGIS strategy, and access model.
3. **Migration:** write and validate versioned schema migration(s).
4. **Seed contract:** define canonical data format and provenance rules.
5. **Seed data:** prepare and validate a small reviewed dataset.
6. **Seed loader:** implement idempotent loading and dry-run/validation behavior.
7. **Backend contracts:** add Pydantic destination schemas.
8. **Repository layer:** implement bounded, parameterized read operations.
9. **Tests:** add schema, seed, repository, and database tests appropriate to available infrastructure.
10. **Security review:** inspect secrets, RLS/access assumptions, SQL handling, and public data exposure.
11. **Regression:** run frontend/backend checks and CI-equivalent commands.
12. **Documentation:** update setup instructions and write the completion report.
13. **Phase gate:** compare results against acceptance criteria and declare `READY`, `READY_WITH_ASSUMPTIONS`, or `BLOCKED`.

Do not attempt to perform the entire phase in one unreviewed code-generation pass if the IDE workflow supports checkpoints. Validate each stage before continuing.

---

## 15. Acceptance Criteria

Phase 2 is complete only when the following criteria are verified or explicitly marked as blocked with evidence.

| ID | Acceptance criterion | Evidence required |
|---|---|---|
| PH2-01 | Phase 1 architecture and specifications are preserved | Repository diff and file audit |
| PH2-02 | Database design is documented | Reviewed database design document |
| PH2-03 | Migration history is version-controlled | Migration files and documented command |
| PH2-04 | PostGIS setup is represented in migration history | Migration review and, where available, database verification |
| PH2-05 | Destination schema has appropriate keys and constraints | SQL review and tests |
| PH2-06 | Spatial column and index are correctly defined if PostGIS is available | Database inspection or clearly labelled static verification |
| PH2-07 | Unknown fees and unknown opening hours are represented honestly | Schema/seed tests |
| PH2-08 | Seed records have stable identifiers and provenance | Seed validation report |
| PH2-09 | Seed data is small, traceable, and not fabricated | Source review and editorial status audit |
| PH2-10 | Re-running seed process does not duplicate records | Idempotency test |
| PH2-11 | Seed loader reports invalid records and safe update behavior | Automated tests or recorded validation output |
| PH2-12 | Destination schemas validate data at the backend boundary | Pydantic tests |
| PH2-13 | Repository uses parameterized queries and bounded pagination | Code review and tests |
| PH2-14 | Public read paths expose only intended published records | Repository tests and access-model documentation |
| PH2-15 | Database errors do not leak secrets or raw SQL | Error-path tests |
| PH2-16 | Tests run without production credentials | CI/test configuration review |
| PH2-17 | Existing Phase 1 tests and build remain green | Full regression output |
| PH2-18 | CI validates new deterministic checks | Workflow review and successful run, if available |
| PH2-19 | Documentation matches the actual implementation | README and guide review |
| PH2-20 | Completion report distinguishes tested facts from assumptions | `PHASE_2_COMPLETION_REPORT.md` |
| PH2-21 | No out-of-scope AI, itinerary, auth, or UI feature has been added | Diff and code audit |
| PH2-22 | Final readiness is declared with unresolved risks listed | Completion report |

### Definition of Done

The phase must not be declared fully complete merely because files were generated. At minimum:

- Relevant tests and checks have been executed.
- Migration execution claims are supported by actual evidence.
- Seed data passes validation.
- Existing functionality has not regressed.
- Security/access decisions are documented.
- Known limitations are explicit.
- Any unavailable external infrastructure is reported honestly.

---

## 16. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| PostGIS extension unavailable or permissions differ | Migration failure or missing spatial support | Verify target Supabase capabilities early; stop clearly if blocked. |
| Local and CI Python versions differ | Reproducibility failures | Align supported versions and dependency metadata before adding database libraries. |
| Seed facts are inaccurate | User-facing misinformation | Require source metadata, review status, and nullable unknown fields. |
| Re-running seeds overwrites editorial corrections | Data loss | Define upsert rules and protect reviewed fields. |
| Mixed database access patterns | Complexity and inconsistent behavior | Choose one primary strategy and document the rationale. |
| Overly broad RLS or service-role use | Unauthorized access | Apply least privilege; document server trust boundary and policy semantics. |
| Migration files are edited after application | Environment drift | Use forward corrective migrations for applied schema changes. |
| Integration tests depend on live production services | Flaky CI and accidental production changes | Use mocks or disposable non-production databases. |
| Phase 2 expands into UI or AI work | Schedule and quality risk | Enforce explicit scope boundaries. |
| Coordinates or road travel claims are confused | Misleading distance/ETA information | Document coordinate semantics; distinguish geographic proximity from road routing. |

---

## 17. Phase 3 Readiness Gate

At the end of Phase 2, evaluate readiness for the next phase based on the actual roadmap and product specifications.

A `READY` decision requires:
- The destination schema is stable enough for discovery APIs.
- Seed records have traceable provenance and documented review state.
- Repository behavior is covered by tests.
- Migration and setup steps are reproducible.
- No unresolved critical access-control or data-integrity issue remains.

Use `READY_WITH_ASSUMPTIONS` when non-blocking decisions remain, such as the final production routing provider or a pending editorial review workflow.

Use `BLOCKED` if migrations cannot be applied or validated in the intended environment, destination data integrity is unreliable, or the access model has a critical unresolved security issue.

Do not automatically treat this phase as authorization to implement discovery UI. Follow the project roadmap and specifications to determine the next phase's actual scope.

---

## 18. Instructions for Gemini 3.8 Flash — Medium in Antigravity

When executing this plan:

1. Inspect the actual workspace and read all relevant Phase 0 documents, ADRs, Phase 1 reports, and existing code before editing.
2. Treat this plan as a controlled implementation contract, but resolve conflicts in favor of explicit product specifications and existing approved ADRs. Document any conflict.
3. Do not assume a database, Supabase project, or credentials are available. Inspect safely and ask for required human input if a genuinely blocking decision cannot be resolved from the repository.
4. Never print, expose, or copy real secrets into reports.
5. Work incrementally and run relevant tests after each major workstream.
6. Do not delete or rewrite unrelated files. Preserve the existing test suite and Phase 1 behavior.
7. Do not invent source citations or claim destination facts were verified when they were not.
8. Do not claim that a migration was applied to Supabase unless the command completed against the intended non-production or production environment and the outcome was observed.
9. Do not silently use production data for destructive testing.
10. Report all files created, updated, or deleted and explain why.
11. Record commands actually executed and their real results; distinguish pass, fail, skipped, mocked, and static-only checks.
12. Stop at the Phase 2 boundary. Do not implement AI generation, auth flows, itinerary planning, maps UI, or unrelated features.
13. Finish with a concise status summary, acceptance-criteria table, unresolved questions, and explicit Phase 3 readiness decision.

---

## 19. Final Deliverable Checklist

- [ ] Repository pre-flight completed.
- [ ] Phase 0 specifications and Phase 1 foundation preserved.
- [ ] Database design documented.
- [ ] Migration(s) created and validated to the extent infrastructure permits.
- [ ] PostGIS setup and coordinate semantics documented.
- [ ] Seed dataset created with provenance and review status.
- [ ] Seed validation and idempotency verified.
- [ ] Backend destination schemas implemented and tested.
- [ ] Repository layer implemented and tested.
- [ ] Access model/RLS/service-role boundaries documented and checked.
- [ ] Frontend and backend regression checks run.
- [ ] CI updated and validated as available.
- [ ] README/setup/seed guides updated.
- [ ] `docs/PHASE_2_COMPLETION_REPORT.md` completed with real evidence.
- [ ] Phase 3 readiness declared with risks and assumptions.

---

**End of document — NK-PH2-PLAN-001**
