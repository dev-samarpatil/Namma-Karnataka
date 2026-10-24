# Phase 4 — Budget Calculation Rules and Scenario Guide

**Environment:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** 2026-10-24  
**Author:** Travel-Cost Systems Architect  
**Core Module:** `backend/app/services/budget.py`  

---

## 1. Budget Categories & Mathematical Definitions

The travel budget engine aggregates expenses across five structured categories:

| Category | Basis | Verified vs. Estimated Handling |
|---|---|---|
| **1. Attraction Entry Fees** | Per-person ($\times \text{travelers}$) | Uses official ASI / Karnataka Tourism tariffs. Unknown entry fees are excluded from minimums and flagged with a warning banner. |
| **2. Meals & Dining** | Per-person ($\times \text{travelers} \times \text{meals}$) | Scaled by requested budget scenario or verified eatery prices from `places.json`. |
| **3. Overnight Accommodation** | Per-room ($\times \text{rooms} \times \text{nights}$) | Rooms = $\lceil\text{travelers} / 2\rceil$. Nights = $\max(0, \text{days} - 1)$. 0 for 1-day trips. |
| **4. Transportation** | Per-vehicle (car/cab) or per-person (transit) | Integrated via `TransportCostCalculator` with round-trip or one-way distance billing. |
| **5. Contingency Buffer** | Per-group | Deterministic $10\%$ reserve over total known expenses. |

---

## 2. Budget Scenarios Matrix

Users can adjust their travel profile via `budget_scenario`:

| Scenario Profile | Dining Allowances (Breakfast / Lunch / Dinner) | Accommodation Standard (per room/night) | Target Traveler Persona |
|---|---|---|---|
| **`budget`** | ₹80 / ₹150 / ₹200 (Total ₹430/day) | ₹1,200 – ₹1,800 | Backpacker / student / budget-conscious |
| **`standard`** | ₹100 / ₹200 / ₹250 (Total ₹550/day) | ₹1,800 – ₹3,000 | Family / mid-tier / KSTDC hotels |
| **`comfort`** | ₹160 / ₹350 / ₹450 (Total ₹960/day) | ₹3,500 – ₹6,000 | Luxury / heritage resorts / Jungle Lodges (JLR) |

---

## 3. Subtotals and Totals Architecture

$$\text{Known Subtotal}_{\text{min}} = \text{Verified Subtotal} + \text{Estimated Subtotal}_{\text{min}}$$

$$\text{Contingency}_{\text{min}} = \text{round}(\text{Known Subtotal}_{\text{min}} \times 0.10, 2)$$

$$\text{Grand Total}_{\text{min}} = \text{Known Subtotal}_{\text{min}} + \text{Contingency}_{\text{min}}$$

$$\text{Per-Person Cost}_{\text{min}} = \operatorname{round}\left(\frac{\text{Grand Total}_{\text{min}}}{\text{Travelers Count}}, 2\right)$$

### Key Rules:
- **Zero Substitution Prohibited:** Unknown fees are never treated as ₹0 free entry.
- **Double-Counting Prohibited:** Scheduled meal and accommodation stops are not billed twice.
- **Precision:** Currency is strictly rounded at monetary presentation boundaries (2 decimal places).

---

## 4. Test-Backed Concrete Calculation Example

**Trip Configuration:**
- Duration: 2 Days (1 night)
- Travelers: 2 Adults (1 room)
- Transport Mode: `driving_car` (Private Car, 100 km one-way = 200 km round-trip at 14 km/L, ₹100/L fuel)
- Destinations: 2 Attractions with ₹50 entrance fee each
- Scenario: `standard`

**Itemized Cost Breakdown:**
1. **Attractions:** 2 attractions $\times$ ₹50 $\times$ 2 travelers = **₹200.00** (`VERIFIED`)
2. **Meals:** (₹100 + ₹200 + ₹250) $\times$ 2 travelers $\times$ 2 days = **₹2,200.00** (`ESTIMATED`)
3. **Lodging:** 1 night $\times$ 1 room $\times$ ₹1,800 min = **₹1,800.00** (`ESTIMATED`)
4. **Transport:** $(200\text{ km} / 14\text{ km/L}) \times ₹100\text{/L} \times 1\text{ car}$ = **₹1,428.57** (`ESTIMATED`)
5. **Known Subtotal:** ₹$200.00 + ₹2,200.00 + ₹1,800.00 + ₹1,428.57$ = **₹5,628.57**
6. **10% Contingency:** ₹$5,628.57 \times 0.10$ = **₹562.86**
7. **Grand Total (Min):** ₹$5,628.57 + ₹562.86$ = **₹6,191.43**
8. **Per Person (Min):** ₹$6,191.43 / 2$ = **₹3,095.72**
