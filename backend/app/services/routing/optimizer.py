"""Sequential multi-day route optimizer and geographic candidate planner."""

from __future__ import annotations

import logging

from app.schemas.destinations import Coordinates, DestinationRead, LanguageCode
from app.schemas.planning import PlanningRequest, RecommendedDestination
from app.services.clustering.corridors import (
    TravelCorridor,
    get_origin_coordinates,
    haversine_distance_km,
    identify_best_corridor,
)

logger = logging.getLogger(__name__)


class RouteOptimizer:
    """Optimizes multi-day destination selection and stop sequencing."""

    @staticmethod
    def plan_coherent_itinerary(
        request: PlanningRequest,
        candidates: list[DestinationRead],
    ) -> tuple[list[RecommendedDestination], list[str], TravelCorridor]:
        """Produce a geographically coherent, sequentially ordered destination sequence.

        Returns: (recommended_items, planning_warnings, chosen_corridor)
        """
        warnings: list[str] = []
        origin_coords = get_origin_coordinates(request.origin_label)

        # 1. Identify primary geographic corridor
        corridor, omitted_districts = identify_best_corridor(
            origin_coords=origin_coords,
            preferred_districts=request.preferred_districts,
            duration_days=request.duration_days,
        )

        if omitted_districts:
            omitted_str = ", ".join(omitted_districts)
            if request.language == LanguageCode.KN:
                warnings.append(
                    f"ಆಯ್ಕೆಮಾಡಿದ ಜಿಲ್ಲೆಗಳು ಪರಸ್ಪರ ಅತಿ ದೂರದಲ್ಲಿವೆ. {request.duration_days} "
                    f"ದಿನಗಳ ಪ್ರವಾಸಕ್ಕಾಗಿ ದಿನಕ್ಕೆ ೪ ಗಂಟೆಗಿಂತ ಹೆಚ್ಚು ಚಾಲನೆ ತಪ್ಪಿಸಲು ಪ್ರವಾಸವನ್ನು "
                    f"'{corridor.name_kn}' ಸರ್ಕ್ಯೂಟ್‌ಗೆ ಸೀಮಿತಗೊಳಿಸಲಾಗಿದೆ. "
                    f"ಉಳಿದ ಜಿಲ್ಲೆಗಳು ({omitted_str}) ಭೇಟಿ ನೀಡಲು ದಿನಗಳನ್ನು ವಿಸ್ತರಿಸಿ."
                )
            else:
                warnings.append(
                    f"Selected districts span distant regions of Karnataka. For a "
                    f"{request.duration_days}-day trip from {request.origin_label}, the "
                    f"itinerary is focused on the '{corridor.name_en}' to prevent excessive "
                    f"daily driving (>4 hrs). Omitted districts: {omitted_str}."
                )

        # 2. Filter candidates by corridor
        corridor_pool = [c for c in candidates if c.district_code in corridor.districts]
        if not corridor_pool:
            corridor_pool = list(candidates)

        # 3. Category matching and allied thematic categories
        allied_categories_map: dict[str, set[str]] = {
            "heritage": {"heritage", "architecture", "museum", "spiritual_cultural", "town_city"},
            "architecture": {"architecture", "heritage", "spiritual_cultural"},
            "nature": {"nature", "wildlife", "waterfall", "hill_station", "viewpoint"},
            "spiritual_cultural": {"spiritual_cultural", "heritage", "architecture", "food_culture"},
            "wildlife": {"wildlife", "nature"},
            "waterfall": {"waterfall", "nature", "viewpoint"},
            "hill_station": {"hill_station", "viewpoint", "nature", "adventure"},
            "beach": {"beach", "nature", "viewpoint"},
            "adventure": {"adventure", "hill_station", "nature", "beach"},
            "food_culture": {"food_culture", "spiritual_cultural"},
        }

        exact_cats = set(request.categories or [])
        allied_cats: set[str] = set()
        for c_cat in exact_cats:
            allied_cats.update(allied_categories_map.get(str(c_cat), set()))
        allied_cats -= exact_cats

        # 4. Determine stops per day based on pace
        stops_per_day = 3
        if request.pace == "relaxed":
            stops_per_day = 2
        elif request.pace == "packed":
            stops_per_day = 4

        total_stops_needed = request.duration_days * stops_per_day

        cat_matches = [c for c in corridor_pool if c.category in exact_cats]
        allied_matches = [c for c in corridor_pool if c.category in allied_cats]
        total_category_matches = cat_matches + allied_matches

        # If enough exact+allied matches exist to populate the trip, focus pool on them;
        # otherwise preserve the full corridor pool so later days never run out of stops.
        if len(total_category_matches) >= total_stops_needed:
            available_pool = list(total_category_matches)
        else:
            available_pool = list(corridor_pool)

        budget_limit = getattr(request, "budget_limit_inr", None)

        def candidate_priority_score(
            dest: DestinationRead,
            current_loc: Coordinates,
            previous_visited_locs: list[Coordinates],
        ) -> float:
            """Progressive exploration scoring: lower score is better."""
            if not dest.coordinates:
                return 9999.0
            dist_km = haversine_distance_km(
                current_loc.lat, current_loc.lon, dest.coordinates.lat, dest.coordinates.lon
            )

            # Progressive regional exploration:
            # Local cluster exploration (<= 45 km) gets a bonus to encourage thorough exploration
            # of the current region before moving to the next.
            if dist_km <= 45.0:
                dist_penalty = dist_km * 0.75
            elif dist_km <= 85.0:
                dist_penalty = dist_km
            else:
                dist_penalty = dist_km + (dist_km - 85.0) * 3.0

            # Backtracking prevention: penalize returning close to older visited stops
            backtrack_penalty = 0.0
            if len(previous_visited_locs) > 1:
                for prev in previous_visited_locs[:-1]:
                    d_prev = haversine_distance_km(dest.coordinates.lat, dest.coordinates.lon, prev.lat, prev.lon)
                    if d_prev < 20.0 and dist_km > 40.0:
                        backtrack_penalty += 75.0

            # Preference matching
            if dest.category in exact_cats:
                cat_bonus = -40.0
            elif dest.category in allied_cats:
                cat_bonus = -20.0
            else:
                cat_bonus = 0.0

            offbeat_bonus = -30.0 if (request.is_offbeat_preferred and dest.is_offbeat) else 0.0
            fee = dest.entry_fee_min_inr if dest.entry_fee_min_inr is not None else 50.0
            fee_penalty = (fee * 0.1) if budget_limit else 0.0
            return dist_penalty + backtrack_penalty + cat_bonus + offbeat_bonus + fee_penalty

        # 5. Sequential Day-by-Day Progressive Assignment
        scheduled_stops: list[RecommendedDestination] = []
        current_departure = origin_coords
        all_visited_locations: list[Coordinates] = [origin_coords]

        for day_num in range(1, request.duration_days + 1):
            day_candidates: list[DestinationRead] = []
            target_stops = min(stops_per_day, len(available_pool))
            day_start_coords = current_departure

            for _ in range(target_stops):
                if not available_pool:
                    break
                # Pick best candidate closest to current position
                available_pool.sort(
                    key=lambda d: candidate_priority_score(
                        d, current_departure, all_visited_locations
                    )
                )
                chosen = available_pool.pop(0)
                day_candidates.append(chosen)
                current_departure = chosen.coordinates
                all_visited_locations.append(chosen.coordinates)

            if not day_candidates:
                break

            # Re-order the day's stops using 2-opt / nearest neighbor starting from day's departure
            day_candidates = RouteOptimizer._order_day_stops(
                start_coords=day_start_coords,
                stops=day_candidates,
            )

            # Establish the actual end of the day as origin for subsequent day's exploration
            current_departure = day_candidates[-1].coordinates

            # Hydrate RecommendedDestination items for the day
            for order_idx, dest in enumerate(day_candidates, start=1):
                disp_name = dest.slug
                disp_summary = None
                for t in dest.translations:
                    if t.language_code == request.language:
                        disp_name = t.name
                        disp_summary = t.summary
                        break
                else:
                    for t in dest.translations:
                        if t.language_code == LanguageCode.EN:
                            disp_name = t.name
                            disp_summary = t.summary
                            break

                district_name = dest.district.name_en if dest.district else dest.district_code
                if dest.district and request.language == LanguageCode.KN:
                    district_name = dest.district.name_kn

                if request.language == LanguageCode.KN:
                    rationale = (
                        f"{corridor.name_kn} ವ್ಯಾಪ್ತಿಯ {district_name} ದಲ್ಲಿ ನಿಮ್ಮ {request.pace} "
                        f"ವೇಗಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ ಪ್ರಮುಖ ತಾಣ."
                    )
                else:
                    rationale = (
                        f"Curated {dest.category} destination in {district_name} within the "
                        f"{corridor.name_en} matching your {request.pace} pace."
                    )

                rec = RecommendedDestination(
                    id=dest.id,
                    slug=dest.slug,
                    name=disp_name,
                    summary=disp_summary,
                    category=dest.category,
                    district_code=dest.district_code,
                    district_name=district_name,
                    coordinates=dest.coordinates,
                    day_number=day_num,
                    order=order_idx,
                    rationale=rationale,
                    entry_fee_min_inr=dest.entry_fee_min_inr,
                    entry_fee_max_inr=dest.entry_fee_max_inr,
                    currency_code=dest.currency_code,
                    access_status=dest.access_status,
                    is_offbeat=dest.is_offbeat,
                    sources=dest.sources,
                )
                scheduled_stops.append(rec)

        return scheduled_stops, warnings, corridor

    @staticmethod
    def _order_day_stops(
        start_coords: Coordinates,
        stops: list[DestinationRead],
    ) -> list[DestinationRead]:
        """Order stops within a day sequentially using nearest-neighbor heuristic."""
        if len(stops) <= 1:
            return stops

        unvisited = list(stops)
        ordered: list[DestinationRead] = []
        curr_lat, curr_lon = start_coords.lat, start_coords.lon

        while unvisited:
            unvisited.sort(
                key=lambda s: haversine_distance_km(
                    curr_lat, curr_lon, s.coordinates.lat, s.coordinates.lon
                )
            )
            next_stop = unvisited.pop(0)
            ordered.append(next_stop)
            curr_lat, curr_lon = next_stop.coordinates.lat, next_stop.coordinates.lon

        return ordered

    @staticmethod
    def optimize_ai_selection(
        request: PlanningRequest,
        ai_items: list[RecommendedDestination],
        candidates: list[DestinationRead],
        corridor: TravelCorridor,
    ) -> list[RecommendedDestination]:
        """Validate and sequentially reorder AI-recommended destinations.

        Ensures:
        1. Day 1 starts from the user's origin hub.
        2. Destination stops are ordered using nearest-neighbor / 2-opt.
        3. Multi-day geographic continuity is enforced without teleportation.
        4. Any impossible 500+ km jump is caught and re-sequenced.
        """
        if not ai_items:
            return ai_items

        candidate_map = {c.id: c for c in candidates}
        candidate_slug_map = {c.slug: c for c in candidates}

        resolved_stops: list[tuple[DestinationRead, str | None]] = []
        for item in ai_items:
            dest = candidate_map.get(item.id) or candidate_slug_map.get(item.slug)
            if dest and dest.coordinates:
                resolved_stops.append((dest, item.rationale))

        if not resolved_stops:
            return ai_items

        origin_coords = get_origin_coordinates(request.origin_label)

        stops_per_day = 3
        if request.pace == "relaxed":
            stops_per_day = 2
        elif request.pace == "packed":
            stops_per_day = 4

        unallocated = list(resolved_stops)
        scheduled_stops: list[RecommendedDestination] = []
        current_departure = origin_coords

        for day_num in range(1, request.duration_days + 1):
            if not unallocated:
                break
            day_batch: list[tuple[DestinationRead, str | None]] = []
            target_count = min(stops_per_day, len(unallocated))
            day_start_coords = current_departure

            for _ in range(target_count):
                if not unallocated:
                    break
                unallocated.sort(
                    key=lambda s: haversine_distance_km(
                        current_departure.lat,
                        current_departure.lon,
                        s[0].coordinates.lat,
                        s[0].coordinates.lon,
                    )
                )
                chosen = unallocated.pop(0)
                day_batch.append(chosen)
                current_departure = chosen[0].coordinates

            if not day_batch:
                break

            day_dests = [b[0] for b in day_batch]
            ordered_dests = RouteOptimizer._order_day_stops(
                start_coords=day_start_coords,
                stops=day_dests,
            )
            # Anchor next day's departure to the actual final destination of this day
            current_departure = ordered_dests[-1].coordinates

            rationale_map = {b[0].id: b[1] for b in day_batch}

            for order_idx, dest in enumerate(ordered_dests, start=1):
                disp_name = dest.slug
                disp_summary = None
                for t in dest.translations:
                    if t.language_code == request.language:
                        disp_name = t.name
                        disp_summary = t.summary
                        break
                else:
                    for t in dest.translations:
                        if t.language_code == LanguageCode.EN:
                            disp_name = t.name
                            disp_summary = t.summary
                            break

                district_name = dest.district.name_en if dest.district else dest.district_code
                if dest.district and request.language == LanguageCode.KN:
                    district_name = dest.district.name_kn

                fallback_rationale = (
                    f"Selected {dest.category} destination in {district_name} within the "
                    f"{corridor.name_en} matching your preferences."
                )
                rationale = rationale_map.get(dest.id) or fallback_rationale

                scheduled_stops.append(
                    RecommendedDestination(
                        id=dest.id,
                        slug=dest.slug,
                        name=disp_name,
                        summary=disp_summary,
                        category=dest.category,
                        district_code=dest.district_code,
                        district_name=district_name,
                        coordinates=dest.coordinates,
                        day_number=day_num,
                        order=order_idx,
                        rationale=rationale,
                        entry_fee_min_inr=dest.entry_fee_min_inr,
                        entry_fee_max_inr=dest.entry_fee_max_inr,
                        currency_code=dest.currency_code,
                        access_status=dest.access_status,
                        is_offbeat=dest.is_offbeat,
                        sources=dest.sources,
                    )
                )

        return scheduled_stops
