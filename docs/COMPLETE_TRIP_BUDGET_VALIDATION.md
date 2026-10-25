# Complete Trip Budget Validation & Consistency

## 1. Overview
The Trip Budget Engine calculates authoritative, itemized trip cost estimates encompassing all aspects of the journey. Budget calculations are performed by the backend `BudgetCalculator` and shared consistently across the planner, daily schedule cards, and summary panels.

---

## 2. Expense Categories & Calculation Models

### 2.1 Attraction Entry Fees
- Sourced from curated destination records (`entry_fee_min_inr` and `entry_fee_max_inr`).
- Multiplied by traveler count for group total.
- Distinguishes free monuments, standard entry tickets, and special camera / safari fees.

### 2.2 Transportation Costs (`TransportCostCalculator`)
Integrated directly with the route distance calculated for the corridor:
- **Private Car (`driving_car`):**
  $$\text{Fuel Cost} = \left(\frac{\text{Total Road Distance (km)}}{\text{Fuel Efficiency (km/L)}}\right) \times \text{Fuel Price (₹/L)} + \text{Tolls & Parking}$$
  - Default: 14 km/L, ₹102/L petrol.
- **Cab / Taxi (`cab_taxi`):**
  $$\text{Cab Cost} = \max(\text{Total km} \times \text{Rate/km}, \text{Min Daily km} \times \text{Rate}) + (\text{Driver Bata} \times \text{Days})$$
  - Default: ₹14/km (sedan) or ₹18/km (SUV/Innova), ₹400/day driver allowance.
- **Public Transit (`public_transit`):**
  - KSRTC bus tariffs (Airavat Club Class, Rajahamsa, Sarige) + local auto/metro first/last mile.
- **Return Journey:** When `is_return_trip=True`, the distance back to the origin hub is explicitly factored into both billable km and fuel.

### 2.3 Overnight Accommodation
$$\text{Lodging Cost} = \text{Rooms Needed} \times \text{Nights} \times \text{Nightly Tariff}$$
Where:
- $\text{Rooms Needed} = \lceil \text{Travelers} / 2 \rceil$.
- $\text{Nights} = \text{Trip Duration (Days)} - 1$.
- Nightly Tariff: Grounded in selected budget scenario (`budget` ₹1,500, `standard` ₹3,500, `comfort` ₹6,500) or verified property tariff.

### 2.4 Dining & Meals
- Breakfast: ₹120 (budget) to ₹350 (comfort) per person.
- Lunch: ₹200 (budget South Indian thali) to ₹600 per person.
- Dinner: ₹200 to ₹700 per person.
- Multiplied by traveler count $\times$ trip days.

### 2.5 Contingency & Incidentals
- 5% to 10% contingency buffer for miscellaneous snacks, temple prasad, local guide fees, and parking charges.

---

## 3. Budget Feasibility Evaluation
When a user specifies a budget cap (`budget_limit_inr`):
1. **Total vs Per-Person Scope:** Evaluated based on `budget_scope` (`total_trip` vs `per_person`).
2. **Feasibility Flag:**
   $$\text{is\_budget\_feasible} = (\text{Estimated Min Total} \le \text{Budget Limit})$$
3. **Transparent Overrun Disclosure:**
   If the proposed itinerary exceeds the budget limit, the engine does not silently remove required stops or switch modes without warning. Instead, it flags:
   - `is_budget_feasible = False`
   - `budget_overrun_inr = Estimated Min Total - Budget Limit`
   - Explicit advisory with suggestions (e.g. adjust accommodation tier from comfort to budget, or reduce cab travel).
