"""Authoritative deterministic budget calculation engine.

Computes comprehensive travel budget breakdowns across attraction fees, meals,
accommodations, transportation (driving, cab, transit, mixed), and contingency buffers
with explicit transparency on verified versus estimated figures and unknown values.
"""

from __future__ import annotations

import math

from app.schemas.planning import (
    BudgetCategoryItem,
    CompleteBudgetBreakdown,
    CostStatus,
    DayPlan,
    PlanningRequest,
    RecommendedDestination,
    StopType,
)
from app.services.transport_cost import SupportedTransportMode, TransportCostCalculator


class BudgetCalculator:
    """Calculates structured, transparent, non-deceptive travel budgets."""

    SCENARIO_MEAL_RATES = {
        "budget": {"breakfast": 80.0, "lunch": 150.0, "dinner": 200.0},
        "standard": {"breakfast": 100.0, "lunch": 200.0, "dinner": 250.0},
        "comfort": {"breakfast": 160.0, "lunch": 350.0, "dinner": 450.0},
    }

    SCENARIO_HOTEL_RATES = {
        "budget": {"min": 1200.0, "max": 1800.0, "desc": "Budget lodge / homestay lodging"},
        "standard": {"min": 1800.0, "max": 3000.0, "desc": "Standard 3-star / KSTDC hotel"},
        "comfort": {"min": 3500.0, "max": 6000.0, "desc": "Heritage resort / Jungle Lodges (JLR)"},
    }

    @classmethod
    def calculate_budget(
        cls,
        request: PlanningRequest,
        days: list[DayPlan],
        destinations: list[RecommendedDestination],
    ) -> CompleteBudgetBreakdown:
        categories: list[BudgetCategoryItem] = []
        travelers = max(1, request.travelers_count)
        duration = max(1, request.duration_days)
        scenario = getattr(request, "budget_scenario", "standard") or "standard"
        if scenario not in cls.SCENARIO_MEAL_RATES:
            scenario = "standard"

        travel_mode = getattr(request, "travel_mode", "driving_car") or "driving_car"
        is_return = getattr(request, "is_return_trip", True)
        fuel_eff = getattr(request, "fuel_efficiency_km_per_litre", 14.0)
        fuel_price = getattr(request, "fuel_price_per_litre", 102.86)

        warnings: list[str] = []
        calculation_notes: list[str] = [
            f"Budget scenario applied: '{scenario}' profile.",
            f"Transport mode selected: '{travel_mode}' (Return trip: {is_return}).",
        ]

        verified_subtotal = 0.0
        estimated_min_subtotal = 0.0
        estimated_max_subtotal = 0.0

        # ---------------------------------------------------------
        # 1. Attraction Entry Fees
        # ---------------------------------------------------------
        attraction_min = 0.0
        attraction_max = 0.0
        has_unknown_entry_fees = False
        known_fee_stops = 0
        all_attractions_verified = True

        for dest in destinations:
            min_fee = dest.entry_fee_min_inr
            max_fee = dest.entry_fee_max_inr

            if min_fee is None:
                has_unknown_entry_fees = True
                all_attractions_verified = False
            elif min_fee == 0.0 and (max_fee == 0.0 or max_fee is None):
                known_fee_stops += 1
            else:
                attraction_min += min_fee * travelers
                attraction_max += (max_fee or min_fee) * travelers
                known_fee_stops += 1

        if has_unknown_entry_fees and known_fee_stops == 0:
            entry_fee_status = CostStatus.UNKNOWN
            subtotal_type = "estimated"
        elif all_attractions_verified and not has_unknown_entry_fees:
            entry_fee_status = CostStatus.VERIFIED
            subtotal_type = "verified"
            verified_subtotal += attraction_min
        else:
            entry_fee_status = CostStatus.ESTIMATED
            subtotal_type = "estimated"
            estimated_min_subtotal += attraction_min
            estimated_max_subtotal += attraction_max

        categories.append(
            BudgetCategoryItem(
                category_name="Attraction Entry Fees",
                estimated_min_inr=round(attraction_min, 2)
                if (known_fee_stops > 0 or not has_unknown_entry_fees)
                else None,
                estimated_max_inr=round(attraction_max, 2)
                if (known_fee_stops > 0 or not has_unknown_entry_fees)
                else None,
                cost_status=entry_fee_status,
                calculation_basis=(
                    f"Official entry fees for {len(destinations)} attraction(s) "
                    f"× {travelers} traveler(s)"
                ),
                basis_type="per_person",
                subtotal_type=subtotal_type,
                notes=(
                    "Unverified attraction fees are flagged as unknown and "
                    "excluded from minimum totals."
                    if has_unknown_entry_fees
                    else "Verified against ASI / Karnataka Tourism official entry tariffs."
                ),
            )
        )

        if has_unknown_entry_fees:
            warnings.append(
                "Some attractions have unverified entry fees. "
                "These are excluded from minimum calculated totals."
            )

        # ---------------------------------------------------------
        # 2. Food & Meals (Breakfast, Lunch, Dinner)
        # ---------------------------------------------------------
        meal_min = 0.0
        meal_max = 0.0
        meal_count = 0
        verified_meal_cost = 0.0

        for day in days:
            for stop in day.stops:
                if stop.stop_type == StopType.MEAL:
                    meal_count += 1
                    s_min = stop.cost_min_inr or 0.0
                    s_max = stop.cost_max_inr or s_min
                    meal_min += s_min
                    meal_max += s_max
                    if stop.cost_status == CostStatus.VERIFIED:
                        verified_meal_cost += s_min

        # If scheduler didn't populate meal stops, compute from scenario profile
        if meal_count == 0:
            rates = cls.SCENARIO_MEAL_RATES[scenario]
            daily_per_person = rates["breakfast"] + rates["lunch"] + rates["dinner"]
            meal_min = daily_per_person * travelers * duration
            meal_max = meal_min * 1.25
            meal_count = duration * 3
            meal_status = CostStatus.ESTIMATED
            meal_basis = (
                f"{duration * 3} planned meals for {travelers} traveler(s) ({scenario} dining tier)"
            )
            estimated_min_subtotal += meal_min
            estimated_max_subtotal += meal_max
            meal_subtotal_type = "estimated"
        else:
            has_verified_meals = verified_meal_cost > 0
            meal_status = CostStatus.VERIFIED if has_verified_meals else CostStatus.ESTIMATED
            meal_basis = (
                f"{meal_count} scheduled meal stop(s) across {duration} day(s) "
                f"for {travelers} traveler(s)"
            )
            if has_verified_meals:
                verified_subtotal += verified_meal_cost
                estimated_min_subtotal += max(0.0, meal_min - verified_meal_cost)
                estimated_max_subtotal += max(0.0, meal_max - verified_meal_cost)
                meal_subtotal_type = "verified"
            else:
                estimated_min_subtotal += meal_min
                estimated_max_subtotal += meal_max
                meal_subtotal_type = "estimated"

        categories.append(
            BudgetCategoryItem(
                category_name="Meals & Dining (Breakfast, Lunch, Dinner)",
                estimated_min_inr=round(meal_min, 2),
                estimated_max_inr=round(meal_max, 2),
                cost_status=meal_status,
                calculation_basis=meal_basis,
                basis_type="per_person",
                subtotal_type=meal_subtotal_type,
                notes=(
                    f"Profile '{scenario}': "
                    f"Breakfast ₹{cls.SCENARIO_MEAL_RATES[scenario]['breakfast']:.0f}, "
                    f"Lunch ₹{cls.SCENARIO_MEAL_RATES[scenario]['lunch']:.0f}, "
                    f"Dinner ₹{cls.SCENARIO_MEAL_RATES[scenario]['dinner']:.0f}."
                ),
            )
        )

        # ---------------------------------------------------------
        # 3. Overnight Accommodation
        # ---------------------------------------------------------
        nights = max(0, duration - 1)
        rooms = math.ceil(travelers / 2)

        if nights > 0:
            scheduled_stay_stops = [
                s for day in days for s in day.stops if s.stop_type == StopType.ACCOMMODATION
            ]
            if scheduled_stay_stops:
                lodging_min = sum(s.cost_min_inr or 0.0 for s in scheduled_stay_stops)
                lodging_max = sum(
                    s.cost_max_inr or s.cost_min_inr or 0.0 for s in scheduled_stay_stops
                )
                is_all_verified = all(
                    s.cost_status == CostStatus.VERIFIED for s in scheduled_stay_stops
                )
                stay_status = CostStatus.VERIFIED if is_all_verified else CostStatus.ESTIMATED
                notes = (
                    "Based on verified tariffs from KSTDC / JLR / curated accommodations."
                    if is_all_verified
                    else f"Based on scheduled accommodation recommendations ({scenario} tier)."
                )
                if is_all_verified:
                    verified_subtotal += lodging_min
                    lodging_subtotal_type = "verified"
                else:
                    estimated_min_subtotal += lodging_min
                    estimated_max_subtotal += lodging_max
                    lodging_subtotal_type = "estimated"
            else:
                hotel_rate = cls.SCENARIO_HOTEL_RATES[scenario]
                lodging_min = nights * rooms * hotel_rate["min"]
                lodging_max = nights * rooms * hotel_rate["max"]
                stay_status = CostStatus.ESTIMATED
                lodging_subtotal_type = "estimated"
                estimated_min_subtotal += lodging_min
                estimated_max_subtotal += lodging_max
                notes = (
                    f"Estimated {hotel_rate['desc']} "
                    f"(₹{hotel_rate['min']:.0f}–₹{hotel_rate['max']:.0f} "
                    f"per room/night in regional Karnataka)."
                )

            categories.append(
                BudgetCategoryItem(
                    category_name="Overnight Accommodation",
                    estimated_min_inr=round(lodging_min, 2),
                    estimated_max_inr=round(lodging_max, 2),
                    cost_status=stay_status,
                    calculation_basis=(
                        f"{nights} night(s) × {rooms} standard room(s) (2 travelers/room)"
                    ),
                    basis_type="per_group",
                    subtotal_type=lodging_subtotal_type,
                    notes=notes,
                )
            )
        else:
            categories.append(
                BudgetCategoryItem(
                    category_name="Overnight Accommodation",
                    estimated_min_inr=0.0,
                    estimated_max_inr=0.0,
                    cost_status=CostStatus.NOT_APPLICABLE,
                    calculation_basis="Day trip (0 overnight stays required)",
                    basis_type="per_group",
                    subtotal_type="verified",
                    notes=None,
                )
            )

        # ---------------------------------------------------------
        # 4. Transportation Model Integration
        # ---------------------------------------------------------
        # Calculate total road distance from itinerary stops
        cumulative_route_km = 0.0
        has_return_leg = False
        for day in days:
            for s in day.stops:
                if s.distance_from_prev_km and s.distance_from_prev_km > 0:
                    cumulative_route_km += s.distance_from_prev_km
                if s.stop_id and s.stop_id.endswith("-return"):
                    has_return_leg = True

        # If itinerary stops didn't have distance (e.g. single day, origin not routed),
        # estimate realistic regional circuit based on duration
        if cumulative_route_km < 10.0:
            cumulative_route_km = max(60.0, duration * 110.0)

        # If the return leg is already explicitly scheduled in cumulative_route_km,
        # do not double the distance in TransportCostCalculator.
        effective_return_flag = False if has_return_leg else is_return

        trans_estimate = TransportCostCalculator.estimate_transport(
            mode=travel_mode,
            road_distance_km=cumulative_route_km,
            travelers_count=travelers,
            duration_days=duration,
            fuel_efficiency_km_per_litre=fuel_eff,
            fuel_price_per_litre=fuel_price,
            is_return_trip=effective_return_flag,
        )

        if trans_estimate.cost_status == CostStatus.VERIFIED:
            verified_subtotal += trans_estimate.total_cost_min_inr
            trans_subtotal_type = "verified"
        else:
            estimated_min_subtotal += trans_estimate.total_cost_min_inr
            estimated_max_subtotal += trans_estimate.total_cost_max_inr
            trans_subtotal_type = "estimated"

        trans_mode_label = trans_estimate.mode.value.replace("_", " ").title()
        categories.append(
            BudgetCategoryItem(
                category_name=f"Transportation ({trans_mode_label})",
                estimated_min_inr=round(trans_estimate.total_cost_min_inr, 2),
                estimated_max_inr=round(trans_estimate.total_cost_max_inr, 2),
                cost_status=trans_estimate.cost_status,
                calculation_basis=trans_estimate.calculation_basis,
                basis_type="per_group"
                if trans_estimate.mode
                in (SupportedTransportMode.DRIVING_CAR, SupportedTransportMode.CAB_TAXI)
                else "per_person",
                subtotal_type=trans_subtotal_type,
                notes=(
                    f"{trans_estimate.toll_and_parking_note} "
                    f"Assumptions: {' '.join(trans_estimate.assumptions[:2])}"
                ),
            )
        )

        calculation_notes.append(
            f"Transport: {cumulative_route_km:.1f} km route distance "
            f"({'round-trip' if is_return else 'one-way'} = "
            f"{trans_estimate.billable_distance_km:.1f} billable km)."
        )

        # ---------------------------------------------------------
        # 5. Contingency Buffer (10% over known subtotals)
        # ---------------------------------------------------------
        known_subtotal_min = verified_subtotal + estimated_min_subtotal
        known_subtotal_max = verified_subtotal + estimated_max_subtotal

        contingency_min = round(known_subtotal_min * 0.10, 2)
        contingency_max = round(known_subtotal_max * 0.10, 2)

        categories.append(
            BudgetCategoryItem(
                category_name="Contingency & Incidentals",
                estimated_min_inr=contingency_min,
                estimated_max_inr=contingency_max,
                cost_status=CostStatus.ESTIMATED,
                calculation_basis=(
                    "10% recommended reserve for snacks, bottled water, tips, "
                    "and unexpected local fees"
                ),
                basis_type="per_group",
                subtotal_type="contingency",
                notes="Calculated over sum of confirmed and estimated expense categories.",
            )
        )

        # Grand Totals
        grand_min = round(known_subtotal_min + contingency_min, 2)
        grand_max = round(known_subtotal_max + contingency_max, 2)
        per_person_min = round(grand_min / travelers, 2)
        per_person_max = round(grand_max / travelers, 2)

        # Budget Feasibility Check
        budget_limit = getattr(request, "budget_limit_inr", None)
        budget_scope = getattr(request, "budget_scope", "total_trip") or "total_trip"
        is_feasible = True
        budget_overrun: float | None = None

        if budget_limit is not None and budget_limit > 0:
            effective_target_total = (
                budget_limit if budget_scope == "total_trip" else budget_limit * travelers
            )

            if grand_min > effective_target_total:
                is_feasible = False
                budget_overrun = round(grand_min - effective_target_total, 2)
                scope_label = budget_scope.replace("_", " ")
                warning_text = (
                    f"Target budget of ₹{budget_limit:,.0f} ({scope_label}) is exceeded by "
                    f"approximately ₹{budget_overrun:,.0f}. Minimum estimated trip cost is "
                    f"₹{grand_min:,.0f} (₹{per_person_min:,.0f}/person). Consider selecting "
                    f"free/nature attractions or choosing budget transport."
                )
                if getattr(request, "language", "en") == "kn":
                    warning_text = (
                        f"ನಿಗದಿಪಡಿಸಿದ ಬಜೆಟ್ ₹{budget_limit:,.0f} ಗಿಂತ ಅಂದಾಜು ವೆಚ್ಚವು "
                        f"₹{budget_overrun:,.0f} ಹೆಚ್ಚಾಗಿದೆ. ಕನಿಷ್ಠ ವೆಚ್ಚ ₹{grand_min:,.0f}."
                    )
                warnings.append(warning_text)
                calculation_notes.append(
                    f"Budget constraint: ₹{budget_limit:,.0f} ({budget_scope}). "
                    f"Target exceeded by ₹{budget_overrun:,.0f}."
                )
            else:
                calculation_notes.append(
                    f"Budget constraint: ₹{budget_limit:,.0f} ({budget_scope}). "
                    f"Plan is within budget (estimated ₹{grand_min:,.0f} - ₹{grand_max:,.0f})."
                )

        return CompleteBudgetBreakdown(
            grand_total_min_inr=grand_min,
            grand_total_max_inr=grand_max,
            per_person_min_inr=per_person_min,
            per_person_max_inr=per_person_max,
            verified_subtotal_inr=round(verified_subtotal, 2),
            estimated_subtotal_min_inr=round(estimated_min_subtotal, 2),
            estimated_subtotal_max_inr=round(estimated_max_subtotal, 2),
            currency="INR",
            traveler_count=travelers,
            travel_mode_used=travel_mode,
            budget_scenario_used=scenario,
            is_return_trip=is_return,
            budget_limit_inr=budget_limit,
            budget_scope=budget_scope,
            is_budget_feasible=is_feasible,
            budget_overrun_inr=budget_overrun,
            categories=categories,
            has_unknown_costs=has_unknown_entry_fees,
            calculation_notes=calculation_notes,
            warnings=warnings,
        )
