# Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ) — Phase 6 Search and Advanced Destination Filters
**Canonical Scope:** Faceted Search, Bilingual Query Normalization, Multi-Criteria Filtering, Active Chips, and Sorting  
**Execution Environment:** React 18 • TypeScript • Tailwind CSS • FastAPI Backend  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED

---

## 1. Overview

The destination catalogue features 61 verified destinations spanning all 31 districts of Karnataka. To allow travellers to find suitable destinations quickly, Phase 6 implements a comprehensive, multi-faceted filtering and search system operating seamlessly in both English and Kannada.

---

## 2. Filter Dimensions & Semantics

| Filter Dimension | Supported Options | Implementation & Contract |
|---|---|---|
| **Free Text Search** | Free text input in English or Kannada | Matches against `name_en`, `name_kn`, `summary_en`, `summary_kn`, `category`, and `district_code`. Whitespace normalized and case-insensitive. |
| **District** | Authoritative 31-district master list | Filter by official district codes (e.g., `KA-MY`, `KA-VIJ`, `KA-UK`, `KA-DH`). |
| **Category** | 10 Curated categories | `heritage`, `architecture`, `spiritual`, `hill_station`, `nature`, `waterfall`, `beach`, `wildlife`, `viewpoint`, `adventure`. |
| **Fee Type** | `all`, `free`, `paid`, `unknown` | `free`: `entry_fee_min_inr == 0` and `entry_fee_max_inr == 0`.<br>`paid`: `entry_fee_max_inr > 0`.<br>`unknown`: entry fee is null. Unknown fees are strictly segregated and never assumed to be free. |
| **Visit Duration** | `all`, `under_2h`, `2h_to_4h`, `over_4h` | `under_2h`: `<= 120` minutes.<br>`2h_to_4h`: `> 120` and `<= 240` minutes.<br>`over_4h`: `> 240` minutes. |
| **Offbeat Status** | Boolean toggle | Filters exclusively for verified hidden gems / offbeat sites (`is_offbeat == true`). |
| **Sort Order** | `name`, `duration_asc`, `duration_desc`, `district` | Sorts the filtered results deterministically. |

---

## 3. Composable Filtering Logic

Filters compose conjunctively (AND logic). A destination is included in the result set if and only if it satisfies all active filter conditions:

$$\text{Visible}(D) = \text{Match}_{\text{search}}(D) \land \text{Match}_{\text{district}}(D) \land \text{Match}_{\text{cat}}(D) \land \text{Match}_{\text{fee}}(D) \land \text{Match}_{\text{duration}}(D) \land \text{Match}_{\text{offbeat}}(D)$$

### Example Combination:
- District = `KA-MY` (Mysuru)
- Category = `heritage`
- Fee Type = `paid`
- Duration = `2h_to_4h`
- Result: Returns Mysuru Palace (`dest-mysuru-palace`), correctly excluding Chamundi Hills (spiritual / free) and Zoo (different duration).

---

## 4. UI Controls & Active Filter Chips

In `DestinationDiscovery.tsx`:
1. **Interactive Filter Bar:** Responsive grid featuring search bar, district dropdown, category selector, fee type buttons, duration selector, offbeat checkbox, and sort dropdown.
2. **Active Filter Chips:** When filters are applied, dismissible chips appear above the destination grid:
   - `District: Mysuru ✕`
   - `Category: Heritage ✕`
   - `Fee: Paid Entry ✕`
   - `Duration: 2 to 4 hours ✕`
   - `Offbeat Only ✕`
3. **Clear All Controls:** A single "Clear all filters (ಎಲ್ಲವನ್ನೂ ತೆರವುಗೊಳಿಸಿ)" button resets all controls back to default state.
4. **Live Result Counter:** Accurately announces:
   - *"Showing 12 destinations (12 ತಾಣಗಳನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ)"*
5. **No Results Recovery:** If no destinations match the combination, a friendly empty-state card prompts the user to broaden their search criteria or clear active filters.

---

## 5. Offline and PWA Readiness

Since the 61-destination catalogue is cached locally in service worker storage and IndexedDB/state, all filter evaluation, string matching, duration comparisons, and sorting execute instantaneously in-browser without network roundtrips, ensuring 100% functionality even when offline in remote parts of the Western Ghats.
