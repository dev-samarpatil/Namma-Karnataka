# Product Improvement Baseline — Audit & Failure Analysis

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 2026  
**Auditor:** Principal Full-Stack Engineer, Geospatial Systems Architect & QA Lead  
**Scope:** Core Usability, Travel Preferences, Budget-Aware Scheduling, Authentic Photography & Real Road Routing  

---

## 1. Executive Summary & Root Cause Analysis

An exhaustive audit of the existing codebase confirms all seven product problems reported in the master implementation prompt:

| # | Reported Product Problem | Root Cause Identified in Codebase | Severity |
|---|--------------------------|-----------------------------------|----------|
| **1** | Generic / placeholder imagery on destination cards | `data/seed/destinations.json` reuses 4 generic Unsplash photo URLs across all 61 destinations. E.g., `photo-1582510003544-4d00b7f74220` is reused across 22 distinct monuments/forts; `photo-1506744038136-46273834b3fb` (Yosemite, US) is reused for 13 peaks/gardens/viewpoints. | **Critical** (Visual Integrity) |
| **2** | Artificial 5-category selection limit | Hardcoded constraint in `TripPlannerForm.tsx` (lines 65-67: `selectedCategories.length >= 5`) and Pydantic schema in `backend/app/schemas/planning.py` (`categories: Field(..., max_length=5)`). | **High** (User Restriction) |
| **3** | Inflexible category exploration | Flat chip grid with no search, no thematic groupings, no descriptive context, and no keyboard search. | **Medium** (Usability) |
| **4** | Artificial 5-district selection limit | Hardcoded constraint in `TripPlannerForm.tsx` (lines 78-81: `selectedDistricts.length >= 5`) and Pydantic schema in `backend/app/schemas/planning.py` (`preferred_districts: Field(..., max_length=5)`). Unwieldy 31-chip wall. | **High** (User Restriction) |
| **5** | Lack of numeric trip budget limit | `PlanningRequest` only accepts qualitative `budget_scenario` (`budget`/`standard`/`comfort`). No `budget_limit_inr` or `budget_scope` (`total_trip` vs `per_person`). No feasibility check or budget-constrained re-ranking. | **High** (Budget Modeling) |
| **6** | Itinerary page UX, hierarchy & white-box contrast | `BudgetSummary.tsx` uses hardcoded `#f8fafc` white background inline styles inside a dark-navy theme. Cluttered day blocks, unstyled itemized tables, lack of day-wise tab navigation. | **High** (UI/UX Hierarchy) |
| **7** | Itinerary map broken & lacks real road routing | `MapView.tsx` is **not a map library instance**; it is an SVG math projection (`projectToSvg`) drawing straight lines on a black SVG box. No road network polylines, no turn-by-turn directions panel, no Google Maps external navigation integration. | **Critical** (Geospatial Feature) |

---

## 2. Baseline Test & Quality Metrics

Prior to applying any modifications, the existing test and linting baselines are recorded:
- **Backend Tests:** 141 passed in 23.36s (`pytest -q`)
- **Frontend Tests:** 78 passed in 5.52s (`npm test -- --run`)
- **Backend Lint:** 0 Ruff errors (`ruff check .`)
- **Frontend Lint:** 0 ESLint errors (`npm run lint`)
- **Security SAST:** 0 Bandit High/Medium vulnerabilities across 7,888 lines
- **Frontend Build:** Built cleanly in 1.18s (`tsc -b && vite build`)
- **Playwright E2E:** 10/10 passed in 1.3m across Chromium & Mobile Chromium

---

## 3. Workstream Execution Roadmap

1. **Workstream A (Authentic Photography):** Audit all 61 destination media records, replace reused stock images with authentic, verified photographs or honest fallback badges, and generate `docs/DESTINATION_PHOTO_VERIFICATION_REPORT.md`.
2. **Workstream B & C (Remove Category & District Caps):** Remove `max_length=5` from schemas, remove frontend length checks, replace flat chip walls with searchable multi-select selectors with Select All / Clear All.
3. **Workstream D & I (Numeric Budget Planning):** Add `budget_limit_inr` and `budget_scope` to form, Pydantic schemas, and `BudgetCalculator`. Implement budget feasibility analysis and budget-aware destination ranking.
4. **Workstream G & H (Real Road Routing):** Replace static SVG with interactive Leaflet/OSRM & Google Maps route integration. Fetch real road geometry (encoded polylines), calculate leg distances and durations, render per-leg directions panel, and provide "Open in Google Maps" links.
5. **Workstream F & L (Itinerary UX Redesign):** Rebuild `ItineraryView.tsx` with compact header, unified dark-theme palette, Day Navigator tabs, distinct stop cards (attraction vs meal vs lodging), itemized budget cards, and integrated directions.
6. **Workstream N (Testing & Verification):** Update Pytest, Vitest, and Playwright suites to validate multi-category/multi-district submissions, budget calculations, and real road routing.
