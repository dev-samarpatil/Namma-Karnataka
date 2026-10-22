# ADR-006: Deterministic Budget Calculation and Route Distance Honesty

* **Status:** `ACCEPTED`
* **Date:** October 2026
* **Deciders:** Lead Architect, Backend Lead, QA Lead

## Context
LLMs frequently make arithmetic errors, invent hotel/ticket prices, and hallucinate driving travel times. To establish user trust and practical trip feasibility, budget totals and route calculations must be governed by deterministic code rather than language model tokens.

## Options Considered
1. **LLM-Calculated Budget and Routes:** The model outputs final budget totals and driving hours directly in its generated text.
2. **Deterministic Service Layer:** The backend calculates all financial totals using validated formulas and retrieves route metrics from an external routing adapter (or fallback), treating the LLM solely as a narrative generator and stop sequencer.

## Decision
Adopt a **Deterministic Service Layer**:
1. **Authoritative Budget Calculation:**
   - Implemented in `app/services/budget.py`.
   - Grand totals, category subtotals (Transport, Stay, Food, Entry Fees, Contingency), and per-person estimates are calculated strictly using Python arithmetic.
   - Any mathematical totals supplied inside raw LLM responses are discarded.
   - Unknown costs are excluded from minimum calculated sums and flagged with warning badges.
2. **Honest Route Representation:**
   - Routing adapter (`app/adapters/osrm.py`) attempts to fetch driving route distance and duration from OSRM.
   - If routing succeeds: UI renders road polyline and labels metric *"Estimated road travel"*.
   - If routing fails or is unconfigured: System computes Haversine straight-line distance, appends a standard 30% winding road factor, and explicitly labels it: *"Straight-line estimate (~X km). Driving duration unavailable."*
   - Under no circumstances does the application draw a straight line on the Leaflet map and claim it is a verified driving route.

## Consequences & Mitigations
- **Pros:** 100% mathematically consistent budgets; clear user expectations regarding road conditions; zero arithmetic hallucinations.
- **Cons:** Haversine fallback provides approximate distances when OSRM is unreachable.
- **Mitigation:** Explicit visual disclaimer on straight-line estimates advising travelers to verify actual road transit times locally.
