# Destination Catalogue Deduplication Audit

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-26  
**Auditor:** Principal Architect & Full-Stack Systems Lead  
**Scope:** Pairwise Geodesic Distance Audit, Catalogue Deduplication, Canonical ID/Slug Mapping, and Scheduler Consolidation.

---

## 1. Executive Summary

A comprehensive pairwise geodesic distance audit was conducted across all destinations in `data/seed/destinations.json`. The analysis detected **two genuine duplicate pairs** where identical geographic attractions were catalogued under distinct UUIDs and URL slugs:

1. **Murudeshwar Temple & Beach:** 11.1 meters apart.
2. **Belagavi Fort:** 135.8 meters apart.

Both duplicate pairs have been merged into canonical destination records. Backward compatibility for legacy IDs and slugs has been implemented across the database schema, repository resolvers, and the deterministic travel scheduler.

The curated catalogue now contains **59 distinct canonical destinations** spanning all 31 districts of Karnataka, with 0 duplicate attractions.

---

## 2. Geodesic Pairwise Audit Findings

Pairwise ellipsoidal geodesic distances ($D \le 1.0\text{ km}$) calculated via the Haversine formula across the destination dataset revealed the following clusters:

| Pair # | Destination A | Destination B | District | Geodesic Distance | Assessment | Action Taken |
|---|---|---|---|---|---|---|
| **1** | `murudeshwar-temple-beach`<br>`11111111-1111-4111-8111-111111111121` | `murudeshwara-temple-beach`<br>`22222222-2222-4222-8222-222222222223` | Uttara Kannada (`KA-UKN`) | **11.1 meters** | **Exact Duplicate:** Both represent the iconic coastal Shiva colossus and beach in Murudeshwar. | Merged into canonical `murudeshwar-temple-beach`. Combined bilingual text and photos. |
| **2** | `belagavi-fort-kamal-basti`<br>`11111111-1111-4111-8111-111111111134` | `belagavi-fort`<br>`22222222-2222-4222-8222-222222222216` | Belagavi (`KA-BLG`) | **135.8 meters** | **Exact Duplicate:** The Kamal Basti Jain temple is located directly inside Belagavi Fort ramparts. | Merged into canonical `belagavi-fort-kamal-basti`. Preserved fort gateway and basadi media. |
| **3** | `lalbagh-botanical-garden` | `cubbon-park` | Bengaluru Urban (`KA-BLRU`) | 2,740 meters | **Distinct:** Separate historic urban parks in Bengaluru. | Kept as independent canonical destinations. |
| **4** | `virupaksha-temple-hampi` | `vitthala-temple-hampi` | Vijayanagara (`KA-VJN`) | 2,210 meters | **Distinct:** Distinct temple complexes within the Hampi World Heritage precinct. | Kept as independent canonical destinations. |
| **5** | `badami-cave-temples` | `bhutanatha-temples-badami` | Bagalkote (`KA-BAG`) | 840 meters | **Distinct:** Cave temples on southern cliff vs Bhutanatha lakeside complex across Agastya Lake. | Kept as independent canonical destinations. |

---

## 3. Merge & Reconciliation Specifications

### 3.1. Murudeshwar Temple & Beach

- **Canonical Record:**
  - **ID:** `11111111-1111-4111-8111-111111111121`
  - **Slug:** `murudeshwar-temple-beach`
  - **Name (EN):** Murudeshwar Temple & Beach
  - **Name (KN):** ಮುರುಡೇಶ್ವರ ದೇವಾಲಯ ಮತ್ತು ಕಡಲತೀರ
  - **District:** Uttara Kannada (`KA-UKN`)
  - **Coordinates:** `14.0942° N, 74.4849° E`
  - **Category:** `spiritual_cultural`
  - **Primary Image:** `https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Shiva_statue_murudeshwar_beach.jpg/960px-Shiva_statue_murudeshwar_beach.jpg`
- **Retired Record:** `murudeshwara-temple-beach` (`22222222-2222-4222-8222-222222222223`)
- **Metadata Merging:**
  - Combined the detailed spiritual history of the 123-foot Shiva statue and 20-story Rajagopuram with beachside water-sport and sunset viewing details.
  - Consolidated verified photographs:
    1. `Shiva_statue_murudeshwar_beach.jpg` (Wide beach and colossus view, CC BY-SA 4.0)
    2. `Murudeshwara_Shiva_Statue.jpg` (Detailed architectural view, CC BY-SA 3.0)
  - Registered aliases: `["murudeshwara-temple-beach", "murudeshwar-temple", "murudeshwara"]`.

### 3.2. Belagavi Fort & Kamal Basti

- **Canonical Record:**
  - **ID:** `11111111-1111-4111-8111-111111111134`
  - **Slug:** `belagavi-fort-kamal-basti`
  - **Name (EN):** Belagavi Fort & Kamal Basti
  - **Name (KN):** ಬೆಳಗಾವಿ ಕೋಟೆ ಮತ್ತು ಕಮಲ ಬಸದಿ
  - **District:** Belagavi (`KA-BLG`)
  - **Coordinates:** `15.8588° N, 74.5222° E`
  - **Category:** `heritage`
  - **Primary Image:** `https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Kamal_Basadi_%28Jain_Temple%29_Belgaum_Fort.jpg/960px-Kamal_Basadi_%28Jain_Temple%29_Belgaum_Fort.jpg`
- **Retired Record:** `belagavi-fort` (`22222222-2222-4222-8222-222222222216`)
- **Metadata Merging:**
  - Integrated 13th-century Ratta dynasty architectural history, stone moat ramparts, Safa Mosque, and Kamal Basti lotus ceiling craftsmanship.
  - Consolidated verified photographs:
    1. `Kamal_Basadi_(Jain_Temple)_Belgaum_Fort.jpg` (Kamal Basti shrine, CC BY-SA 4.0)
    2. `General_view_of_the_gateway_of_the_fort.jpg` (Historic stone gateway, Public Domain)
  - Registered aliases: `["belagavi-fort", "belgaum-fort", "kamal-basti-belgaum"]`.

---

## 4. Architectural & Repository Implementation

### 4.1. Schema Extension
Added optional `aliases` field to destination models:
- **Backend:** `app.schemas.destinations.DestinationBase.aliases: list[str] = Field(default_factory=list)`
- **Frontend:** `frontend/src/types/index.ts` -> `DestinationRead.aliases?: string[]`

### 4.2. Repository Canonical Mappings
In `backend/app/repositories/destinations.py`:
```python
CANONICAL_ID_MAPPINGS: dict[str, str] = {
    "22222222-2222-4222-8222-222222222223": "11111111-1111-4111-8111-111111111121",  # Murudeshwar
    "22222222-2222-4222-8222-222222222216": "11111111-1111-4111-8111-111111111134",  # Belagavi Fort
}

CANONICAL_SLUG_MAPPINGS: dict[str, str] = {
    "murudeshwara-temple-beach": "murudeshwar-temple-beach",
    "belagavi-fort": "belagavi-fort-kamal-basti",
}
```
- `get_by_id(id)` automatically maps retired UUIDs to canonical records.
- `get_by_slug(slug)` transparently routes retired slugs to canonical records.
- `list_destinations` matches free-text search queries against `aliases` as well as title and summary fields.

### 4.3. Deterministic Scheduler Deduplication
In `backend/app/services/scheduler.py` (`DeterministicScheduler.build_schedule`):
- Before constructing day timelines, input destination candidates are checked against `CANONICAL_ID_MAPPINGS` and `CANONICAL_SLUG_MAPPINGS`.
- If an itinerary request contains multiple aliases referring to the same physical attraction, the duplicates are consolidated into a single visit stop, with an informational warning appended to `schedule_warnings`.

---

## 5. Verification Results

1. **Catalogue Count:** Seed records reduced from 61 to 59 canonical destinations with zero coverage loss across Karnataka's 31 districts.
2. **Search Verification:** Searching for `"Murudeshwar"` or `"Murudeshwara"` in the frontend returns exactly 1 destination card.
3. **Belagavi Verification:** Searching for `"Belagavi"` returns Belagavi Fort & Kamal Basti and Gokak Falls; no duplicate fort cards exist.
4. **Automated Tests:** `test_destination_repository.py` and `test_destination_discovery_phase6.py` pass hermetically without errors.
