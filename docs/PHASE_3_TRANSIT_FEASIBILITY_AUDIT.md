# Phase 3 — Transit Journey Feasibility and Transfer Routing Audit

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Audit Date:** 2026-10-24  
**Auditor:** Principal Geospatial Systems & Journey Planning Auditor  
**Components Evaluated:** `backend/app/services/transit/curated_provider.py`, `backend/app/api/v1/transit.py`, `backend/app/tests/test_transit_api.py`  

---

## 1. Executive Summary

This audit assesses the mathematical, temporal, and spatial feasibility of transit journeys computed by the Namma Karnataka transit routing engine. 

### Key Defect Identified & Remediated
During the audit, a temporal feasibility defect was uncovered in `curated_provider.py`:
- **Defect:** Prior to hardening, one-transfer journeys through the central Bengaluru hub computed total journey duration using a constant 30-minute layover (`dur1 + 30 + dur2`), regardless of when the onward connecting service actually departed. If leg 1 arrived at 12:00 and leg 2 departed at 14:30, the true layover was 150 minutes, but the journey reported only 30 minutes, underreporting total travel time by two hours.
- **Remediation:** Implemented `_minutes_diff(t1, t2)` with midnight rollover handling and true physical layover calculation (`dur1 + actual_layover + dur2`).
- **Intermodal Buffer:** Added specialized handling for cross-terminal connections between KSR Bengaluru Railway Station (`stop-blr-railway-sbc`) and Kempegowda Bus Station (`stop-blr-majestic`), enforcing a 35-minute pedestrian subway transfer buffer, compared to 25 minutes for same-terminal transfers.

---

## 2. Direct Route Consistency

Direct corridor queries were evaluated across major axes (e.g., Bengaluru ↔ Mysuru, Bengaluru ↔ Hassan, Bengaluru ↔ Shivamogga):
1. **Departure Matching:** Selected departures correspond strictly to valid scheduled slots in the corridor's timetable.
2. **Arrival Computation:** Arrival is computed by adding the corridor's typical running time (`typical_duration_minutes`) to the departure time with proper modulo 24-hour rollover.
3. **Fare Accuracy:** Minimum and maximum fare brackets reflect one-way adult passenger fares across service classes.
4. **Leg Properties:** Every leg references authentic `TransitStop` objects with complete bilingual naming, coordinates, and operator metadata.

---

## 3. Transfer Feasibility & Hub Architecture

Transfer routing is supported through the primary state transit interchange: the Bengaluru Majestic intermodal complex.

### Evaluation of Transfer Criteria:
- **Spatial Interchange:** Evaluates connections connecting at `stop-blr-majestic` (KSRTC Central) or `stop-blr-railway-sbc` (SWR Central).
- **Physical Feasibility Buffer:**
  - Same-terminal transfers: Minimum 25 minutes buffer.
  - Cross-terminal intermodal transfers (Subway between SBC Rail and Majestic Bus): Minimum 35 minutes buffer.
- **Onward Departure Selection:** The engine searches for the earliest onward departure on Leg 2 that satisfies `dep2 >= arr1 + min_buffer`.
- **Accurate Layover Aggregation:**
  $$\text{Total Duration} = \text{Duration}_{\text{Leg 1}} + (\text{Departure}_{\text{Leg 2}} - \text{Arrival}_{\text{Leg 1}}) + \text{Duration}_{\text{Leg 2}}$$
- **Fare Aggregation:** Total minimum and maximum fares are strictly additive across legs:
  $$\text{Fare}_{\text{total}} = \text{Fare}_{\text{Leg 1}} + \text{Fare}_{\text{Leg 2}}$$

---

## 4. Catchment & Spatial Validation

1. **Haversine Implementation:** Verified the spherical distance calculation in `CuratedTransitProvider._haversine_km(lat1, lon1, lat2, lon2)`:
   - Latitude and longitude parameter ordering is verified.
   - Earth radius used is $R = 6371.0\text{ km}$.
   - Spatial bounding correctly constrains search within Karnataka's geographical envelope.
2. **Catchment Radius Limits:**
   - Default search radius: 10–25 km.
   - Maximum catchment threshold: 45 km.
   - Any catchment distance $> 2.0\text{ km}$ is distinguished in the API response as requiring first-mile/last-mile road transport (local auto-rickshaw or taxi), preventing misleading walking claims.

---

## 5. Road-versus-Transit Comparison

The comparison endpoint (`/api/v1/transit/compare`) aggregates multimodal intelligence:
1. **Road Distance & Duration:** Uses a terrain-adjusted highway estimation formula:
   $$\text{Road Distance} = \text{Haversine Distance} \times 1.28$$
   $$\text{Road Duration} = \frac{\text{Road Distance}}{55\text{ km/h}} \times 60\text{ minutes}$$
2. **Cab Cost Estimation:** Computed at ₹16/km with a base fare of ₹150, accurately reflecting standard intercity cab hire rates (e.g., KSTDC or private taxi tariffs).
3. **Public Transit Advantage:** Clearly highlights cost-effectiveness for solo and dual travelers, while transparently noting that group travelers (3–4 passengers) may find cab fares comparable.
4. **Carbon Footprint Disclosures:** Environmental comparisons deliver a documented qualitative note emphasizing that electrified railway corridors (e.g., SWR Bengaluru–Mysuru) and full-occupancy KSRTC express buses produce significantly lower per-passenger greenhouse gas emissions than single-occupancy private combustion vehicles.

---

## 6. Regression Verification

The transfer feasibility test was added to `backend/app/tests/test_transit_api.py::test_find_transit_journeys_transfer_feasibility`:
- Hubballi → Mysuru via Bengaluru Majestic.
- Verified: `transfers_count == 1`, `len(legs) == 2`, `layover >= 25`, `total_duration_minutes == leg1_dur + layover + leg2_dur`.
- Test execution passed cleanly in 1.10s.
