# Critical Bug Fixes and Reliability Improvements Report

**Date:** October 27, 2026  
**Application:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) Travel Discovery and Planning Platform  
**Target Areas:** AI Provider Fallback Hierarchy, Dynamic Image Search, Multi-Photo Destination Gallery, Uncropped Full-Image Rendering, and Canonical Cost-Estimate Structure.

---

## 1. Executive Summary

This engineering effort diagnosed root causes and implemented complete, end-to-end fixes for six critical reliability and presentation defects in the Namma Karnataka platform:

1. **AI Model Quota Exhaustion & Dynamic Fallback:** Gemini Flash 3.8 / 2.5 quota limits (HTTP 429) and unsupported model IDs (HTTP 404) no longer crash requests. A multi-tier cascade dynamically shifts from primary Gemini model $\rightarrow$ secondary Flash models $\rightarrow$ Groq models $\rightarrow$ deterministic offline planner.
2. **Provider-Aware Error Classification & Observability:** HTTP 429, 401/403, 404, 5xx, and timeouts are uniquely categorized and recorded in a structured audit log without leaking API credentials or sensitive user data.
3. **Dynamic Destination-Specific Image Search:** Replaced static single-image fallbacks with a live, backend-proxied Wikimedia Commons Action API integration generating landmark-specific search queries (e.g. `Mysore Palace exterior`, `Badami Cave Temples architecture`), filtering non-photo SVGs/diagrams, and validating canonical URLs.
4. **Multi-Photo Destination Galleries (5–8 Photos):** Replaced single-photo views with an interactive gallery featuring thumbnail strips, next/prev navigation, photo counters (`1 / N`), synchronized photographer credits and CC licenses, loading skeletons, and retry actions.
5. **Uncropped Image Rendering & Full-Image Lightbox:** Eliminated distorted image cropping in hero containers by switching to `object-fit: contain` with an atmospheric blurred backdrop and implementing an interactive full-screen Lightbox modal with zoom, pan, and escape controls.
6. **Eliminated Duplicate "Itemized Cost Estimates" Section:** Resolved the duplicated heading in the itinerary budget view by canonizing Section B as the single itemized estimates container and re-titling the raw breakdown table, maintaining 100% of cost categories and calculations.

---

## 2. Root Cause Diagnoses

### Issue 1 & 2: Gemini Quota Exhaustion and Missing Cascaded Fallback
- **Diagnosis:** The previous AI architecture attempted a single model per provider. When the configured primary Gemini model hit quota exhaustion (HTTP 429) or model deprecation (HTTP 404), the entire provider failed immediately or threw an unhandled exception rather than trying alternative low-cost Flash models (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-flash-8b`) before failing over to Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
- **Resolution:** Introduced a configurable list of fallback models on both `GeminiAdapter` and `GroqAdapter`. Implemented loop-based model failover within the adapter, classifying HTTP 429 and HTTP 404 as recoverable model-switch events. When all Gemini models fail or if credentials fail, `AIOrchestrator` fails over to Groq, and if Groq fails or times out, gracefully returns a grounded, corridor-aware deterministic plan.

### Issue 3: Image Search Not Working End-to-End
- **Diagnosis:** The application relied purely on pre-seeded records in `destinations.json` and Supabase with at most 1–2 photos per destination. No dynamic query endpoint existed on the backend to fetch genuine location photos for destinations from open media repositories, causing foreign or missing image states.
- **Resolution:** Implemented `DestinationImageSearchService` on the backend using the Wikimedia Commons Action API (`query`, `generator=search`, `prop=imageinfo`). Generated targeted landmark-specific search queries, stripped HTML from author attribution, discarded SVG vector maps, and exposed `GET /api/v1/destinations/{id_or_slug}/images` with in-memory caching.

### Issue 4: Destination Detail Pages Showing Only One Image
- **Diagnosis:** `DestinationModal.tsx` rendered only `destination.media[0]`. There was no component logic to request additional images or render a thumbnail selector.
- **Resolution:** Updated `DestinationModal.tsx` to automatically call `fetchDestinationImages(destination.slug)` on open. Merged and deduplicated fetched images with catalog seed media, rendering an interactive thumbnail gallery with smooth navigation, keyboard arrow support, and photo counter.

### Issue 5: Main Destination Image Cropping and Distortion
- **Diagnosis:** The hero image container used fixed-height boxes with aggressive `object-fit: cover` and fixed aspect ratios, chopping off architectural towers, temple spires, and landscape panoramas with no option to view the uncropped photograph.
- **Resolution:** Updated the hero container to use `object-fit: contain` with an underlying soft blurred backdrop of the same image (`filter: blur(20px)`), guaranteeing zero cropping while preventing letterboxing artifacts. Added a full-screen "Inspect Full Image" button launching an uncropped lightbox modal with ESC key and click-outside dismissal.

### Issue 6: Duplicate "Itemized Cost Estimates" Heading in Itinerary
- **Diagnosis:** In `BudgetSummary.tsx`, both Section B and Section E's table subtitle were labeled "Itemized Cost Estimates", creating duplicate headings in the DOM and confusing assistive screen readers.
- **Resolution:** Preserved Section B's canonical heading `📊 Itemized Cost Estimates` (`ವಿವರವಾದ ವೆಚ್ಚದ ಪಟ್ಟಿ`) while renaming Section E to `Itemized Category Breakdown Table` (`ವರ್ಗವಾರು ಲೆಕ್ಕಾಚಾರ ಕೋಷ್ಟಕ`), ensuring `Itemized Cost Estimates` appears exactly once in the DOM while retaining all transport, accommodation, food, ticket, and total cost calculations.

---

## 3. Implementation Details & Files Modified

### Backend Architecture
1. **`backend/app/core/config.py`**:
   - Added `GEMINI_PRIMARY_MODEL`, `GEMINI_FALLBACK_MODELS`, `GROQ_PRIMARY_MODEL`, `GROQ_FALLBACK_MODELS`.
   - Added `_parse_model_list` validator to safely parse JSON arrays and comma-separated model lists.
   - Retained safe default fallbacks for unconfigured environments.

2. **`backend/app/services/ai/base.py`**:
   - Added `AIProviderModelError` exception class for HTTP 404 / unsupported model errors.
   - Added `last_model_used` property to the `AIProvider` Protocol.

3. **`backend/app/services/ai/gemini_adapter.py`**:
   - Re-architected `generate_plan` to iterate across `self._models` (`primary_model` + `fallback_models`).
   - Categorized errors:
     - HTTP 429 $\rightarrow$ `AIProviderRateLimitError` (triggers next model attempt).
     - HTTP 404 $\rightarrow$ `AIProviderModelError` (triggers next model attempt).
     - HTTP 400 with `API_KEY_INVALID` or 401/403 $\rightarrow$ `AIProviderAuthError` (skips provider cleanly).
     - HTTP 5xx $\rightarrow$ Bounded backoff retry (`AI_MAX_RETRIES`), then fails over.
     - Timeout $\rightarrow$ `AIProviderTimeoutError`.
   - Preserves `last_model_used` for observability and response attribution.

4. **`backend/app/services/ai/groq_adapter.py`**:
   - Re-architected `generate_plan` to support multi-model fallback across `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, and `llama3-70b-8192`.
   - Implemented bounded retries and sanitized error reporting without secret logging.

5. **`backend/app/services/ai/orchestrator.py`**:
   - Enforced fallback order: `settings.AI_PREFERRED_PROVIDER` (Gemini) $\rightarrow$ Groq $\rightarrow$ Deterministic Fallback.
   - Built structured `fallback_audit_log` tracking provider, model, failure category, and elapsed duration.
   - Populated `provider_used` with specific model identifier (e.g. `gemini (gemini-2.0-flash)`).

6. **`backend/app/services/media/image_search.py`** *(New)*:
   - `DestinationImageSearchService` querying Wikimedia Commons Action API.
   - Landmark-specific query generation (e.g. `"<name> exterior"`, `"<name> architecture"`).
   - Author sanitization, Creative Commons license mapping, SVG/diagram exclusion, URL canonicalization, and in-memory TTL caching.

7. **`backend/app/schemas/destinations.py` & `backend/app/api/v1/destinations.py`**:
   - Added `DestinationMedia = DestinationMediaRead` backward-compatible alias.
   - Exposed `GET /api/v1/destinations/{id_or_slug}/images` with limit and caching.

### Frontend Presentation & UX
1. **`frontend/src/lib/api.ts`**:
   - Added `fetchDestinationImages(slugOrId: string, limit = 8)`.

2. **`frontend/src/features/discovery/DestinationModal.tsx`**:
   - Integrated dynamic image search on destination change.
   - Merged fetched images with seed images and deduplicated by URL.
   - Added thumbnail grid with active selection outline, arrow navigation, and photo counter `[current / total]`.
   - Replaced cropped hero container with `object-fit: contain` and blurred background wrapper.
   - Added "Inspect Full Image" button and uncropped Lightbox modal.
   - Provided error and retry states (`gallery-retry-button`).

3. **`frontend/src/features/itinerary/BudgetSummary.tsx`**:
   - Removed duplicate "Itemized Cost Estimates" heading.
   - Section B serves as canonical `Itemized Cost Estimates` container.
   - Section E re-titled to `Itemized Category Breakdown Table`.

---

## 4. Test Suite Execution & Verification Results

### Backend Verification (Pytest & Ruff)
- **Pytest (AI & Image Search Suites):**
  - Command: `pytest app/tests/test_ai_config.py app/tests/test_ai_adapters.py app/tests/test_ai_orchestrator.py app/tests/test_destination_image_search.py -v`
  - Result: **34 passed, 0 failed, 1 warning in 9.69s**.
- **Pytest (Full Regression Suite):**
  - Command: `pytest app/tests`
  - Result: **187 passed, 0 failed, 30 warnings in 68.12s**.
- **Ruff Code Quality & Linting:**
  - Command: `ruff check .`
  - Result: **0 errors, clean**.

### Frontend Verification (Vitest & Vite Build)
- **Vitest Regression Suite:**
  - Command: `npm test -- --run`
  - Result: **16 test files passed, 95 tests passed, 0 failed in 7.11s**.
- **TypeScript & Production Build:**
  - Command: `npm run build`
  - Result: **`tsc -b && vite build` succeeded in 1.83s with 0 errors**.

### Live API Verification
- `GET http://127.0.0.1:8000/api/v1/destinations/mysore-palace/images` $\rightarrow$ **HTTP 200 OK**, returned 3 authentic photographs from Wikimedia Commons with valid photographer attribution and CC licenses.
- `GET http://127.0.0.1:8000/api/v1/destinations/badami-cave-temples/images` $\rightarrow$ **HTTP 200 OK**, returned 3 authentic photographs with valid CC attribution.

---

## 5. Summary of Acceptance Criteria

| Requirement | Status | Evidence |
| :--- | :---: | :--- |
| **Gemini primary model quota exhaustion (429) triggers automatic fallback** | Passed | Tested in `test_gemini_adapter_model_fallback_on_429` & `test_orchestrator_gemini_quota_exhausted_falls_back_to_groq` |
| **Unavailable Gemini model (404) does not terminate request** | Passed | Tested in `test_gemini_adapter_model_fallback_on_404` |
| **Groq is used when all eligible Gemini models fail** | Passed | Tested in `test_orchestrator_gemini_quota_exhausted_falls_back_to_groq` |
| **Deterministic fallback is used when external providers fail** | Passed | Tested in `test_orchestrator_both_providers_fail_graceful_deterministic_fallback` |
| **Dynamic image search returns genuine, location-specific images** | Passed | Tested in `test_destination_image_search.py` and live HTTP endpoints |
| **Destination detail views display multiple distinct images** | Passed | Tested in `DestinationModal.test.tsx` and frontend tests |
| **Images are not cropped in destination detail views** | Passed | Verified with `object-fit: contain` + blurred backdrop and full-image Lightbox |
| **Duplicate "Itemized Cost Estimates" heading removed** | Passed | Verified with `expect(screen.getAllByText('Itemized Cost Estimates')).toHaveLength(1)` |
