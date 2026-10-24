# Budget-Aware Planning — Numeric Limits, Feasibility & Breakdown

**Project:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Date:** October 2026  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Overview & Problem Statement

Prior versions of Namma Karnataka only accepted an abstract `budget_scenario` enum (`budget`, `standard`, `comfort`). This provided no way for travelers to specify a concrete spending cap in Indian Rupees (INR) for their group or on a per-person basis.

As a result:
1. Travelers could not set a hard ceiling (e.g., ₹8,000 for a weekend trip).
2. The planner could generate itineraries requiring entry fees and transport costs far beyond what travelers intended to spend.
3. The application never warned users when an itinerary exceeded their budget limit.

---

## 2. Architecture & Data Contracts

### 2.1 Request Schema (`backend/app/schemas/planning.py`)
Extended `PlanningRequest` with two explicit budget constraint parameters:
- `budget_limit_inr`: `Optional[float] = Field(None, gt=0, le=10_000_000, description="Optional concrete target spending limit in INR")`
- `budget_scope`: `Optional[str] = Field("total_trip", pattern="^(total_trip|per_person)$", description="Budget scope: 'total_trip' or 'per_person'")`

### 2.2 Response Breakdown (`CompleteBudgetBreakdown`)
Extended `CompleteBudgetBreakdown` in backend and frontend:
- `budget_limit_inr`: Echoes the user's target limit.
- `budget_scope`: Scope applied (`total_trip` or `per_person`).
- `is_budget_feasible`: Boolean indicating whether estimated minimum trip expenses fit within the target limit.
- `budget_overrun_inr`: Exact numeric amount by which minimum estimated expenses exceed the target limit (`0.0` if within budget).

---

## 3. Authoritative Budget Engine Integration

### 3.1 Budget Feasibility Calculation (`BudgetCalculator.calculate_budget`)
Inside `backend/app/services/budget.py`:
1. Converts the target limit into an effective total trip target:
   $$\text{effective\_target\_total} = \begin{cases} \text{budget\_limit\_inr} & \text{if } \text{budget\_scope} = \text{'total\_trip'} \\ \text{budget\_limit\_inr} \times \text{travelers} & \text{if } \text{budget\_scope} = \text{'per\_person'} \end{cases}$$
2. Compares `grand_min` (verified entry fees + estimated food + estimated lodging + fuel/cab costs + 10% contingency) against `effective_target_total`.
3. If `grand_min > effective_target_total`:
   - Sets `is_budget_feasible = False`.
   - Computes `budget_overrun = round(grand_min - effective_target_total, 2)`.
   - Generates bilingual warnings in English and Kannada advising travelers on cost-reduction adjustments.
4. If within budget:
   - Sets `is_budget_feasible = True` and records budget headroom in calculation notes.

### 3.2 Budget-Aware Destination Candidate Ranking (`DeterministicFallbackEngine`)
In `backend/app/services/ai/fallback.py`:
When `request.budget_limit_inr` is provided, candidate destination pools are sorted by `entry_fee_min_inr ASC`, giving priority to free or low-cost heritage/nature attractions, minimizing admission costs and keeping the itinerary affordable.

### 3.3 AI Orchestrator Integration (`GeminiAdapter` & `GroqAdapter`)
Both AI model prompts are injected with the explicit budget ceiling and scope:
```
- Numeric Budget Limit: ₹{budget_limit_inr} ({budget_scope})
- CRITICAL: Prioritize low-entry-fee attractions to strictly respect this budget cap.
```

---

## 4. Frontend UX Integration

### 4.1 Trip Planner Form (`TripPlannerForm.tsx`)
Added a dedicated "Trip Budget" section:
- Enable/disable toggle for numeric budget constraints.
- Number input for INR amount with quick-fill presets (₹5,000, ₹10,000, ₹20,000).
- Scope selector: "Entire trip" vs "Per traveler".
- Style selector: Budget, Standard, or Comfort profile.
- Inclusions & Exclusions card explaining that estimates cover admissions, meals, lodging, and transport, while personal shopping is excluded.

### 4.2 Itinerary Summary (`BudgetSummary.tsx`)
- High-visibility comparison banner displaying:
  - Target budget in INR with scope badge.
  - Feasibility badge: `✓ Within Budget Cap` (emerald) or `⚠️ Budget Overrun: +₹X` (coral/red).
  - Explicit guidance explaining the overrun amount and recommending adjustments.
- Retained full itemized cost breakdown with cost status indicators (`✓ Verified`, `≈ Estimated`, `? Unknown`).

---

## 5. Verification Evidence

1. **Backend Tests:**
   - `test_budget_within_limit`: Validates ₹50,000 budget on 2-day trip returns `is_budget_feasible=True` and `budget_overrun_inr=0.0`.
   - `test_budget_exceeded_warning`: Validates ₹1,000 budget on 2-day trip sets `is_budget_feasible=False` and generates bilingual overrun warnings.
   - `test_budget_per_person_scope`: Validates per-person budget multiplier across multiple travelers.
2. **Frontend Tests:**
   - Vitest suite validates `BudgetSummary` rendering of target budget and overrun alerts.
