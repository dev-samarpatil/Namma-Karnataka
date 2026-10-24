# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## ROADMAP RECONCILIATION & PHASE MAPPING SPECIFICATION

**Document ID:** NK-MAP-ROADMAP-2026-10-23  
**Date:** 2026-10-23  
**Author:** Principal Software Architect & QA Lead  
**Repository:** `dev-samarpatil/Namma-Karnataka`  
**Purpose:** Formally establish the exact correspondence between the canonical TRD Section 26 roadmap (Phase 0–9), the extended modular roadmap (Phase 0–13), and all historical Phase 3, 4.x, and 5A–5J implementation deliverables.

---

## 1. THE DUAL ROADMAP CONSTRUCT

The Namma Karnataka engineering documents define two structured roadmap specifications:

1. **Canonical TRD Roadmap (TRD Section 26):**  
   Formally authored in [Namma_Karnataka_TRD.md](file:///c:/Namma%20Karnataka/Namma_Karnataka_TRD.md#L1706-L1848). It divides the project lifecycle into **10 waterfall-style milestones (Phase 0 through Phase 9)**.
2. **Extended Modular Roadmap:**  
   A fine-grained 14-phase decomposition (**Phase 0 through Phase 13**) used in task scheduling, separating schema design from data seeding, form validation from timeline rendering, adapter implementation from orchestrator fallbacks, and arithmetic from map projections.

---

## 2. CROSS-ROADMAP ALIGNMENT MATRIX

The table below demonstrates the exact 1-to-1 or 1-to-many relationship between the Canonical TRD Roadmap and the Extended Modular Roadmap:

| Canonical TRD Phase (0–9) | TRD Phase Name | Extended Modular Phase(s) (0–13) | Modular Phase Name(s) | Scope & Deliverable Overlap | Mapping Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TRD Phase 0** | Repository Audit, Lock Scope, Decisions & Setup | **Phase 0** | Scope & Architecture Lock | PRD, TRD, Schemas, 7 ADRs, MVP Acceptance Criteria, Risk Register. | **EXACT MATCH** |
| **TRD Phase 1** | Project Skeleton, CI/CD & Design System Foundation | **Phase 1** | Foundation & Health Probes | Monorepo structure, FastAPI + React/Vite, `/health` and `/ready` probes, error envelopes, CI pipeline. | **EXACT MATCH** |
| **TRD Phase 2** | Destination Catalogue, Relational Schema & Seed Data | **Phase 2**<br>**Phase 3** | Database Schema & Migrations<br>Curation & Provenance | PostGIS DDL, 4 migration files, indexes, RLS, 31 districts, curated destinations, source citations, translations. | **SUBDIVIDED IN MODULAR** |
| **TRD Phase 3** | Trip Preference Planning Form & Itinerary Data Contract | **Phase 4**<br>**Phase 5** | Trip Form & Validation<br>Itinerary Contracts & Timeline | Responsive preference form, Pydantic planning schemas, duration/group limits, day-wise stop timeline display. | **SUBDIVIDED IN MODULAR** |
| **TRD Phase 4** | AI Providers, Adapters & Orchestrator | **Phase 6**<br>**Phase 7** | AI Adapters<br>AI Orchestrator & Fallback | Groq and Gemini adapters, candidate grounding validator, 28s global deadline, deterministic offline fallback. | **SUBDIVIDED IN MODULAR** |
| **TRD Phase 5** | Budget Calculation Engine, Route Distance & Interactive Maps | **Phase 8**<br>**Phase 9** | Deterministic Budget Engine<br>Routing & Maps | Authoritative Python arithmetic, unknown fee preservation (`null`), SVG coordinate map, straight-line disclaimer. | **SUBDIVIDED IN MODULAR** |
| **TRD Phase 6** | English/Kannada Bilingual Parity & Quality Verification | **Phase 10** | Bilingual Parity (EN/KN) | Static dictionary coverage, instant toggle with form retention, localized Pydantic API response models. | **EXACT MATCH** |
| **TRD Phase 7** | Saved Trips, Cloud Persistence & Row-Level Security | **Phase 11** | Supabase Auth & RLS | Guest `localStorage` persistence, authenticated Supabase persistence, GoTrue JWT auth, native PostgreSQL RLS. | **EXACT MATCH** |
| **TRD Phase 8** | End-to-End Testing, Security Hardening, Deployment & Observability | **Phase 12** | E2E Regression, Security & CI | Full automated test suite (82 pytest + 17 vitest), Ruff/ESLint/TSC clean, secret scanning, bundle audit. | **EXACT MATCH** |
| **TRD Phase 9** | Controlled Pilot, Human Feedback & Release Readiness | **Phase 13** | Controlled Pilot & Rollout | Closed beta cohort of 10–20 users, usability feedback, latency monitoring, production release sign-off. | **EXACT MATCH** |

---

## 3. HISTORICAL IMPLEMENTATION MAPPING (PHASES 3, 4.x, 5A–5J)

During iterative development, tasks were assigned working labels based on an early informal 6-milestone table in the root `README.md`. This resulted in historical label divergence. The mapping below resolves all historical reports to their authoritative TRD and Modular phase counterparts:

| Historical Work Label | Document Reference | Actual Work Delivered | Canonical TRD Phase | Extended Modular Phase | Audit Reconciliation Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 3** | `docs/PHASE_3_AI_ORCHESTRATION_DESIGN.md` | Dual AI adapters (Groq/Gemini), anti-hallucination grounding, orchestrator, deterministic fallback. | **TRD Phase 4** | **Modular Phases 6 & 7** | Satisfied AI requirements early in development. |
| **Phase 4** | `docs/PHASE_4_IMPLEMENTATION_REPORT.md` | Trip planner form, destination discovery explorer, SVG map, budget summary, bilingual switching. | **TRD Phases 1, 3, 5, 6** | **Modular Phases 4, 5, 8, 9, 10** | Implemented the entire client UI layer. |
| **Phase 4.1** | `docs/PHASE_4_1_E2E_VERIFICATION_REPORT.md` | Guest mode `localStorage` persistence, UI error boundary recovery, integration hardening. | **TRD Phases 1, 3, 7** | **Modular Phases 4, 5, 11** | Hardened frontend persistence. |
| **Phase 4.2** | `docs/PHASE_4_2_SUPABASE_READINESS_REPORT.md` | Prepared SQL migrations (`000001`–`000004`), PostgREST repository layer, auth scaffolding. | **TRD Phases 2, 7** | **Modular Phases 2, 11** | Created database assets (migrations pending execution). |
| **Phase 4 Final** | `docs/PHASE_4_FINAL_CLOSURE_REPORT.md` | Consolidated Phase 4 baseline, passing local test suite (36 backend, 7 frontend). | **TRD Phases 1, 3, 4** | **Modular Phases 1, 4, 5, 6, 7** | Superseded by Phase 5 test expansion. |
| **Phase 5A** | `docs/PHASE_5A_ENVIRONMENT_PREFLIGHT_REPORT.md` | Environment configuration validation, clean git baseline, diagnostic checks. | **TRD Phases 1, 8** | **Modular Phases 1, 12** | Foundation verified. |
| **Phase 5B** | `docs/PHASE_5B_SUPABASE_MIGRATION_REPORT.md` | Execution of remote Supabase PostgreSQL DDL migrations. | **TRD Phases 2, 7** | **Modular Phases 2, 11** | Remote tables created in live Supabase cloud. |
| **Phase 5C** | `docs/PHASE_5C_CATALOGUE_SEED_VALIDATION.md` | Seeding of 31 districts, 12 pilot destinations, translations, and sources to Supabase. | **TRD Phase 2** | **Modular Phase 3** | Remote database populated and verified. |
| **Phase 5D** | `docs/PHASE_5D_AUTH_RLS_LIVE_VERIFICATION.md` | Supabase GoTrue authentication, live JWT generation, tenant isolation. | **TRD Phase 7** | **Modular Phase 11** | Multi-tenant authentication verified live. |
| **Phase 5E** | `docs/PHASE_5E_CLOUD_TRIPS_INTEGRATION_REPORT.md` | `/api/v1/trips` endpoints, immutable snapshots, database persistence. | **TRD Phase 7** | **Modular Phase 11** | FastAPI TestClient and remote database verified. |
| **Phase 5F** | `docs/PHASE_5F_AI_RELIABILITY_REPORT.md` | Live AI provider smoke tests (Groq, Gemini), grounding validation, fallback trigger. | **TRD Phase 4** | **Modular Phases 6, 7** | Live AI network calls verified. |
| **Phase 5G** | `docs/PHASE_5G_RELEASE_REGRESSION_REPORT.md` | Comprehensive automated regression test suite execution (82 backend, 17 frontend). | **TRD Phase 8** | **Modular Phase 12** | Complete automated regression verified. |
| **Phase 5H** | `docs/PHASE_5H_SECURITY_DEPLOYMENT_AUDIT.md` | Secret scanning, token redaction in logs, CORS origin whitelist checks. | **TRD Phases 7, 8** | **Modular Phases 11, 12** | Zero secrets leaked; security audit passed. |
| **Phase 5I** | `docs/PHASE_5I_LIVE_SUPABASE_VERIFICATION_REPORT.md` | Multi-tenant isolation testing, live GoTrue users, release gate audit. | **TRD Phases 7, 8** | **Modular Phases 11, 12** | Remote database verified with live accounts. |
| **Phase 5J** | `docs/PHASE_5J_DEPLOYMENT_VERIFICATION_REPORT.md` | Native PostgreSQL RLS policy verification, frontend/backend integration, E2E browser run. | **TRD Phases 7, 8** | **Modular Phases 11, 12** | Direct PostgREST RLS tests verified HTTP 403. |

---

## 4. ROOT CAUSE OF HISTORICAL NUMBERING DIVERGENCE

1. **The Early README Table:**  
   In the initial repository setup, an informal high-level 6-item status checklist was placed in the root `README.md` (labeled "Phase 0" through "Phase 5"). In that informal table:
   - "Phase 3" was titled "AI Orchestrator & Fallback".
   - "Phase 4" was titled "Bilingual Planner & UI".
   - "Phase 5" was titled "Quality Audit & Release".
2. **Subsequent Agent Prompts:**  
   Subsequent development prompts referenced that informal 6-item checklist rather than the authoritative 10-phase TRD Section 26 or 14-phase modular plan. Consequently, AI orchestration was coded under historical label "Phase 3", the frontend UI under "Phase 4", and cloud persistence under "Phase 5".
3. **Architectural Coherence:**  
   Despite the inverted labeling sequence, **no architectural harm or interface mismatch occurred**. The backend Pydantic contracts created in historical Phase 3 served as rigid, type-safe specifications for the frontend forms developed in historical Phase 4, and the Supabase migrations in Phase 5 cleanly mirrored the models.

---

## 5. RESOLUTION OF AMBIGUITIES

The following ambiguity rules are formally established:

| Subject | Potential Ambiguity | Authoritative Decision |
| :--- | :--- | :--- |
| **Roadmap Precedence** | TRD 10-phase vs Modular 14-phase | The **Canonical TRD Roadmap (TRD Section 26, Phases 0–9)** is the primary architectural baseline. The **14-phase Modular Roadmap (Phases 0–13)** is the official engineering breakdown. Both are 100% aligned per Section 2 of this document. |
| **Historical Labels** | Does "Phase 5J" mean the project is on Phase 5? | **No.** Historical "Phase 5J" was a sub-milestone of cloud deployment and testing. In the canonical TRD roadmap, Phase 5J completed **TRD Phase 8 (QA, Deployment & Observability)** and **TRD Phase 7 (Persistence & RLS)**. The project is at the boundary of **TRD Phase 9 / Modular Phase 13**. |
| **Database Table Names** | `saved_trips` vs `trips` | Spec documents colloquially referenced `saved_trips`, but the authoritative database tables created by migration `20261023000004` are `trips` and `itinerary_snapshots`. Pydantic models map to `trips`. |
| **Map Technology** | Leaflet OSM tiles vs SVG Projection | While TRD Section 11 referenced Leaflet tile layers, ADR-005 and actual implementation adopted a mathematically accurate, responsive SVG canvas with Karnataka bounds (11.5°N–18.5°N, 74.0°E–78.6°E) and accessible list alternative. This avoids third-party tile-server rate limits, eliminates bundle bloat, and truthfully represents straight-line travel. |
| **Kannada Translation** | Sarvam AI vs Pre-compiled Dictionaries | PRD Section 12 discussed dynamic machine translation repair using Sarvam AI. The implementation verified that static pre-compiled dictionaries provide instant, deterministic, zero-cost, grammatically sound localization. `ENABLE_SARVAM_REPAIR=false` is maintained by architectural design. |

---

## 6. CONCLUSION & RECONCILED PROJECT POSITION

- **Canonical TRD Roadmap:** Phases 0 through 8 are `VERIFIED COMPLETE`. Only **Phase 9: Controlled Pilot** remains.
- **Extended Modular Roadmap:** Phases 0 through 12 are `VERIFIED COMPLETE`. Only **Phase 13: Controlled Pilot & Rollout** remains.
- **Next Engineering Action:** Proceed directly to user recruitment and execution of the Controlled Pilot without reimplementing any completed foundation.
