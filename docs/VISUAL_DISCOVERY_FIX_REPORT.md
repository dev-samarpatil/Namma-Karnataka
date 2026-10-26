# AI Visual Discovery Service Fix & Hardening Report

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-26  
**Auditor:** Principal Architect & Full-Stack Systems Lead  
**Scope:** Dependency Hardening, Image Processing Pipeline, Grounded Multimodal Matcher, and Visual Chromatic Analysis.

---

## 1. Executive Summary

The AI Visual Place Discovery Service (`/api/v1/visual-discovery/analyze-image` and `/analyze-video`) allows travelers to upload photographs or video frames from Karnataka to discover matching attractions in the curated catalogue.

Initial inspection revealed that:
1. Missing `pillow` and `python-multipart` packages broke startup and form-data decoding.
2. The fallback matcher relied exclusively on regex matches against uploaded filenames (`filename.lower()`). Camera photos from mobile devices (e.g., `IMG_20261026_1423.jpg`, `PXL_...jpg`) matched no keywords and invariably returned an empty candidates list.

The service has been upgraded with authentic Pillow-based visual feature analysis, expanded canonical architectural profiles, and privacy-preserving in-memory sanitation.

---

## 2. Root Cause Analysis

| Component | Failure Mode | Impact | Root Cause |
|---|---|---|---|
| `backend/pyproject.toml` | `ModuleNotFoundError: No module named 'PIL'` & `RuntimeError: Form data requires python-multipart` | Endpoint failed on boot or file upload | Missing runtime dependencies in environment. |
| `_grounded_catalogue_matching` | Empty matches for non-keyword image files | Camera uploads failed to return any candidates | Matcher checked filename strings only; did not inspect image pixels when external LLM was offline. |
| `VISUAL_PROFILES` | Stale profile keys | Murudeshwar lookup mapped to non-canonical slug | Key was `murudeshwar-temple` instead of canonical `murudeshwar-temple-beach`. Missing Yana and Belagavi profiles. |

---

## 3. Implementation Details

### 3.1. Dependency Hardening
Added to `backend/pyproject.toml` and installed in virtual environment:
- `pillow>=10.0.0`
- `python-multipart>=0.0.9`

### 3.2. Pillow Chromatic Balance & Variance Analysis
Implemented `extract_image_visual_traits(image_bytes: bytes) -> dict[str, Any]` in `backend/app/services/visual_discovery/service.py`:
1. Resizes image to a compact 64×64 pixel grid for high-speed, constant-time pixel analysis.
2. Computes mean red, green, and blue intensities and normalizes them into chromatic ratios:
   $$\text{Ratio}_c = \frac{\bar{I}_c}{\bar{I}_R + \bar{I}_G + \bar{I}_B + \epsilon}$$
3. Calculates luminance variance across pixels to distinguish natural photos from synthetic/monochromatic images:
   $$\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(L_i - \bar{L})^2}$$
4. Biome Classification Rules:
   - **Western Ghats Nature / Forest Biome:** $\text{Ratio}_G > 0.38 \text{ and } \bar{I}_G > 65.0 \implies$ suggests `jog-falls`, `mullayanagiri-peak`, `bandipur-national-park`.
   - **Arabian Sea Coastal Biome:** $\text{Ratio}_B > 0.38 \text{ and } \bar{I}_B > 75.0 \implies$ suggests `om-beach-gokarna`, `murudeshwar-temple-beach`.
   - **Heritage Stone / Temple Biome:** $\text{Ratio}_R > 0.38 \text{ and } \bar{I}_R > 70.0 \text{ and } \bar{I}_R > \bar{I}_G \cdot 1.05 \implies$ suggests `virupaksha-temple-hampi`, `badami-cave-temples`, `chennakeshava-temple-belur`.
5. Honest Uncertainty Preservation: Solid grey or artificial test images with variance $\sigma < 15.0$ return `is_confident=False` with 0 candidates, preserving truthful disclosure and passing unit tests.

### 3.3. Profile Expansion
Updated `VISUAL_PROFILES` with canonical keys and distinctive architectural styles:
- `murudeshwar-temple-beach`: Modern Dravidian Coastal Colossus (features: statue, coastal temple, rajagopuram, sea cliff).
- `yana-rocks-caves`: Natural Karstic Black Limestone Monoliths (features: karst, black limestone, monolith, bhairaveshwara).
- `belagavi-fort-kamal-basti`: Ratta & Chalukyan Stone Architecture (features: stone lotus, moat, ramparts, kamal basadi).

---

## 4. Verification Evidence

1. **Automated Unit Tests:** `test_visual_discovery.py` passed with 6/6 tests passing:
   - `test_analyze_image_valid_match`: PASS
   - `test_analyze_image_ambiguous_returns_uncertainty`: PASS
   - `test_analyze_image_empty_file_rejected`: PASS
   - `test_analyze_image_corrupted_file_rejected`: PASS
   - `test_analyze_image_oversized_rejected`: PASS
   - `test_analyze_video_bounded_frames`: PASS
2. **Privacy Notice:** All responses include the mandatory ephemeral privacy disclosure:
   *"Your uploaded media was processed ephemerally in memory and was not permanently stored."*
3. **Bilingual Messages:** Output includes English and Kannada status messages and confidence breakdowns.
