# Phase 5 Itinerary Editing Design — Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)

**Author:** Principal Full-Stack Engineer & Travel-Planning Systems Architect  
**Status:** Canonical Implementation Contract  
**Phase:** Phase 5 — Interactive Itinerary Editing & Individual Stop Regeneration  

---

## 1. Overview & Objectives

In Phases 1–4, Namma Karnataka implemented destination discovery, dining and lodging curation, deterministic scheduling, public transit corridors, and transparent budget calculation. However, if a user wanted to adjust a single attraction, add another stop, or swap out a destination, the entire trip had to be re-planned from scratch.

Phase 5 introduces **Interactive Itinerary Editing and Individual Stop Regeneration**:
1. **Stop Editing:** Users can modify visit duration, scheduled start time, and user notes on individual stops.
2. **Add & Remove Stops:** Users can add verified attractions from the 61-destination catalogue and remove unwanted stops without deleting or corrupting global catalogue records.
3. **Stop Reordering:** Users can reorder attraction stops within a day with immediate recalculation of travel durations, arrival timings, and downstream schedules.
4. **Individual Stop Regeneration:** Users can request alternative candidates for a single stop. Candidates are grounded strictly in the 61 verified destinations, filtered by proximity, category, and budget impact.
5. **Day Regeneration:** Users can regenerate an entire day's attractions while preserving other days, protected/locked stops, and user preferences.
6. **Deterministic Recalculation:** Every edit runs through `DeterministicScheduler`, `RoutingService`, `TransportCostCalculator`, and `BudgetCalculator` to maintain arithmetic consistency.
7. **Bilingual UI & Persistence:** Seamless guest storage (`localStorage`) and authenticated cloud persistence (`PUT /api/v1/trips/{trip_id}`) with English and Kannada localization.

---

## 2. Stop Data Model & Lifecycle

### 2.1 Schema Extensions (`ItineraryStop`)

```python
class ItineraryStop(StrictSchema):
    stop_id: str = Field(..., description="Unique stop identifier")
    destination_id: str | None = Field(None, description="Catalog destination ID if applicable")
    stop_type: StopType = Field(..., description="attraction, meal, accommodation, transport, break")
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    start_time: str = Field(..., description="Scheduled start time 'HH:MM'")
    end_time: str = Field(..., description="Scheduled end time 'HH:MM'")
    duration_minutes: int = Field(..., ge=1, le=720)
    coordinates: Coordinates | None = None
    distance_from_prev_km: float | None = None
    transit_from_prev_minutes: int | None = None
    transit_method: str | None = None
    cost_min_inr: float | None = None
    cost_max_inr: float | None = None
    currency: str = "INR"
    cost_status: CostStatus = CostStatus.VERIFIED
    source_reference: str | None = None
    rationale: str | None = None
    # Phase 5 Extensions:
    notes: str | None = Field(None, max_length=500, description="User-provided notes or custom details")
    user_modified: bool = Field(False, description="Flag indicating user customization")
    locked: bool = Field(False, description="Flag preventing automated reordering or regeneration")
```

### 2.2 Stop Mutability Matrix

| Stop Type | Editable Duration | Editable Start Time | Editable Notes | Can Reorder | Can Regenerate | Can Delete |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Attraction** | Yes (15–360m) | Yes | Yes (≤500 chars) | Yes | Yes (grounded) | Yes |
| **Activity** | Yes (15–360m) | Yes | Yes | Yes | Yes (grounded) | Yes |
| **Meal (Breakfast/Lunch/Dinner)** | Fixed (45/60/75m) | Slid by scheduler | Yes | Contextual | No (places-based) | Optional |
| **Accommodation** | Fixed | Evening Check-in | Yes | Anchored to end | No (places-based) | No (auto-placed) |
| **Public Transit / Transfer** | Fixed (published) | Fixed | Read-only | Anchored | No | No |

---

## 3. Editing Operations & Workflows

### 3.1 Edit Stop (Duration / Start Time / Notes)
- Changing `duration_minutes` shifts the stop's `end_time = start_time + duration`.
- Downstream stops on the same day are rescheduled: transit buffers are preserved and subsequent stops start after arrival.
- If duration expansion pushes sightseeing past 19:30, a schedule warning is surfaced: `"Day schedule exceeds recommended 19:30 evening window."`

### 3.2 Add Stop
- User chooses a day and selects a verified destination from the catalogue modal.
- Destination is inserted into the day's attraction list (at designated index or appended before evening dinner).
- The day's schedule is recalculated: road transit from preceding coordinates and to succeeding coordinates is recomputed via `RoutingService.estimate_travel(...)`.
- `BudgetCalculator` incorporates the new destination's verified or unknown entry fee and updated road fuel/cab/transit mileage.

### 3.3 Remove Stop
- Stop is removed from the day's stop list.
- Preceding and following stops are connected directly; transit between them is recomputed.
- Attraction entry fee and related transit costs are deducted from the budget.
- Catalogue records in the global database remain completely untouched.

### 3.4 Reorder Stops
- User moves a stop up or down, or submits a new sequence order of stop IDs for a given day.
- `DeterministicScheduler` re-links coordinates in the new sequence, recalculates road distances and driving times, shifts arrival times, and re-anchors lunch/dinner meal windows.

---

## 4. API Endpoints Contract

### 4.1 `POST /api/v1/planning/recalculate`
- **Purpose:** Deterministically recalculates timing, transit, meals, and complete budget breakdown after user edits.
- **Request Body:** `ItineraryRecalculateRequest` (`request: PlanningRequest`, `days: list[DayPlan]`).
- **Response:** `PlanningRecommendationResponse` (fully updated `days`, `items`, `budget_breakdown`, and `warnings`).

### 4.2 `POST /api/v1/planning/regenerate-stop`
- **Purpose:** Proposes verified alternative destinations to replace a specific stop.
- **Request Body:** `StopRegenerateRequest` (`day_number: int`, `stop_id: str`, `preferred_category?: str`, `request: PlanningRequest`, `current_plan: PlanningRecommendationResponse`).
- **Response:** `StopRegenerateResponse` with candidate list detailing name, category, district, visit duration, entry fee status, and travel/budget delta.

### 4.3 `POST /api/v1/planning/regenerate-day`
- **Purpose:** Re-plans attractions for a specific day while keeping other days and locked stops intact.
- **Request Body:** `DayRegenerateRequest` (`day_number: int`, `request: PlanningRequest`, `current_plan: PlanningRecommendationResponse`).
- **Response:** `DayPlan` (newly generated day schedule) + updated `PlanningRecommendationResponse`.

### 4.4 `PUT /api/v1/trips/{trip_id}`
- **Purpose:** Updates an existing saved trip under the authenticated user's account.
- **Security:** Derives `user_id` strictly from JWT bearer token; verifies ownership; rejects cross-tenant edits with HTTP 404; updates PostgreSQL `trips` record and `itinerary_snapshots`.
- **Request Body:** `UpdateTripRequest` (`title?: str`, `itinerary: PlanningRecommendationResponse`).
- **Response:** `SavedTripDetail`.

---

## 5. Security, Multi-Tenancy & Integrity

1. **Authentication Enforcement:** All `/trips` endpoints require valid JWT authentication. Unauthenticated requests are rejected with HTTP 401.
2. **Strict Multi-Tenant Isolation:** When accessing `/trips/{trip_id}`, the repository queries `where id = :trip_id and user_id = :authenticated_user_id`. If `user_id` does not match, a 404 is returned.
3. **Data Integrity Guarantee:** Zero synthetic or AI-hallucinated destination IDs are accepted. Any stop addition or replacement verifies destination existence in `DestinationRepository`.
4. **Idempotence & Retries:** Updates are atomic snapshots. Stale updates or network retries do not duplicate stops or corrupt saved state.
