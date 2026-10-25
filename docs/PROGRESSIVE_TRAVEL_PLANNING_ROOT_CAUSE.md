# PROGRESSIVE TRAVEL PLANNING & MULTI-DAY CONTINUITY: ROOT CAUSE AUDIT & ARCHITECTURE

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Execution Mode:** Reproduce → Audit → Fix → Test → Verify  
**Status:** Audit Complete; Implementation & Verification In Progress  

---

## 1. Executive Summary

An exhaustive audit of the Namma Karnataka travel planning engine was performed to trace why generated itineraries exhibited geographic inconsistency, erratic jumps between distant districts (e.g., Bengaluru → Devanahalli → Hosapete → Mysuru), Day 2 resetting its origin to Bengaluru, missing accommodation transit legs, duplicated return trip transportation costs, and route map synchronization bugs.

The audit verified that the planner operated under an "independent bucket" mental model—selecting destinations and slicing them into days before considering physical travel feasibility—rather than planning a single continuous forward journey and dividing it into realistic days.

---

## 2. The 12 Audit Root Causes & Code Evidence

### 1. Why can destinations be selected without considering the user's starting location?
**Code Location:** `backend/app/services/clustering/corridors.py` (`identify_best_corridor`) and `backend/app/services/routing/optimizer.py` (`plan_coherent_itinerary`).
- **Evidence:** In `corridors.py` line 195, corridor scoring was computed as `(matches * 100.0) - (dist_to_corridor * 0.1)`. A user choosing Bengaluru as origin but selecting distant preferred districts (e.g., Belagavi or Vijayapura) resulted in the Northern Deccan or Belagavi corridor (500+ km away) being selected for Day 1, even for short 2-day trips, ignoring realistic driving time from Bengaluru.
- **Evidence 2:** In `RouteOptimizer.plan_coherent_itinerary`, candidates were filtered by corridor without checking if the first day's destinations were reachable from the origin within daily driving limits (<= 3-4 hours).
- **Evidence 3:** When filtering by category (e.g. `['heritage', 'nature']`), strict category filtering discarded related categories (e.g. `architecture` like Mysore Palace or Bangalore Palace, and `wildlife` like Bandipur or Ranganathittu), resulting in an exhausted candidate pool where later days had 0 destinations.

### 2. Why does a subsequent day appear to use Bengaluru as its starting location?
**Code Location:** `frontend/src/features/itinerary/ItineraryView.tsx`, `frontend/src/features/itinerary/MapView.tsx`, and `backend/app/services/scheduler.py`.
- **Evidence 1 (Frontend):** In `ItineraryView.tsx` line 791, `<MapView stops={plan.items} dayPlans={plan.days} language={language} originLabel={plan.origin_label || 'Bengaluru'} />` did **not** pass `activeDayFilter={activeDayTab === 0 ? null : activeDayTab}`. Therefore, when the user selected Day 2 in the Day Navigation bar, `MapView` remained in `selectedDay = null` (all-days mode). The subtitle in `MapView.tsx` (line 585) displayed `Complete journey from ${originLabel}: ...`, which rendered `Complete journey from Bengaluru: ...`.
- **Evidence 2 (Frontend):** In `MapView.tsx`, `selectedDay` state was initialized via `useState<number | null>(initialDayFilter)` but did not react to `activeDayFilter` prop updates. Moreover, line 167 fell back to `startWp.name = originLabel` (Bengaluru) if `prevPlan` lacked an accommodation stop.
- **Evidence 3 (Backend):** In `scheduler.py` (`build_schedule`), after visiting Devanahalli Fort on Day 1, `events_svc.get_events_near` matched an event 35 km away in central Bengaluru (`Bengaluru Karaga`), which pulled `prev_coords` back to central Bengaluru and scheduled dinner at Vidyarthi Bhavan (South Bengaluru) and accommodation in Bengaluru Urban. Consequently, Day 2 started back in Bengaluru Urban instead of Devanahalli!

### 3. Does the scheduler preserve the previous day's final physical location?
**Code Location:** `backend/app/services/scheduler.py` (`build_schedule` and `reschedule_itinerary`).
- **Evidence:** While `scheduler.py` set `current_loc_coords = stay_coords`, it did **not** create a travel leg to that accommodation (`distance_from_prev_km=None`, `transit_from_prev_minutes=None`). Furthermore, `RouteOptimizer` ran *before* `scheduler.py`, meaning candidate selection for Day 2 scored proximity relative to the last attraction of Day 1 (`day_candidates[-1].coordinates`) rather than the actual overnight accommodation.

### 4. Is the accommodation location used as the next day's starting location?
**Code Location:** `backend/app/schemas/planning.py` (`DayPlan`) and `backend/app/services/scheduler.py`.
- **Evidence:** `DayPlan` included `start_location_name` (string) but omitted authoritative `start_coordinates` and `end_coordinates` fields. Frontend consumers had to heuristically guess coordinates from stop collections or fall back to `originLabel` (Bengaluru).

### 5. Does the AI choose destination order without route validation?
**Code Location:** `backend/app/services/ai/orchestrator.py` and `backend/app/services/routing/optimizer.py`.
- **Evidence:** The LLM prompt requested raw destinations with day numbers and orders. `RouteOptimizer.optimize_ai_selection` attempted nearest-neighbor ordering within days, but did not enforce corridor feasibility or validate maximum daily road transit constraints across days.

### 6. Are daily schedules generated independently rather than as one continuous trip?
**Code Location:** `backend/app/services/routing/optimizer.py` (`plan_coherent_itinerary`).
- **Evidence:** Destination candidate selection iterated through day numbers 1 to $N$, greedily picking stops per day from `available_pool`. It did not construct a unified progression (e.g. Origin → Cluster 1 → Overnight 1 → Cluster 2 → Overnight 2 → Return Origin).

### 7. Are route distances and times calculated for the correct endpoints?
**Code Location:** `backend/app/services/scheduler.py` lines 645 and 1227.
- **Evidence:** Accommodation stops had `distance_from_prev_km=None` and `transit_from_prev_minutes=None`. The travel from the last attraction or dinner to the overnight hotel was omitted from `day_driving_km` and `total_transit_mins`.

### 8. Does the map use the selected day's actual start location?
**Code Location:** `frontend/src/features/itinerary/MapView.tsx` lines 154–176.
- **Evidence:** In single-day view, `MapView` tried to locate `prevStay = prevPlan?.stops.find(s => s.stop_type === 'accommodation')`. If `prevPlan` was missing, or if `stops` had not been scheduled, it defaulted to `originLabel` (Bengaluru) at `originCoords` [12.9716, 77.5946].

### 9. Does the route summary incorrectly reuse the original trip origin?
**Code Location:** `frontend/src/features/itinerary/MapView.tsx` line 584-585.
- **Evidence:** When `selectedDay === null`, the header subtitle rendered `Complete journey from ${originLabel}: ...`. Because `ItineraryView.tsx` never passed `activeDayFilter` down to `MapView`, clicking Day 2 in the timeline navigation left `MapView` showing the full-trip origin "Bengaluru".

### 10. Is the map rendering stale route geometry after day switching?
**Code Location:** `frontend/src/features/itinerary/MapView.tsx` lines 297–326.
- **Evidence:** Although `activeRouteKeyRef` was used, `MapView` did not listen to prop changes on `activeDayFilter`. Switching day tabs in `ItineraryView` did not update `selectedDay` in `MapView`.

### 11. Are the transportation costs calculated from the same route used by the scheduler?
**Code Location:** `backend/app/services/budget.py` lines 280–299 and `backend/app/services/transport_cost.py` line 76.
- **Evidence:** On the final day of the trip, `scheduler.py` (line 670) already added the return journey back to origin (`distance_from_prev_km = ret_est.estimated_road_distance_km`). Then, `budget.py` summed `cumulative_route_km` from all stops. Subsequently, `TransportCostCalculator.calculate_car_fuel` executed `billable_km = distance * 2.0 if is_return_trip else distance`, **doubling the entire circuit distance and charging return fuel twice!**

### 12. Do saved itineraries contain the actual daily starting points and endpoints?
**Code Location:** `backend/app/schemas/planning.py` and `backend/app/repositories/trips.py`.
- **Evidence:** Saved trips persist the serialized `PlanningRecommendationResponse`. Because `DayPlan` previously lacked structured `start_coordinates` and `end_coordinates`, reloaded trips relied on string names and had to reconstruct waypoint coordinates heuristically.

---

## 3. Systematic Architecture & Implementation Plan

### 3.1 Authoritative Data Model Extensions
1. **Extend `DayPlan` in `backend/app/schemas/planning.py` and `frontend/src/types/index.ts`:**
   - Add `start_coordinates: Coordinates | None = None`
   - Add `end_coordinates: Coordinates | None = None`
2. **Explicit Daily Continuity Rule:**
   - Day 1: `start_location_name = request.origin_label`, `start_coordinates = origin_coords`.
   - Day $d+1$: `start_location_name = day_d.accommodation_name or day_d.end_location_name`, `start_coordinates = day_d.accommodation_coordinates or day_d.end_coordinates`.

### 3.2 Progressive Exploration & Clustering Engine (`RouteOptimizer`)
1. **Journey-First Progression:**
   - Establish `origin_coords` as the anchor.
   - Expand category filtering to include allied categories (e.g., `heritage` includes `architecture` and `spiritual_cultural`; `nature` includes `wildlife`, `waterfall`, `hill_station`, `viewpoint`).
   - Grade candidates by progressive proximity to current location, penalizing backtracking.
   - Ensure the candidate pool provides enough stops for all $N$ days without running empty.
   - Enforce realistic travel corridors based on trip duration (e.g. 2-day trips cannot jump 500 km across the state).

### 3.3 Daily Schedule & Accommodation Integration (`DeterministicScheduler`)
1. **Local Accommodation Anchoring:**
   - Search accommodation strictly within $\le 30$ km of the day's final attraction, avoiding jumps back to origin.
   - Calculate authentic transit distance and driving minutes from final attraction/dinner to the accommodation stop.
   - Add this transit to `day_driving_km` and `transit_minutes`.
2. **Event Proximity Guard:**
   - Cultural events must only be scheduled if within $\le 25$ km of the current day's route.

### 3.4 Budget & Fuel Calculation Fix (`budget.py`)
1. **Single Return Trip Accounting:**
   - Because the schedule's `cumulative_route_km` includes all legs including the final return leg, pass the actual circuit distance to `TransportCostCalculator` without double-multiplying by 2.

### 3.5 Frontend Map & Directions Synchronization (`MapView.tsx` & `ItineraryView.tsx`)
1. **Pass & Sync `activeDayFilter`:**
   - Pass `activeDayFilter={activeDayTab === 0 ? null : activeDayTab}` from `ItineraryView.tsx` to `MapView`.
   - In `MapView.tsx`, sync `selectedDay` when `activeDayFilter` changes.
2. **Authoritative Daily Origin Header:**
   - When Day $d$ is selected, display:
     `Day ${selectedDay}: Starting from ${activeOriginName} • ${distance} km • ~${hours}h ${mins}m driving time`
   - Use `dayPlan.start_coordinates` for Day $d$'s start waypoint.
   - Fit map viewport to Day $d$'s specific route.
