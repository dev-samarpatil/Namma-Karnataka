# Namma Karnataka — Itinerary Planning Logic Refinement Report

**Environment:** Google Antigravity IDE  
**System:** Namma Karnataka Full-Stack Travel Platform  
**Target:** Global Trip-Wide Destination Uniqueness, Geographic Routing, Day Regeneration, and Duplicate Prevention  
**Date:** November 3, 2026  

---

## 1. Executive Summary

During multi-day itinerary generation, attraction duplication was observed across different days (and occasionally within the same day), such as Mysore Palace appearing on Day 1 and again on Day 3 in the itinerary carousel.

Rather than applying a superficial frontend patch that simply conceals duplicate cards, an exhaustive, engine-level overhaul was conducted across the data repositories, AI orchestrator, route optimizer, deterministic scheduler, budget optimizer, and frontend state management.

The system now enforces **strict trip-wide canonical uniqueness**:
1. **Canonical Identity Resolution:** All destination references across UUIDs, provider-specific prefixes (`kstdc-*`, `asi-*`), aliases, and spelling variants resolve to a single canonical identity.
2. **Geodesic Coordinate Proximity Deduplication:** Any attraction within 500 meters of an already visited location in the same district is recognized as the same physical attraction and deduplicated.
3. **Trip-Wide Validation & Repair:** Every generated itinerary passes through `validate_trip_destination_uniqueness(..., repair=True)`, guaranteeing that no attraction is scheduled more than once in a trip.
4. **Day Regeneration Protection:** When regenerating an individual day, all attractions scheduled on any other day (along with locked stops) are strictly filtered out of the candidate pool.
5. **Intelligent Manual Stop Addition:** When a user attempts to add an attraction already scheduled elsewhere in the trip, the system prevents duplicate insertion and offers to move the destination to the target day.
6. **Honest Sparse Catalogue Pacing:** When available unique candidates in a corridor are exhausted, the engine does not fabricate stops or repeat visits; it generates honest travel warnings and paces the schedule realistically.

---

## 2. Root Cause Analysis

Investigation revealed two primary mechanisms causing destination duplication:

### Mechanism 1: Disparate Identifiers in External Discovery Providers
- The curated repository contains Mysuru Palace under UUID `11111111-1111-4111-8111-111111111101` (slug: `mysore-palace`, name: `Mysuru Palace (Amba Vilas)`).
- The dynamic `OfficialTourismProvider` (KSTDC) surfaced Mysuru Palace under `kstdc-mysore-palace` (slug: `mysore-palace-official`, name: `Mysore Palace (Amba Vilas)`).
- In `AIOrchestrator.recommend_itinerary`, the candidate pool augmentation step checked:
  ```python
  if d.id not in existing_ids and d.slug not in existing_slugs:
      candidates.append(...)
  ```
  Because both `id` and `slug` differed, both records simultaneously entered the planning candidate pool. The AI model and the route optimizer treated them as two distinct attractions, scheduling one on Day 1 and the other on Day 3.

### Mechanism 2: Day-Scoped Selection Without Trip-Wide Canonical Memory
- In `RouteOptimizer.plan_coherent_itinerary` and `optimize_ai_selection`, candidates were popped from day batches without tracking global canonical IDs or coordinate proximity across previous days.
- In `DeterministicScheduler.regenerate_day` and `get_stop_alternatives`, exclusion sets checked raw `destination_id` strings against other days rather than canonical identities, allowing semantic aliases or nearby sister entries to be introduced.

---

## 3. Architecture & Key Files Modified

| Component | File | Responsibilities & Enhancements |
| :--- | :--- | :--- |
| **Uniqueness Engine** | `backend/app/services/destination_uniqueness.py` *(New)* | Authoritative canonical ID and slug dictionaries, geodesic haversine proximity ($\le 500\text{m}$), name stem normalizer, global trip validator `validate_trip_destination_uniqueness`, and candidate pool uniqueness filter. |
| **Repository Mappings** | `backend/app/repositories/destinations.py` | Expanded canonical ID and slug maps for all KSTDC, ASI, and regional naming variants. Graceful fallback on network/migration errors. |
| **AI Orchestrator** | `backend/app/services/ai/orchestrator.py` | Candidate augmentation now checks canonical ID and sub-500m proximity before adding discovered spots. All AI and fallback returns pass through trip-wide validation and auto-repair. |
| **Route Optimizer** | `backend/app/services/routing/optimizer.py` | Trip-wide canonical tracking (`visited_canon_ids`, `visited_coords`). Deduplicates `available_pool` and `ai_items`. Implements honest sparse catalog handling without repetition. |
| **Scheduler** | `backend/app/services/scheduler.py` | `reschedule_itinerary` enforces trip-wide canonical uniqueness and drops accidental subsequent duplicates. `regenerate_day` and `get_stop_alternatives` filter candidates using canonical exclusion. |
| **Budget Optimizer** | `backend/app/services/budget_optimizer.py` | Budget substitute selection checks canonical IDs and proximity. Sets `substitute.day_number = d.day_number` and handles null min fees safely. |
| **Frontend Itinerary View** | `frontend/src/features/itinerary/ItineraryView.tsx` | Carousel `activeDaySightseeingStops` applies canonical deduplication. `handleAddDestinationToDay` detects duplicates across all days, alerts the user, and presents a dedicated Move Duplicate Destination confirmation dialog. |
| **Test Suite** | `backend/app/tests/test_destination_uniqueness.py` *(New)* | Automated verification covering Tests A through F: multi-day uniqueness, day regeneration, alias deduplication, deterministic repair, sparse catalog handling, and candidate pool filtering. |

---

## 4. Destination Uniqueness Strategy

### 4.1 Canonical Identity Resolution
The engine resolves any destination representation to its canonical identity using a 4-tier pipeline:
1. **Static Dictionary Lookup:** Cross-references `GLOBAL_CANONICAL_ID_MAPPINGS` and `GLOBAL_CANONICAL_SLUG_MAPPINGS`.
2. **Repository Entity Match:** Queries the verified 61+ destination repository by ID, slug, and translation aliases.
3. **Geodesic Coordinate Proximity:**
   $$\text{dist}(p_1, p_2) = 2R \arcsin \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)} \le 500\text{ meters}$$
   If a discovered attraction has coordinates within 500 meters of a catalog destination in the same district, it is resolved to that destination's canonical ID.
4. **Normalized Name Stem Matching:** Removes parentheticals, transliteration differences (Mysuru/Mysore, Belagavi/Belgaum, Bengaluru/Bangalore), and stop words (`palace`, `temple`, `fort`, `falls`, `complex`).

### 4.2 Global Trip Validation & Repair
The function `validate_trip_destination_uniqueness(itinerary, repair=True, request=None)` audits all days of a trip:
- Scans every stop where `stop_type` is `attraction` or `activity`.
- Flags any repeated canonical ID across any days or on the same day.
- If `repair=True`:
  - Retains the **first** scheduled visit.
  - Purges subsequent duplicate stops.
  - Deterministically reschedules the itinerary through `DeterministicScheduler.reschedule_itinerary` and recalculates the budget.
  - Adds an informative warning: `"Duplicate destination visits were automatically consolidated to preserve itinerary variety."`

---

## 5. Day Regeneration & Manual Addition Workflow

### 5.1 Day Regeneration
When a user regenerates Day $N$:
1. All stops on all days $d \neq N$ are collected.
2. All locked stops on Day $N$ are collected.
3. `filter_candidate_pool_for_uniqueness(all_dests, stops_to_exclude)` purges all used canonical IDs and coordinates within 500m.
4. The remaining candidate pool is prioritized by the day's dominant district and category alignment.
5. Day $N$ is rescheduled cleanly without any collision with other days.

### 5.2 Manual Addition & Move Dialog
When the user clicks **+ Add Destination** on Day $N$:
1. The destination is checked against all scheduled stops on all days.
2. **Case A (Already on Day $N$):** Displays an action banner:
   *`"<Destination Name>" is already scheduled on Day N. Each destination can only be visited once per trip.`*
3. **Case B (Scheduled on Day $M \neq N$):** Displays an interactive confirmation modal:
   - Header: *⚠️ Destination Already Scheduled / ತಾಣ ಈಗಾಗಲೇ ನಿಗದಿಯಾಗಿದೆ*
   - Message: *`"<Destination Name>" is already scheduled on Day M. Would you like to move it to Day N instead?`*
   - Actions: `[Cancel]` or `[Move to Day N]`.
   - On confirming move, the stop is seamlessly transferred from Day $M$ to Day $N$, and the entire trip is rescheduled and recalculated.

---

## 6. Automated Test Verification Results

### Backend Test Suite (`backend/app/tests/test_destination_uniqueness.py`)
```text
backend/app/tests/test_destination_uniqueness.py::test_canonical_alias_and_proximity_deduplication PASSED
backend/app/tests/test_destination_uniqueness.py::test_validate_and_repair_trip_destination_uniqueness PASSED
backend/app/tests/test_destination_uniqueness.py::test_multi_day_itinerary_generation_uniqueness PASSED
backend/app/tests/test_destination_uniqueness.py::test_day_regeneration_excludes_other_days PASSED
backend/app/tests/test_destination_uniqueness.py::test_sparse_catalogue_honest_handling PASSED
backend/app/tests/test_destination_uniqueness.py::test_filter_candidate_pool_for_uniqueness PASSED

============================= 6 passed in 24.92s =============================
```

### Full Frontend Test Suite (`vitest run --run`)
```text
Test Files  23 passed (23)
Tests       146 passed (146)
Duration    34.62s
```

### Production Build (`npm run build`)
```text
✓ 2501 modules transformed.
dist/index.html                   1.17 kB │ gzip:   0.63 kB
dist/assets/index-rtJNT5ak.css   91.35 kB │ gzip:  19.56 kB
dist/assets/index-iO7bKmxZ.js   908.75 kB │ gzip: 259.32 kB
✓ built in 6.02s
```

---

## 7. Before and After Comparison

| Scenario | Before Refinement | After Refinement |
| :--- | :--- | :--- |
| **Multi-Day Planning** | Mysore Palace appeared on Day 1 and again on Day 3 under alias `kstdc-mysore-palace`. | Mysuru Palace appears on Day 1; Day 3 schedules St Philomena's Cathedral or Chamundi Hills. 100% unique attractions. |
| **Nearby Sister Landmarks** | Two entries within 200m of the same monument complex both appeared in the same day. | Sub-500m geodesic proximity detection consolidates nearby duplicates into a single visit. |
| **Day Regeneration** | Regenerating Day 3 could pick an attraction already visited on Day 1. | Day 3 regeneration strictly excludes all attractions scheduled on Days 1 and 2. |
| **Manual Destination Add** | User could add the same attraction multiple times across days. | Detected instantly. If already on another day, prompts the user to move it to the current day. |
| **Sparse Corridor Catalog** | Engine repeated destinations or fabricated stops to meet pace count. | Schedules only verified unique stops and adds an honest planning notification explaining the pace. |
| **Photo Carousel Slides** | Carousel could render identical slides if duplicates occurred. | Canonical deduplication guarantees every Polaroid slide corresponds to a unique destination. |

---

## 8. Summary of Preserved Features

- **Visual Design & Carousel:** The Polaroid rope carousel, physics, animations, and typography remain intact.
- **Bilingual Experience:** English and Kannada localized strings for warnings, modals, and rationale cards are maintained.
- **Budget Calculations:** Fuel formulas, KSRTC transit fares, homestay tariffs, and meal budgets remain accurate.
- **Offline & PWA Sync:** Idempotent sync queue, offline storage, and guest transfer mechanics are fully preserved.

