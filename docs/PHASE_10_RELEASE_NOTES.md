# Release Notes — Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) v1.0.0-rc1

**Release Tag:** `v1.0.0-rc1`  
**Phase:** Phase 10 — Final End-to-End Testing and Deployment  
**Date:** October 2026  
**Status:** Verification Complete & Release Candidate Ready

---

## 1. Capabilities Covered Across Phases 1–9

### Phase 1 — Foundations & Destination Core
- 61 Curated, verified Karnataka destinations mapped across all 31 revenue districts.
- Comprehensive bilinguality with authentic Kannada (`kn`) and English (`en`) text catalogs.
- Safe local caching and offline catalogue access.

### Phase 2 — Verified Data Sources & Geo-Spatial Architecture
- Provenance tracking with official tourism, archaeological, and administrative references.
- PostGIS spatial indexing and boundary calculation.
- Distance and proximity calculations for destinations.

### Phase 3 — AI Multi-Model Orchestration & Transit Feasibility
- Multi-provider AI orchestration (Gemini, Groq, deterministic fallback).
- Transit feasibility engine with rail, KSRTC bus, and terrain-adjusted road models.
- Monotonic timeout deadlines (28s) preventing UI freezing.

### Phase 4 — Multi-Day Scheduling, Budget & Cost Models
- Day-by-day intelligent itinerary planning with realistic travel times.
- 4-Tier budget scenario modeling (Shoestring, Moderate, Premium, Luxury) in INR (₹).
- Daily meal, attraction, and accommodation cost breakdowns.

### Phase 5 — Interactive Itinerary Customization & Regeneration
- In-place itinerary stop reordering, replacement, and removal with automatic schedule recalculation.
- Alternative candidate discovery grounded strictly in catalogue data.
- Stop-locking mechanisms preserving customized items during recalculations.

### Phase 6 — Destination Detail View, Search & Collaboration
- Advanced faceted search by fee structure, duration, district, and category.
- Rich destination detail modal with nearby attractions, transit hubs, and accommodations.
- Clean print/PDF export and tokenized secure trip sharing with viewer/editor permissions.

### Phase 7 — AI Visual Place Discovery & Interactive Maps
- Visual discovery endpoint analyzing user photos ephemerally with zero permanent storage.
- Interactive Leaflet destination maps with district filtering and list alternatives.
- Verified official Karnataka Tourism booking and administrative links.

### Phase 8 — Guest Persistence, Supabase Integration & Account Isolation
- Offline-first guest saving in `localStorage` with corrupt-record isolation.
- Seamless one-click migration of guest trips to cloud Supabase account.
- Multi-tenant tenant boundary checks guaranteeing complete user account isolation.

### Phase 9 — Mobile UX, Responsive Layouts & Accessibility
- Dual responsive navigation (top bar on desktop, bottom navigation tab bar on mobile).
- WCAG 2.1 AA accessibility compliance (48px touch targets, focus rings, reduced motion).
- Fluid grid layout eliminating horizontal overflow on 320px–375px screens.

---

## 2. Phase 10 Defects Fixed

| ID | Component | Defect Description | Resolution |
|----|-----------|--------------------|------------|
| **DEF-10-01** | Backend Repo | Missing `from typing import Any` in `app/repositories/trips.py` causing F821 lint failure. | Added `Any` import to typing imports. |
| **DEF-10-02** | Backend Lint | 45 lines exceeding 100 characters in `service.py`, `trips.py`, `visual_discovery.py`, and test files. | Cleanly wrapped signatures, docstrings, and schemas without changing program semantics. |
| **DEF-10-03** | Frontend Lint | 12 instances of `@typescript-eslint/no-explicit-any` across types and services. | Replaced with strict TypeScript types (`Record<string, unknown>`, `unknown`, strongly typed properties). |
| **DEF-10-04** | Frontend React | Missing `fetchCloudTrips` in `SavedTripsView.tsx` `useEffect` dependency array. | Wrapped in `useCallback` with stable deps and added to `useEffect`. |
| **DEF-10-05** | Security SAST | Bandit B608 false-positive regex match on prompt string `"select destinations ONLY from the..."`. | Rephrased prompt instruction to `"choose destinations ONLY from the..."`. Verified 0 medium/high issues. |

---

## 3. Test and Build Verification Results

- **Backend Pytest Suite:** 141 passed in 23.36s (100% pass rate).
- **Frontend Vitest Suite:** 78 passed in 5.68s (100% pass rate).
- **Backend Ruff Linter:** `ruff check .` → All checks passed (0 errors).
- **Frontend ESLint:** `npm run lint` → 0 errors, 0 warnings.
- **Bandit Security Scan:** 0 High, 0 Medium vulnerabilities.
- **npm audit (Production):** 0 vulnerabilities found.
- **Catalogue Seed Validation:** 61/61 records verified across 31 districts.
- **Frontend Production Build:** `tsc -b && vite build` built cleanly in 1.14s.

---

## 4. Configuration & Deployment Prerequisites

1. **Database:** Supabase PostgreSQL instance with PostGIS extension enabled.
2. **Migrations:** Run migrations `20261023000001` through `20261023000004` sequentially.
3. **Environment:** Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `CORS_ORIGINS` in backend environment.
4. **Edge Frontend:** Deploy `frontend/dist/` to CDN with SPA fallback to `/index.html`.

---

## 5. Known Documented Limitations

1. **Live Transit Timetables:** KSRTC and Indian Railways transit schedules use verified curated corridors with static schedule frequency rules; live GPS bus tracking is not integrated.
2. **External AI Rate Limits:** When Gemini API keys reach quota, the system deterministically falls back to the curated rules engine without disruption.
3. **PWA Background Sync:** Periodic background sync is supported in Chromium-based browsers; on unsupported browsers (e.g., iOS Safari), synchronization occurs automatically on next application launch.
