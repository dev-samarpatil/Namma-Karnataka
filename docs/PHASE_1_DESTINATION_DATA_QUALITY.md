# NAMMA KARNATAKA (ನಮ್ಮ ಕರ್ನಾಟಕ)
## PHASE 1 DESTINATION DATA QUALITY & COVERAGE REPORT

**Document ID:** NK-DATA-QUALITY-P1-2026-10-23  
**Audit Date:** 2026-10-23  
**Auditor:** Principal Data Quality Engineer & Travel Planning Architect  

---

## 1. DATA QUALITY AUDIT SUMMARY

- **Total Destinations Audited:** 12
- **Validation Issues Found:** 0
- **Audit Verdict:** ✅ **100% COMPLIANT** with zero data corruption or bounds errors.
- **GPS Coordinate Coverage:** 100.0% within Karnataka boundaries (11.0°N–19.0°N, 73.5°E–79.0°E).
- **Estimated Visit Duration Coverage:** 100.0% (Average: 116 mins, Range: 60–180 mins).
- **Bilingual Parity (EN/KN) Coverage:** 100.0% with full name, summary, and description.
- **Provenance Source Citation Coverage:** 100.0% backed by official/editorial sources.

## 2. PRICING & ENTRY FEE INTEGRITY

In accordance with the Anti-Hallucination and Pricing Transparency Mandate:
- **Free Entry Attractions:** 4 (explicitly verified ₹0 / ಉಚಿತ)
- **Paid Entry Attractions:** 7 (verified fee range)
- **Unknown Fee Attractions:** 1 (explicit `null`, never silently zeroed)
- **Rule Enforcement:** Zero instances of unknown fees converted to ₹0.

## 3. GEOGRAPHIC & DISTRICT COVERAGE

Current pilot dataset covers **9 of 31 Karnataka districts** (29.0%).

| District Code | District Name | Destination Count | Sample Destination |
| :--- | :--- | :--- | :--- |
| `KA-BLRU` | KA-BLRU | **1** | Verified curated entry |
| `KA-CKM` | KA-CKM | **1** | Verified curated entry |
| `KA-HAS` | KA-HAS | **1** | Verified curated entry |
| `KA-KOD` | KA-KOD | **1** | Verified curated entry |
| `KA-MYS` | KA-MYS | **2** | Verified curated entry |
| `KA-SHI` | KA-SHI | **2** | Verified curated entry |
| `KA-UDP` | KA-UDP | **1** | Verified curated entry |
| `KA-UKN` | KA-UKN | **2** | Verified curated entry |
| `KA-VJN` | KA-VJN | **1** | Verified curated entry |

*Note: Full statewide expansion to all 31 districts with 50+ destinations is scheduled post-pilot.*

## 4. CATEGORY BREAKDOWN

| Category | Count | Percentage |
| :--- | :--- | :--- |
| `architecture` | 2 | 16.7% |
| `heritage` | 2 | 16.7% |
| `waterfall` | 2 | 16.7% |
| `nature` | 2 | 16.7% |
| `hill_station` | 1 | 8.3% |
| `beach` | 1 | 8.3% |
| `spiritual_cultural` | 1 | 8.3% |
| `wildlife` | 1 | 8.3% |

## 5. EDITORIAL OFFBEAT CLASSIFICATION

- **Famous / Anchor Destinations:** 10
- **Offbeat / Hidden Gems:** 2 (16.7%)

## 6. DATA QUALITY RULES ENFORCED

1. **No Fabricated Facts:** Coordinates, fees, and operational hours originate from verified government/ASI/tourism portals.
2. **Explicit Nulls:** Unverified hours are marked as 'Hours not verified' rather than assuming 9 AM–5 PM.
3. **Bilingual Requirement:** Every destination contains parallel English and Kannada records.
4. **Provenance Attachment:** Every record carries `source_name`, `source_type`, and `checked_at` timestamp.
