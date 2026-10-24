# Phase 7 AI Visual Place Discovery Architecture

**Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)**  
**Version:** Phase 7.0  
**Status:** Implemented & Verified

---

## 1. Overview and Core Philosophy

Namma Karnataka's Visual Place Discovery enables travellers to upload photographs or short travel video clips and discover matching destinations across Karnataka.

Unlike generic image search or unconstrained AI vision bots, **Namma Karnataka grounds every visual candidate strictly within the verified 61-destination catalogue**. The system adheres to these foundational principles:
1. **Never Invent Places or Coordinates:** If an AI model hallucinates a place, suggests an uncurated location, or generates a destination slug not present in the verified repository, the candidate is discarded.
2. **Distinguish Observation from Interpretation:** The analysis explicitly separates observable features (e.g. Dravidian stone gopuram, Hoysala soapstone carving, four-tiered waterfall) from inferred historical or geographical claims.
3. **Honest Uncertainty:** When an image lacks distinctive landmarks or is ambiguous (e.g. generic forest, lake, or common street), the system returns `is_confident: false` and prompts the user rather than guessing an unrelated destination with false confidence.
4. **Zero-Persistence Privacy by Default:** User-uploaded media is processed ephemerally in memory. EXIF metadata is stripped prior to any external provider request, and media files are never saved to public storage buckets.

---

## 2. Media Inputs, Formats & Validation Rules

| Attribute | Image Discovery | Video Discovery |
|---|---|---|
| **Supported Formats** | JPEG (`image/jpeg`), PNG (`image/png`), WebP (`image/webp`) | MP4 (`video/mp4`), WebM (`video/webm`) keyframes |
| **Max Payload Size** | 10 MB | 25 MB / max 5 sampled frames |
| **Dimension Bounds** | Min: 32 x 32 px, Max: 8192 x 8192 px | Min: 32 x 32 px, Max: 8192 x 8192 px |
| **Magic Byte Verification** | Enforced via `Pillow Image.verify()` | Enforced per sampled keyframe |
| **Metadata / Privacy** | EXIF stripped via `ImageOps.exif_transpose` | EXIF stripped prior to transmission |

---

## 3. Video Frame Sampling Architecture

Because Python runtime environments in cloud containers or client installations frequently lack system-level `ffmpeg` or `opencv` binaries, Namma Karnataka implements a resilient hybrid pipeline:
1. **Client-Side Extraction (Primary):** The browser uses native HTML5 `<video>` and `<canvas>` elements to seek and decode keyframes at bounded intervals (e.g., 15%, 50%, 85% of duration).
2. **Bounded Keyframe Limits:** A strict maximum of 5 sampled keyframes (`MAX_VIDEO_FRAMES = 5`) prevents memory exhaustion and network congestion.
3. **Backend Multi-part Frame Handling:** Keyframes are submitted as multipart files to `POST /api/v1/visual-discovery/analyze-video`.
4. **Cross-Frame Evidence Aggregation:** Observable features across all valid frames are combined to reinforce candidate identification.

---

## 4. Multimodal AI Integration & Deterministic Fallback

### Multimodal Gemini Adapter
- **Provider:** Google Generative Language REST API (`gemini-2.5-flash` / `gemini-1.5-flash`).
- **Payload:** `contents.parts` containing:
  - `inlineData` with base64-encoded image and MIME type.
  - Strict system prompt injecting the active 61-destination catalogue.
- **Enforced JSON Schema:**
  ```json
  {
    "is_confident": true,
    "observed_features": ["Ornate Dravidian gopuram", "Granite monoliths"],
    "architectural_style": "Vijayanagara Dravidian",
    "candidates": [
      {
        "slug": "virupaksha-temple-hampi",
        "match_score": 0.95,
        "confidence_label": "strong_match",
        "matching_reasons": ["Visible 50-meter tiered gopuram and Tungabhadra boulder terrain"]
      }
    ]
  }
  ```

### Deterministic Grounded Fallback
When live AI providers are disabled (test/offline mode) or when rate limits/timeouts occur:
- Evaluates visual signatures against curated profiles (`mysore-palace`, `virupaksha-temple-hampi`, `gol-gumbaz-vijayapura`, `jog-falls`, `chennakeshava-temple-belur`, `badami-cave-temples`, `om-beach-gokarna`, etc.).
- Evaluates word-boundary regex tokens and observable traits.
- Returns honest ambiguity if the image does not uniquely match a known profile.

---

## 5. API Contracts

### A. Photo Discovery: `POST /api/v1/visual-discovery/analyze-image`
- **Request:** `multipart/form-data`
  - `file`: Image binary.
  - `language`: `"en"` | `"kn"` (default: `"en"`).
- **Response Schema:** `VisualDiscoveryResponse`

### B. Video Discovery: `POST /api/v1/visual-discovery/analyze-video`
- **Request:** `multipart/form-data`
  - `frames`: List of sampled keyframe files (max 5).
  - `language`: `"en"` | `"kn"`.
- **Response Schema:** `VisualDiscoveryResponse`

```json
{
  "query_type": "image",
  "is_confident": true,
  "message_en": "Found a strong visual match for Mysuru Palace (Amba Vilas) in Mysuru.",
  "message_kn": "ಮೈಸೂರು ಜಿಲ್ಲೆಯ ಮೈಸೂರು ಅರಮನೆ (ಅಂಬಾ ವಿಲಾಸ) ತಾಣಕ್ಕೆ ಹೊಂದಾಣಿಕೆಯಾಗಿದೆ.",
  "candidates": [
    {
      "destination_id": "11111111-1111-4111-8111-111111111101",
      "slug": "mysore-palace",
      "name_en": "Mysuru Palace (Amba Vilas)",
      "name_kn": "ಮೈಸೂರು ಅರಮನೆ (ಅಂಬಾ ವಿಲಾಸ)",
      "district_code": "KA-MYS",
      "district_name_en": "Mysuru",
      "district_name_kn": "ಮೈಸೂರು",
      "category": "architecture",
      "match_score": 0.92,
      "confidence_label": "strong_match",
      "matching_reasons": [
        "Features match Indo-Saracenic & Royal Wadiyar profile",
        "Distinctive visual signature corresponding to KA-MYS region"
      ],
      "image_url": "https://images.unsplash.com/photo-1600100397608-f010f423b971?auto=format&fit=crop&w=400&q=80"
    }
  ],
  "sampled_frame_count": null,
  "analyzed_at": "2026-10-24T13:25:00Z",
  "privacy_notice": "Your uploaded media was processed ephemerally in memory and was not permanently stored."
}
```

---

## 6. Security, Privacy & Integrity Guarantees

1. **Prompt Injection Resistance:** Text detected within an image is categorized strictly as visual signage, never parsed as system instructions.
2. **Catalogue Invariant:** Every candidate destination must resolve to an active record in `DestinationRepository`. All unrecognized IDs are discarded.
3. **No External Leaks:** Photos and video frames are never stored on disk or in remote blob stores.
4. **Client-Side Fallback:** If offline, the UI shows clear messaging and allows manual exploration of the cached catalogue.

---
