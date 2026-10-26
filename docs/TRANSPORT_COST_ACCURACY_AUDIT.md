# Transportation Cost Accuracy & Routing Provenance Audit

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-26  
**Auditor:** Principal Architect & Full-Stack Systems Lead  
**Scope:** Public Transit Corridor Matching, Distance-Proportional Fares, Transfer Loop Prevention, and Metered Auto Tariffs.

---

## 1. Executive Summary

A critical cost-modelling defect was detected where travel legs of vastly different distances exhibited identical or suspiciously similar transit costs (for example, ₹260 charged for a 3.3 km intra-city hop as well as for a 46.2 km regional journey).

Deep diagnostic investigation traced this anomaly to two interrelated algorithmic flaws:
1. **Unconstrained Transit Catchment & Circular Transfer Loops in `curated_provider.py`:** The curated transit provider applied a static 45 km catchment radius and allowed 1-transfer connections across the entire state network. For intra-city trips in Mysuru or Bengaluru, origins and destinations both snapped to `stop-blr-majestic` or matched the BMTC Airport Volvo corridor (`corridor-blr-airport-bmtc`, fare ₹260), charging flat intercity or airport express fares for local trips!
2. **Missing Distance Tiers in `scheduler.py`:** When transit corridors were unavailable, fallback alternatives defaulted to flat constants (e.g. ₹150 first/last mile auto fees, flat bus rates, or falling through to full commercial cab tariffs).

Both the routing provider and scheduler have been updated with distance-tiered logic, loop prevention, and genuine Karnataka municipal auto and KSRTC state bus tariffs.

---

## 2. Root Cause Analysis

### 2.1. The "₹260 for 3.3 km" Defect Trace
In `data/seed/transit_network.json`, corridor `corridor-blr-airport-bmtc` (BMTC Vayu Vajra KIA-9) connects Majestic to Kempegowda International Airport with a verified flat fare of **₹260.00**.

When planning an itinerary with an intra-city leg (such as Mysuru Palace to Mysuru Rail Museum, 3.3 km):
1. `find_journeys` searched for origin and destination stops within a static 45 km radius.
2. For journeys near Bengaluru or when multi-hop matching snapped to regional hubs, `corridor-blr-airport-bmtc` was returned as the top transit match!
3. For multi-hop connections, transfer routing allowed `origin_stop.stop_id == destination_stop.stop_id`, creating circular detours through Bengaluru Majestic (e.g., Mysuru $\to$ Bengaluru $\to$ Mysuru), charging ₹295/₹260!

---

## 3. Implementation Details

### 3.1. Routing Loop Prevention (`backend/app/services/transit/curated_provider.py`)
1. **Short-Distance Exclusion:** If straight-line distance is under 15 km, intercity transit corridor matching is bypassed:
   ```python
   direct_dist_km = haversine_distance_km(origin_lat, origin_lon, dest_lat, dest_lon)
   if direct_dist_km < 15.0:
       return []  # Defer to local city transit / metered auto in scheduler
   ```
2. **Proportional Catchment Radius:** Rather than a static 45 km radius, the catchment scales dynamically with journey length:
   ```python
   catchment_radius_km = min(40.0, max(10.0, direct_dist_km * 0.40))
   ```
3. **Detour & Circuit Prevention:**
   - Single corridors are rejected if corridor distance exceeds $2.5 \times \text{direct\_dist\_km}$.
   - One-transfer connections strictly disallow `o_stop.stop_id == d_stop.stop_id` (preventing A $\to$ B $\to$ A circular routes).
   - Combined transfer distance cannot exceed $2.5 \times \text{direct\_dist\_km}$.

### 3.2. Proportional Multi-Tier Transport Modeling (`backend/app/services/scheduler.py`)

Transportation costs now adhere to three realistic distance tiers:

| Distance Tier | Primary Modes | Cost Formulation | Example Leg (1 Traveler) |
|---|---|---|---|
| **Tier 1: Pedestrian Hop**<br>($\text{dist} \le 1.5\text{ km}$) | Walking (Free)<br>Local Bus Hop | **Walk:** ₹0.00 (at ~13 mins/km)<br>**Local Bus:** Flat stage fare ₹15.00/person | Mysuru Palace to Devaraja Market (1.1 km):<br>• Walk: **₹0** (15 mins)<br>• Bus: **₹15** (10 mins) |
| **Tier 2: Local Urban / Town**<br>($1.5 < \text{dist} \le 15.0\text{ km}$) | City Bus (BMTC / Local KSRTC)<br>Metered Auto-Rickshaw | **City Bus:** $\min(30, \max(15, 10 + 1.5 \times \text{dist}))$/person<br>**Auto:** $\max(35, 30 + (\text{dist} - 1.5) \times 16)$ | Mysuru Palace to Rail Museum (3.3 km):<br>• City Bus: **₹15**<br>• Metered Auto: **₹59** (base ₹30 + ₹29)<br>• Car Fuel: **₹23** |
| **Tier 3: Regional Intercity**<br>($\text{dist} > 15.0\text{ km}$) | KSRTC Regional Bus<br>Mixed (Bus + Auto)<br>Private Car / Taxi | **KSRTC Sarige:** $\max(35, \text{round}(\text{dist} \times 1.85))$/person<br>**Mixed:** Bus fare + ₹60 local auto transfers | Bengaluru to Nandi Hills (46.2 km):<br>• KSRTC Bus: **₹85**<br>• Mixed: **₹205** (₹85 + ₹120 auto)<br>• Car Fuel: **₹316** |

---

## 4. Distance vs. Cost Comparison Table

The following table demonstrates the strict proportionality and realistic cost scaling across various journey lengths:

| Travel Leg | Road Dist. | Private Car Fuel (15 km/L @ ₹102.50) | Metered Auto-Rickshaw | Public Transit (per person) | Mixed Multimodal |
|---|---|---|---|---|---|
| **Mysuru Palace $\to$ Devaraja Market** | 1.1 km | ₹8.00 (~0.1 L) | ₹35.00 (min fare) | **₹0.00** (Walk) / **₹15** (Bus) | ₹35.00 |
| **Mysuru Palace $\to$ Rail Museum** | 3.3 km | ₹23.00 (~0.2 L) | ₹59.00 | **₹15.00** (City Bus) | ₹59.00 |
| **Bengaluru $\to$ Bannerghatta Zoo** | 14.2 km | ₹97.00 (~0.9 L) | ₹233.00 | **₹30.00** (BMTC City Bus) | ₹233.00 |
| **Bengaluru $\to$ Nandi Hills** | 46.2 km | ₹316.00 (~3.1 L) | ₹745.00 (cab tier) | **₹85.00** (KSRTC Regional) | ₹205.00 |
| **Bengaluru $\to$ Mysuru** | 143.0 km | ₹977.00 (~9.5 L) | N/A (commercial cab) | **₹265.00** (KSRTC Express) | ₹385.00 |
| **Hubballi $\to$ Gokarna** | 165.0 km | ₹1,128.00 (~11.0 L) | N/A (commercial cab) | **₹305.00** (NWKRTC Bus) | ₹425.00 |

---

## 5. Verification Evidence

1. **Short Trips Eliminated from Airport Corridor:** Short trips under 15 km never match the ₹260 airport corridor or circular intercity hops.
2. **Realistic Cost Scaling:** A 3.3 km trip costs ₹15 (bus) or ₹59 (auto); a 46.2 km trip costs ₹85 (bus); a 143 km trip costs ₹265 (bus). The flat ₹260 defect is 100% eliminated.
3. **Automated Tests:** All 174 backend pytest tests and 83 frontend vitest tests passed.
