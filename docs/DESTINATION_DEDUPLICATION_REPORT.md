# DESTINATION DEDUPLICATION REPORT

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 26, 2026  
**Scope:** Complete Destination Catalogue Audit & Canonical Resolution  

---

## 1. Catalogue Survey & Methodology

The destination catalogue was audited across all 59 records in `data/seed/destinations.json`, the backend `InMemoryDestinationRepository`, and the Supabase cloud table.

Auditing methodology examined 5 orthogonal dimensions:
1. **Coordinate Proximity:** Haversine distance matrix calculated between all 59 records. 0 pairs exist within 1.5 km of each other.
   - Nearest physical neighbors:
     - Lalbagh Botanical Garden vs Tipu Sultan's Summer Palace: 1.52 km (Distinct heritage & nature attractions).
     - Mysore Palace vs St. Philomena's Cathedral: 1.84 km (Distinct royal palace vs gothic cathedral).
     - Virupaksha Temple vs Vijaya Vittala Temple: 2.15 km (Distinct UNESCO monument complexes in Hampi).
2. **Title & Transliteration Similarity:** Levenshtein and substring comparisons across English and Kannada names.
3. **Primary Photography Provenance:** Cross-referencing image URLs and Wikimedia Commons upload hashes.
4. **Physical Visitable Complex Boundary:** Distinguishing between distinct attractions and components of a single complex.
5. **Legacy Itinerary Compatibility:** Verifying that old saved trips containing legacy IDs or slugs remain fully resolvable.

---

## 2. Duplicate Consolidation Details

### Case 1: Murudeshwar Temple & Beach
- **Canonical Destination ID:** `11111111-1111-4111-8111-111111111121`
- **Canonical Slug:** `murudeshwar-temple-beach`
- **Canonical Category:** `spiritual_cultural`
- **Canonical Name (EN):** Murudeshwar Temple & Beach
- **Canonical Name (KN):** ಮುರುಡೇಶ್ವರ ದೇವಾಲಯ ಮತ್ತು ಕಡಲತೀರ
- **District:** Uttara Kannada (Gokarna) (`KA-UK`)
- **Coordinates:** Lat 14.0942, Lon 74.4849
- **Retired / Preserved Aliases:**
  - ID: `22222222-2222-4222-8222-222222222223`
  - Slug: `murudeshwara-temple-beach`
  - Text Aliases: `["Murudeshwara Temple & Coastal Beach", "Murudeshwar Shiva Statue"]`
- **Consolidation Rationale:**
  - Both records described the identical site on Kanduka Hill featuring the world's second-tallest Shiva statue (123 ft) and the 20-storied Rajagopura overlooking the Arabian Sea.
  - Distinct spellings (Murudeshwar vs Murudeshwara) were merged into the canonical record while registering the alternate spelling as an alias for search and URL resolution.
  - Media records verified: Primary photo by Prof. Mohammed Saleem (CC BY-SA 4.0, Wikimedia Commons).

### Case 2: Belagavi Fort & Kamal Basti
- **Canonical Destination ID:** `11111111-1111-4111-8111-111111111134`
- **Canonical Slug:** `belagavi-fort-kamal-basti`
- **Canonical Category:** `heritage`
- **Canonical Name (EN):** Belagavi Fort & Kamal Basti
- **Canonical Name (KN):** ಬೆಳಗಾವಿ ಕೋಟೆ ಮತ್ತು ಕಮಲ ಬಸದಿ
- **District:** Belagavi (`KA-BLG`)
- **Coordinates:** Lat 15.8583, Lon 74.5204
- **Retired / Preserved Aliases:**
  - ID: `22222222-2222-4222-8222-222222222216`
  - Slug: `belagavi-fort`
  - Text Aliases: `["Belgaum Fort", "Kamala Basadi", "Belagavi Kote"]`
- **Consolidation Rationale:**
  - Kamal Basti is a 10th-century Ratta dynasty Jain temple constructed inside the ramparts of Belagavi Fort. Treating the fort and Kamal Basti as separate independent destinations previously caused dual itinerary visits to the exact same complex.
  - Consolidating the record into `Belagavi Fort & Kamal Basti` under `heritage` captures both the military ramparts and the fine Chalukyan stone architecture.
  - Media records verified: Primary photo by Manjunath Doddamani (CC BY-SA 4.0, Wikimedia Commons).

---

## 3. Backward Compatibility and Saved-Trip Preservation

To ensure guest trips and cloud itineraries created prior to deduplication load without errors:
1. **Repository-Level Alias Mappings:**
   ```python
   CANONICAL_ID_MAPPINGS = {
       "22222222-2222-4222-8222-222222222223": "11111111-1111-4111-8111-111111111121",
       "22222222-2222-4222-8222-222222222216": "11111111-1111-4111-8111-111111111134",
   }
   CANONICAL_SLUG_MAPPINGS = {
       "murudeshwara-temple-beach": "murudeshwar-temple-beach",
       "belagavi-fort": "belagavi-fort-kamal-basti",
   }
   ```
2. **Scheduler Deduplication Invariant:**
   - In `backend/app/services/scheduler.py`, `get_stop_alternatives()` and `regenerate_day()` normalize all existing stops to canonical IDs before checking for candidates.
   - Guaranteed Invariant: `A single itinerary must not contain the same canonical destination more than once unless the user explicitly requests repeated visits.`
3. **Database Query Exclusion:**
   - `SupabaseDestinationRepository.list_destinations()` injects `id=not.in.(22222222-2222-4222-8222-222222222223,22222222-2222-4222-8222-222222222216)` to guarantee that legacy IDs are never served as distinct cards.

---

## 4. Verification Results

| Test Scenario | Tool | Result |
| :--- | :--- | :--- |
| Keyword Search "Murudeshwar" | API + Playwright | Exactly 1 card returned; canonical ID used |
| Keyword Search "Belagavi" | API + Playwright | Exactly 1 card returned; Category is Heritage |
| Legacy ID Resolution `2222...2223` | Unit Test | Resolves to canonical `1111...1121` |
| Legacy ID Resolution `2222...2216` | Unit Test | Resolves to canonical `1111...1134` |
| Itinerary Stop Alternatives | Pytest | Excludes both canonical and legacy aliases |
| Catalogue Count | Media Validation Script | 59 canonical records, 0 duplicate coordinates |
