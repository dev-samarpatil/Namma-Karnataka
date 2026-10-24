# Phase 4 — Travel-Time and Routing Estimation Model Specification

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-24  
**Author:** Geospatial & Routing Systems Engineer  
**Core Services:** `backend/app/services/routing/terrain_provider.py`, `backend/app/services/transit/curated_provider.py`  

---

## 1. Overview & Principles

Accurate travel time estimation is essential for realistic itinerary feasibility. In Karnataka's varied topography—spanning flat Deccan plateaus, high-speed national expressways, and steep Western Ghats mountain passes—straight-line distance or fixed highway speed assumptions produce severely misleading results.

### Non-Negotiable Contract:
1. Straight-line (Haversine) distance is **never** presented as driving distance.
2. Terrain-adjusted estimates are explicitly disclosed as approximations.
3. Live traffic is **never** claimed without a real-time probe data feed.

---

## 2. Distance Calculation Architecture

### 2.1 Great-Circle (Haversine) Formula
Great-circle distance $d$ between coordinates $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$:

$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$

$$d = R \cdot c \quad (R = 6371.0\text{ km})$$

### 2.2 Topographical Winding Factors & Regional Speed Profiles

The routing provider identifies whether either endpoint falls within the **Western Ghats corridor** ($11.8^\circ \le \text{Lat} \le 15.2^\circ$, $74.2^\circ \le \text{Lon} \le 76.1^\circ$):

| Terrain Classification | Winding Factor ($\gamma$) | Average Driving Speed ($v$) | Intersection / Terminal Buffer | Minimum Leg Duration |
|---|---|---|---|---|
| **Western Ghats (Chikkamagaluru, Kodagu, Uttara Kannada)** | $1.45$ (+45% over straight-line) | $32.0\text{ km/h}$ | $+15\text{ minutes}$ | $10\text{ minutes}$ |
| **Standard Plateau / National Highways (Bengaluru, Mysuru, Hubballi)** | $1.30$ (+30% over straight-line) | $48.0\text{ km/h}$ | $+15\text{ minutes}$ | $10\text{ minutes}$ |

$$\text{Estimated Road Distance} = \text{round}(d \times \gamma, 1)$$

$$\text{Estimated Duration (minutes)} = \max\left(10, \operatorname{int}\left(\frac{\text{Estimated Road Distance}}{v} \times 60\right) + 15\right)$$

---

## 3. Public Transit Schedule Logic & Actual Layovers

1. **Curated Departures:** Selected from authentic scheduled departure times in `data/seed/transit_network.json`.
2. **Temporal Feasibility:** On multi-leg journeys transferring through the central Bengaluru Majestic intermodal complex:
   - Same-terminal transfer minimum buffer: $25\text{ minutes}$.
   - Cross-terminal intermodal transfer buffer (Subway between SBC Railway Station and Majestic Bus Stand): $35\text{ minutes}$.
3. **True Physical Layover:**
   $$\text{Total Duration} = \text{Duration}_{\text{Leg 1}} + (\text{Departure}_{\text{Leg 2}} - \text{Arrival}_{\text{Leg 1}}) + \text{Duration}_{\text{Leg 2}}$$

---

## 4. Day-Boundary & Itinerary Feasibility Safeguards

1. **Sightseeing Start Time:** Daily itineraries begin at 08:30 AM (breakfast), commencing sightseeing at 09:30 AM.
2. **Meal Windows:**
   - Lunch: 13:00 to 14:00 (60 minutes).
   - Dinner: 20:00 to 21:15 (75 minutes).
3. **End of Day:** Sightseeing concludes by 19:30, with overnight accommodation check-in at 21:30.
4. **Feasibility Warnings:**
   - Any single transit leg $> 180\text{ km}$ triggers a fatigue warning.
   - Any leg $> 240\text{ minutes}$ (4 hours) mandates a rest-stop advisory.
