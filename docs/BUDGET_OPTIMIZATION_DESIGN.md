# Budget Optimization Engine Design & Architecture — Namma Karnataka

## 1. Executive Summary

In legacy iterations of Namma Karnataka, budget parameters functioned merely as post-facto audit labels. When a user submitted a ₹10,000 target budget for a 2-day / 2-traveler trip, the engine routinely returned a ₹16,110.16 minimum calculation accompanied only by a generic warning badge.

The Phase 3 **Budget Optimization Engine** transforms budget from a passive observation into an active mathematical planning constraint that dynamically shapes transport modes, lodging selections, attraction entry tariffs, and day pacing.

---

## 2. Root Cause Analysis of the ₹16,110.16 Calculation

Our architectural audit identified four compounding multipliers:
1. **Unfiltered Accommodation Lookup**: The deterministic scheduler selected default KSTDC properties (e.g. Hotel Mayura Hoysala at ₹2,200/night) regardless of whether the user chose the `budget` scenario.
2. **Commercial Cab Tariffs**: When a private cab was requested, outstation billable distance calculations (600 km round-trip at ₹16/km plus daily driver batas of ₹400/day) added ₹10,400 alone.
3. **Double Room Occupancy Assumption**: Solo travelers were occasionally billed for group room blocks.
4. **10% Compound Contingency**: Applied unconditionally across the elevated base subtotals.

---

## 3. Mathematical Optimization Architecture

### 3.1 Absolute Baseline Survival Tariffs (Karnataka Standard)
The engine defines the deterministic, non-negotiable floor for safe, hygienic travel in Karnataka:
* **Meals**: ₹320.00 / traveler / day (Tiffin breakfast ₹70, Thali lunch ₹120, light dinner ₹130).
* **Lodging**: ₹800.00 / room / night (Verified community dharamsala / dormitory / budget lodge).
* **Public Transit**: KSRTC ordinary/express bus baseline (calculated via `TransportCostCalculator.calculate_public_transit`).
* **Reserve Buffer**: 5% minimum contingency for unexpected regional tariffs.

### 3.2 Feasibility Status States
The engine categorizes every requested budget into one of four states:
1. `within_budget`: Calculated minimum cost $\le 90\%$ of effective target budget. Surfaces positive remaining headroom ($R = B_{\text{effective}} - C_{\text{min}}$).
2. `near_budget`: Calculated minimum cost falls between $90\%$ and $100\%$ of effective target budget.
3. `exceeds_budget`: Calculated minimum cost exceeds budget, but budget is $\ge C_{\text{lowest\_feasible}}$. Actionable alternatives are provided to reconcile the variance.
4. `infeasible`: Target budget $< C_{\text{lowest\_feasible}}$. Structured diagnostic explains exact gap ($B_{\text{target}} - C_{\text{lowest\_feasible}}$) and details unavoidable baseline costs.

---

## 4. Actionable Alternatives Generation Engine

When a plan exceeds target budget or when optimization headroom is detected, the engine generates prioritized, structured alternatives:
1. **Transportation**:
   * *Private Cab $\to$ KSRTC Express / SWR Rail*: Saves ₹4,000–₹7,000 without compromising regional connectivity.
   * *Personal Car Fuel $\to$ KSRTC Rajahamsa Bus*: Saves ₹2,000–₹3,500 for solo/duo travelers.
2. **Accommodation**:
   * *Comfort Hotel $\to$ Verified Homestay / KSTDC Budget Wing*: Saves ₹1,000–₹2,500 per room/night.
3. **Dining**:
   * *Comfort Restaurant $\to$ Authentic Darshini / Local Mess / Khanavali*: Saves ₹200–₹400 per person/day while delivering richer authentic taste.
4. **Attractions**:
   * *Paid Theme Parks $\to$ Free ASI Heritage / Scenic Viewpoints*: Reduces entry fees by up to 70%.

---

## 5. API and Schema Contracts

### `BudgetAlternativeItem`
```json
{
  "category": "Transportation",
  "expensive_choice": "Outstation Cab / Taxi (~₹10,500)",
  "alternative_choice": "KSRTC Express / SWR Rail Transit (~₹1,200)",
  "potential_savings_inr": 9300.0,
  "action_type": "switch_to_public_transit",
  "explanation": "Switching from private commercial cab to state public transit significantly slashes travel expense without compromising regional connectivity."
}
```

### Complete Budget Breakdown Additions
* `feasibility_status`: `"within_budget" | "near_budget" | "exceeds_budget" | "infeasible"`
* `remaining_budget_inr`: Float or null
* `lowest_feasible_cost_inr`: Float or null
* `cost_drivers`: Array of strings with percentage weights
* `budget_alternatives`: Array of `BudgetAlternativeItem`
* `infeasibility_reason`: Formatted localized explanation
* `recommended_budget_increase_inr`: Float or null

