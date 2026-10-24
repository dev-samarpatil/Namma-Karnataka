# Flexible Travel Preferences — Categories & Districts

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Overview & Problem Statement

Earlier versions of Namma Karnataka imposed an arbitrary constraint capping user selections to at most 5 preferred categories and at most 5 districts (`Select Preferred Categories (Up to 5) (2/5)` and `Select Specific Districts (Optional, Up to 5) (0/5)`).

Furthermore, the district and category interfaces rendered rigid, sprawling grids of buttons that:
1. Cluttered the trip planner viewport.
2. Prevented travelers with diverse interests (e.g. Heritage, Architecture, Spiritual, Wildlife, Beaches, Nature, Waterfalls) from fully expressing their trip preferences.
3. Prevented travelers planning statewide Karnataka tours from selecting more than 5 districts (out of 31 administrative districts).

---

## 2. Full-Stack Changes

### 2.1 Backend Schema (`backend/app/schemas/planning.py`)
Removed `max_length=5` from both `preferred_districts` and `categories` in `PlanningRequest`:
```python
class PlanningRequest(BaseModel):
    # ...
    preferred_districts: list[str] = Field(
        default_factory=list,
        description="Optional district code filters without arbitrary limits",
    )
    categories: list[DestinationCategory] = Field(
        default_factory=list,
        description="Preferred categories without arbitrary limits",
    )
```

### 2.2 Category Exploration & Thematic Grouping (`TripPlannerForm.tsx`)
Replaced the flat 5-item chip wall with a searchable, grouped category explorer:
- **Thematic Groups:**
  - *Heritage & Culture:* Heritage (`heritage`), Architecture (`architecture`), Spiritual & Cultural (`spiritual`).
  - *Nature & Outdoors:* Nature (`nature`), Waterfall (`waterfall`), Viewpoint (`viewpoint`), Hill Station (`hill_station`).
  - *Coastal & Wildlife:* Beach (`beach`), Wildlife (`wildlife`), Adventure (`adventure`).
- **Interactive Controls:**
  - Search input with instant bilingual English and Kannada filtering.
  - "Select All" and "Clear All" batch operations.
  - Selected category chips with ✕ remove action.
  - Informative count showing total selected categories without any arbitrary cap.

### 2.3 31-District Searchable Selector (`TripPlannerForm.tsx`)
Replaced the 31-button wall with an accessible searchable selector:
- Search input allowing instant lookup by English district name (e.g., "Mysuru", "Udupi", "Kodagu") or Kannada district name (e.g., "ಮೈಸೂರು", "ಉಡುಪಿ", "ಕೊಡಗು").
- "Select All" and "Clear All" batch operations.
- Selected districts displayed as removable chips with count indicators (e.g., "7 districts selected").
- Zero arbitrary capping: users can select 6, 12, or all 31 districts.

### 2.4 Localization (`frontend/src/lib/i18n.ts`)
Updated bilingual translation dictionaries:
- `selectCategories`: "Select Preferred Categories" / "ಆದ್ಯತೆಯ ವರ್ಗಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ" (removed "(Up to 5)" / "(ಗರಿಷ್ಠ ೫)").
- `selectDistricts`: "Select Specific Districts (Optional)" / "ನಿರ್ದಿಷ್ಟ ಜಿಲ್ಲೆಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ (ಐಚ್ಛಿಕ)" (removed "(Up to 5)").
- Added keys: `selectAll`, `clearAll`, `searchCategoriesPlaceholder`, `searchDistrictsPlaceholder`.

---

## 3. Geographic Feasibility & Ranking Semantics

Selecting multiple districts or categories does **not** force the deterministic planner to create an unrealistic itinerary that zigzags across distant parts of Karnataka in a 2-day trip.

- **Constraint Distinction:**
  - *Hard constraints:* Trip duration (`duration_days`), starting city (`origin_label`), transport mode, and numeric budget limit.
  - *Soft preferences:* Selected categories and preferred districts are treated as ranking scores for candidate selection.
- **Geographic Proximity:**
  The `DeterministicScheduler` clusters candidates within feasible driving radiuses for each day, ensuring daily transit times remain manageable (typically under 4 hours per day) while accommodating as many selected preferences as geographically feasible.

---

## 4. Verification Evidence

1. **Unit & API Tests:**
   - `test_unlimited_category_and_district_planning` in `backend/app/tests/test_planning_api.py` verifies submitting 8 categories and 7 districts returns HTTP 200 with an intact itinerary.
   - Vitest suite in `frontend/src/App.test.tsx` validates selecting multiple categories and districts without frontend validation errors.
2. **Execution Results:**
   - Backend Pytest: 145/145 passed.
   - Frontend Vitest: 78/78 passed.
