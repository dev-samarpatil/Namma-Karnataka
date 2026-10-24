# Phase 5 Baseline Audit — Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)

**Audit Date:** 2026-10-24  
**Audit Author:** Principal Full-Stack Engineer & Travel-Planning Systems Architect  
**Target Milestone:** Phase 5 — Interactive Itinerary Editing & Individual Stop Regeneration  

---

## 1. Executive Summary

This document establishes the official repository baseline for Phase 5 implementation in **Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)**. The codebase was audited across backend planning services, scheduling algorithms, budget calculations, database persistence layers, and frontend React/TypeScript features.

The Phase 4 baseline was successfully reproduced:
- **Backend Tests:** 109 passing (`pytest backend/app/tests`, 0 failures, 10.68s)
- **Frontend Tests:** 28 passing (`vitest run --run`, 6 test suites, 0 failures, 3.39s)
- **Backend Linter:** Clean (`ruff check backend/app`, 0 errors)
- **Destination Data Quality:** 61 verified destinations across all 31 districts, 0 errors
- **Frontend Production Build:** Successful (`tsc -b && vite build`, 1.00s)

---

## 2. Existing Architecture & Contract Audit

### 2.1 Itinerary & Stop Models (`backend/app/schemas/planning.py`)
- **`ItineraryStop`:**
  - Identifiers: `stop_id: str` (e.g. `stop-d1-breakfast`, `stop-d1-mysore-palace`, `stop-d1-stay`).
  - Destination reference: `destination_id: str | None`.
  - Type: `StopType` (`attraction`, `activity`, `meal`, `accommodation`, `transport`, `break`).
  - Timing: `start_time: str`, `end_time: str`, `duration_minutes: int`.
  - Spatial: `coordinates: Coordinates | None`, `distance_from_prev_km: float | None`, `transit_from_prev_minutes: int | None`, `transit_method: str | None`.
  - Monetary: `cost_min_inr: float | None`, `cost_max_inr: float | None`, `cost_status: CostStatus` (`verified`, `estimated`, `user_provided`, `unknown`, `not_applicable`).
  - Metadata: `source_reference: str | None`, `rationale: str | None`.
- **`DayPlan`:**
  - `day_number: int`, `date: str | None`, `theme: str`, `stops: list[ItineraryStop]`, `total_duration_minutes: int`, `transit_minutes: int`, `meals_covered: list[str]`, `daily_cost_min_inr: float | None`, `daily_cost_max_inr: float | None`, `warnings: list[str]`.
- **`PlanningRecommendationResponse`:**
  - `items: list[RecommendedDestination]`: High-level destination cards.
  - `days: list[DayPlan]`: Chronological timeline stops.
  - `budget_breakdown: CompleteBudgetBreakdown`: Detailed category budget breakdown.

### 2.2 Scheduler Architecture (`backend/app/services/scheduler.py`)
- `DeterministicScheduler.build_schedule(request, destinations)`:
  - Takes `PlanningRequest` and ordered list of `RecommendedDestination`.
  - Schedules Day 1..N starting at 08:30 AM.
  - Inserts traditional breakfast (08:30 - 09:15).
  - Inserts attractions in sequential order, computing terrain-adjusted transit from the preceding coordinates via `RoutingService.estimate_travel(...)`.
  - Inserts verified or regional lunch around 13:00.
  - Inserts dinner around 20:00 (querying nearby verified restaurants from `PlacesService`).
  - For multi-day trips, inserts verified or estimated overnight accommodation near dinner coordinates.
  - Computes `daily_cost_min_inr` and `daily_cost_max_inr`.

### 2.3 Budget Architecture (`backend/app/services/budget.py`)
- `BudgetCalculator.calculate_budget(request, days, destinations)`:
  - Takes `request`, `days`, and `destinations`.
  - Computes line items across:
    1. Attraction entry fees (verified vs. estimated vs. unknown).
    2. Food & dining (3 meals/day scaled to party size & budget profile).
    3. Accommodations (rooms scaled to `ceil(travelers / 2)` and nights).
    4. Transportation via `TransportCostCalculator` (supporting `driving_car`, `cab_taxi`, `public_transit`, `mixed`).
    5. Contingency buffer (10% standard/comfort, 8% budget).
  - Maintains strict distinction between verified and estimated subtotals.

### 2.4 Persistence Model (`backend/app/repositories/trips.py` & Frontend)
- **Guest Trips:** Persisted in browser `localStorage['nk_saved_trips']` as `SavedTrip` records (`id`, `title`, `saved_at`, `request`, `plan`).
- **Cloud Trips:**
  - `POST /api/v1/trips`: Inserts trip record into Supabase PostgreSQL `trips` table and snapshot into `itinerary_snapshots` table.
  - `GET /api/v1/trips`: Returns user trips with strict RLS (`user_id` enforced from auth token).
  - `GET /api/v1/trips/{id}`: Returns trip detail with multi-tenant check.
  - `DELETE /api/v1/trips/{id}`: Deletes user trip.
  - **Gap Identified:** No `PUT /api/v1/trips/{id}` exists yet in `trips.py` to update an existing cloud trip.

---

## 3. Gaps Identified for Phase 5

1. **Stop Model Extensions:**
   - Need fields for `notes: str | None`, `user_modified: bool = False`, and `locked: bool = False` on `ItineraryStop` to distinguish system-generated defaults from user customizations.
2. **Deterministic Rescheduling Functionality:**
   - Need dedicated recalculation/rescheduling methods on `DeterministicScheduler` to reschedule a day or entire itinerary after stops are modified, added, removed, or reordered without losing user modifications.
3. **Stop Regeneration & Grounded Alternatives:**
   - Need a service method `get_stop_alternatives(...)` that queries the verified 61-destination catalogue, excludes currently used destinations, matches district/category/pace, computes distance/timing differences, and proposes valid alternatives.
4. **Backend API Endpoints:**
   - Need `POST /api/v1/planning/regenerate-stop` (or `/alternatives`) to get grounded candidate stops.
   - Need `POST /api/v1/planning/recalculate` to validate an edited itinerary and recalculate schedule + budget deterministically.
   - Need `PUT /api/v1/trips/{trip_id}` in `backend/app/api/v1/trips.py` and `TripRepository` for authenticated trip updates with RLS protection.
5. **Frontend Interactive Controls & Modals:**
   - In `ItineraryView.tsx`:
     - Stop actions: Edit (duration, start time, notes), Move Up, Move Down, Regenerate/Replace, Remove.
     - Day actions: "+ Add Destination" modal to pick from catalog, "Regenerate Day" option.
     - Edit Stop dialog with input validation, cancellation, and save semantics.
     - Alternative Selection dialog showing differences in travel time, entry fees, and categories.
     - Bilingual Kannada & English translations for all new controls and messages.
6. **State & Synchronization:**
   - Update `App.tsx` and `SavedTripsView.tsx` so edits immediately recalculate schedule/budget, update active plan, and sync to `localStorage` or cloud depending on auth state.

---

## 4. Phase 5 Architectural Design Decisions

1. **Deterministic Single Source of Truth:**
   All timing, travel durations, and budget recalculations MUST run through `DeterministicScheduler`, `RoutingService`, `TransportCostCalculator`, and `BudgetCalculator`. Frontend never computes its own ad-hoc budget or travel times.
2. **Zero Destination Fabrication:**
   Every alternative or newly added stop must match an existing verified record in `destinations.json` (61 destinations) or verified places.
3. **Preserve User Modifications:**
   When a day is rescheduled due to duration or timing edits, unmodified stops retain their identities, notes, and locked attributes.
4. **Backward Compatibility:**
   All new fields on `ItineraryStop` (`notes`, `user_modified`, `locked`) will have safe defaults (`None`, `False`, `False`), ensuring existing saved trips load seamlessly.
5. **Strict Auth & RLS:**
   Cloud updates derive `user_id` strictly from verified JWT tokens, preventing any privilege escalation or cross-tenant modification.

---

## 5. Baseline Test Execution Results

```text
Backend:
109 passed, 5 warnings in 10.68s (pytest)
All checks passed! (ruff check)

Frontend:
Test Files: 6 passed (6)
Tests:      28 passed (28)
Duration:   3.39s (vitest)

Data Audit:
Total: 61 destinations across 31 districts. Issues: 0

Production Build:
✓ built in 1.00s
```
