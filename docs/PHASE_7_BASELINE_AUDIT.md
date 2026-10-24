# Phase 7 Baseline Audit — Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)

**Date:** 2026-10-24  
**Audit Scope:** AI Visual Place Discovery, Interactive Maps, Official Tourism Links, and Resilient PWA Synchronization.  
**Execution Environment:** Windows (PowerShell), Python 3.14.0, Node.js / Vite 5.4.21, Vitest 2.1.9, Pytest 9.1.1.

---

## 1. Executive Summary & Verification of Baseline

The baseline verification was executed directly on the repository before introducing Phase 7 changes:
- **Backend Tests:** **127 passed, 0 failed** in 32.44s (`pytest backend/app/tests`).
- **Frontend Tests:** **41 passed, 0 failed** in 24.55s across 8 test suites (`vitest run`).
- **Frontend Build & Typecheck:** Succeeded (`tsc -b && vite build`) producing `dist/` in 828ms without TypeScript errors.
- **Git Status:** Working tree clean on branch `main` at commit `20a6e73`.

---

## 2. Architectural Findings Across Phase 7 Domains

### A. AI Orchestration & Multimodal Capabilities
1. **Current AI Architecture:**
   - Centralized in `backend/app/services/ai/` with `orchestrator.py`, `gemini_adapter.py`, `groq_adapter.py`, `fallback.py`, and `validator.py`.
   - Settings in `backend/app/core/config.py`:
     - `GROQ_MODEL`: `llama-3.3-70b-versatile` (pure text-based LLM, does not accept image bytes).
     - `GEMINI_MODEL`: `gemini-2.5-flash` / `gemini-1.5-flash` via Google Generative Language REST API (`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`). Supports multimodal `inlineData` with `mimeType` and base64-encoded `data`.
     - `AI_ENABLE_LIVE_PROVIDERS`: defaults to `False` in test/offline environments with deterministic fallback.
2. **Visual Discovery Gap:**
   - No existing visual search endpoint in `api/v1/`.
   - Must implement `POST /api/v1/visual-discovery/analyze-image` and `POST /api/v1/visual-discovery/analyze-video`.
   - Python environment has `Pillow 12.2.0` and `python-multipart 0.0.22`, but **no `ffmpeg` or `opencv-python (cv2)`**.
   - **Decision:** Photo analysis validates format, dimensions, and magic bytes using `Pillow`. Video processing utilizes browser-native HTML5 `<video>` and `<canvas>` frame extraction (hardware-accelerated, zero-dependency) with bounded sampling (3–5 keyframes), coupled with backend frame validation and aggregation.

### B. Interactive Maps & Geographic Exploration
1. **Existing Map Assets:**
   - `frontend/src/features/itinerary/MapView.tsx` contained a static SVG coordinate projection (11.5°N–18.5°N, 74.0°E–78.6°E).
   - No interactive tile map library was installed in `frontend/package.json`.
2. **Library Selection:**
   - Selected **Leaflet 1.9.4** (`leaflet` and `@types/leaflet`), lightweight (~40KB gzip), zero-WebGL requirement, fully responsive mobile touch gestures, accessible DOM marker rendering, and official OpenStreetMap tile support.
   - OSM Tile Provider: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with mandatory attribution `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`.
3. **Integration Requirements:**
   - Toggleable Map/List view in `DestinationDiscovery.tsx`.
   - Synchronized active markers and destination cards.
   - Filter synchronization (district, category, fee, duration, offbeat).
   - Proximity overlays for nearby dining, accommodations, and transit hubs without fabricating route geometries.

### C. Official Tourism & Accommodation Links
1. **Existing Data Audit:**
   - `data/seed/places.json` contains 10 verified KSTDC hotels (`https://kstdc.co/hotels/...`) and JLR resorts (`https://www.junglelodges.com/resort/...`).
   - `data/seed/destinations.json` includes Mysore Palace Board (`https://www.mysorepalace.gov.in`), Karnataka Tourism (`https://karnatakatourism.org`), and ASI citations.
2. **Gaps & Enhancements:**
   - Schema currently has `booking_reference_url` on accommodation, but lacks explicit `official_website_url`, `official_booking_url`, `link_source_name`, and `link_status`.
   - Destination detail modal and cards need prominent, styled "Official Tourism Portal" and "Official Property Website" badges with verified domain provenance, security headers (`rel="noopener noreferrer"`), and honest disclaimers that Namma Karnataka does not process transactions.

### D. Resilient PWA Synchronization
1. **Current Persistence:**
   - Guest trips stored in `localStorage['nk_saved_trips']`.
   - Public destinations cached in `localStorage['nk_offline_destinations_v1']`.
   - Service worker (`frontend/public/sw.js`) precaches static assets and enforces security rule: **requests with `Authorization` headers are never cached**.
2. **Gaps & Synchronization Model:**
   - No durable offline mutation queue for authenticated or shared trip updates.
   - If network drops during trip edit (add stop, remove stop, change duration/notes), operation is lost or errors out.
   - Must implement `offlineSync.ts` with typed mutation queue, unique `operation_id`, idempotency key, expected monotonic version validation, exponential retry with jitter, conflict detection (HTTP 409), and user-visible sync status indicator.

---

## 3. Baseline Audit Checklist

| Item | Status | Verification Note |
|---|---|---|
| Backend Test Suite | **127/127 PASS** | Verified via `pytest backend/app/tests` |
| Frontend Test Suite | **41/41 PASS** | Verified via `vitest run` |
| TypeScript Build | **PASS** | `tsc -b && vite build` clean |
| Multimodal AI Model | **VERIFIED** | Gemini REST API supports image parts; Groq is text-only |
| Video Decoding Binaries | **NOT PRESENT** | No `ffmpeg`/`cv2` in OS; client canvas extraction chosen |
| Map Library | **INSTALLED** | `leaflet` & `@types/leaflet` added to dependencies |
| KSTDC / JLR Link Seed | **PRESENT** | 10 verified government lodging records identified |
| PWA Service Worker | **PRESENT** | Cache isolation intact; requires sync queue integration |

---
