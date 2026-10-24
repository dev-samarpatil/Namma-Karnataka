# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 7 Test Report

**Execution Date:** 2026-10-24  
**Target Environment:** Windows 11, Node.js v22.14.0, Python 3.14  
**Target Capabilities:** AI Visual Place Discovery, Interactive Maps, Official Tourism Links, Resilient PWA Synchronization  
**Status:** ALL TESTS PASSING (137 backend tests, 56 frontend tests, 0 regressions, clean production build)

---

## 1. Test Suite Execution Summary

| Test Domain | Command | Baseline (Phase 6) | Phase 7 Outcome | Pass Rate | Duration |
|:---|:---|:---:|:---:|:---:|:---:|
| **Backend Unit & API** | `pytest backend/app/tests` | 127 passed | **137 passed** (0 failed) | 100% | 25.93s |
| **Official Links Validation** | `python data/validation/audit_official_links.py` | N/A | **10 accommodations, 61 destinations (0 errors, 0 warnings)** | 100% | 0.08s |
| **Frontend Unit & Components** | `npm test -- --run` (Vitest) | 41 passed | **56 passed** (0 failed) | 100% | 5.63s |
| **Frontend Production Build** | `npm run build` (`tsc -b && vite build`) | Passed | **Passed (Clean bundle, 0 TS errors)** | 100% | 2.46s |

---

## 2. Capability A & B: AI Visual Place Discovery Verification

### 2.1 Backend Tests (`backend/app/tests/test_visual_discovery.py`)

* `test_analyze_image_success_known_landmark`: Uploads `test_mysore_palace.jpg`, verifies EXIF stripping, landmark profile detection, and returns grounded candidate record for `mysore-palace` with confidence badge `strong_match`.
* `test_analyze_image_grounded_candidates_only`: Asserts all returned candidates exist in `seed/destinations.json` and rejects arbitrary hallucinated destination IDs.
* `test_analyze_image_unsupported_file_type`: Rejects `.gif` and `.exe` uploads with HTTP 400 Bad Request and descriptive localized message.
* `test_analyze_image_oversized_file`: Enforces strict 10MB image limit with HTTP 413 Payload Too Large.
* `test_analyze_image_corrupt_data`: Rejects non-image bytes (e.g. text masquerading as `.jpg`) via Pillow verification with HTTP 400.
* `test_analyze_image_no_match_fallback`: Uploads generic landscape without identifiable Karnataka landmarks; asserts honest uncertainty notice (`is_confident: false`, `confidence_label: "uncertain_suggestion"`).
* `test_analyze_video_bounded_frames_success`: Submits 3 multipart sampled frame JPEG Blobs; verifies aggregate candidate scoring and bounded multi-frame evidence consolidation.
* `test_analyze_video_exceeds_frame_limit`: Submits >10 frames; enforces server-side frame budget limit with HTTP 400.

### 2.2 Frontend Tests (`frontend/src/features/discovery/VisualDiscoveryModal.test.tsx`)

* `renders modal with privacy badge, upload controls, and tabs`: Asserts presence of ephemeral processing notice (`data-testid="privacy-disclosure-notice"`), Photo / Video tab selectors, and upload dropzone.
* `analyzes photo and renders grounded candidate destination card with confidence badge`: Simulates file selection, triggers `analyzeImageVisualDiscovery`, asserts candidate card rendering (`data-testid="candidate-card-mysore-palace"`), architectural clues, and View Details/Plan triggers.
* `displays honest uncertainty message when no confident match is identified`: Asserts alert banner (`data-testid="no-confident-match-alert"`) when candidates array is empty.
* `switches between photograph and video tabs`: Verifies mode toggle and format/size hint updates.

---

## 3. Capability C & D: Interactive Maps Verification

### 3.1 Frontend Tests (`frontend/src/features/discovery/DestinationInteractiveMap.test.tsx`)

* `renders interactive map container, destination count, and OpenStreetMap attribution`: Renders Leaflet root container (`data-testid="interactive-map-container"`), verifies OpenStreetMap license attribution notice, and displays destination count.
* `toggles accessible list view alternative and displays destination details`: Tests accessible view alternative (`data-testid="toggle-map-list-mode"` -> `data-testid="map-list-alternative-view"`), ensuring screen readers and low-bandwidth users can browse all 61 destinations with WGS84 coordinates.
* `supports nearby layer overlay checkboxes for dining, stays, and transit`: Verifies checkboxes for Dining, Accommodations, and Transit Hubs.
* `resets state view on center button click`: Verifies recentering trigger on Karnataka geographical midpoint [14.5° N, 75.8° E].

---

## 4. Capability E: Official Tourism Links Verification

### 4.1 Data Audit Script (`data/validation/audit_official_links.py`)

Executed automated provenance audit across `data/seed/places.json` and `data/seed/destinations.json`:
* **Accommodations Audited:** 10 verified properties (KSTDC Mayura hotels and Jungle Lodges & Resorts).
* **Official Booking Links Checked:** 10 valid HTTPS URLs pointing directly to official booking engines (`kstdc.co` and `junglelodges.com`).
* **Protocol Enforcement:** 100% HTTPS enforced; no `http://` or non-standard protocols.
* **Domain Whitelist:** Verified all official properties map strictly to `kstdc.co`, `junglelodges.com`, or `karnatakatourism.org`.
* **Zero Fabrication:** Destinations without verified direct booking engines honestly disclose `null` rather than generating speculative URLs.
* **Audit Result:** 0 errors, 0 warnings.

---

## 5. Capability F: Resilient PWA Synchronization Verification

### 5.1 Backend Tests (`backend/app/tests/test_pwa_sync_idempotency.py`)

* `test_idempotent_trip_update_replay_with_key`: Updates trip with `Idempotency-Key: test-idemp-001`. Replaying the identical request with the same idempotency key returns the cached authoritative version without advancing `trip.version` or duplicating audit events.
* `test_trip_version_conflict_409`: Submits an update with a stale `expected_version: 1` when the trip is already at version 2. Verifies backend returns HTTP 409 Conflict with `TRIP_VERSION_CONFLICT` code.

### 5.2 Frontend Tests (`frontend/src/services/offlineSync.test.ts`)

* `enqueues an operation with stable ID, status pending, and retry count 0`: Verifies local persistence in `nk_sync_queue_v1` with cryptographic-style unique ID.
* `reports correct trip sync status across empty, pending, conflict, and auth states`: Tests `getTripSyncStatus` transitions.
* `clears completed synced operations while preserving pending ones`: Verifies queue maintenance without erasing pending changes.
* `processes queue successfully and sends Idempotency-Key headers`: Tests HTTP replay, verifying `Idempotency-Key` and `Authorization` headers are passed.
* `handles HTTP 409 conflict gracefully without throwing or erasing pending work`: Simulates server 409, marks operation as `conflict`, preserving local work for user conflict review.
* `handles temporary network disconnection with retry count increments`: Simulates offline fetch rejection, increments retry count, marks status as `failed_retryable`.
* `removes a specific operation when discarded by the user`: Verifies user-directed discard action.

---

## 6. Regression Verification (Phase 1–6)

All Phase 1–6 features were executed as part of the full test runs:
* **Destination Discovery & Filters:** Bilingual search, fee filters, duration filters, offbeat filtering, and sorting (`DestinationDiscoveryPhase6.test.tsx` — 4 passed).
* **Destination Modal & Photo Gallery:** Gallery thumbnails, license attribution, practical info, nearby places (`DestinationModal.test.tsx` — 1 passed).
* **Itinerary Planning & Scheduler:** Deterministic 3-day travel schedule, meal allocation, transit timing (`ItineraryView.test.tsx` — 5 passed).
* **Itinerary Export & Sharing:** Print-to-PDF preview, structured JSON export, viewer/editor share links, revoke link (`ItineraryExportSharePhase6.test.tsx` — 5 passed).
* **Saved Trips & Cloud Persistence:** Guest localStorage saving, account switching, cache invalidation (`SavedTripsView.test.tsx` — 2 passed).
* **Offline Destination Storage:** IndexedDB destination caching, TTL verification, offline fallback (`offlineStorage.test.ts` — 6 passed).
* **Central API Client:** Typed fetch, error normalization, retry deadline (`api.test.ts` — 13 passed).
* **Application Shell Journey:** App shell rendering, language toggle EN <-> KN (`App.test.tsx` — 5 passed).

---

## 7. Build and Compilation Verification

```
> namma-karnataka-frontend@0.1.0 build
> tsc -b && vite build

vite v5.4.21 building for production...
transforming...
✓ 53 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.83 kB │ gzip:   0.50 kB
dist/assets/index-CudFqegU.css   43.76 kB │ gzip:  11.95 kB
dist/assets/index-CPQw-X4C.js   453.75 kB │ gzip: 136.94 kB
✓ built in 2.46s
```

* **TypeScript Compilation:** Zero errors.
* **CSS Assets:** 43.76 kB (11.95 kB gzipped).
* **JS Bundle:** 453.75 kB (136.94 kB gzipped), including Leaflet mapping runtime.
* **Exit Code:** 0 (Clean).

---

## 8. Known Limitations & Blocked Checks

1. **System Python OpenCV / FFmpeg:**
   * Python 3.14 on this system does not have `opencv-python` or `ffmpeg` installed. Video frame extraction is implemented via hardware-accelerated client-side HTML5 `<video>` and `<canvas>` sampling, submitting 3–5 keyframe JPEG Blobs to the backend. This is lighter, requires zero system binary dependencies, and avoids server CPU spikes.
2. **Offline Map Tiles:**
   * OpenStreetMap standard tiles are loaded over HTTPS and are subject to OSM tile usage policies. Leaflet does not cache external map tiles in Service Worker storage to prevent violating OSM tile usage terms. When offline, destination coordinates and metadata remain 100% accessible via the Accessible List Alternative.
3. **Live Booking Transactions:**
   * External official booking links are external redirects with `rel="noopener noreferrer"`. Namma Karnataka does not process payment transactions or manage real-time inventory.
