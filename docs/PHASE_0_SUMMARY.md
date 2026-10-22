# NAMMA KARNATAKA
## Phase 0 Executive Summary

**Product:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Document ID:** NK-SUM-001  
**Version:** 1.0  
**Phase:** Phase 0 — Scope, Requirements Lock & Architecture Blueprint  
**Status:** COMPLETE WITH DOCUMENTED ASSUMPTIONS  
**Date:** October 2026  

---

## 1. Project Understanding

Namma Karnataka is an AI-powered regional travel discovery and itinerary-planning application dedicated to Karnataka, India. Rather than operating as a superficial conversational chatbot, the platform provides a structured, dependable travel-planning workflow. It combines a curated catalog of verified destinations (both famous landmarks and editorially classified offbeat locations) with deterministic budget and route calculations, isolated dual-provider AI generation (Groq and Google Gemini), and strict bilingual parity for English and Kannada.

---

## 2. MVP Scope Definition

The MVP boundary is strictly locked:
- **`MVP_REQUIRED`:** Bilingual application shell (EN/KN), curated destination discovery with filtering and search, trip preferences form (1–7 days), dual-provider AI orchestrator with primary-then-secondary failover, Pydantic schema validation, deterministic rule-based offline fallback, deterministic budget arithmetic engine, Leaflet map with honest route uncertainty, guest planning, and authenticated saved trips via Supabase Auth and Row Level Security.
- **`DEFERRED / POST_MVP`:** IndicTrans2 self-hosted models, user review feeds, multi-state expansion, collaborative itinerary editing, and custom stay booking engines.
- **`OUT_OF_SCOPE`:** Live ticket booking, payment processing, real-time traffic prediction, live inventory availability, and emergency/medical guarantees.

---

## 3. Architecture Summary

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui (Radix primitives), `react-router-dom`, `react-i18next`, `react-leaflet`, and TanStack Query.
- **Backend:** Python 3.11+, FastAPI (async routes prefixed with `/api/v1/`), Pydantic v2 schemas across all layers, `httpx` async client with isolated timeouts, and `pytest`.
- **Database & Auth:** Supabase PostgreSQL with PostGIS, versioned SQL migrations, and strict Row Level Security (`auth.uid() = user_id`) isolating private trips.
- **AI & Integrations:** Isolated adapters for Groq (`llama-3.3-70b-versatile`) and Google Gemini (`gemini-1.5-flash`), with a 28-second global request deadline and local deterministic rule-based fallback.

---

## 4. Key Architectural Decisions

1. **Monorepo Layout:** Unified repository hosting `frontend/`, `backend/`, `supabase/`, and `docs/` (`ADR-001`).
2. **Decoupled SPA + FastAPI:** High-performance static React frontend paired with an async Python backend for AI orchestration and Pydantic validation (`ADR-002`).
3. **Database & Privacy:** Supabase PostgreSQL with RLS ensuring multi-tenant data isolation (`ADR-003`).
4. **AI Failover Strategy:** Primary-then-secondary execution (`Groq` $\rightarrow$ `Gemini` $\rightarrow$ `Deterministic Fallback`) minimizing token costs and eliminating downtime (`ADR-004`).
5. **Catalog Integrity & Provenance:** Zero LLM hallucinations in the catalog; all recommendations must reference pre-existing, source-verified IDs with explicit uncertainty labels (`ADR-005`).
6. **Deterministic Budget & Route Honesty:** Backend code owns arithmetic totals; missing fees are never treated as ₹0; straight-line distances are never drawn as road routes (`ADR-006`).
7. **Guest Planning:** "Plan first, sign in later." In-memory generation for anonymous users; authentication required only for persisting trips (`ADR-007`).

---

## 5. Major Risks and Mitigations

- **AI Hallucinations (Critical):** Mitigated by strict candidate ID grounding and Pydantic validation; any unregistered ID triggers immediate rejection.
- **Cross-User Data Exposure (High):** Mitigated by PostgreSQL Row-Level Security (`user_id = auth.uid()`) and automated multi-tenant JWT test suites.
- **AI Outages & Rate Limits (Critical):** Mitigated by automated primary-then-secondary provider failover and an offline deterministic fallback planner.
- **Deceptive Cost Information (High):** Mitigated by explicit unknown status (`null`), preventing unverified entry fees from silently becoming ₹0.
- **Kannada Degradation on Error (High):** Mitigated by static pre-compiled translation catalogs and independent client-side locale persistence.

---

## 6. Unresolved Decisions (Non-Blocking for Phase 1)

1. `DEC-UNRES-01`: Production routing provider (OSRM demo server used for dev/staging; evaluate self-hosted or Mapbox for production).
2. `DEC-UNRES-02`: Production map tile provider (OpenStreetMap tiles for dev; evaluate CartoDB/MapLibre for production).
3. `DEC-UNRES-03`: Destination image licensing compliance (Wikimedia Commons CC-BY-SA verified; editorial review for marketing assets).
4. `DEC-UNRES-05`: Native Kannada content review workflow for seed data.

---

## 7. Phase 1 Readiness Status

* **Status:** `READY_WITH_ASSUMPTIONS`
* **Assumptions:** All initial Phase 1 tests run against deterministic mocks without requiring live paid external API keys.
* **Blocker Assessment:** No technical blockers exist. The project foundation is solid and verified.

---

## 8. Files Created in Phase 0

| File Path | Description |
|---|---|
| `docs/IMPLEMENTATION_DECISIONS.md` | Authoritative architecture blueprint and decisions lock. |
| `docs/MVP_ACCEPTANCE_CRITERIA.md` | 18 release-blocking and MVP-required testable criteria. |
| `docs/PHASE_0_RISK_REGISTER.md` | Prioritized risk matrix with mitigations and escalation triggers. |
| `docs/PHASE_1_READINESS.md` | Repository inventory, structure, environment variables, and Phase 1 sequence. |
| `docs/PHASE_0_TRACEABILITY_MATRIX.md` | End-to-end mapping from PRD/TRD requirements to acceptance criteria and tests. |
| `docs/PHASE_0_SUMMARY.md` | Concise executive summary of Phase 0 findings and decisions. |
| `docs/ADR/ADR-001-monorepo-structure.md` | Architecture Decision Record: Monorepo layout. |
| `docs/ADR/ADR-002-frontend-backend-separation.md` | Architecture Decision Record: React SPA + FastAPI boundary. |
| `docs/ADR/ADR-003-supabase-persistence-and-auth.md` | Architecture Decision Record: Supabase PostgreSQL and RLS. |
| `docs/ADR/ADR-004-ai-provider-orchestration-and-fallback.md` | Architecture Decision Record: Dual AI orchestration and fallback. |
| `docs/ADR/ADR-005-destination-provenance-and-curation.md` | Architecture Decision Record: Destination provenance and uncertainty. |
| `docs/ADR/ADR-006-deterministic-budget-and-route-uncertainty.md` | Architecture Decision Record: Budget arithmetic and route honesty. |
| `docs/ADR/ADR-007-guest-planning-and-trip-persistence.md` | Architecture Decision Record: Guest planning and trip persistence. |

---

## 9. Validation Performed

1. **Reconnaissance & Inventory:** Inspected all root files, confirming 5 pre-existing specification documents (total ~303 KB) and verifying zero existing code/test conflicts.
2. **Contradiction Resolution:** Audited and resolved discrepancies regarding guest planning, AI execution order, deterministic fallback eligibility, and translation storage.
3. **Traceability Verification:** Verified that every critical requirement in PRD Section 9 and TRD Section 17 maps directly to an acceptance criterion in `MVP_ACCEPTANCE_CRITERIA.md`.
4. **Secret Exposure Audit:** Verified that zero API keys, tokens, or passwords exist in any generated documentation.

---

## 10. Recommended Next Action

Formally approve the Phase 0 blueprint and authorize commencement of **Phase 1: Project Scaffolding, Package Setup, Core Schemas & Health Check Endpoints**.
