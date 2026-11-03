# Namma Karnataka — Itinerary Logic & Uniqueness Engine Improvements

**Date:** November 3, 2026  
**Scope:** Trip-Wide Canonical Deduplication, Cross-Day Uniqueness, Anti-Backtracking, and Pacing Integrity  
**Status:** Completed & Verified

---

## 1. Problem Statement

Previously, users reported recurring destination duplications across different days of an itinerary:
* The same attraction (e.g. *Mysore Palace*) could appear on Day 1, Day 2, or twice on the same day.
* Slugs, aliases, and slight name variations (*"Mysore Palace"*, *"Amba Vilas Palace"*, *"Mysuru Palace"*) evaded simplistic string matching.
* Manual addition or day regeneration lacked cross-day exclusion filters.

---

## 2. Solution Architecture

We established a comprehensive, multi-layered uniqueness architecture spanning backend storage, AI recommendation orchestration, optimization routing, and frontend state synchronization.

### Layer 1: Canonical Alias Registry & Proximity Deduplication
File: `backend/app/services/destination_uniqueness.py`
- **Canonical ID & Slug Mappings**: Unified known historical aliases and variant spellings into canonical identity keys (`GLOBAL_CANONICAL_ID_MAPPINGS`, `GLOBAL_CANONICAL_SLUG_MAPPINGS`).
- **Geodesic Coordinate Proximity**: Destinations situated within 500 meters of an already-scheduled attraction are detected as duplicates.
- **Trip-Wide Repair Validator**: `validate_trip_destination_uniqueness(plan, candidate_pool, repair=True)` audits all days in an itinerary, removes duplicates, and substitutes appropriate alternatives from the district candidate pool.

### Layer 2: Routing Optimizer Uniqueness Tracking
File: `backend/app/services/routing/optimizer.py`
- Maintained a trip-wide `visited_canon_ids` and `visited_coords` set across all days of the trip.
- When generating days, candidate attractions that match any previously visited canonical ID or proximity threshold are strictly excluded.
- Sparse catalogue handling: When a district or circuit has fewer distinct attractions than the target day pace, the engine paces the day realistically rather than repeating previous attractions.

### Layer 3: Scheduler & Day Regeneration Isolation
File: `backend/app/services/scheduler.py`
- `regenerate_day` strictly filters candidate pools using `filter_candidate_pool_for_uniqueness(pool, other_days_stops)`.
- Re-ordering and editing preserve canonical IDs to prevent accidental duplication on save.

### Layer 4: Client-Side Deduplication & Interactive Move Dialog
Files:
- `frontend/src/lib/itineraryDeduplication.ts`: Exports `deduplicateItineraryDestinations()`, `isDestinationDuplicate()`, and `findDuplicateDestinationDay()`.
- `frontend/src/features/itinerary/ItineraryView.tsx`: Detects duplicate insertion attempts and offers an intuitive **"Move to Day X"** prompt rather than duplicating the stop.

---

## 3. Verification & Test Matrix

- **Backend Pytest**:
  `backend/app/tests/test_destination_uniqueness.py`:
  - `test_normalize_destination_name`: Passed
  - `test_canonical_id_resolution`: Passed
  - `test_coordinates_proximity_detection`: Passed
  - `test_validate_trip_destination_uniqueness_detects_duplicates`: Passed
  - `test_validate_trip_destination_uniqueness_repairs_plan`: Passed
  - `test_filter_candidate_pool_for_uniqueness`: Passed

- **Frontend Vitest**:
  `frontend/src/lib/itineraryDeduplication.test.ts`:
  - `normalizes destination keys accurately`: Passed
  - `detects cross-day destination duplicates`: Passed
  - `deduplicates duplicate destinations across days and within the same day`: Passed

