# VISUAL DISCOVERY AND DESTINATION MEDIA ROOT-CAUSE AUDIT

**Date:** 2026-10-27  
**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Scope:** End-to-end audit of Visual Place Discovery, Destination Media Catalogue, and Gallery Presentation

---

## 1. Executive Summary

This audit investigates why photo-based place identification returned "No confident match" for recognizable Karnataka landmarks, why the destination detail modal lacked functional multi-photo galleries, and why photographs were subjected to aggressive cropping.

---

## 2. Detailed Technical Audit Findings

### Question 1: Which component owns the image-upload state?
* **Finding:** `frontend/src/features/discovery/VisualDiscoveryCard.tsx` owns the image-upload state (`selectedFile`, `previewUrl`, `activeTab`, `isAnalyzing`, `discoveryResult`, `errorMessage`). It is embedded within `frontend/src/features/discovery/DestinationDiscovery.tsx`. A legacy modal `VisualDiscoveryModal.tsx` also existed in the codebase, but `DestinationDiscovery.tsx` renders `VisualDiscoveryCard` directly inline above the destination grid.

### Question 2: Which endpoint does the frontend call after the user clicks "Identify Place"?
* **Finding:** The frontend calls:
  * For photographs: `POST /api/v1/visual-discovery/analyze-image` (via `analyzeImageVisualDiscovery(selectedFile, language)` in `frontend/src/lib/api.ts`).
  * For video keyframes: `POST /api/v1/visual-discovery/analyze-video` (via `analyzeVideoVisualDiscovery(sampledFrames, language)`).

### Question 3: Is the upload actually transmitted as file bytes or merely represented by a filename or browser object?
* **Finding:** Transmitted as real multipart file bytes. `frontend/src/lib/api.ts` constructs a standard `FormData` object with `formData.append('file', file)`. In `fetchApi`, `Content-Type` is omitted when sending `FormData`, allowing `fetch` to automatically set the `multipart/form-data; boundary=...` header. FastAPI receives `file: Annotated[UploadFile, File(...)]` and calls `await file.read()` to obtain real binary image bytes.

### Question 4: Does the backend accept the MIME types sent by the frontend?
* **Finding:** Yes. The frontend validates `image/jpeg`, `image/png`, `image/webp`. The backend opens the image via Pillow (`Image.open(io.BytesIO(data))`), detects format (`JPEG`, `PNG`, `WEBP`), transposes EXIF orientation via `ImageOps.exif_transpose`, and strips metadata for user privacy.

### Question 5: Do file size, decoding, request validation, or timeout handling cause failures?
* **Finding:**
  * File size limits (10MB for photos, 25MB for video) are well calibrated.
  * In the Gemini multimodal path, `AI_PROVIDER_TIMEOUT_SECONDS` (12s) is enforced.
  * However, when live Gemini was disabled or unconfigured (`AI_ENABLE_LIVE_PROVIDERS=false`), the backend immediately dropped into `_grounded_catalogue_matching`.

### Question 6: Does the Gemini adapter receive actual image bytes?
* **Finding:** Yes. In `_call_gemini_multimodal`, image bytes are base64-encoded and passed in the `inlineData` part payload (`{"inlineData": {"mimeType": mime_type, "data": b64_data}}`). However, because `AI_ENABLE_LIVE_PROVIDERS=false` in configuration and during testing, the request was directed solely to the deterministic fallback.

### Question 7: Does the current deterministic fallback analyse image content or rely mainly on filenames, textual hints, and handcrafted traits?
* **Root Cause Identified:**
  * **Critical Defect:** The deterministic fallback previously prioritized filename matching (`re.search(r"\b" + re.escape(feat) + r"\b", fname_clean)`).
  * If a user uploaded a photograph taken from a mobile phone, digital camera, or renamed file (e.g. `IMG_20261025.jpg`, `PXL_12345.jpg`, `photo.jpg`), **zero filename keywords matched**.
  * The image trait fallback (`extract_image_visual_traits`) only checked simple scalar averages over a $64 \times 64$ downsampled thumbnail (`mean_r, mean_g, mean_b`, variance).
  * In real photographs of Karnataka landmarks (like Hampi ruins or temples), the top half of the photo is typically open blue sky. The blue sky raised `b_ratio`, causing `is_heritage_stone` checks (`abs(r_ratio - b_ratio) < 0.12` or `is_warm_stone`) to fail!
  * As a direct consequence, any phone photograph of Hampi or Belur with a blue sky failed all checks and returned `"No confident match found"`.
  * **Solution Required:** A genuine visual matching engine based on spatial grid color/luminance signatures and texture histograms compared against precomputed visual signatures of verified Karnataka destination photographs.

### Question 8: Does candidate matching use canonical destination IDs, slugs, aliases, or inconsistent identifiers?
* **Finding:** Matching is grounded via `DestinationRepository.get_by_slug()`. Slugs, aliases, and IDs are checked against canonical records. Any candidate slug not found in the catalogue is immediately discarded, preventing hallucinated destination IDs.

### Question 9: Does the backend discard otherwise valid candidates through overly strict confidence thresholds?
* **Finding:** In `_build_validated_response`, if `is_confident` is False, the candidate list is cleared. In the fallback, if trait conditions are missed, `is_confident` is set to False with empty candidates. The thresholds were fragile rather than calibrated against visual similarity distance metrics.

### Question 10: Does `VisualDiscoveryResponse` match the response expected by `VisualDiscoveryCard.tsx`?
* **Finding:** Mostly, but `VisualDiscoveryCard` originally had an arithmetic defect where `cand.match_score` ($0.0 - 1.0$) was passed to `Math.round()`, yielding `1%`. This was corrected in Phase 10 to multiply by 100, but the component still needed explicit rendering of visual similarity indicators and candidate category/district tags.

### Question 11: Does the gallery read `media`, `primary_image_url`, or another field?
* **Finding:** `DestinationModal.tsx` reads `destination.media`. If `destination.media` is empty or missing, it falls back to `destination.primary_image_url`.

### Question 12: Does the backend return the complete media array or only one primary photograph?
* **Finding:** The backend serialization (`DestinationRead`) returns the full `media: list[DestinationMediaRead]`. However, in `data/seed/destinations.json`, **55 out of 59 destinations contained only 1 single media item**! The backend was faithfully returning what was in the database; the seed data simply had not been enriched with authentic multi-photo galleries for the other 55 destinations.

### Question 13: Does the modal update the displayed image when the user selects another thumbnail?
* **Finding:** The previous `DestinationModal.tsx` had state `activeMediaIndex`, but **completely omitted rendering a clickable thumbnail strip**! Only `‹` and `›` arrow buttons existed, with no visible thumbnail strip.

### Question 14: Do malformed thumbnail URLs, incorrect file paths, duplicate image records, or CSS cropping cause gallery defects?
* **Finding:**
  1. **No Thumbnail Strip:** Users could not see or click thumbnails because no thumbnail component was present in the JSX.
  2. **Cropping:** While `object-fit: contain` was applied to the inner `img`, the container was locked to a fixed height of `350px` without responsive max-height scaling (`min(50vh, 480px)`), leading to awkward letterboxing on wide viewports and cramped views on small mobile devices.
  3. **Attribution and Caption Placement:** Captions and attribution were floating inside the hero banner in an absolute overlay that covered the bottom of the contained image when captions were long or bilingual. The caption and source metadata must be clearly laid out below or distinctly framed.

---

## 3. Coordinated Action Plan

1. **Implement Genuine Visual Matching Fallback:**
   * Build a spatial-grid visual feature extractor ($4 \times 4$ spatial grid computing local hue, saturation, luminance, and edge texture variance).
   * Precompute visual signatures for all verified Karnataka destinations and embed them into the visual discovery engine.
   * Compare uploaded image bytes against destination signatures using normalized Euclidean/cosine similarity, so generic filenames like `IMG_1234.jpg` depicting Hampi, Belur, waterfalls, beaches, or forts match accurately based on actual pixel content.
2. **Enrich Destination Catalogue with Multi-Photo Galleries:**
   * Curate authentic, verifiable Wikimedia Commons photographs (3 to 5 images per major destination) with explicit photographer attributions, CC BY-SA licenses, and separate display/source URLs.
   * Update `data/seed/destinations.json`.
3. **Build Complete Responsive Gallery UI in `DestinationModal.tsx`:**
   * Add a dedicated, scrollable thumbnail strip below the main image with active indicator borders.
   * Separate the main image container from caption/attribution rows so captions never obscure the photograph.
   * Ensure `object-fit: contain` with soft blurred backdrop is responsive across mobile, tablet, and desktop viewports.
   * Provide full keyboard navigation (`ArrowLeft` / `ArrowRight`), image counter (`1 / N`), and image error fallback.
4. **Local Verification:**
   * Pytest for visual discovery (recognisable image, generic filename `IMG_1234.jpg`, catalogue grounding, non-Karnataka photo, malformed upload, video).
   * Vitest for frontend gallery and discovery card.
   * Media validator and seed validator.
