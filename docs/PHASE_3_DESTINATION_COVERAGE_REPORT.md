# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## PHASE 3 DESTINATION COVERAGE & STATEWIDE SATURATION REPORT

**Document ID:** NK-DESTINATION-COVERAGE-P3-2026-10-24  
**Audit Date:** 2026-10-24  
**Auditor:** Principal Geospatial Data Engineer & Travel Planning Architect  

---

## 1. DATA QUALITY & COVERAGE AUDIT SUMMARY

- **Total Destinations Audited:** 61
- **Districts Represented:** 31 of 31 (100.0%) — **100% STATEWIDE SATURATION**
- **Validation Issues Found:** 0
- **Audit Verdict:** ✅ **100% COMPLIANT** with zero data corruption or geographic bounds errors.
- **GPS Coordinate Coverage:** 100.0% within Karnataka boundaries (11.0°N–19.0°N, 73.5°E–79.0°E).
- **Estimated Visit Duration Coverage:** 100.0% (Average: 107 mins, Range: 60–360 mins).
- **Bilingual Parity (EN/KN) Coverage:** 100.0% with complete names, summaries, descriptions, and directions.
- **Provenance Source Citation Coverage:** 100.0% backed by official/editorial sources.

## 2. PRICING & ENTRY FEE INTEGRITY

In accordance with the Anti-Hallucination and Pricing Transparency Mandate:
- **Free Entry Attractions:** 35 (explicitly verified ₹0 / ಉಚಿತ)
- **Paid Entry Attractions:** 25 (verified fee range)
- **Unknown Fee Attractions:** 1 (explicit `null`, never silently zeroed)
- **Rule Enforcement:** Zero instances of unknown fees converted to ₹0.

## 3. COMPLETE 31-DISTRICT STATEWIDE COVERAGE TABLE

Current expanded dataset covers **all 31 of 31 Karnataka districts** across all 4 administrative divisions (Bengaluru, Mysuru, Belagavi, Kalaburagi).

| District Code | District Name | Destination Count | Coverage Status |
| :--- | :--- | :--- | :--- |
| `KA-BAG` | Bagalkote | **3** | Verified Curated |
| `KA-BAL` | Ballari | **1** | Verified Curated |
| `KA-BID` | Bidar | **1** | Verified Curated |
| `KA-BLG` | Belagavi | **3** | Verified Curated |
| `KA-BLRR` | Bengaluru Rural | **1** | Verified Curated |
| `KA-BLRU` | Bengaluru Urban | **3** | Verified Curated |
| `KA-CBL` | Chikkaballapura | **1** | Verified Curated |
| `KA-CHA` | Chamarajanagar | **3** | Verified Curated |
| `KA-CHI` | Chitradurga | **1** | Verified Curated |
| `KA-CKM` | Chikkamagaluru | **3** | Verified Curated |
| `KA-DAV` | Davanagere | **1** | Verified Curated |
| `KA-DHW` | Dharwad | **1** | Verified Curated |
| `KA-DKN` | Dakshina Kannada | **2** | Verified Curated |
| `KA-GAD` | Gadag | **1** | Verified Curated |
| `KA-HAS` | Hassan | **3** | Verified Curated |
| `KA-HAV` | Haveri | **1** | Verified Curated |
| `KA-KAL` | Kalaburagi | **1** | Verified Curated |
| `KA-KOD` | Kodagu | **3** | Verified Curated |
| `KA-KOL` | Kolar | **2** | Verified Curated |
| `KA-KOP` | Koppal | **1** | Verified Curated |
| `KA-MAN` | Mandya | **2** | Verified Curated |
| `KA-MYS` | Mysuru | **4** | Verified Curated |
| `KA-RAI` | Raichur | **1** | Verified Curated |
| `KA-RAM` | Ramanagara | **1** | Verified Curated |
| `KA-SHI` | Shivamogga | **4** | Verified Curated |
| `KA-TUM` | Tumakuru | **1** | Verified Curated |
| `KA-UDP` | Udupi | **2** | Verified Curated |
| `KA-UKN` | Uttara Kannada | **5** | Verified Curated |
| `KA-VIJ` | Vijayapura | **2** | Verified Curated |
| `KA-VJN` | Vijayanagara | **2** | Verified Curated |
| `KA-YAD` | Yadgir | **1** | Verified Curated |

*Note: 100% of Karnataka administrative districts now possess verified curated destination records.*

## 4. CATEGORY BREAKDOWN

| Category | Count | Percentage |
| :--- | :--- | :--- |
| `heritage` | 16 | 26.2% |
| `architecture` | 14 | 23.0% |
| `spiritual_cultural` | 8 | 13.1% |
| `hill_station` | 5 | 8.2% |
| `nature` | 5 | 8.2% |
| `waterfall` | 4 | 6.6% |
| `beach` | 3 | 4.9% |
| `wildlife` | 3 | 4.9% |
| `viewpoint` | 2 | 3.3% |
| `adventure` | 1 | 1.6% |

## 5. EDITORIAL OFFBEAT CLASSIFICATION

- **Famous / Anchor Destinations:** 52
- **Offbeat / Hidden Gems:** 9 (14.8%)

## 6. DATA QUALITY RULES ENFORCED

1. **No Fabricated Facts:** Coordinates, fees, and operational hours originate from verified government/ASI/tourism portals.
2. **Explicit Nulls:** Unverified hours are marked as 'Hours not verified' rather than assuming 9 AM–5 PM.
3. **Bilingual Requirement:** Every destination contains parallel English and Kannada records.
4. **Provenance Attachment:** Every record carries `source_name`, `source_type`, and `checked_at` timestamp.
