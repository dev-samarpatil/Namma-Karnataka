# Phase 4 — Unified Transportation Cost Model Specification

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-24  
**Author:** Principal Travel-Cost & Transportation Systems Specialist  
**Target Module:** `backend/app/services/transport_cost.py`  

---

## 1. Overview & Objectives

The Unified Transportation Cost Model provides deterministic, verifiable, and transparent travel expense calculations across Karnataka's multimodal network. It replaces blunt per-day estimates with grounded formulas based on billable distance, vehicle capacities, fuel tariffs, commercial taxi rates, and curated public transit fares.

---

## 2. Supported Transportation Modes

The engine implements four primary modes:
1. **`driving_car` (Private Car / Personal Vehicle):** Models direct fuel expenses based on fuel efficiency and regional fuel price.
2. **`cab_taxi` (Commercial Outstation Taxi / Cab):** Models commercial rate per kilometer, base fare, and daily driver allowance.
3. **`public_transit` (Scheduled Intercity Bus / Rail):** Integrates verified KSRTC express bus and South Western Railway train fares per passenger.
4. **`mixed` (Multimodal Transit + Local Transfers):** Combines intercity public transit with last-mile town bus / auto-rickshaw connections.

---

## 3. Mathematical Models & Formulas

### 3.1 Private Car Fuel Model (`driving_car`)

$$\text{Billable Distance} = \begin{cases} 2 \times \text{Road Distance}, & \text{if Round-Trip} \\ \text{Road Distance}, & \text{if One-Way} \end{cases}$$

$$\text{Vehicles Needed} = \left\lceil \frac{\text{Travelers Count}}{4} \right\rceil$$

$$\text{Fuel Cost} = \left( \frac{\text{Billable Distance}}{\text{Fuel Efficiency (km/L)}} \right) \times \text{Fuel Price (₹/L)} \times \text{Vehicles Needed}$$

$$\text{Per-Person Cost} = \frac{\text{Fuel Cost}}{\text{Travelers Count}}$$

- **Baseline Assumptions:**
  - Standard midsize petrol vehicle fuel efficiency: $14.0\text{ km/L}$ (configurable).
  - Karnataka baseline petrol tariff: ₹$102.86\text{/L}$ (2026 state retail tariff).
  - An upper buffer ($+8\%$) accounts for air-conditioning and urban congestion.
  - FASTag highway tolls and parking fees are explicitly excluded and labeled.

### 3.2 Outstation Cab Model (`cab_taxi`)

$$\text{Distance Charge} = \max(\text{Base Fare} \times \text{Vehicles}, \text{Billable Distance} \times \text{Rate/km} \times \text{Vehicles})$$

$$\text{Driver Allowance} = \text{Driver Bata/Day} \times \text{Duration (Days)} \times \text{Vehicles}$$

$$\text{Cab Minimum Fare} = \text{Distance Charge} + \text{Driver Allowance}$$

$$\text{Cab Maximum Fare} = \text{Cab Minimum Fare} \times 1.15 \quad (\text{Peak/Innova tier})$$

- **Tariff Constants:**
  - Base fare: ₹$150$ (covers first 4 km).
  - Distance tariff: ₹$16.00\text{/km}$ (standard sedan outstation rate).
  - Driver outstation allowance: ₹$400.00\text{/day}$.
  - Passenger capacity: 4 passengers per vehicle.

### 3.3 Public Transit Model (`public_transit`)

When a verified corridor (e.g., Bengaluru ↔ Mysuru) exists in `data/seed/transit_network.json`:

$$\text{Group Cost}_{\text{min}} = \text{Fare}_{\text{min}} \times \text{Multiplier} \times \text{Travelers Count}$$

$$\text{Group Cost}_{\text{max}} = \text{Fare}_{\text{max}} \times \text{Multiplier} \times \text{Travelers Count}$$

Where $\text{Multiplier} = 2.0$ for round-trip, $1.0$ for one-way.

- **Fallback Rate:** When no direct curated corridor matches, the model applies standard KSRTC Sarige / Rajahamsa slab rates (₹$1.75$ to ₹$2.60$ per passenger-kilometer).
- **Status:** Verified when matching curated corridor; Estimated when applying slab rates.

### 3.4 Mixed Multimodal Model (`mixed`)

$$\text{Mixed Total} = \text{Public Transit Fare} + \text{Local Transfer Allowance}$$

- Local transfer allowance accounts for auto-rickshaw or town bus transfers between transit terminals and sightseeing attractions:
  $$\text{Local Transfer} = ₹150\text{ to }₹300 \times \text{Days} \times \left\lceil \frac{\text{Travelers}}{3} \right\rceil$$

---

## 4. Cost Transparency & Statuses

1. `VERIFIED`: Exact tariffs from KSRTC, South Western Railway, or BMTC scheduled tables.
2. `ESTIMATED`: Formula-grounded calculations (fuel consumption, commercial taxi rates).
3. `UNKNOWN`: Incomplete or unverified fees. **Never converted to zero.**
4. `NOT_APPLICABLE`: Stays or transfers not required (e.g., lodging on 1-day trips).

---

## 5. Verification & Test Evidence

Validated in `backend/app/tests/test_transport_cost.py`:
- `test_car_fuel_cost_calculation`: Verified 100 km round trip fuel formula = ₹1,428.57.
- `test_car_fuel_multiple_vehicles_ceiling`: Verified 6 travelers correctly allocate 2 vehicles.
- `test_cab_taxi_tariff_and_driver_bata`: Verified 150 km 2-day cab calculation = ₹5,600.
- `test_public_transit_verified_corridor_fare`: Verified corridor scaling per passenger.
