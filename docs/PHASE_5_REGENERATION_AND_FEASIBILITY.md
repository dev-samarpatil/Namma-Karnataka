# Phase 5 Stop Regeneration and Feasibility Design — Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)

**Author:** Principal Full-Stack Engineer & Travel-Planning Systems Architect  
**Status:** Canonical Implementation Contract  
**Phase:** Phase 5 — Interactive Itinerary Editing & Individual Stop Regeneration  

---

## 1. Grounding Principles & Anti-Hallucination Rules

A core tenet of Namma Karnataka is absolute travel groundedness:
1. **Zero Invented Destinations:** Stop alternatives must originate strictly from the 61 human-verified Karnataka destination records in `destinations.json`.
2. **Verified Fees & Provenance:** Fee amounts and statuses (`verified`, `estimated`, `unknown`) are preserved exactly as audited.
3. **Terrain-Adjusted Travel Calculations:** Detours and travel time differences are computed using `RoutingService.estimate_travel(...)`, taking into account Western Ghats winding factors and realistic regional speeds.
4. **Deterministic Cost Consistency:** Budget differences reflect exact changes in entry fees and vehicle fuel/cab/transit tariffs.

---

## 2. Candidate Selection Algorithm

When a user requests regeneration of an attraction stop (`stop_id` on `day_number`):
1. **Identify Context:**
   - Locate the target stop and its destination reference (`dest_current`).
   - Identify preceding stop coordinates (`prev_coords`) and succeeding stop coordinates (`next_coords`) within the day.
   - Extract the active trip's overall destination set (`used_destination_ids = {item.id for item in plan.items}`).
2. **Candidate Filtering:**
   - From the 61-destination catalogue, eliminate any destination already scheduled in `used_destination_ids`.
   - Priority 1: Destinations in the same district (`district_code == dest_current.district_code`).
   - Priority 2: Destinations matching requested category (or user's preferred category).
   - Priority 3: Nearby destinations within ≤75 km road distance.
3. **Detour & Feasibility Calculation:**
   - For each candidate:
     - Compute road distance and driving duration from `prev_coords` to candidate: $d_1, t_1$.
     - If `next_coords` exists, compute road distance and driving duration from candidate to `next_coords`: $d_2, t_2$.
     - Compare with the original leg duration ($t_{orig} = t(prev, orig) + t(orig, next)$).
     - $\Delta t = (t_1 + t_2) - t_{orig}$.
     - $\Delta \text{Fee} = (\text{candidate\_fee} - \text{orig\_fee}) \times \text{travelers\_count}$.
4. **Ranking:**
   - Sort candidates by:
     1. Same district match (boolean descending).
     2. Category relevance match (boolean descending).
     3. Minimal additional detour ($\Delta t$ ascending).
   - Return top 4–6 viable candidates.

---

## 3. Proposal Preview & User Acceptance Flow

1. **User Action:** User clicks "✨ Replace / Regenerate" on an attraction card.
2. **Modal Presentation:**
   - System displays alternative cards with:
     - Name in active language (English / Kannada).
     - District and category pill.
     - Visit duration.
     - Entry fee and fee status.
     - Travel difference badge: e.g. `"+12 mins driving"` or `"-5 km closer"`.
     - Cost difference badge: e.g. `"+₹100 entry fee"` or `"Free entry"`.
     - Curated rationale for why this destination fits.
3. **User Decision:**
   - **Accept Replacement:** Destination replaces original stop. Day schedule and total budget are recalculated immediately and saved.
   - **Cancel:** Original stop and itinerary remain 100% unaltered.

---

## 4. Day-Level Regeneration Strategy

When a user chooses "Regenerate Day":
1. Protect any stops flagged with `locked = True`.
2. Retrieve available unvisited destinations matching the day's district or theme.
3. Generate a fresh combination of 2–3 attractions respecting the user's travel pace (`relaxed`, `balanced`, `packed`).
4. Re-insert meals (lunch at verified local eatery) and evening dining/stay.
5. Display a clear before/after comparison before committing the change.
