# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## PHASE 2 DESTINATION COVERAGE & DATA QUALITY REPORT

**Document ID:** NK-DESTINATION-COVERAGE-P2-2026-10-23  
**Audit Date:** 2026-10-23  
**Auditor:** Principal Data Quality Engineer & Travel Planning Architect  

---

## 1. DATA QUALITY & COVERAGE AUDIT SUMMARY

- **Total Destinations Audited:** 40
- **Districts Represented:** 18 of 31 (58.1%)
- **Validation Issues Found:** 0
- **Audit Verdict:** ✅ **100% COMPLIANT** with zero data corruption or geographic bounds errors.
- **GPS Coordinate Coverage:** 100.0% within Karnataka boundaries (11.0°N–19.0°N, 73.5°E–79.0°E).
- **Estimated Visit Duration Coverage:** 100.0% (Average: 108 mins, Range: 60–360 mins).
- **Bilingual Parity (EN/KN) Coverage:** 100.0% with complete names, summaries, descriptions, and directions.
- **Provenance Source Citation Coverage:** 100.0% backed by official/editorial sources.

## 2. PRICING & ENTRY FEE INTEGRITY

In accordance with the Anti-Hallucination and Pricing Transparency Mandate:
- **Free Entry Attractions:** 18 (explicitly verified ₹0 / ಉಚಿತ)
- **Paid Entry Attractions:** 21 (verified fee range)
- **Unknown Fee Attractions:** 1 (explicit `null`, never silently zeroed)
- **Rule Enforcement:** Zero instances of unknown fees converted to ₹0.

## 3. GEOGRAPHIC & DISTRICT COVERAGE

Current expanded dataset covers **18 of 31 Karnataka districts** across all 4 administrative divisions (Bengaluru, Mysuru, Belagavi, Kalaburagi).

| District Code | District Name | Destination Count | Coverage Status |
| :--- | :--- | :--- | :--- |
| `KA-BAG` | Bagalkote | **2** | Verified Curated |
| `KA-BID` | Bidar | **1** | Verified Curated |
| `KA-BLG` | Belagavi | **2** | Verified Curated |
| `KA-BLRU` | Bengaluru Urban | **3** | Verified Curated |
| `KA-CHA` | Chamarajanagar | **2** | Verified Curated |
| `KA-CHI` | Chitradurga | **1** | Verified Curated |
| `KA-CKM` | Chikkamagaluru | **3** | Verified Curated |
| `KA-DKN` | Dakshina Kannada | **2** | Verified Curated |
| `KA-HAS` | Hassan | **3** | Verified Curated |
| `KA-KAL` | Kalaburagi | **1** | Verified Curated |
| `KA-KOD` | Kodagu | **3** | Verified Curated |
| `KA-MAN` | Mandya | **2** | Verified Curated |
| `KA-MYS` | Mysuru | **3** | Verified Curated |
| `KA-SHI` | Shivamogga | **3** | Verified Curated |
| `KA-UDP` | Udupi | **2** | Verified Curated |
| `KA-UKN` | Uttara Kannada | **3** | Verified Curated |
| `KA-VIJ` | Vijayapura | **2** | Verified Curated |
| `KA-VJN` | Vijayanagara | **2** | Verified Curated |

*Note: Full statewide expansion to all 31 districts with 50+ destinations is scheduled post-pilot.*

## 4. CATEGORY BREAKDOWN

| Category | Count | Percentage |
| :--- | :--- | :--- |
| `heritage` | 11 | 27.5% |
| `spiritual_cultural` | 6 | 15.0% |
| `architecture` | 5 | 12.5% |
| `waterfall` | 4 | 10.0% |
| `hill_station` | 3 | 7.5% |
| `beach` | 3 | 7.5% |
| `nature` | 3 | 7.5% |
| `wildlife` | 3 | 7.5% |
| `viewpoint` | 2 | 5.0% |

## 5. EDITORIAL OFFBEAT CLASSIFICATION

- **Famous / Anchor Destinations:** 37
- **Offbeat / Hidden Gems:** 3 (7.5%)

## 6. DATA QUALITY RULES ENFORCED

1. **No Fabricated Facts:** Coordinates, fees, and operational hours originate from verified government/ASI/tourism portals.
2. **Explicit Nulls:** Unverified hours are marked as 'Hours not verified' rather than assuming 9 AM–5 PM.
3. **Bilingual Requirement:** Every destination contains parallel English and Kannada records.
4. **Provenance Attachment:** Every record carries `source_name`, `source_type`, and `checked_at` timestamp.
