# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## PHASE 1 BASELINE AUDIT & IMPLEMENTATION GAP ANALYSIS

**Document ID:** NK-AUDIT-P1-BASELINE-2026-10-23  
**Date:** 2026-10-23  
**Repository:** `dev-samarpatil/Namma-Karnataka`  
**Git Branch:** `main`  
**Git Commit:** `5478063`  
**Auditor:** Principal Full-Stack Engineer, AI Systems Architect & QA Specialist  

---

## 1. EXECUTIVE SUMMARY

This baseline audit evaluates the existing Namma Karnataka application prior to implementing Phase 1: **Destination Data Quality, Complete AI Travel Itinerary Engine & Frontend Integration**.

While foundational architecture (FastAPI, React 18, Vite, Supabase PostGIS, GoTrue Auth, native PostgreSQL RLS, dual AI adapters, and deterministic fallback) is fully operational with 99 passing automated tests, the generated travel itineraries are currently **sparse and attraction-only**:
1. An itinerary currently contains only a list of destination cards assigned to a day and sequence order (e.g., a 2-day trip contains 2 or 4 attractions).
2. It lacks the essential components of a realistic travel plan: **sightseeing vs. activity distinction, breakfast/lunch/dinner meal stops, overnight accommodation, inter-stop transit time estimates, breaks/buffers, chronological time slots (start/end times), and feasibility validation**.
3. Budget calculations currently sum only entry fees (min/max), ignoring transport, lodging, meals, activities, and contingency, with no explicit cost status indicators (`verified`, `estimated`, `unknown`, `user_provided`).
4. The destination catalogue seed has 12 high-quality destinations across 8 districts, but lacks an automated data quality and coverage auditing tool that generates structured data-quality metrics.

---

## 2. EXISTING FEATURE INVENTORY & VERIFICATION STATUS

| Capability / Module | Status | File Paths | Evidence & Notes |
| :--- | :--- | :--- | :--- |
| **Monorepo & Health Probes** | `VERIFIED` | `backend/app/main.py`<br>`backend/app/api/v1/health.py` | `/health` & `/ready` endpoints operational; 4/4 pytest tests pass. |
| **Destination Explorer & Search** | `VERIFIED` | `frontend/src/features/destinations/`<br>`backend/app/api/v1/destinations.py` | Search by query, district, category, and offbeat flag works with bilingual support. |
| **Bilingual Language Toggle** | `VERIFIED` | `frontend/src/lib/i18n.ts`<br>`frontend/src/App.tsx` | Instant EN/KN switching with input retention verified in browser session. |
| **Trip Planning Form** | `VERIFIED` | `frontend/src/features/planner/TripPlannerForm.tsx` | Captures origin, duration (1–7), group size, pace, categories, and districts. |
| **AI Orchestration & Fallback** | `VERIFIED (SPARSE)` | `backend/app/services/ai/orchestrator.py`<br>`backend/app/services/ai/fallback.py` | Groq -> Gemini -> Fallback works, but only generates destination cards. |
| **Detailed Daily Schedule** | `MISSING` | `backend/app/schemas/planning.py`<br>`frontend/src/features/itinerary/` | Missing start/end times, activity types, meal slots, and transit buffers. |
| **Meal & Lodging Organization** | `MISSING` | `backend/app/services/ai/` | No breakfast, lunch, dinner, or overnight stay entries in generated plans. |
| **Complete Budget Estimation** | `PARTIAL` | `frontend/src/features/itinerary/BudgetSummary.tsx` | Only entry fees are aggregated; transport, food, lodging, and unknown fees absent. |
| **Schedule Feasibility Validator**| `MISSING` | N/A | No validation for overlapping times, day length overruns, or pacing constraints. |
| **SVG Route Map & List View** | `VERIFIED` | `frontend/src/features/itinerary/MapView.tsx` | Mathematical SVG coordinate projection with straight-line disclaimer banners. |
| **Guest & Cloud Saved Trips** | `VERIFIED` | `frontend/src/features/saved-trips/`<br>`backend/app/api/v1/trips.py` | Guest `localStorage` + authenticated Supabase PostgREST with native RLS. |
| **Automated Test Baseline** | `VERIFIED` | `backend/app/tests/`<br>`frontend/src/**/*.test.tsx` | 82 Pytest + 17 Vitest passing; Ruff/ESLint/TSC clean; production build 585ms. |

---

## 3. EXISTING API ROUTES & DATABASE OBJECTS

### 3.1. API Endpoints
- `GET /health`: Liveness probe.
- `GET /ready`: Readiness probe (checks database and settings).
- `GET /api/v1/destinations`: List destinations with pagination, category, district, search, and language filters.
- `GET /api/v1/destinations/{id}`: Detailed destination view with coordinates, sources, and translations.
- `POST /api/v1/planning/recommendations`: AI and fallback recommendation engine.
- `GET /api/v1/trips`: List user's saved trips (authenticated).
- `POST /api/v1/trips`: Save trip snapshot (authenticated).
- `GET /api/v1/trips/{id}`: Retrieve trip snapshot with RLS enforcement.
- `DELETE /api/v1/trips/{id}`: Delete trip with RLS enforcement.

### 3.2. Database Tables (Supabase PostgreSQL + PostGIS)
- `public.districts`: 31 official Karnataka districts.
- `public.destinations`: 12 verified pilot destinations with PostGIS point geometry.
- `public.destination_translations`: 24 bilingual name/summary/description records (EN and KN).
- `public.destination_sources`: 24 provenance source citations.
- `public.trips`: User-saved trips with foreign key to `auth.users` and RLS policy (`auth.uid() = user_id`).
- `public.itinerary_snapshots`: Immutable JSONB itinerary snapshots linked to `trips`.

---

## 4. CURRENT BEHAVIOR & CONFIRMED IMPLEMENTATION GAPS

### Gap 1: Sparse Itineraries (Attractions Only)
- **Current Behavior:** The AI and fallback engines only emit `RecommendedDestination` records (attraction ID, day number, order, rationale).
- **Required Behavior:** Every day must be structured with a feasible chronological timeline: Morning activity/sightseeing, Lunch break, Afternoon sightseeing, Evening activity/leisure, Dinner, and Accommodation for multi-day trips.

### Gap 2: Missing Stop Types & Metadata
- **Current Behavior:** Only destination IDs are represented.
- **Required Behavior:** Stop types must include:
  1. `attraction` (Major heritage/natural sight)
  2. `activity` (Trek, boat ride, temple walk, shopping)
  3. `meal` (Breakfast, lunch, dinner, tea break)
  4. `accommodation` (Overnight hotel/resort/homestay placeholder)
  5. `transport` (Intercity or local travel segment)
  6. `break` (Rest stop, transition buffer)

### Gap 3: Elementary Budget Calculation
- **Current Behavior:** `BudgetSummary.tsx` only sums `entry_fee_min_inr` and `entry_fee_max_inr`.
- **Required Behavior:** Complete budget categories:
  - Intercity Transport
  - Local Transport
  - Accommodation (nights $\times$ rate $\times$ rooms)
  - Meals (Breakfast, Lunch, Dinner per person $\times$ days)
  - Attraction Entry Fees
  - Activities
  - Contingency / Buffer
  - Explicit Cost Statuses: `verified`, `estimated`, `unknown`, `user_provided`, `not_applicable`.
  - Missing costs must remain `null` and explicitly flagged as unknown (never silently ₹0).

### Gap 4: Lack of Schedule Feasibility & Constraint Validation
- **Current Behavior:** Stops are ordered by sequence numbers (1, 2, 3...) with no start/end timestamps or duration feasibility checks.
- **Required Behavior:** Dedicated deterministic scheduling engine that:
  - Enforces feasible day windows (e.g. 08:30 to 20:30).
  - Allocates realistic durations (e.g. 90 mins for Mysore Palace, 60 mins for Chamundi Hill).
  - Adds transit buffers between stops.
  - Generates structured warnings when days are overloaded or opening hours conflict.

### Gap 5: Destination Data Quality & Coverage Metrics
- **Current Behavior:** `validate_seed.py` validates schema structure, but there is no dedicated coverage report analyzing district representation, category distribution, duration completeness, or fee status breakdown.
- **Required Behavior:** Automated quality analyzer that computes and outputs concrete data quality metrics to `docs/PHASE_1_DESTINATION_DATA_QUALITY.md`.

---

## 5. BASELINE TEST & QUALITY VERIFICATION EXECUTION

All existing quality checks were run before modifications:

1. **Backend Automated Tests (Pytest):**  
   Command: `pytest`  
   Result: **82 passed**, 0 failed (9.93s).
2. **Frontend Automated Tests (Vitest):**  
   Command: `npm test -- --run`  
   Result: **17 passed**, 0 failed (2.42s).
3. **Backend Linter & Formatter (Ruff):**  
   Command: `python -m ruff check backend/app; python -m ruff format --check backend/app`  
   Result: **All checks passed! 47 files clean.**
4. **Frontend Linter (ESLint):**  
   Command: `npm run lint`  
   Result: **0 errors, 0 warnings.**
5. **TypeScript Compilation (TSC):**  
   Command: `npx tsc --noEmit`  
   Result: **Exit code 0. Zero type errors.**
6. **Frontend Production Build (Vite):**  
   Command: `npm run build`  
   Result: **Success in 585ms.**

---

## 6. MAPPING TO ORIGINAL ROADMAP

This Phase 1 implementation directly enriches and completes the requirements of:
- **Canonical TRD Phase 3:** *Trip Preference Planning Form & Itinerary Data Contract*
- **Canonical TRD Phase 4:** *AI Providers, Adapters & Orchestrator*
- **Canonical TRD Phase 5:** *Budget Calculation Engine, Route Distance & Interactive Maps*
- **Extended Modular Phases 4, 5, 7, 8 & 9.**

It prepares the application for human validation in **TRD Phase 9 / Modular Phase 13 (Controlled Pilot)** by providing rich, realistic, actionable travel itineraries.
