# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 6 Baseline Audit
**Canonical Scope:** Destination Discovery, Itinerary Export, Secure Sharing, and Multi-Day Collaboration  
**Execution Environment:** Google Antigravity IDE • Windows Shell (PowerShell) • Python 3.14.3 • Node.js v22  
**Date:** October 2026  
**Status:** BASELINE AUDITED & VERIFIED

---

## 1. Executive Summary

Phase 6 extends Namma Karnataka from an interactive itinerary builder into a comprehensive discovery, document export, secure sharing, and multi-day collaboration platform.

Before making changes, the repository was audited to reproduce test suites, review data models, inspect media availability, and establish the Phase 5 baseline.

---

## 2. Baseline Test Reproduction

The test suites from Phase 5 were executed directly on the user's Windows environment:

| Test Suite | Command | Outcome |
|---|---|---|
| **Backend Pytest** | `.\backend\venv\Scripts\python -m pytest app/tests -q` | **117 PASSED** (0 failures, 100% green in 16.42s) |
| **Frontend Vitest** | `npm test -- --run` in `frontend/` | **32 PASSED** (0 failures, 100% green in 4.88s) |
| **Backend Code Quality** | `.\backend\venv\Scripts\ruff check app` | **CLEAN** (0 errors, 0 warnings) |
| **Frontend Build** | `npm run build` (`tsc -b && vite build`) | **SUCCESS** (Exit code 0, 936ms) |
| **Destination Schema Audit** | `pytest app/tests/test_destination_schemas.py` | **8 PASSED** (All 61 destinations valid) |

---

## 3. Existing Capabilities & Architecture Audit

### 3.1 Destination Catalogue & Discovery
- **Catalogue Size:** 61 verified destinations spanning all 31 Karnataka districts (`data/seed/destinations.json`).
- **Metadata Fields:** `id`, `slug`, `district_code`, `category`, `latitude`, `longitude`, `access_status`, `verification_status`, `content_status`, `is_offbeat`, `estimated_visit_minutes`, `entry_fee_min_inr`, `entry_fee_max_inr`, `currency_code`, `translations` (en/kn), and `sources`.
- **Discovery Frontend:** `DestinationDiscovery.tsx` currently provides basic district/category dropdowns and an offbeat toggle. It lacks fee filtering (Free vs Paid vs Unknown), duration filtering, active filter chips, sort options, and primary photo cards.
- **Destination Modal:** `DestinationModal.tsx` displays overview, access status, how to reach, accessibility, and nearby verified food and stays (`fetchRestaurantsNear`, `fetchAccommodationsNear`). It lacks hero photography, photo galleries with attribution, nearby attractions with geospatial distance, and nearby transit terminals.

### 3.2 Photography & Media Assets
- Currently `destinations.json` lacks a dedicated `media` array.
- `frontend/public/images` contains PWA icons (`icon-192.svg`, `icon-512.svg`), but no destination imagery.
- Destination schemas in `backend/app/schemas/destinations.py` do not yet define a `DestinationMediaRead` structure with attribution, licensing, and thumbnails.

### 3.3 Nearby Places & Transit
- `data/seed/places.json` contains 12 curated restaurants and 10 accommodations with coordinates and price tiers.
- `data/seed/transit_network.json` contains static bus and rail corridors connecting major hubs (Bengaluru, Mysuru, Hubballi, Mangaluru, Belagavi, etc.).
- The backend provides `places` endpoints (`/places/restaurants/near`, `/places/accommodations/near`) but lacks an integrated endpoint for nearby attractions, transit hubs, and places for a specific destination.

### 3.4 Itinerary Export
- Currently, users can view itineraries on screen, but there is no dedicated print layout, PDF generation, or structured JSON export.
- Browser print currently renders web navigation, buttons, and headers without proper print pagination or media print styles.

### 3.5 Trip Persistence, Sharing & Collaboration
- **Cloud Trips:** `POST /api/v1/trips`, `GET /api/v1/trips`, `GET /api/v1/trips/{trip_id}`, `PUT /api/v1/trips/{trip_id}`, and `DELETE /api/v1/trips/{trip_id}` enforce multi-tenant ownership via Supabase Auth JWT.
- **Sharing:** There are currently no share link creation or permission endpoints (`viewer` vs `editor`).
- **Concurrency & Versioning:** Trips currently store `snapshot` without a monotonic `version` counter. Concurrent collaborative edits could overwrite each other without conflict warning.
- **Guest Trips:** Persisted in browser `localStorage['nk_saved_trips']`. Guest mode remains isolated from cloud storage.

---

## 4. Phase 6 Design Decisions

1. **Grounded Photography:** Define `DestinationMediaRead` with verified attribution, licensing, and captions. Populate curated photo records for Karnataka destinations with legitimate tourism/ASI provenance.
2. **Integrated Nearby Discovery:** Implement `GET /api/v1/destinations/{slug_or_id}/nearby` returning nearby attractions (excluding itself), nearby transit hubs, restaurants, and hotels.
3. **Multi-Faceted Search & Filter:** Upgrade `DestinationDiscovery.tsx` with fee filter (Free/Paid/Unknown), duration filter, bilingual search, sort options, and active chips.
4. **Rich Detail View:** Upgrade `DestinationModal.tsx` into a rich detail view with Hero photography, photo gallery with captions and attribution, practical info, nearby attractions, nearby transit, and "Plan With This" workflow.
5. **Print & JSON Export:**
   - Add `@media print` CSS for clean print/PDF export with page breaks per day, budget tables, and disclosures.
   - Add structured JSON export with a privacy toggle to exclude personal notes.
6. **Secure Sharing & Concurrency:**
   - Introduce `version` field on trips for optimistic concurrency control.
   - Add endpoints for creating, listing, and revoking share links with `viewer` and `editor` roles.
   - Enforce server-side role checks: viewers cannot mutate trips.
   - Return HTTP 409 Conflict if an editor submits an update with a stale `expected_version`.
