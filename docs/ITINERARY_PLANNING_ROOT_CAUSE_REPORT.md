# Root Cause Analysis: Itinerary Planning Inconsistencies & Map Disconnects

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-25  
**Severity:** Critical — Core Travel Planning Correctness  
**Status:** Diagnosed & Ready for Hardening  

---

## 1. Reproduction of the Reported Defects

### 1.1 The Belagavi Origin Jump & 508.9 km Leg
- **User Input:**
  - Origin: Bengaluru (`KA_BLR_U` / 12.9716° N, 77.5946° E)
  - Duration: 2 to 4 days
  - Categories: Heritage / Nature
  - Transport: Driving car
- **Observed Bug:**
  - Day 1 route begins at **Belagavi Fort & Kamal Basti** in Northern Karnataka (~500 km northwest of Bengaluru).
  - Next leg travels from Belagavi Fort to **Devanahalli Fort** (located in Bengaluru Rural, 508.9 km away).
  - Day 1 reported driving distance: ~508.9 km, taking 7–8 hours of behind-the-wheel driving.

---

## 2. Root Cause Analysis

### Root Cause 1: Statewide Unbounded Destination Feeding to AI
In `backend/app/services/ai/orchestrator.py`:
```python
filter_params = DestinationFilterParams(limit=100, offset=0)
candidates, total = self._repository.list_destinations(filter_params, published_only=True)
```
- The AI orchestrator queried the repository for 100 destinations across all 31 Karnataka districts with no geographic bounding to the user's origin hub or travel duration.
- Destinations from Belagavi, Bidar, Kalaburagi, and Mysuru were all sent indiscriminately in the prompt.
- The remote LLM (Gemini/Groq) matched the category "Heritage" and selected both `belagavi-fort` (Belagavi) and `devanahalli-fort` (Bengaluru Rural) in the same itinerary.

### Root Cause 2: AI Recommendations Bypassed Feasibility Validation
- `AIOrchestrator` accepted `grounded_items` directly from `parse_and_ground_plan()` with the LLM's hallucinated `day_number` and `order`.
- The engine did NOT run corridor validation, origin-proximity filtering, or 2-opt sequential routing on the AI's picks.
- The scheduler received `grounded_items` with Belagavi Fort as Day 1 stop 1, and Devanahalli Fort as Day 1 stop 2, blind to the 508 km chasm between them.

### Root Cause 3: Map Component Replaced Origin with First Attraction
In `frontend/src/features/itinerary/MapView.tsx`:
```tsx
const firstStop = validStops[0];
const lastStop = validStops[validStops.length - 1];

const originWaypoint: Waypoint = {
  name: firstStop.name,
  lat: firstStop.coordinates!.lat,
  lon: firstStop.coordinates!.lon,
  ...
};
```
- The map component extracted waypoints solely from `validStops` (which only contained sightseeing attractions, not the trip origin or hotel).
- `originWaypoint` was set to `validStops[0]`!
- When Day 1 had Belagavi Fort as its first stop, `MapView` drew the start marker ("S") on Belagavi Fort, completely omitting Bengaluru from the map.
- The route line was calculated directly from Belagavi Fort to Devanahalli Fort (508.9 km).

### Root Cause 4: Asynchronous Stale Route State on Day Switching
In `MapView.tsx`:
```tsx
fetchRoadDirections(directionsRequest)
  .then((res) => {
    if (isMounted) {
      setDirectionsData(res);
      setLoadingDirections(false);
    }
  })
```
- Switching between Day 1 and Day 2 fired separate asynchronous HTTP requests.
- `isMounted` did not check whether `directionsRequest.day_number === selectedDay`.
- When Day 1's route request took longer to resolve than Day 2's, Day 1's geometry overwrote Day 2's map display, displaying Day 1's route geometry and distances under Day 2's header.

### Root Cause 5: Multi-Day Disconnects (Teleportation)
- In `DeterministicScheduler.build_schedule`, each day loop reset previous coordinates.
- Day 2 did not depart from the Day 1 hotel coordinates, creating disconnected islands of travel.
- Return travel back to Bengaluru was omitted from the route waypoints.

---

## 3. Required Corrective Actions

1. **AI Pipeline Grounding & Pre-Filtering:**
   - Filter candidate destinations by the identified travel corridor *before* passing them to the AI provider.
   - For an origin of Bengaluru with 2–4 days, only supply destinations within the `southern_heritage_wildlife` corridor (or adjacent feasible corridors).
2. **Post-AI Deterministic Routing Optimization:**
   - Route all AI-recommended destinations through `RouteOptimizer.optimize_ai_selection()`.
   - Ensure Day 1 starts from the user's origin hub (Bengaluru), stops are ordered via 2-opt, and multi-day continuity is enforced.
3. **Map Waypoint Synchronization with True Origins & Stays:**
   - On Day 1, `originWaypoint` MUST be the trip origin (e.g. Bengaluru).
   - On Day $d+1$, `originWaypoint` MUST be the Day $d$ overnight hotel.
   - On the final day, `destWaypoint` MUST be the return location if `is_return_trip=True`.
4. **Race-Condition & Stale State Elimination in MapView:**
   - Use a deterministic `routeKey` combining `trip_id`, `selectedDay`, `stop_ids`, and `travel_mode`.
   - Ignore any asynchronous response whose `routeKey` does not match the currently active `routeKey`.
   - Clear `directionsData` immediately when `selectedDay` changes to prevent stale route flashing.
5. **Regression Test Suite:**
   - Test 1: Bengaluru origin preservation (Day 1 first leg starts at Bengaluru).
   - Test 2: Consecutive day continuity (Day 2 starts at Day 1 hotel).
   - Test 3: Reject 500 km sightseeing jumps (Belagavi to Devanahalli).
   - Test 4: Map & directions stop order agreement.
   - Test 5: Stale route cancellation on day switching.
