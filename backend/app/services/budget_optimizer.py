"""Deterministic Budget Optimization Engine for Namma Karnataka.

Applies mathematical optimization to travel planning, ensuring the user's budget
serves as an active planning constraint rather than an afterthought warning.
Evaluates cost drivers, prunes budget-infeasible options, and generates structured
budget alternatives and infeasibility diagnostics.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass, field

from app.schemas.destinations import DestinationRead
from app.schemas.planning import (
    BudgetAlternativeItem,
    CompleteBudgetBreakdown,
    DayPlan,
    PlanningRequest,
    RecommendedDestination,
)
from app.services.transport_cost import SupportedTransportMode, TransportCostCalculator


@dataclass
class BudgetFeasibilityAnalysis:
    """Detailed mathematical budget feasibility breakdown."""

    is_feasible: bool
    feasibility_status: str  # within_budget, near_budget, exceeds_budget, infeasible
    user_budget_inr: float
    effective_budget_inr: float
    lowest_feasible_cost_inr: float
    estimated_cost_inr: float
    variance_inr: float  # positive = savings remaining, negative = overrun
    cost_drivers: list[str] = field(default_factory=list)
    alternatives: list[BudgetAlternativeItem] = field(default_factory=list)
    infeasibility_reason: str | None = None
    recommended_budget_increase_inr: float | None = None


class BudgetOptimizer:
    """Optimizes itinerary candidate selection, travel modes, and lodging to fit user budget."""

    # Absolute baseline survival costs per day per traveler in Karnataka (Tier 3/Rural/Town)
    MIN_DAILY_MEAL_COST_BUDGET = 320.0  # Tiffin breakfast ₹70 + Thali lunch ₹120 + Light dinner ₹130
    MIN_NIGHTLY_LODGING_PER_ROOM = 800.0  # Verified budget dharamsala / dormitory / budget lodge
    MIN_LOCAL_TRANSIT_PER_DAY = 120.0  # State bus / town shuttle

    @classmethod
    def calculate_absolute_minimum_trip_cost(
        cls,
        duration_days: int,
        travelers_count: int,
        origin_label: str = "Bengaluru",
        approx_corridor_km: float = 300.0,
    ) -> float:
        """Calculate the absolute lowest deterministic cost possible for a safe trip in Karnataka."""
        travelers = max(1, travelers_count)
        days = max(1, duration_days)
        nights = max(0, days - 1)
        rooms = math.ceil(travelers / 2)

        # 1. Bare minimum transport (KSRTC ordinary bus round trip + local connection)
        transit_cost = TransportCostCalculator.calculate_public_transit(
            road_distance_km=approx_corridor_km,
            travelers_count=travelers,
            is_return_trip=True,
        ).total_cost_min_inr

        # 2. Minimum safe accommodation (Budget lodge / verified dormitory)
        lodging_cost = nights * rooms * cls.MIN_NIGHTLY_LODGING_PER_ROOM

        # 3. Minimum clean dining (Local mess / darshinis)
        meals_cost = days * travelers * cls.MIN_DAILY_MEAL_COST_BUDGET

        # 4. Free attractions (Entry fee = 0)
        attractions_cost = 0.0

        # 5. 5% contingency reserve
        subtotal = transit_cost + lodging_cost + meals_cost + attractions_cost
        contingency = subtotal * 0.05

        return round(subtotal + contingency, 2)

    @classmethod
    def analyze_budget_feasibility(
        cls,
        request: PlanningRequest,
        estimated_budget: CompleteBudgetBreakdown,
        approx_corridor_km: float = 300.0,
    ) -> BudgetFeasibilityAnalysis:
        """Perform deep feasibility analysis, identify cost drivers, and generate alternatives."""
        travelers = max(1, request.travelers_count)
        budget_limit = request.budget_limit_inr or 0.0
        effective_limit = (
            budget_limit
            if request.budget_scope == "total_trip"
            else budget_limit * travelers
        )

        grand_min = estimated_budget.grand_total_min_inr or 0.0
        lowest_feasible = cls.calculate_absolute_minimum_trip_cost(
            duration_days=request.duration_days,
            travelers_count=travelers,
            origin_label=request.origin_label,
            approx_corridor_km=approx_corridor_km,
        )

        cost_drivers: list[str] = []
        alternatives: list[BudgetAlternativeItem] = []

        # Analyze category weightings
        for cat in estimated_budget.categories:
            c_min = cat.estimated_min_inr or 0.0
            if grand_min > 0 and c_min > 0:
                pct = round((c_min / grand_min) * 100, 1)
                if pct >= 25.0:
                    cost_drivers.append(
                        f"{cat.category_name} (₹{c_min:,.0f}, {pct}% of total minimum cost)"
                    )

        # Generate actionable alternatives based on request inputs
        # 1. Transport Alternative
        travel_mode = getattr(request, "travel_mode", "driving_car")
        if travel_mode in (SupportedTransportMode.CAB_TAXI, "cab_taxi", "cab"):
            public_est = TransportCostCalculator.calculate_public_transit(
                road_distance_km=approx_corridor_km,
                travelers_count=travelers,
                is_return_trip=request.is_return_trip,
            )
            cab_cat = next((c for c in estimated_budget.categories if "Transportation" in c.category_name), None)
            current_trans_cost = cab_cat.estimated_min_inr if cab_cat else 8000.0
            savings = max(0.0, current_trans_cost - public_est.total_cost_min_inr)
            if savings > 500:
                alternatives.append(
                    BudgetAlternativeItem(
                        category="Transportation",
                        expensive_choice=f"Outstation Cab / Taxi (~₹{current_trans_cost:,.0f})",
                        alternative_choice=f"KSRTC Express / SWR Rail Transit (~₹{public_est.total_cost_min_inr:,.0f})",
                        potential_savings_inr=round(savings, 2),
                        action_type="switch_to_public_transit",
                        explanation="Switching from private commercial cab to state public transit significantly slashes travel expense without compromising regional connectivity.",
                    )
                )
        elif travel_mode in (SupportedTransportMode.DRIVING_CAR, "driving_car"):
            public_est = TransportCostCalculator.calculate_public_transit(
                road_distance_km=approx_corridor_km,
                travelers_count=travelers,
                is_return_trip=request.is_return_trip,
            )
            car_cat = next((c for c in estimated_budget.categories if "Transportation" in c.category_name), None)
            current_trans_cost = car_cat.estimated_min_inr if car_cat else 4500.0
            savings = max(0.0, current_trans_cost - public_est.total_cost_min_inr)
            if savings > 600 and travelers <= 2:
                alternatives.append(
                    BudgetAlternativeItem(
                        category="Transportation",
                        expensive_choice=f"Private Car Fuel & Driving (~₹{current_trans_cost:,.0f})",
                        alternative_choice=f"KSRTC Airavat / Rajahamsa Bus (~₹{public_est.total_cost_min_inr:,.0f})",
                        potential_savings_inr=round(savings, 2),
                        action_type="switch_to_public_transit",
                        explanation="For 1–2 solo/duo travelers, public express buses offer lower overall expenditure than personal fuel and vehicle wear.",
                    )
                )

        # 2. Accommodation Alternative
        nights = max(0, request.duration_days - 1)
        rooms = math.ceil(travelers / 2)
        scenario = getattr(request, "budget_scenario", "standard")
        if scenario in ("comfort", "standard") and nights > 0:
            stay_cat = next((c for c in estimated_budget.categories if "Accommodation" in c.category_name), None)
            current_stay_cost = (stay_cat.estimated_min_inr or (nights * rooms * 2500.0)) if stay_cat else nights * rooms * 2500.0
            budget_homestay_cost = nights * rooms * 1200.0
            stay_savings = max(0.0, current_stay_cost - budget_homestay_cost)
            if stay_savings > 400:
                alternatives.append(
                    BudgetAlternativeItem(
                        category="Accommodation",
                        expensive_choice=f"{scenario.title()} Hotel Lodging (~₹{current_stay_cost:,.0f})",
                        alternative_choice=f"Verified Homestay / KSTDC Budget Wing (~₹{budget_homestay_cost:,.0f})",
                        potential_savings_inr=round(stay_savings, 2),
                        action_type="switch_to_budget_homestay",
                        explanation="Selecting verified local homestays or KSTDC budget units provides comfortable authentic hospitality at substantial savings.",
                    )
                )

        # 3. Dining Alternative
        if scenario in ("comfort", "standard"):
            meal_cat = next((c for c in estimated_budget.categories if "Meals" in c.category_name), None)
            curr_meal = (meal_cat.estimated_min_inr or (request.duration_days * travelers * 600.0)) if meal_cat else request.duration_days * travelers * 600.0
            darshini_meal = request.duration_days * travelers * 430.0  # Budget meal rates
            meal_savings = max(0.0, curr_meal - darshini_meal)
            if meal_savings > 300:
                alternatives.append(
                    BudgetAlternativeItem(
                        category="Food & Dining",
                        expensive_choice=f"{scenario.title()} Dining Tier (~₹{curr_meal:,.0f})",
                        alternative_choice=f"Authentic Darshini / Local Mess (~₹{darshini_meal:,.0f})",
                        potential_savings_inr=round(meal_savings, 2),
                        action_type="switch_to_local_mess",
                        explanation="Dining at celebrated local tiffin darshinis, thali mess halls, and Udupi joints offers richer regional taste at lower costs.",
                    )
                )

        # 4. Paid Attraction Reduction
        attr_cat = next((c for c in estimated_budget.categories if "Attraction" in c.category_name), None)
        curr_attr = (attr_cat.estimated_min_inr or 0.0) if attr_cat else 0.0
        if curr_attr > 500 * travelers:
            alternatives.append(
                BudgetAlternativeItem(
                    category="Attractions",
                    expensive_choice=f"Commercial Attractions & Palaces (~₹{curr_attr:,.0f})",
                    alternative_choice="Prioritize Free Heritage & Nature Viewpoints (₹0)",
                    potential_savings_inr=round(curr_attr * 0.7, 2),
                    action_type="prefer_free_attractions",
                    explanation="Karnataka possesses magnificent free public waterfalls, ancient ASI temples, and scenic hills with minimal or zero entry fees.",
                )
            )

        # Determine Feasibility Status
        if budget_limit <= 0:
            return BudgetFeasibilityAnalysis(
                is_feasible=True,
                feasibility_status="within_budget",
                user_budget_inr=0.0,
                effective_budget_inr=0.0,
                lowest_feasible_cost_inr=lowest_feasible,
                estimated_cost_inr=grand_min,
                variance_inr=0.0,
                cost_drivers=cost_drivers,
                alternatives=alternatives,
            )

        variance = round(effective_limit - grand_min, 2)
        if variance >= 0:
            if variance <= effective_limit * 0.10:
                status = "near_budget"
            else:
                status = "within_budget"
            is_feasible = True
            infeasibility_reason = None
            increase_needed = None
        else:
            is_feasible = False
            overrun = abs(variance)
            if effective_limit < lowest_feasible:
                status = "infeasible"
                infeasibility_reason = (
                    f"The specified budget of ₹{effective_limit:,.0f} is lower than the absolute minimum "
                    f"feasible travel expense of ₹{lowest_feasible:,.0f} for a {request.duration_days}-day "
                    f"trip across Karnataka for {travelers} traveler(s). Minimum accommodation, basic KSRTC transit, "
                    f"and local mess meals alone require at least ₹{lowest_feasible:,.0f}."
                )
                increase_needed = round(lowest_feasible - effective_limit, 2)
            else:
                status = "exceeds_budget"
                infeasibility_reason = (
                    f"The selected itinerary configuration costs ₹{grand_min:,.0f}, exceeding your budget limit "
                    f"of ₹{effective_limit:,.0f} by ₹{overrun:,.0f}. Applying the suggested alternatives below "
                    f"can bring the trip within your target."
                )
                increase_needed = overrun

        return BudgetFeasibilityAnalysis(
            is_feasible=is_feasible,
            feasibility_status=status,
            user_budget_inr=budget_limit,
            effective_budget_inr=effective_limit,
            lowest_feasible_cost_inr=lowest_feasible,
            estimated_cost_inr=grand_min,
            variance_inr=variance,
            cost_drivers=cost_drivers,
            alternatives=alternatives,
            infeasibility_reason=infeasibility_reason,
            recommended_budget_increase_inr=increase_needed,
        )

    @classmethod
    def filter_and_rank_by_budget(
        cls,
        request: PlanningRequest,
        candidates: Sequence[DestinationRead],
        target_count: int,
    ) -> list[DestinationRead]:
        """Rank candidate destinations considering entry fees, popularity, and offbeat scores."""
        budget_limit = request.budget_limit_inr
        is_strict = getattr(request, "strict_budget", False)
        is_offbeat = getattr(request, "is_offbeat_preferred", False)

        scored_candidates: list[tuple[float, DestinationRead]] = []

        for c in candidates:
            score = 100.0
            fee = c.entry_fee_min_inr or 0.0

            # 1. Budget penalty
            if budget_limit and budget_limit > 0:
                if is_strict and fee > 250:
                    score -= 40.0
                elif fee > 100:
                    score -= 15.0

            # 2. Offbeat scoring
            # If offbeat is preferred, penalize mainstream highly popular spots
            if is_offbeat:
                if getattr(c, "is_offbeat", False):
                    score += 60.0
                if getattr(c, "popularity_level", "high") == "high":
                    score -= 45.0
            else:
                if getattr(c, "is_offbeat", False):
                    score += 10.0

            # 3. Category match
            if request.categories and c.category in request.categories:
                score += 35.0

            scored_candidates.append((score, c))

        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in scored_candidates[:target_count]]

    @classmethod
    def optimize_itinerary_for_budget(
        cls,
        request: PlanningRequest,
        destinations: list[RecommendedDestination],
        days: list[DayPlan],
        budget: CompleteBudgetBreakdown,
        candidates: Sequence[DestinationRead] | None = None,
    ) -> tuple[list[DayPlan], list[RecommendedDestination], CompleteBudgetBreakdown, bool]:
        """Actively optimizes an itinerary to fit within user budget constraints.

        Returns: (optimized_days, optimized_destinations, optimized_budget, was_optimized)
        """
        if budget.is_budget_feasible or not request.budget_limit_inr or request.budget_limit_inr <= 0:
            return days, destinations, budget, False

        travelers = max(1, request.travelers_count)
        effective_limit = (
            request.budget_limit_inr
            if request.budget_scope == "total_trip"
            else request.budget_limit_inr * travelers
        )

        lowest_feasible = cls.calculate_absolute_minimum_trip_cost(
            duration_days=request.duration_days,
            travelers_count=travelers,
            origin_label=request.origin_label,
        )

        # If mathematically impossible even at survival rates, cannot fake costs
        if effective_limit < lowest_feasible:
            return days, destinations, budget, False

        from app.services.budget import BudgetCalculator
        from app.services.destination_discovery import get_destination_discovery_service
        from app.services.scheduler import DeterministicScheduler

        # Step 1: Clone request with budget-conscious scenario & accommodation
        opt_request = request.model_copy(
            update={
                "budget_scenario": "budget",
                "accommodation_type_preference": "homestay"
                if request.accommodation_type_preference == "any"
                else (request.accommodation_type_preference or "homestay"),
            }
        )

        # Step 2: Prune or replace expensive attractions with free/low-cost ASI & nature spots
        disc_svc = get_destination_discovery_service()
        free_cand_records = disc_svc.discover_destinations(max_entry_fee_inr=50.0, limit=30)
        free_recs = [disc_svc.to_recommended_destination(d) for d in free_cand_records]

        from app.services.destination_uniqueness import (
            _haversine_distance_m,
            get_canonical_destination_id,
        )

        opt_destinations: list[RecommendedDestination] = []
        replaced_count = 0
        used_canon_ids = {
            get_canonical_destination_id(d.id, name=d.name, coordinates=d.coordinates, district_code=d.district_code)
            for d in destinations
        }
        used_coords = [
            (d.coordinates.lat, d.coordinates.lon)
            for d in destinations
            if getattr(d, "coordinates", None)
        ]

        for d in destinations:
            fee = (d.entry_fee_min_inr or 0.0) * travelers
            if fee > 200.0:  # Expensive attraction
                # Find free or low-cost substitute in same district or category
                substitute = None
                for fr in free_recs:
                    fr_canon = get_canonical_destination_id(
                        fr.id, name=fr.name, coordinates=fr.coordinates, district_code=fr.district_code
                    )
                    if fr_canon in used_canon_ids:
                        continue
                    if fr.coordinates:
                        too_close = False
                        for lat, lon in used_coords:
                            if _haversine_distance_m(fr.coordinates.lat, fr.coordinates.lon, lat, lon) <= 500.0:
                                too_close = True
                                break
                        if too_close:
                            continue
                    if fr.district_code == d.district_code or fr.category == d.category:
                        substitute = fr
                        break

                if substitute:
                    opt_destinations.append(
                        substitute.model_copy(
                            update={
                                "day_number": d.day_number,
                                "order": d.order,
                                "rationale": f"Budget-friendly alternative replacing {d.name} to maintain trip feasibility within ₹{effective_limit:,.0f}.",
                            }
                        )
                    )
                    sub_canon = get_canonical_destination_id(
                        substitute.id, name=substitute.name, coordinates=substitute.coordinates, district_code=substitute.district_code
                    )
                    used_canon_ids.add(sub_canon)
                    if substitute.coordinates:
                        used_coords.append((substitute.coordinates.lat, substitute.coordinates.lon))
                    replaced_count += 1
                    continue
            opt_destinations.append(d)

        # Step 3: Re-schedule and re-calculate budget
        opt_days, warnings, assumptions = DeterministicScheduler.build_schedule(
            request=opt_request, destinations=opt_destinations
        )
        opt_budget = BudgetCalculator.calculate_budget(
            request=opt_request, days=opt_days, destinations=opt_destinations
        )

        # Step 4: Verify feasibility
        if opt_budget.is_budget_feasible:
            opt_budget.calculation_notes.append(
                f"Active budget optimization applied: replaced {replaced_count} paid attraction(s) with free regional gems, selected budget homestays, and adjusted meal profiles to authentic local messes."
            )
            return opt_days, opt_destinations, opt_budget, True

        return opt_days, opt_destinations, opt_budget, False


