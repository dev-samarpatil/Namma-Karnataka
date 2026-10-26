"""Deterministic travel scheduler and timeline generator.

Transforms destination candidates into realistic, feasible, time-budgeted daily itineraries
including sightseeing, meals, transit buffers, and overnight accommodations.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any

from app.core.errors import AppError
from app.repositories.destinations import get_destination_repository
from app.schemas.destinations import (
    Coordinates,
    DestinationCategory,
    DestinationFilterParams,
    DestinationRead,
    LanguageCode,
)
from app.schemas.planning import (
    AccessStatus,
    CostStatus,
    DayPlan,
    ItineraryStop,
    PlanningRecommendationResponse,
    PlanningRequest,
    RecommendedDestination,
    StopRegenerateCandidate,
    StopType,
    TravelLegAlternative,
    TravelLegDetails,
    TravelLegSegment,
)
from app.services.clustering.corridors import get_origin_coordinates
from app.services.events import get_events_service
from app.services.places import get_places_service
from app.services.routing import get_routing_service
from app.services.transit.service import get_transit_service
from app.services.transport_cost import TransportCostCalculator


def haversine_distance_km(coord1: Coordinates, coord2: Coordinates) -> float:
    """Calculate great-circle distance between two coordinates in kilometers."""
    lat1, lon1 = math.radians(coord1.lat), math.radians(coord1.lon)
    lat2, lon2 = math.radians(coord2.lat), math.radians(coord2.lon)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6371.0 * c


def estimate_transit_minutes(distance_km: float) -> int:
    """Estimate road travel time from straight-line distance.

    Assumes average 40 km/h regional driving speed in Karnataka terrain plus
    a standard 15-minute terminal/traffic buffer. Minimum transit is 15 minutes.
    """
    if distance_km <= 0:
        return 0
    estimated_driving_km = distance_km * 1.35  # Terrain winding factor
    hours = estimated_driving_km / 40.0
    return max(15, int(hours * 60) + 15)


def build_travel_leg_details(
    origin_name: str,
    dest_name: str,
    dist_km: float,
    duration_mins: int,
    prev_coords: Coordinates | None,
    dest_coords: Coordinates | None,
    request: PlanningRequest,
) -> TravelLegDetails:
    """Build structured, actionable transportation details for a travel leg."""
    travelers = max(1, request.travelers_count)
    dist = max(0.1, round(dist_km, 1))
    req_mode = getattr(request, "travel_mode", "driving_car") or "driving_car"

    # 1. Car fuel estimate
    eff = getattr(request, "fuel_efficiency_km_per_litre", None) or 15.0
    fuel_price = getattr(request, "fuel_price_per_litre", None) or 102.50
    car_est = TransportCostCalculator.calculate_car_fuel(
        road_distance_km=dist,
        travelers_count=travelers,
        fuel_efficiency_km_per_litre=eff,
        fuel_price_per_litre=fuel_price,
        is_return_trip=False,
    )
    fuel_litres = round(dist / max(1.0, eff), 1)

    # 2. Cab fare estimate
    cab_est = TransportCostCalculator.calculate_cab_fare(
        road_distance_km=dist,
        travelers_count=travelers,
        duration_days=1,
        is_return_trip=False,
    )

    # 3. Check public transit
    transit_options = []
    if prev_coords and dest_coords:
        try:
            transit_svc = get_transit_service()
            transit_options = transit_svc.find_journeys(
                origin_lat=prev_coords.lat,
                origin_lon=prev_coords.lon,
                dest_lat=dest_coords.lat,
                dest_lon=dest_coords.lon,
            )
        except Exception:
            transit_options = []

    # 4. Walking feasibility
    walking_feasible = dist <= 1.5
    walking_mins = max(5, math.ceil(dist * 13))  # ~4.6 km/h brisk walk

    # 5. Build Alternatives List
    alternatives: list[TravelLegAlternative] = [
        TravelLegAlternative(
            mode="driving_car",
            mode_label="Private Car",
            mode_label_kn="ಸ್ವಂತ ಕಾರು",
            duration_minutes=duration_mins,
            cost_inr=car_est.total_cost_min_inr,
            cost_status=CostStatus.ESTIMATED,
            notes=f"Fuel: ₹{car_est.total_cost_min_inr:.0f} (~{fuel_litres}L @ ₹{fuel_price:.2f}/L). Tolls & parking separate.",
            notes_kn=f"ಇಂಧನ: ₹{car_est.total_cost_min_inr:.0f} (~{fuel_litres} ಲೀಟರ್). ಟೋಲ್ ಪ್ರತ್ಯೇಕ.",
        ),
        TravelLegAlternative(
            mode="cab_taxi",
            mode_label="Taxi / Cab",
            mode_label_kn="ಟ್ಯಾಕ್ಸಿ / ಕ್ಯಾಬ್",
            duration_minutes=duration_mins,
            cost_inr=cab_est.total_cost_min_inr,
            cost_status=CostStatus.ESTIMATED,
            notes=f"Commercial taxi tariff ({dist:.1f} km). Tolls not included.",
            notes_kn=f"ಟ್ಯಾಕ್ಸಿ ದರ ({dist:.1f} ಕಿ.ಮೀ). ಟೋಲ್ ಹೊರತುಪಡಿಸಿ.",
        ),
    ]

    # Public transit alternative
    if transit_options:
        best_t = transit_options[0]
        t_per_person = best_t.total_fare_min_inr
        t_group = t_per_person * travelers
        t_operator = best_t.operator_name
        alternatives.append(
            TravelLegAlternative(
                mode="public_transit",
                mode_label=f"Public Transit ({t_operator})",
                mode_label_kn=f"ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ ({t_operator})",
                duration_minutes=best_t.total_duration_minutes,
                cost_inr=t_group,
                cost_status=CostStatus.VERIFIED if best_t.fare_status == "verified" else CostStatus.ESTIMATED,
                notes=f"Scheduled service fare (₹{t_per_person:.0f}/person)",
                notes_kn=f"ನಿಗದಿತ ಸಾರಿಗೆ ದರ (ತಲಾ ₹{t_per_person:.0f})",
            )
        )
    elif dist <= 1.5:
        alternatives.append(
            TravelLegAlternative(
                mode="public_transit",
                mode_label="Local City Bus (Short Hop)",
                mode_label_kn="ಸ್ಥಳೀಯ ನಗರ ಬಸ್",
                duration_minutes=max(10, duration_mins),
                cost_inr=15.0 * travelers,
                cost_status=CostStatus.ESTIMATED,
                notes=f"Local city transit stop-to-stop (~₹15/person)",
                notes_kn="ಸ್ಥಳೀಯ ನಗರ ಸಾರಿಗೆ (ತಲಾ ~₹15)",
            )
        )
    elif dist <= 15.0:
        local_bus_pp = float(min(30, max(15, round(10.0 + dist * 1.5, 0))))
        alternatives.append(
            TravelLegAlternative(
                mode="public_transit",
                mode_label="Local / City Bus",
                mode_label_kn="ಸ್ಥಳೀಯ / ನಗರ ಬಸ್",
                duration_minutes=duration_mins + 15,
                cost_inr=local_bus_pp * travelers,
                cost_status=CostStatus.ESTIMATED,
                notes=f"City municipal / KSRTC town bus (~₹{local_bus_pp:.0f}/person)",
                notes_kn=f"ಸ್ಥಳೀಯ ಬಸ್ ಸೇವೆ (ತಲಾ ~₹{local_bus_pp:.0f})",
            )
        )
    else:
        reg_bus_pp = float(max(35.0, round(dist * 1.85, 0)))
        alternatives.append(
            TravelLegAlternative(
                mode="public_transit",
                mode_label="KSRTC Regional Bus",
                mode_label_kn="ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಪ್ರಾದೇಶಿಕ ಬಸ್",
                duration_minutes=duration_mins + 25,
                cost_inr=reg_bus_pp * travelers,
                cost_status=CostStatus.ESTIMATED,
                notes=f"KSRTC Regional service (~₹{reg_bus_pp:.0f}/person, ~₹1.85/km)",
                notes_kn=f"ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಪ್ರಾದೇಶಿಕ ಬಸ್ ಸೇವೆ (ತಲಾ ~₹{reg_bus_pp:.0f})",
            )
        )

    # Mixed alternative
    autos_needed = math.ceil(travelers / 3)
    if transit_options:
        best_t = transit_options[0]
        local_transfer_fare = 60.0 * autos_needed
        mixed_cost_group = (best_t.total_fare_min_inr * travelers) + (local_transfer_fare * 2)
        alternatives.append(
            TravelLegAlternative(
                mode="mixed",
                mode_label="Mixed (Transit + Auto)",
                mode_label_kn="ಮಿಶ್ರ ಸಾರಿಗೆ (ಬಸ್ + ಆಟೋ)",
                duration_minutes=best_t.total_duration_minutes + 20,
                cost_inr=round(mixed_cost_group, 2),
                cost_status=CostStatus.ESTIMATED,
                notes=f"Scheduled {best_t.operator_name} (₹{best_t.total_fare_min_inr:.0f}×{travelers}) + ₹{local_transfer_fare*2:.0f} local auto transfers",
                notes_kn=f"ನಿಗದಿತ {best_t.operator_name} + ಸ್ಥಳೀಯ ಆಟೋ ಸಂಪರ್ಕಗಳು",
            )
        )
    elif dist > 15.0:
        est_bus_pp = max(35.0, round(dist * 1.85, 0))
        local_transfer_fare = 60.0 * autos_needed
        est_mixed_group = (est_bus_pp * travelers) + (local_transfer_fare * 2)
        alternatives.append(
            TravelLegAlternative(
                mode="mixed",
                mode_label="Mixed (Regional Transit + Local Auto)",
                mode_label_kn="ಮಿಶ್ರ ಸಾರಿಗೆ (ಪ್ರಾದೇಶಿಕ ಬಸ್ + ಆಟೋ)",
                duration_minutes=duration_mins + 25,
                cost_inr=round(est_mixed_group, 2),
                cost_status=CostStatus.ESTIMATED,
                notes=f"Estimated regional bus (~₹{est_bus_pp:.0f}/person) + ₹{local_transfer_fare*2:.0f} first/last-mile autos",
                notes_kn="ಅಂದಾಜು ಪ್ರಾದೇಶಿಕ ಬಸ್ + ಸ್ಥಳೀಯ ಆಟೋ",
            )
        )
    else:
        auto_fare = max(35.0, round(30.0 + max(0.0, dist - 1.5) * 16.0, 0)) * autos_needed
        alternatives.append(
            TravelLegAlternative(
                mode="mixed",
                mode_label="Mixed (Local Auto)",
                mode_label_kn="ಮಿಶ್ರ ಸಾರಿಗೆ (ಸ್ಥಳೀಯ ಆಟೋ)",
                duration_minutes=duration_mins + 5,
                cost_inr=round(auto_fare, 2),
                cost_status=CostStatus.ESTIMATED,
                notes=f"Local metered auto-rickshaw connection ({dist:.1f} km)",
                notes_kn=f"ಸ್ಥಳೀಯ ಆಟೋ ರಿಕ್ಷಾ ಸಂಪರ್ಕ ({dist:.1f} ಕಿ.ಮೀ)",
            )
        )

    # Walking alternative if short
    if dist <= 2.5:
        alternatives.append(
            TravelLegAlternative(
                mode="walking",
                mode_label="Walking",
                mode_label_kn="ಕಾಲ್ನಡಿಗೆ",
                duration_minutes=walking_mins,
                cost_inr=0.0,
                cost_status=CostStatus.VERIFIED,
                notes="Feasible pedestrian connection" if walking_feasible else "Extended walk, exercise caution",
                notes_kn="ಕಾಲ್ನಡಿಗೆ ಮಾರ್ಗ" if walking_feasible else "ಹೆಚ್ಚಿನ ದೂರದ ನಡಿಗೆ",
            )
        )

    segments: list[TravelLegSegment] = []
    warnings: list[str] = []
    toll_note = "Toll estimate unavailable — not included in the total."
    toll_note_kn = "ಟೋಲ್ ಅಂದಾಜು ಅಲಭ್ಯ — ಒಟ್ಟು ಮೊತ್ತದಲ್ಲಿ ಸೇರಿಸಲಾಗಿಲ್ಲ."
    parking_note = "Parking excluded — pay locally where applicable."
    parking_note_kn = "ಪಾರ್ಕಿಂಗ್ ವೆಚ್ಚ ಪ್ರತ್ಯೇಕ — ಅನ್ವಯವಾಗುವ ಸ್ಥಳಗಳಲ್ಲಿ ಪಾವತಿಸಿ."
    fuel_cost_inr = None

    if req_mode in ("walking", "walk") or (dist <= 0.8 and walking_feasible):
        rec_mode = "walking"
        rec_reason = f"Short pedestrian connection ({dist:.1f} km, ~{walking_mins} mins). Walking is pleasant and zero-cost."
        rec_reason_kn = f"ಹತ್ತಿರದ ಕಾಲ್ನಡಿಗೆ ಸಂಪರ್ಕ ({dist:.1f} ಕಿ.ಮೀ, ಸುಮಾರು {walking_mins} ನಿಮಿಷಗಳು). ನಡೆದುಕೊಂಡು ಹೋಗುವುದು ಸೂಕ್ತ."
        per_person_inr = 0.0
        group_inr = 0.0
        fare_status = CostStatus.VERIFIED
        calc_basis = "Zero-cost pedestrian movement"
        op_name = None
        route_num = None
        orig_term = None
        dest_term = None
        segments.append(
            TravelLegSegment(
                segment_order=1,
                segment_type="walk",
                mode="walking",
                mode_label="Walking",
                mode_label_kn="ಕಾಲ್ನಡಿಗೆ",
                description=f"Walk from {origin_name} to {dest_name}",
                description_kn=f"{origin_name} ಇಂದ {dest_name} ವರೆಗೆ ಕಾಲ್ನಡಿಗೆ",
                origin_name=origin_name,
                destination_name=dest_name,
                distance_km=dist,
                duration_minutes=walking_mins,
                cost_inr=0.0,
                cost_status=CostStatus.VERIFIED,
                is_per_person=False,
            )
        )
    elif req_mode == "mixed":
        rec_mode = "mixed"
        autos_count = math.ceil(travelers / 3)
        if transit_options:
            best_t = transit_options[0]
            op_name = best_t.operator_name
            route_num = best_t.legs[0].line_name if best_t.legs else None
            orig_term = best_t.legs[0].origin_stop.name_en if best_t.legs else f"{origin_name} Bus Stand"
            dest_term = best_t.legs[-1].destination_stop.name_en if best_t.legs else f"{dest_name} Bus Stand"

            t_fare_pp = best_t.total_fare_min_inr
            t_fare_group = t_fare_pp * travelers
            first_mile_cost = 100.0 * autos_count
            last_mile_cost = 100.0 * autos_count
            group_inr = t_fare_group + first_mile_cost + last_mile_cost
            per_person_inr = group_inr / travelers
            fare_status = CostStatus.ESTIMATED

            rec_reason = (
                f"Mixed multimodal connection: First-mile local auto to {orig_term}, "
                f"scheduled {op_name} transit corridor to {dest_term}, and last-mile auto to {dest_name}."
            )
            rec_reason_kn = (
                f"ಮಿಶ್ರ ಸಾರಿಗೆ: {orig_term} ವರೆಗೆ ಸ್ಥಳೀಯ ಆಟೋ, {op_name} ಸಾರ್ವಜನಿಕ ಬಸ್ ಮತ್ತು {dest_name} ವರೆಗೆ ಅಂತಿಮ ಹಂತದ ಆಟೋ."
            )
            calc_basis = (
                f"Scheduled {op_name} fare ₹{t_fare_pp:.0f}×{travelers} + "
                f"₹{first_mile_cost + last_mile_cost:.0f} first/last-mile local auto transfers"
            )

            segments = [
                TravelLegSegment(
                    segment_order=1,
                    segment_type="first_mile",
                    mode="auto_rickshaw",
                    mode_label="First-Mile Auto-Rickshaw",
                    mode_label_kn="ಆರಂಭಿಕ ಆಟೋ ಸಂಪರ್ಕ",
                    description=f"Local auto transfer from {origin_name} to {orig_term}",
                    description_kn=f"{origin_name} ಇಂದ {orig_term} ವರೆಗೆ ಸ್ಥಳೀಯ ಆಟೋ",
                    origin_name=origin_name,
                    destination_name=orig_term,
                    distance_km=min(3.0, round(dist * 0.1, 1)),
                    duration_minutes=12,
                    cost_inr=first_mile_cost,
                    cost_status=CostStatus.ESTIMATED,
                    is_per_person=False,
                ),
                TravelLegSegment(
                    segment_order=2,
                    segment_type="intercity_transit",
                    mode="public_transit",
                    mode_label=f"{op_name} Scheduled Service",
                    mode_label_kn=f"{op_name} ನಿಗದಿತ ಬಸ್ ಸೇವೆ",
                    description=f"Scheduled intercity transit from {orig_term} to {dest_term}",
                    description_kn=f"{orig_term} ಇಂದ {dest_term} ವರೆಗೆ ನಿಗದಿತ ಸಾರಿಗೆ",
                    operator_name=op_name,
                    route_service_number=route_num,
                    origin_name=orig_term,
                    destination_name=dest_term,
                    distance_km=dist,
                    duration_minutes=best_t.total_duration_minutes,
                    cost_inr=t_fare_group,
                    cost_status=CostStatus.VERIFIED if best_t.fare_status == "verified" else CostStatus.ESTIMATED,
                    is_per_person=True,
                ),
                TravelLegSegment(
                    segment_order=3,
                    segment_type="last_mile",
                    mode="auto_rickshaw",
                    mode_label="Last-Mile Auto-Rickshaw",
                    mode_label_kn="ಅಂತಿಮ ಆಟೋ ಸಂಪರ್ಕ",
                    description=f"Local auto transfer from {dest_term} to {dest_name}",
                    description_kn=f"{dest_term} ಇಂದ {dest_name} ವರೆಗೆ ಸ್ಥಳೀಯ ಆಟೋ",
                    origin_name=dest_term,
                    destination_name=dest_name,
                    distance_km=min(3.0, round(dist * 0.1, 1)),
                    duration_minutes=12,
                    cost_inr=last_mile_cost,
                    cost_status=CostStatus.ESTIMATED,
                    is_per_person=False,
                ),
            ]
        elif dist > 15.0:
            est_bus_pp = max(40.0, round(dist * 1.5, 0))
            est_bus_group = est_bus_pp * travelers
            first_mile_cost = 120.0 * autos_count
            last_mile_cost = 120.0 * autos_count
            group_inr = est_bus_group + first_mile_cost + last_mile_cost
            per_person_inr = group_inr / travelers
            fare_status = CostStatus.ESTIMATED
            op_name = "KSRTC / Regional Transit"
            route_num = None
            orig_term = f"{origin_name} Bus Stand"
            dest_term = f"{dest_name} Bus Stand"
            rec_reason = (
                f"Mixed transit: Local auto to regional bus station, intercity state bus (~{dist:.1f} km), "
                f"and local auto connection to destination."
            )
            rec_reason_kn = (
                f"ಮಿಶ್ರ ಸಾರಿಗೆ: ಪ್ರಾದೇಶಿಕ ಬಸ್ ನಿಲ್ದಾಣಕ್ಕೆ ಆಟೋ, ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಬಸ್ ಪ್ರಯಾಣ ಮತ್ತು ಸ್ಥಳೀಯ ಆಟೋ ಸಂಪರ್ಕ."
            )
            calc_basis = (
                f"Estimated regional transit fare (~₹{est_bus_pp:.0f}/person) + "
                f"₹{first_mile_cost + last_mile_cost:.0f} local auto transfers"
            )
            warnings.append("Direct timetable schedule unverified for this corridor; board at local KSRTC bus stand.")
            segments = [
                TravelLegSegment(
                    segment_order=1,
                    segment_type="first_mile",
                    mode="auto_rickshaw",
                    mode_label="First-Mile Auto",
                    mode_label_kn="ಆರಂಭಿಕ ಆಟೋ",
                    description=f"Auto transfer to {orig_term}",
                    description_kn=f"{orig_term} ವರೆಗೆ ಆಟೋ",
                    origin_name=origin_name,
                    destination_name=orig_term,
                    distance_km=2.0,
                    duration_minutes=10,
                    cost_inr=first_mile_cost,
                    cost_status=CostStatus.ESTIMATED,
                    is_per_person=False,
                ),
                TravelLegSegment(
                    segment_order=2,
                    segment_type="intercity_transit",
                    mode="public_transit",
                    mode_label="Regional Intercity Bus",
                    mode_label_kn="ಪ್ರಾದೇಶಿಕ ಅಂತರ್-ನಗರ ಬಸ್",
                    description=f"State bus service ({dist:.1f} km)",
                    description_kn=f"ಸರ್ಕಾರಿ ಬಸ್ ಸೇವೆ ({dist:.1f} ಕಿ.ಮೀ)",
                    operator_name=op_name,
                    origin_name=orig_term,
                    destination_name=dest_term,
                    distance_km=dist,
                    duration_minutes=duration_mins + 15,
                    cost_inr=est_bus_group,
                    cost_status=CostStatus.ESTIMATED,
                    is_per_person=True,
                ),
                TravelLegSegment(
                    segment_order=3,
                    segment_type="last_mile",
                    mode="auto_rickshaw",
                    mode_label="Last-Mile Auto",
                    mode_label_kn="ಅಂತಿಮ ಆಟೋ",
                    description=f"Auto transfer from {dest_term} to {dest_name}",
                    description_kn=f"{dest_term} ಇಂದ {dest_name} ವರೆಗೆ ಆಟೋ",
                    origin_name=dest_term,
                    destination_name=dest_name,
                    distance_km=2.0,
                    duration_minutes=10,
                    cost_inr=last_mile_cost,
                    cost_status=CostStatus.ESTIMATED,
                    is_per_person=False,
                ),
            ]
        else:
            auto_fare = max(35.0, round(30.0 + max(0.0, dist - 1.5) * 16.0, 0)) * autos_count
            group_inr = auto_fare
            per_person_inr = group_inr / travelers
            fare_status = CostStatus.ESTIMATED
            op_name = "Local Auto-Rickshaw"
            route_num = None
            orig_term = None
            dest_term = None
            rec_reason = f"Short local connection ({dist:.1f} km): Local metered auto-rickshaw transfer."
            rec_reason_kn = f"ಸ್ಥಳೀಯ ಸಂಪರ್ಕ ({dist:.1f} ಕಿ.ಮೀ): ಸ್ಥಳೀಯ ಆಟೋ ರಿಕ್ಷಾ ಸಂಪರ್ಕ."
            calc_basis = f"Metered local auto-rickshaw (₹30 base for 1.5km + ₹16/km for {autos_count} auto(s))"
            segments = [
                TravelLegSegment(
                    segment_order=1,
                    segment_type="local_transfer",
                    mode="auto_rickshaw",
                    mode_label="Local Auto-Rickshaw",
                    mode_label_kn="ಸ್ಥಳೀಯ ಆಟೋ ರಿಕ್ಷಾ",
                    description=f"Metered auto transfer ({dist:.1f} km)",
                    description_kn=f"ಸ್ಥಳೀಯ ಆಟೋ ಸಂಪರ್ಕ ({dist:.1f} ಕಿ.ಮೀ)",
                    origin_name=origin_name,
                    destination_name=dest_name,
                    distance_km=dist,
                    duration_minutes=duration_mins,
                    cost_inr=auto_fare,
                    cost_status=CostStatus.ESTIMATED,
                    is_per_person=False,
                )
            ]
    elif req_mode in ("public_transit", "transit"):
        rec_mode = "public_transit"
        if transit_options:
            best_t = transit_options[0]
            op_name = best_t.operator_name
            route_num = best_t.legs[0].line_name if best_t.legs else None
            orig_term = best_t.legs[0].origin_stop.name_en if best_t.legs else None
            dest_term = best_t.legs[-1].destination_stop.name_en if best_t.legs else None
            per_person_inr = best_t.total_fare_min_inr
            group_inr = per_person_inr * travelers
            fare_status = CostStatus.VERIFIED if best_t.fare_status == "verified" else CostStatus.ESTIMATED
            rec_reason = f"Verified scheduled {op_name} service connecting {origin_name} corridor to {dest_name}."
            rec_reason_kn = f"{op_name} ಪರಿಶೀಲಿಸಿದ ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ ಸಂಪರ್ಕ."
            calc_basis = f"Published schedule fare ₹{per_person_inr:.0f} per traveler"
            segments = [
                TravelLegSegment(
                    segment_order=1,
                    segment_type="transit",
                    mode="public_transit",
                    mode_label=f"{op_name} Bus/Train",
                    mode_label_kn=f"{op_name} ಸಾರಿಗೆ",
                    description=f"Scheduled service from {orig_term or origin_name} to {dest_term or dest_name}",
                    description_kn="ನಿಗದಿತ ಸಾರಿಗೆ ಸೇವೆ",
                    operator_name=op_name,
                    route_service_number=route_num,
                    origin_name=orig_term or origin_name,
                    destination_name=dest_term or dest_name,
                    distance_km=dist,
                    duration_minutes=best_t.total_duration_minutes,
                    cost_inr=group_inr,
                    cost_status=fare_status,
                    is_per_person=True,
                )
            ]
        elif dist <= 1.5:
            per_person_inr = 15.0
            group_inr = 15.0 * travelers
            fare_status = CostStatus.ESTIMATED
            op_name = "City Transit / Municipal Bus"
            route_num = None
            orig_term = None
            dest_term = None
            rec_reason = f"Short urban transit hop ({dist:.1f} km): Local city bus or pedestrian walk."
            rec_reason_kn = f"ಸ್ಥಳೀಯ ನಗರ ಸಾರಿಗೆ ({dist:.1f} ಕಿ.ಮೀ): ಸ್ಥಳೀಯ ಬಸ್."
            calc_basis = f"Standard local stage fare ₹{per_person_inr:.0f} per traveler"
            segments = [
                TravelLegSegment(
                    segment_order=1,
                    segment_type="transit",
                    mode="public_transit",
                    mode_label="Local City Bus",
                    mode_label_kn="ಸ್ಥಳೀಯ ನಗರ ಬಸ್",
                    description=f"Local bus hop ({dist:.1f} km)",
                    description_kn=f"ಸ್ಥಳೀಯ ನಗರ ಬಸ್ ({dist:.1f} ಕಿ.ಮೀ)",
                    operator_name=op_name,
                    origin_name=origin_name,
                    destination_name=dest_name,
                    distance_km=dist,
                    duration_minutes=max(10, duration_mins),
                    cost_inr=group_inr,
                    cost_status=fare_status,
                    is_per_person=True,
                )
            ]
        elif dist <= 15.0:
            per_person_inr = float(min(30, max(15, round(10.0 + dist * 1.5, 0))))
            group_inr = per_person_inr * travelers
            fare_status = CostStatus.ESTIMATED
            op_name = "Local Town / City Bus"
            route_num = None
            orig_term = f"{origin_name} Stop"
            dest_term = f"{dest_name} Stop"
            rec_reason = f"City municipal / KSRTC town bus service ({dist:.1f} km, ~₹{per_person_inr:.0f}/person)."
            rec_reason_kn = f"ಸ್ಥಳೀಯ ನಗರ / ಪಟ್ಟಣ ಬಸ್ ಸೇವೆ ({dist:.1f} ಕಿ.ಮೀ, ತಲಾ ~₹{per_person_inr:.0f})."
            calc_basis = f"Standard municipal stage fare ₹{per_person_inr:.0f} per traveler"
            segments = [
                TravelLegSegment(
                    segment_order=1,
                    segment_type="transit",
                    mode="public_transit",
                    mode_label="City / Town Bus",
                    mode_label_kn="ನಗರ / ಪಟ್ಟಣ ಬಸ್",
                    description=f"City bus from {orig_term} to {dest_term}",
                    description_kn=f"{orig_term} ಇಂದ {dest_term} ವರೆಗೆ ನಗರ ಬಸ್",
                    operator_name=op_name,
                    origin_name=orig_term,
                    destination_name=dest_term,
                    distance_km=dist,
                    duration_minutes=duration_mins + 15,
                    cost_inr=group_inr,
                    cost_status=fare_status,
                    is_per_person=True,
                )
            ]
        else:
            per_person_inr = float(max(35.0, round(dist * 1.85, 0)))
            group_inr = per_person_inr * travelers
            fare_status = CostStatus.ESTIMATED
            op_name = "KSRTC Regional Bus"
            route_num = None
            orig_term = f"{origin_name} Bus Stand"
            dest_term = f"{dest_name} Bus Stand"
            rec_reason = f"KSRTC regional state bus service ({dist:.1f} km, ~₹1.85/km ordinary/express rate)."
            rec_reason_kn = f"ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಪ್ರಾದೇಶಿಕ ಸರ್ಕಾರಿ ಬಸ್ ಸೇವೆ ({dist:.1f} ಕಿ.ಮೀ)."
            calc_basis = f"Standard KSRTC regional fare estimate ₹{per_person_inr:.0f} per traveler (~₹1.85/km)"
            segments = [
                TravelLegSegment(
                    segment_order=1,
                    segment_type="transit",
                    mode="public_transit",
                    mode_label="KSRTC Regional Bus",
                    mode_label_kn="ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಪ್ರಾದೇಶಿಕ ಬಸ್",
                    description=f"Regional state bus from {orig_term} to {dest_term}",
                    description_kn=f"{orig_term} ಇಂದ {dest_term} ವರೆಗೆ ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಬಸ್",
                    operator_name=op_name,
                    origin_name=orig_term,
                    destination_name=dest_term,
                    distance_km=dist,
                    duration_minutes=duration_mins + 25,
                    cost_inr=group_inr,
                    cost_status=fare_status,
                    is_per_person=True,
                )
            ]
    elif req_mode in ("driving_car", "car"):
        rec_mode = "driving_car"
        per_person_inr = car_est.per_person_min_inr
        group_inr = car_est.total_cost_min_inr
        fare_status = CostStatus.ESTIMATED
        fuel_cost_inr = car_est.total_cost_min_inr
        rec_reason = (
            f"Convenient self-drive route ({dist:.1f} km, ~{duration_mins} mins) across Karnataka road network. "
            f"Estimated fuel: ₹{fuel_cost_inr:.0f} (~{fuel_litres}L @ ₹{fuel_price:.2f}/L)."
        )
        rec_reason_kn = (
            f"ಸ್ವಂತ ವಾಹನ ಪ್ರಯಾಣ ({dist:.1f} ಕಿ.ಮೀ, ಸುಮಾರು {duration_mins} ನಿಮಿಷಗಳು). "
            f"ಅಂದಾಜು ಇಂಧನ ವೆಚ್ಚ: ₹{fuel_cost_inr:.0f} (~{fuel_litres} ಲೀಟರ್)."
        )
        calc_basis = car_est.calculation_basis
        op_name = None
        route_num = None
        orig_term = None
        dest_term = None
        segments = [
            TravelLegSegment(
                segment_order=1,
                segment_type="direct_drive",
                mode="driving_car",
                mode_label="Self-Drive Route",
                mode_label_kn="ಸ್ವಂತ ವಾಹನ ಚಾಲನೆ",
                description=f"Drive {dist:.1f} km via state road network",
                description_kn=f"ರಸ್ತೆ ಜಾಲದ ಮೂಲಕ {dist:.1f} ಕಿ.ಮೀ ಚಾಲನೆ",
                origin_name=origin_name,
                destination_name=dest_name,
                distance_km=dist,
                duration_minutes=duration_mins,
                cost_inr=fuel_cost_inr,
                cost_status=CostStatus.ESTIMATED,
                is_per_person=False,
            )
        ]
    else:  # cab_taxi or default
        rec_mode = "cab_taxi"
        per_person_inr = cab_est.per_person_min_inr
        group_inr = cab_est.total_cost_min_inr
        fare_status = CostStatus.ESTIMATED
        rec_reason = f"Point-to-point road taxi / auto transfer ({dist:.1f} km, ~{duration_mins} mins)."
        rec_reason_kn = f"ನೇರ ಟ್ಯಾಕ್ಸಿ / ಆಟೋ ಸಂಪರ್ಕ ({dist:.1f} ಕಿ.ಮೀ, ಸುಮಾರು {duration_mins} ನಿಮಿಷಗಳು)."
        calc_basis = cab_est.calculation_basis
        op_name = "Local Taxi / Auto"
        route_num = None
        orig_term = None
        dest_term = None
        segments = [
            TravelLegSegment(
                segment_order=1,
                segment_type="taxi",
                mode="cab_taxi",
                mode_label="Commercial Cab / Taxi",
                mode_label_kn="ಟ್ಯಾಕ್ಸಿ / ಕ್ಯಾಬ್",
                description=f"Point-to-point commercial taxi service ({dist:.1f} km)",
                description_kn=f"ನೇರ ಟ್ಯಾಕ್ಸಿ ಸಂಪರ್ಕ ({dist:.1f} ಕಿ.ಮೀ)",
                operator_name=op_name,
                origin_name=origin_name,
                destination_name=dest_name,
                distance_km=dist,
                duration_minutes=duration_mins,
                cost_inr=group_inr,
                cost_status=CostStatus.ESTIMATED,
                is_per_person=False,
            )
        ]

    return TravelLegDetails(
        leg_id=f"leg-{dist:.1f}km",
        origin_name=origin_name,
        destination_name=dest_name,
        distance_km=dist,
        duration_minutes=duration_mins,
        selected_mode=req_mode,
        recommended_mode=rec_mode,
        recommendation_reason=rec_reason,
        recommendation_reason_kn=rec_reason_kn,
        cost_per_person_inr=round(per_person_inr, 2) if per_person_inr is not None else None,
        cost_group_inr=round(group_inr, 2) if group_inr is not None else None,
        fare_status=fare_status,
        calculation_basis=calc_basis,
        operator_name=op_name,
        route_service_number=route_num,
        origin_terminal=orig_term,
        destination_terminal=dest_term,
        fuel_cost_inr=fuel_cost_inr,
        fuel_litres=fuel_litres if req_mode in ("driving_car", "car") else None,
        vehicles_count=car_est.vehicles_count,
        toll_note=toll_note,
        toll_note_kn=toll_note_kn,
        parking_note=parking_note,
        parking_note_kn=parking_note_kn,
        walking_feasible=walking_feasible,
        walking_notes=f"Pedestrian feasible ({dist:.1f} km)" if walking_feasible else f"Distance ({dist:.1f} km) is not recommended for walking",
        walking_notes_kn=f"ಕಾಲ್ನಡಿಗೆಗೆ ಸೂಕ್ತ ({dist:.1f} ಕಿ.ಮೀ)" if walking_feasible else f"ದೂರವು ({dist:.1f} ಕಿ.ಮೀ) ಕಾಲ್ನಡಿಗೆಗೆ ಸೂಕ್ತವಲ್ಲ",
        source_reference="Karnataka Transit Network / Transport Cost Calculator",
        segments=segments,
        alternatives=alternatives,
        warnings=warnings,
    )


class DeterministicScheduler:
    """Builds and validates structured day-by-day travel timelines."""

    @staticmethod
    def build_schedule(
        request: PlanningRequest,
        destinations: list[RecommendedDestination | DestinationRead],
        base_date: datetime | None = None,
    ) -> tuple[list[DayPlan], list[str], list[str]]:
        """Construct chronological day plans with meals, attractions, and accommodations.

        Returns (days, schedule_warnings, assumptions).
        """
        days: list[DayPlan] = []
        schedule_warnings: list[str] = []
        assumptions: list[str] = [
            "Sightseeing start times assume 09:00 AM departure after breakfast.",
            "Meal times scheduled at regular windows: Lunch (13:00) and Dinner (20:00).",
            (
                "Transit durations use terrain-adjusted straight-line estimates; "
                "road conditions may vary."
            ),
            "Overnight accommodation costs assume standard 2-person occupancy per room.",
        ]

        # Deduplicate input destinations by canonical ID / slug
        repo = get_destination_repository()
        canonical_id_map = getattr(repo, "CANONICAL_ID_MAPPINGS", {})
        canonical_slug_map = getattr(repo, "CANONICAL_SLUG_MAPPINGS", {})
        deduped_destinations: list[Any] = []
        seen_keys: set[str] = set()

        for d in destinations:
            raw_id = str(getattr(d, "id", "") or getattr(d, "destination_id", "") or "")
            raw_slug = str(getattr(d, "slug", "") or "")
            canon_id = canonical_id_map.get(raw_id, raw_id)
            canon_slug = canonical_slug_map.get(raw_slug, raw_slug)
            key = canon_id or canon_slug

            if key and key in seen_keys:
                name = getattr(d, "name_en", raw_slug or raw_id)
                schedule_warnings.append(
                    f"Consolidated duplicate destination '{name}' into single canonical itinerary stop."
                )
                continue
            if key:
                seen_keys.add(key)
            deduped_destinations.append(d)

        # Group input destinations by day number
        dest_by_day: dict[int, list[Any]] = {}
        for d in deduped_destinations:
            day_num = getattr(d, "day_number", 1)
            dest_by_day.setdefault(day_num, []).append(d)

        # Base calendar date if user supplied start_date
        if base_date is None and request.start_date:
            try:
                base_date = datetime.strptime(request.start_date, "%Y-%m-%d")
            except ValueError:
                pass

        # Budget scenario unit rates
        scenario = getattr(request, "budget_scenario", "standard") or "standard"
        if scenario == "budget":
            bfast_unit = 80.0
            lunch_unit = 150.0
            dinner_unit = 200.0
            stay_unit_min = 1200.0
            stay_unit_max = 1800.0
        elif scenario == "comfort":
            bfast_unit = 160.0
            lunch_unit = 350.0
            dinner_unit = 450.0
            stay_unit_min = 3500.0
            stay_unit_max = 6000.0
        else:  # standard
            bfast_unit = 100.0
            lunch_unit = 200.0
            dinner_unit = 250.0
            stay_unit_min = 1800.0
            stay_unit_max = 3000.0

        origin_coords = get_origin_coordinates(request.origin_label)
        current_loc_coords: Coordinates | None = origin_coords
        current_loc_name: str = request.origin_label
        scheduled_event_ids: set[str] = set()

        for day_num in range(1, request.duration_days + 1):
            day_destinations = dest_by_day.get(day_num, [])
            day_date_str = (
                (base_date + timedelta(days=day_num - 1)).strftime("%Y-%m-%d")
                if base_date
                else None
            )

            # Determine dominant district/theme
            districts = [
                getattr(d, "district_name", None) or getattr(d, "district_code", "Karnataka")
                for d in day_destinations
            ]
            primary_district = districts[0] if districts else "Karnataka"
            theme = f"{primary_district} Discovery & Cultural Circuit"
            if request.language == LanguageCode.KN:
                theme = f"{primary_district} ದರ್ಶನ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಪ್ರವಾಸ"

            stops: list[ItineraryStop] = []
            current_time = datetime(2026, 1, 1, 8, 30)  # Start day at 08:30 AM
            start_location_name = current_loc_name
            start_coordinates = current_loc_coords
            prev_coords: Coordinates | None = current_loc_coords
            day_driving_km: float = 0.0
            total_transit_mins = 0
            meals_covered: list[str] = []
            day_cost_min = 0.0
            day_cost_max = 0.0

            # 1. Breakfast (08:30 - 09:15)
            bfast_end = current_time + timedelta(minutes=45)
            bfast_name = (
                "Traditional Breakfast"
                if request.language == LanguageCode.EN
                else "ಸಾಂಪ್ರದಾಯಿಕ ಉಪಹಾರ"
            )
            bfast_desc = (
                f"Enjoy local South Indian breakfast in {start_location_name} "
                "(idli, vada, filter coffee). Choose a nearby verified eatery."
                if request.language == LanguageCode.EN
                else f"{start_location_name} ನಲ್ಲಿ ಬೆಳಗಿನ ಉಪಹಾರ (ಇಡ್ಲಿ, ವಡೆ, ಫಿಲ್ಟರ್ ಕಾಫಿ)."
            )
            stops.append(
                ItineraryStop(
                    stop_id=f"stop-d{day_num}-breakfast",
                    destination_id=None,
                    stop_type=StopType.MEAL,
                    name=bfast_name,
                    description=bfast_desc,
                    start_time=current_time.strftime("%H:%M"),
                    end_time=bfast_end.strftime("%H:%M"),
                    duration_minutes=45,
                    coordinates=current_loc_coords,
                    distance_from_prev_km=None,
                    transit_from_prev_minutes=None,
                    transit_method=None,
                    cost_min_inr=round(bfast_unit * request.travelers_count, 2),
                    cost_max_inr=round(bfast_unit * 1.5 * request.travelers_count, 2),
                    currency="INR",
                    cost_status=CostStatus.ESTIMATED,
                    source_reference=None,
                    rationale=(
                        f"Essential breakfast fuel in {start_location_name} before exploration."
                    ),
                )
            )
            meals_covered.append("Breakfast")
            day_cost_min += bfast_unit * request.travelers_count
            day_cost_max += bfast_unit * 1.5 * request.travelers_count
            current_time = bfast_end + timedelta(minutes=15)  # 15 min buffer to 09:30

            # 2. Schedule Sightseeing Stops and Lunch
            lunch_inserted = False

            for s_idx, dest in enumerate(day_destinations):
                coords: Coordinates | None = None
                if hasattr(dest, "coordinates") and dest.coordinates:
                    coords = Coordinates(lat=dest.coordinates.lat, lon=dest.coordinates.lon)

                dist_km: float | None = None
                transit_mins: int | None = None
                transit_method: str | None = None
                if prev_coords and coords:
                    routing_svc = get_routing_service()
                    route_est = routing_svc.estimate_travel(
                        prev_coords.lat, prev_coords.lon, coords.lat, coords.lon
                    )
                    dist_km = route_est.estimated_road_distance_km
                    transit_mins = route_est.duration_minutes
                    transit_method = "terrain_adjusted_estimate"
                    total_transit_mins += transit_mins
                    day_driving_km += dist_km
                    current_time += timedelta(minutes=transit_mins)
                    for w in route_est.feasibility_warnings:
                        if w not in schedule_warnings:
                            schedule_warnings.append(w)

                # Insert Lunch around 13:00 if not already inserted
                if not lunch_inserted and (
                    current_time.hour >= 13 or s_idx >= len(day_destinations) // 2 + 1
                ):
                    lunch_end = current_time + timedelta(minutes=60)
                    places_svc = get_places_service()
                    nearby_rests = (
                        places_svc.get_restaurants_near(coords.lat, coords.lon, radius_km=35.0)
                        if coords
                        else []
                    )
                    if nearby_rests:
                        chosen_rest = nearby_rests[0]
                        lunch_name = (
                            chosen_rest.name_en
                            if request.language == LanguageCode.EN
                            else chosen_rest.name_kn
                        )
                        lunch_desc = (
                            chosen_rest.user_notes_en or chosen_rest.address_en
                            if request.language == LanguageCode.EN
                            else chosen_rest.user_notes_kn
                            or chosen_rest.address_kn
                            or chosen_rest.address_en
                        )
                        unit_cost = chosen_rest.estimated_cost_per_person_inr or 200.0
                        lunch_cost_min = unit_cost * request.travelers_count
                        lunch_cost_max = lunch_cost_min * 1.25
                        lunch_cost_status = (
                            CostStatus.VERIFIED
                            if chosen_rest.price_status == "verified"
                            else CostStatus.ESTIMATED
                        )
                        lunch_source = chosen_rest.source_name
                        lunch_coords = Coordinates(
                            lat=chosen_rest.latitude, lon=chosen_rest.longitude
                        )
                    else:
                        lunch_name = (
                            "Regional Lunch Break"
                            if request.language == LanguageCode.EN
                            else "ಮಧ್ಯಾಹ್ನದ ಊಟದ ವಿರಾಮ"
                        )
                        lunch_desc = (
                            "Taste authentic regional Karnataka cuisine (Oota / Thali). "
                            "Select a verified local restaurant."
                            if request.language == LanguageCode.EN
                            else "ಕರ್ನಾಟಕದ ಸಾಂಪ್ರದಾಯಿಕ ಊಟ. ಹತ್ತಿರದ ಪರಿಶೀಲಿಸಿದ ಉಪಹಾರ ಗೃಹದಲ್ಲಿ ಭೋಜನ."
                        )
                        lunch_cost_min = round(lunch_unit * request.travelers_count, 2)
                        lunch_cost_max = round(lunch_unit * 1.5 * request.travelers_count, 2)
                        lunch_cost_status = CostStatus.ESTIMATED
                        lunch_source = None
                        lunch_coords = None

                    stops.append(
                        ItineraryStop(
                            stop_id=f"stop-d{day_num}-lunch",
                            destination_id=None,
                            stop_type=StopType.MEAL,
                            name=lunch_name,
                            description=lunch_desc,
                            start_time=current_time.strftime("%H:%M"),
                            end_time=lunch_end.strftime("%H:%M"),
                            duration_minutes=60,
                            coordinates=lunch_coords,
                            distance_from_prev_km=None,
                            transit_from_prev_minutes=None,
                            transit_method=None,
                            cost_min_inr=lunch_cost_min,
                            cost_max_inr=lunch_cost_max,
                            currency="INR",
                            cost_status=lunch_cost_status,
                            source_reference=lunch_source,
                            rationale="Midday rest and authentic local cuisine.",
                        )
                    )
                    meals_covered.append("Lunch")
                    day_cost_min += lunch_cost_min
                    day_cost_max += lunch_cost_max
                    lunch_inserted = True
                    current_time = lunch_end + timedelta(minutes=15)

                # Activity / Attraction Stop
                dest_id = getattr(dest, "id", f"dest-{s_idx}")
                dest_slug = getattr(dest, "slug", dest_id)
                dest_name = getattr(dest, "name", dest_slug)
                dest_summary = getattr(dest, "summary", "")
                dest_rationale = getattr(dest, "rationale", "Curated destination visit.")
                visit_duration = getattr(dest, "estimated_visit_minutes", 90) or 90

                fee_min = getattr(dest, "entry_fee_min_inr", None)
                fee_max = getattr(dest, "entry_fee_max_inr", fee_min)

                if fee_min is None:
                    fee_status = CostStatus.UNKNOWN
                    stop_cost_min = None
                    stop_cost_max = None
                elif fee_min == 0.0 and (fee_max == 0.0 or fee_max is None):
                    fee_status = CostStatus.VERIFIED
                    stop_cost_min = 0.0
                    stop_cost_max = 0.0
                else:
                    fee_status = CostStatus.VERIFIED
                    stop_cost_min = fee_min * request.travelers_count
                    stop_cost_max = (fee_max or fee_min) * request.travelers_count
                    day_cost_min += stop_cost_min
                    day_cost_max += stop_cost_max

                stop_end = current_time + timedelta(minutes=visit_duration)

                travel_leg_data = None
                if dist_km is not None and transit_mins is not None and prev_coords and coords:
                    prev_name = stops[-1].name if stops else start_location_name
                    travel_leg_data = build_travel_leg_details(
                        origin_name=prev_name,
                        dest_name=dest_name,
                        dist_km=dist_km,
                        duration_mins=transit_mins,
                        prev_coords=prev_coords,
                        dest_coords=coords,
                        request=request,
                    )

                stops.append(
                    ItineraryStop(
                        stop_id=f"stop-d{day_num}-{dest_slug}",
                        destination_id=dest_id,
                        stop_type=StopType.ATTRACTION,
                        name=dest_name,
                        description=dest_summary,
                        start_time=current_time.strftime("%H:%M"),
                        end_time=stop_end.strftime("%H:%M"),
                        duration_minutes=visit_duration,
                        coordinates=coords,
                        distance_from_prev_km=dist_km,
                        transit_from_prev_minutes=transit_mins,
                        transit_method=transit_method,
                        travel_leg=travel_leg_data,
                        cost_min_inr=stop_cost_min,
                        cost_max_inr=stop_cost_max,
                        currency="INR",
                        cost_status=fee_status,
                        source_reference=None,
                        rationale=dest_rationale,
                    )
                )

                prev_coords = coords
                current_time = stop_end + timedelta(minutes=15)  # 15 min buffer

            # If lunch wasn't inserted because stops were few, add lunch now
            if not lunch_inserted:
                lunch_end = current_time + timedelta(minutes=60)
                lunch_name = (
                    "Regional Lunch Break"
                    if request.language == LanguageCode.EN
                    else "ಮಧ್ಯಾಹ್ನದ ಊಟದ ವಿರಾಮ"
                )
                stops.append(
                    ItineraryStop(
                        stop_id=f"stop-d{day_num}-lunch",
                        destination_id=None,
                        stop_type=StopType.MEAL,
                        name=lunch_name,
                        description="Midday lunch break at local venue.",
                        start_time=current_time.strftime("%H:%M"),
                        end_time=lunch_end.strftime("%H:%M"),
                        duration_minutes=60,
                        cost_min_inr=round(lunch_unit * request.travelers_count, 2),
                        cost_max_inr=round(lunch_unit * 1.5 * request.travelers_count, 2),
                        currency="INR",
                        cost_status=CostStatus.ESTIMATED,
                        rationale="Nutritional pause and recharge.",
                    )
                )
                meals_covered.append("Lunch")
                day_cost_min += lunch_unit * request.travelers_count
                day_cost_max += lunch_unit * 1.5 * request.travelers_count
                current_time = lunch_end + timedelta(minutes=30)

            # Check for Cultural Festival / Event nearby
            events_svc = get_events_service()
            event_check_coords = prev_coords or (
                Coordinates(
                    lat=day_destinations[0].coordinates.lat, lon=day_destinations[0].coordinates.lon
                )
                if day_destinations and getattr(day_destinations[0], "coordinates", None)
                else None
            )
            matched_event = None
            if event_check_coords:
                travel_month = base_date.month if base_date else None
                candidate_events = events_svc.get_events_near(
                    event_check_coords.lat,
                    event_check_coords.lon,
                    radius_km=25.0,
                    month=travel_month,
                )
                if candidate_events and candidate_events[0].event_id not in scheduled_event_ids:
                    matched_event = candidate_events[0]
                    scheduled_event_ids.add(matched_event.event_id)

            if matched_event:
                event_name = (
                    matched_event.name_en
                    if request.language == LanguageCode.EN
                    else matched_event.name_kn
                )
                event_desc = (
                    matched_event.description_en
                    if request.language == LanguageCode.EN
                    else matched_event.description_kn
                )
                event_coords = Coordinates(
                    lat=matched_event.latitude, lon=matched_event.longitude
                )
                event_dist_km: float | None = None
                event_transit_mins: int | None = None
                event_transit_method: str | None = None
                if prev_coords and event_coords:
                    routing_svc = get_routing_service()
                    route_est = routing_svc.estimate_travel(
                        prev_coords.lat, prev_coords.lon, event_coords.lat, event_coords.lon
                    )
                    event_dist_km = route_est.estimated_road_distance_km
                    event_transit_mins = route_est.duration_minutes
                    event_transit_method = "terrain_adjusted_estimate"
                    total_transit_mins += event_transit_mins
                    day_driving_km += event_dist_km
                    current_time += timedelta(minutes=event_transit_mins)

                event_start = current_time
                event_end = current_time + timedelta(minutes=90)
                event_cost_min = (
                    matched_event.ticket_cost_min_inr * request.travelers_count
                    if matched_event.ticket_cost_min_inr is not None
                    else None
                )
                event_cost_max = (
                    matched_event.ticket_cost_max_inr * request.travelers_count
                    if matched_event.ticket_cost_max_inr is not None
                    else event_cost_min
                )
                event_cost_status = (
                    CostStatus.VERIFIED
                    if matched_event.ticket_cost_status == "verified"
                    else (
                        CostStatus.ESTIMATED
                        if matched_event.ticket_cost_status == "estimated"
                        else CostStatus.UNKNOWN
                    )
                )
                event_leg_data = None
                if event_dist_km is not None and event_transit_mins is not None and prev_coords and event_coords:
                    prev_name = stops[-1].name if stops else start_location_name
                    event_leg_data = build_travel_leg_details(
                        origin_name=prev_name,
                        dest_name=event_name,
                        dist_km=event_dist_km,
                        duration_mins=event_transit_mins,
                        prev_coords=prev_coords,
                        dest_coords=event_coords,
                        request=request,
                    )

                stops.append(
                    ItineraryStop(
                        stop_id=f"stop-d{day_num}-event-{matched_event.event_id}",
                        destination_id=None,
                        stop_type=StopType.EVENT,
                        name=f"🎪 {event_name}",
                        description=f"{event_desc} (Source: {matched_event.source_name})",
                        start_time=event_start.strftime("%H:%M"),
                        end_time=event_end.strftime("%H:%M"),
                        duration_minutes=90,
                        coordinates=event_coords,
                        distance_from_prev_km=event_dist_km,
                        transit_from_prev_minutes=event_transit_mins,
                        transit_method=event_transit_method,
                        travel_leg=event_leg_data,
                        cost_min_inr=event_cost_min,
                        cost_max_inr=event_cost_max,
                        currency="INR",
                        cost_status=event_cost_status,
                        source_reference=matched_event.source_url,
                        rationale=f"Verified cultural festival in {matched_event.location_name}.",
                    )
                )
                if event_cost_min:
                    day_cost_min += event_cost_min
                if event_cost_max:
                    day_cost_max += event_cost_max
                current_time = event_end + timedelta(minutes=15)
                prev_coords = event_coords

            # 3. Dinner (20:00 - 21:15)
            if current_time.hour < 20:
                current_time = datetime(2026, 1, 1, 20, 0)

            dinner_end = current_time + timedelta(minutes=75)
            places_svc = get_places_service()
            dinner_ref_coords = prev_coords or (
                Coordinates(
                    lat=day_destinations[0].coordinates.lat, lon=day_destinations[0].coordinates.lon
                )
                if day_destinations and getattr(day_destinations[0], "coordinates", None)
                else None
            )
            nearby_dinner_rests = (
                places_svc.get_restaurants_near(
                    dinner_ref_coords.lat, dinner_ref_coords.lon, radius_km=35.0
                )
                if dinner_ref_coords
                else []
            )

            # If lunch already used a restaurant, prefer an alternative if available
            chosen_dinner_rest = None
            if nearby_dinner_rests:
                chosen_dinner_rest = (
                    nearby_dinner_rests[1]
                    if len(nearby_dinner_rests) > 1
                    else nearby_dinner_rests[0]
                )

            if chosen_dinner_rest:
                dinner_name = (
                    chosen_dinner_rest.name_en
                    if request.language == LanguageCode.EN
                    else chosen_dinner_rest.name_kn
                )
                dinner_desc = (
                    chosen_dinner_rest.user_notes_en or chosen_dinner_rest.address_en
                    if request.language == LanguageCode.EN
                    else chosen_dinner_rest.user_notes_kn
                    or chosen_dinner_rest.address_kn
                    or chosen_dinner_rest.address_en
                )
                unit_cost = chosen_dinner_rest.estimated_cost_per_person_inr or 250.0
                dinner_cost_min = unit_cost * request.travelers_count
                dinner_cost_max = dinner_cost_min * 1.3
                dinner_cost_status = (
                    CostStatus.VERIFIED
                    if chosen_dinner_rest.price_status == "verified"
                    else CostStatus.ESTIMATED
                )
                dinner_source = chosen_dinner_rest.source_name
                dinner_coords = Coordinates(
                    lat=chosen_dinner_rest.latitude, lon=chosen_dinner_rest.longitude
                )
            else:
                dinner_name = (
                    "Dinner & Evening Leisure"
                    if request.language == LanguageCode.EN
                    else "ರಾತ್ರಿಯ ಊಟ ಮತ್ತು ವಿಶ್ರಾಂತಿ"
                )
                dinner_desc = (
                    "Unwind with a relaxed dinner. Sample local dishes and plan the next leg."
                    if request.language == LanguageCode.EN
                    else "ಸ್ಥಳೀಯ ಶೈಲಿಯ ರಾತ್ರಿಯ ಊಟ ಮತ್ತು ಸಂಜೆಯ ವಿಶ್ರಾಂತಿ."
                )
                dinner_cost_min = round(dinner_unit * request.travelers_count, 2)
                dinner_cost_max = round(dinner_unit * 1.6 * request.travelers_count, 2)
                dinner_cost_status = CostStatus.ESTIMATED
                dinner_source = None
                dinner_coords = None

            stops.append(
                ItineraryStop(
                    stop_id=f"stop-d{day_num}-dinner",
                    destination_id=None,
                    stop_type=StopType.MEAL,
                    name=dinner_name,
                    description=dinner_desc,
                    start_time=current_time.strftime("%H:%M"),
                    end_time=dinner_end.strftime("%H:%M"),
                    duration_minutes=75,
                    coordinates=dinner_coords,
                    distance_from_prev_km=None,
                    transit_from_prev_minutes=None,
                    transit_method=None,
                    cost_min_inr=dinner_cost_min,
                    cost_max_inr=dinner_cost_max,
                    currency="INR",
                    cost_status=dinner_cost_status,
                    source_reference=dinner_source,
                    rationale="Evening dining and reflection.",
                )
            )
            meals_covered.append("Dinner")
            day_cost_min += dinner_cost_min
            day_cost_max += dinner_cost_max
            current_time = dinner_end + timedelta(minutes=15)

            # 4. Overnight Accommodation (for multi-day trips, days 1 to N-1)
            accommodation_name: str | None = None
            if day_num < request.duration_days:
                nearby_accs = (
                    places_svc.get_accommodations_near(
                        dinner_ref_coords.lat, dinner_ref_coords.lon, radius_km=45.0
                    )
                    if dinner_ref_coords
                    else []
                )
                rooms = math.ceil(request.travelers_count / 2)

                if nearby_accs:
                    chosen_acc = nearby_accs[0]
                    stay_name = (
                        chosen_acc.name_en
                        if request.language == LanguageCode.EN
                        else chosen_acc.name_kn
                    )
                    stay_desc = (
                        chosen_acc.user_notes_en or chosen_acc.address_en
                        if request.language == LanguageCode.EN
                        else chosen_acc.user_notes_kn
                        or chosen_acc.address_kn
                        or chosen_acc.address_en
                    )
                    if chosen_acc.booking_reference_url:
                        stay_desc += f" (Booking: {chosen_acc.booking_reference_url})"

                    unit_night_cost = chosen_acc.estimated_cost_per_night_inr or 2200.0
                    stay_cost_min = unit_night_cost * rooms
                    stay_cost_max = stay_cost_min * 1.2
                    stay_cost_status = (
                        CostStatus.VERIFIED
                        if chosen_acc.price_status == "verified"
                        else CostStatus.ESTIMATED
                    )
                    stay_source = chosen_acc.source_name
                    stay_coords = Coordinates(lat=chosen_acc.latitude, lon=chosen_acc.longitude)
                else:
                    stay_name = (
                        f"Overnight Stay ({primary_district})"
                        if request.language == LanguageCode.EN
                        else f"ರಾತ್ರಿ ವಾಸ್ತವ್ಯ ({primary_district})"
                    )
                    stay_desc = (
                        f"Overnight lodging in {primary_district}. "
                        "Specific hotel/homestay not verified; "
                        "book verified accommodation in advance."
                        if request.language == LanguageCode.EN
                        else f"{primary_district} ದಲ್ಲಿ ರಾತ್ರಿ ವಾಸ್ತವ್ಯ. ಹೋಟೆಲ್ ಅಥವಾ ಹೋಂಸ್ಟೇ ಮುಂಗಡ ಕಾಯ್ದಿರಿಸಿ."
                    )
                    stay_cost_min = round(stay_unit_min * rooms, 2)
                    stay_cost_max = round(stay_unit_max * rooms, 2)
                    stay_cost_status = CostStatus.ESTIMATED
                    stay_source = None
                    stay_coords = dinner_ref_coords or prev_coords or Coordinates(lat=12.9716, lon=77.5946)

                stay_dist_km: float | None = None
                stay_transit_mins: int | None = None
                stay_transit_method: str | None = None
                if prev_coords and stay_coords:
                    routing_svc = get_routing_service()
                    route_est = routing_svc.estimate_travel(
                        prev_coords.lat, prev_coords.lon, stay_coords.lat, stay_coords.lon
                    )
                    stay_dist_km = route_est.estimated_road_distance_km
                    stay_transit_mins = route_est.duration_minutes
                    stay_transit_method = "terrain_adjusted_estimate"
                    total_transit_mins += stay_transit_mins
                    day_driving_km += stay_dist_km
                    current_time += timedelta(minutes=stay_transit_mins)

                stay_leg_data = None
                if stay_dist_km is not None and stay_transit_mins is not None and prev_coords and stay_coords:
                    prev_name = stops[-1].name if stops else start_location_name
                    stay_leg_data = build_travel_leg_details(
                        origin_name=prev_name,
                        dest_name=stay_name,
                        dist_km=stay_dist_km,
                        duration_mins=stay_transit_mins,
                        prev_coords=prev_coords,
                        dest_coords=stay_coords,
                        request=request,
                    )

                stops.append(
                    ItineraryStop(
                        stop_id=f"stop-d{day_num}-stay",
                        destination_id=None,
                        stop_type=StopType.ACCOMMODATION,
                        name=stay_name,
                        description=stay_desc,
                        start_time=current_time.strftime("%H:%M"),
                        end_time="23:00",
                        duration_minutes=90,
                        coordinates=stay_coords,
                        distance_from_prev_km=stay_dist_km,
                        transit_from_prev_minutes=stay_transit_mins,
                        transit_method=stay_transit_method,
                        travel_leg=stay_leg_data,
                        cost_min_inr=stay_cost_min,
                        cost_max_inr=stay_cost_max,
                        currency="INR",
                        cost_status=stay_cost_status,
                        source_reference=stay_source,
                        rationale=f"Rest and overnight recharge in {primary_district}.",
                    )
                )
                day_cost_min += stay_cost_min
                day_cost_max += stay_cost_max
                accommodation_name = stay_name
                end_location_name = stay_name
                end_coordinates = stay_coords
                # Multi-day continuity: set origin for Day d+1 to this overnight stay
                current_loc_coords = stay_coords
                current_loc_name = stay_name
            else:
                # Final day of the journey
                if request.is_return_trip and origin_coords and prev_coords:
                    routing_svc = get_routing_service()
                    ret_est = routing_svc.estimate_travel(
                        prev_coords.lat, prev_coords.lon, origin_coords.lat, origin_coords.lon
                    )
                    day_driving_km += ret_est.estimated_road_distance_km
                    total_transit_mins += ret_est.duration_minutes
                    ret_name = (
                        f"Return Trip to {request.origin_label}"
                        if request.language == LanguageCode.EN
                        else f"{request.origin_label} ಗೆ ವಾಪಸ್ ಪ್ರಯಾಣ"
                    )
                    prev_name = stops[-1].name if stops else start_location_name
                    ret_leg_data = build_travel_leg_details(
                        origin_name=prev_name,
                        dest_name=request.origin_label,
                        dist_km=ret_est.estimated_road_distance_km,
                        duration_mins=ret_est.duration_minutes,
                        prev_coords=prev_coords,
                        dest_coords=origin_coords,
                        request=request,
                    )
                    stops.append(
                        ItineraryStop(
                            stop_id=f"stop-d{day_num}-return",
                            destination_id=None,
                            stop_type=StopType.TRANSPORT,
                            name=ret_name,
                            description=(
                                f"Drive / return transit back to {request.origin_label} "
                                f"({round(ret_est.estimated_road_distance_km, 1)} km, approx "
                                f"{ret_est.duration_minutes // 60}h "
                                f"{ret_est.duration_minutes % 60}m)."
                            ),
                            start_time=current_time.strftime("%H:%M"),
                            end_time=(
                                current_time + timedelta(minutes=ret_est.duration_minutes)
                            ).strftime("%H:%M"),
                            duration_minutes=min(720, ret_est.duration_minutes),
                            coordinates=origin_coords,
                            distance_from_prev_km=round(ret_est.estimated_road_distance_km, 1),
                            transit_from_prev_minutes=ret_est.duration_minutes,
                            transit_method="terrain_adjusted_estimate",
                            travel_leg=ret_leg_data,
                            cost_min_inr=0.0,
                            cost_max_inr=0.0,
                            currency="INR",
                            cost_status=CostStatus.VERIFIED,
                            source_reference=None,
                            rationale=f"Return transit to trip origin ({request.origin_label}).",
                        )
                    )
                    end_location_name = request.origin_label
                    end_coordinates = origin_coords
                else:
                    end_location_name = current_loc_name
                    end_coordinates = prev_coords or origin_coords

            # Day validation warnings & fatigue checks
            day_warnings: list[str] = []
            if len(day_destinations) < 2 and request.pace in ("balanced", "packed"):
                day_warnings.append(
                    f"Day {day_num} has only {len(day_destinations)} sightseeing "
                    "attraction(s) due to catalogue density."
                )

            if total_transit_mins > 240:
                dur_str = f"{total_transit_mins // 60}h {total_transit_mins % 60}m"
                day_warnings.append(
                    f"High driving duration on Day {day_num} ({dur_str}). "
                    "Consider pacing stops or starting earlier to avoid driver fatigue."
                )
            elif total_transit_mins > 180:
                dur_str = f"{total_transit_mins // 60}h {total_transit_mins % 60}m"
                day_warnings.append(
                    f"Moderate travel duration on Day {day_num} ({dur_str}). "
                    "Plan midway refreshment stops."
                )

            total_activity_mins = sum(s.duration_minutes for s in stops)

            days.append(
                DayPlan(
                    day_number=day_num,
                    date=day_date_str,
                    theme=theme,
                    stops=stops,
                    total_duration_minutes=total_activity_mins,
                    transit_minutes=total_transit_mins,
                    driving_distance_km=round(day_driving_km, 1),
                    start_location_name=start_location_name,
                    start_coordinates=start_coordinates,
                    end_location_name=end_location_name,
                    end_coordinates=end_coordinates,
                    accommodation_name=accommodation_name,
                    meals_covered=meals_covered,
                    daily_cost_min_inr=round(day_cost_min, 2),
                    daily_cost_max_inr=round(day_cost_max, 2),
                    warnings=day_warnings,
                )
            )

        return days, schedule_warnings, assumptions

    @classmethod
    def reschedule_itinerary(
        cls,
        request: PlanningRequest,
        days: list[DayPlan],
    ) -> tuple[list[DayPlan], list[RecommendedDestination], list[str]]:
        """Deterministically reschedule days after stops are edited, added, or reordered.

        Preserves user-customized durations, notes, and locked attributes while
        recalculating travel segments, stop start/end timings, meal windows, and daily costs.
        """
        dest_repo = get_destination_repository()
        routing_svc = get_routing_service()
        places_svc = get_places_service()

        rescheduled_days: list[DayPlan] = []
        schedule_warnings: list[str] = []
        recommended_items: list[RecommendedDestination] = []

        scenario = getattr(request, "budget_scenario", "standard") or "standard"
        if scenario == "budget":
            bfast_unit = 80.0
            lunch_unit = 150.0
            dinner_unit = 200.0
            stay_unit_min = 1200.0
            stay_unit_max = 1800.0
        elif scenario == "comfort":
            bfast_unit = 160.0
            lunch_unit = 350.0
            dinner_unit = 450.0
            stay_unit_min = 3500.0
            stay_unit_max = 6000.0
        else:
            bfast_unit = 100.0
            lunch_unit = 200.0
            dinner_unit = 250.0
            stay_unit_min = 1800.0
            stay_unit_max = 3000.0

        origin_coords = get_origin_coordinates(request.origin_label)
        current_loc_coords: Coordinates | None = origin_coords
        current_loc_name: str = request.origin_label

        for day in days:
            day_num = day.day_number
            # Extract user attraction/activity stops in their specified sequence
            attraction_stops = [
                s for s in day.stops if s.stop_type in (StopType.ATTRACTION, StopType.ACTIVITY)
            ]

            stops: list[ItineraryStop] = []
            current_time = datetime(2026, 1, 1, 8, 30)
            start_location_name = current_loc_name
            start_coordinates = current_loc_coords
            end_coordinates: Coordinates | None = None
            prev_coords: Coordinates | None = current_loc_coords
            day_driving_km: float = 0.0
            total_transit_mins = 0
            meals_covered: list[str] = []
            day_cost_min = 0.0
            day_cost_max = 0.0

            # 1. Breakfast (08:30 - 09:15)
            bfast_end = current_time + timedelta(minutes=45)
            bfast_name = (
                "Traditional Breakfast"
                if request.language == LanguageCode.EN
                else "ಸಾಂಪ್ರದಾಯಿಕ ಉಪಹಾರ"
            )
            bfast_desc = (
                f"Enjoy local South Indian breakfast in {start_location_name} "
                "(idli, vada, filter coffee). Choose a nearby verified eatery."
                if request.language == LanguageCode.EN
                else f"{start_location_name} ನಲ್ಲಿ ಬೆಳಗಿನ ಉಪಹಾರ (ಇಡ್ಲಿ, ವಡೆ, ಫಿಲ್ಟರ್ ಕಾಫಿ)."
            )
            stops.append(
                ItineraryStop(
                    stop_id=f"stop-d{day_num}-breakfast",
                    destination_id=None,
                    stop_type=StopType.MEAL,
                    name=bfast_name,
                    description=bfast_desc,
                    start_time=current_time.strftime("%H:%M"),
                    end_time=bfast_end.strftime("%H:%M"),
                    duration_minutes=45,
                    coordinates=current_loc_coords,
                    distance_from_prev_km=None,
                    transit_from_prev_minutes=None,
                    transit_method=None,
                    cost_min_inr=round(bfast_unit * request.travelers_count, 2),
                    cost_max_inr=round(bfast_unit * 1.5 * request.travelers_count, 2),
                    currency="INR",
                    cost_status=CostStatus.ESTIMATED,
                    source_reference=None,
                    rationale=(
                        f"Essential breakfast fuel in {start_location_name} before exploration."
                    ),
                )
            )
            meals_covered.append("Breakfast")
            day_cost_min += bfast_unit * request.travelers_count
            day_cost_max += bfast_unit * 1.5 * request.travelers_count
            current_time = bfast_end + timedelta(minutes=15)

            # 2. Sightseeing Stops & Lunch
            lunch_inserted = False
            for s_idx, attr in enumerate(attraction_stops):
                coords = attr.coordinates
                dist_km: float | None = None
                transit_mins: int | None = None
                transit_method: str | None = None

                if prev_coords and coords:
                    route_est = routing_svc.estimate_travel(
                        prev_coords.lat, prev_coords.lon, coords.lat, coords.lon
                    )
                    dist_km = route_est.estimated_road_distance_km
                    transit_mins = route_est.duration_minutes
                    transit_method = "terrain_adjusted_estimate"
                    total_transit_mins += transit_mins
                    day_driving_km += dist_km
                    current_time += timedelta(minutes=transit_mins)
                    for w in route_est.feasibility_warnings:
                        if w not in schedule_warnings:
                            schedule_warnings.append(w)

                # Lunch insertion around 13:00
                if not lunch_inserted and (
                    current_time.hour >= 13 or s_idx >= len(attraction_stops) // 2 + 1
                ):
                    lunch_end = current_time + timedelta(minutes=60)
                    nearby_rests = (
                        places_svc.get_restaurants_near(coords.lat, coords.lon, radius_km=35.0)
                        if coords
                        else []
                    )
                    if nearby_rests:
                        chosen_rest = nearby_rests[0]
                        lunch_name = (
                            chosen_rest.name_en
                            if request.language == LanguageCode.EN
                            else chosen_rest.name_kn
                        )
                        lunch_desc = (
                            chosen_rest.user_notes_en or chosen_rest.address_en
                            if request.language == LanguageCode.EN
                            else chosen_rest.user_notes_kn
                            or chosen_rest.address_kn
                            or chosen_rest.address_en
                        )
                        unit_cost = chosen_rest.estimated_cost_per_person_inr or 200.0
                        lunch_cost_min = unit_cost * request.travelers_count
                        lunch_cost_max = lunch_cost_min * 1.25
                        lunch_cost_status = (
                            CostStatus.VERIFIED
                            if chosen_rest.price_status == "verified"
                            else CostStatus.ESTIMATED
                        )
                        lunch_source = chosen_rest.source_name
                        lunch_coords = Coordinates(
                            lat=chosen_rest.latitude, lon=chosen_rest.longitude
                        )
                    else:
                        lunch_name = (
                            "Regional Lunch Break"
                            if request.language == LanguageCode.EN
                            else "ಮಧ್ಯಾಹ್ನದ ಊಟದ ವಿರಾಮ"
                        )
                        lunch_desc = (
                            "Taste authentic regional Karnataka cuisine (Oota / Thali). "
                            "Select a verified local restaurant."
                            if request.language == LanguageCode.EN
                            else "ಕರ್ನಾಟಕದ ಸಾಂಪ್ರದಾಯಿಕ ಊಟ. ಹತ್ತಿರದ ಪರಿಶೀಲಿಸಿದ ಉಪಹಾರ ಗೃಹದಲ್ಲಿ ಭೋಜನ."
                        )
                        lunch_cost_min = round(lunch_unit * request.travelers_count, 2)
                        lunch_cost_max = round(lunch_unit * 1.5 * request.travelers_count, 2)
                        lunch_cost_status = CostStatus.ESTIMATED
                        lunch_source = None
                        lunch_coords = None

                    stops.append(
                        ItineraryStop(
                            stop_id=f"stop-d{day_num}-lunch",
                            destination_id=None,
                            stop_type=StopType.MEAL,
                            name=lunch_name,
                            description=lunch_desc,
                            start_time=current_time.strftime("%H:%M"),
                            end_time=lunch_end.strftime("%H:%M"),
                            duration_minutes=60,
                            coordinates=lunch_coords,
                            distance_from_prev_km=None,
                            transit_from_prev_minutes=None,
                            transit_method=None,
                            cost_min_inr=lunch_cost_min,
                            cost_max_inr=lunch_cost_max,
                            currency="INR",
                            cost_status=lunch_cost_status,
                            source_reference=lunch_source,
                            rationale="Midday rest and authentic local cuisine.",
                        )
                    )
                    meals_covered.append("Lunch")
                    day_cost_min += lunch_cost_min
                    day_cost_max += lunch_cost_max
                    lunch_inserted = True
                    current_time = lunch_end + timedelta(minutes=15)

                # Duration: respect user-modified duration if set, otherwise default
                visit_duration = max(15, attr.duration_minutes)
                stop_end = current_time + timedelta(minutes=visit_duration)

                # Recomputed or preserved attraction stop
                attr_leg_data = None
                if dist_km is not None and transit_mins is not None and prev_coords and coords:
                    prev_name = stops[-1].name if stops else start_location_name
                    attr_leg_data = build_travel_leg_details(
                        origin_name=prev_name,
                        dest_name=attr.name,
                        dist_km=dist_km,
                        duration_mins=transit_mins,
                        prev_coords=prev_coords,
                        dest_coords=coords,
                        request=request,
                    )

                rescheduled_attr = ItineraryStop(
                    stop_id=attr.stop_id,
                    destination_id=attr.destination_id,
                    stop_type=attr.stop_type,
                    name=attr.name,
                    description=attr.description,
                    start_time=current_time.strftime("%H:%M"),
                    end_time=stop_end.strftime("%H:%M"),
                    duration_minutes=visit_duration,
                    coordinates=coords,
                    distance_from_prev_km=dist_km,
                    transit_from_prev_minutes=transit_mins,
                    transit_method=transit_method,
                    travel_leg=attr_leg_data,
                    cost_min_inr=attr.cost_min_inr,
                    cost_max_inr=attr.cost_max_inr,
                    currency=attr.currency,
                    cost_status=attr.cost_status,
                    source_reference=attr.source_reference,
                    rationale=attr.rationale,
                    notes=attr.notes,
                    user_modified=attr.user_modified,
                    locked=attr.locked,
                )
                stops.append(rescheduled_attr)

                if attr.cost_min_inr is not None:
                    day_cost_min += attr.cost_min_inr
                if attr.cost_max_inr is not None:
                    day_cost_max += attr.cost_max_inr

                # Also populate recommended items
                dest_rec = None
                if attr.destination_id:
                    dest_rec = dest_repo.get_by_id(attr.destination_id) or dest_repo.get_by_slug(
                        attr.destination_id
                    )

                slug = dest_rec.slug if dest_rec else attr.stop_id.replace("stop-", "")
                cat = dest_rec.category if dest_rec else DestinationCategory.OTHER
                dist_code = dest_rec.district_code if dest_rec else "KA"
                dist_name = dest_rec.district.name_en if dest_rec and dest_rec.district else None

                recommended_items.append(
                    RecommendedDestination(
                        id=attr.destination_id or attr.stop_id,
                        slug=slug,
                        name=attr.name,
                        summary=attr.description,
                        category=cat,
                        district_code=dist_code,
                        district_name=dist_name,
                        coordinates=coords,
                        day_number=day_num,
                        order=s_idx + 1,
                        rationale=attr.rationale or "User-curated stop.",
                        entry_fee_min_inr=(
                            attr.cost_min_inr / request.travelers_count
                            if attr.cost_min_inr is not None
                            else None
                        ),
                        entry_fee_max_inr=(
                            attr.cost_max_inr / request.travelers_count
                            if attr.cost_max_inr is not None
                            else None
                        ),
                        currency_code="INR",
                        access_status=(
                            dest_rec.access_status if dest_rec else AccessStatus.OPEN_REPORTED
                        ),
                        is_offbeat=dest_rec.is_offbeat if dest_rec else False,
                        sources=dest_rec.sources if dest_rec else [],
                    )
                )

                prev_coords = coords
                current_time = stop_end + timedelta(minutes=15)

            # Ensure lunch was inserted
            if not lunch_inserted:
                lunch_end = current_time + timedelta(minutes=60)
                lunch_name = (
                    "Regional Lunch Break"
                    if request.language == LanguageCode.EN
                    else "ಮಧ್ಯಾಹ್ನದ ಊಟದ ವಿರಾಮ"
                )
                stops.append(
                    ItineraryStop(
                        stop_id=f"stop-d{day_num}-lunch",
                        destination_id=None,
                        stop_type=StopType.MEAL,
                        name=lunch_name,
                        description="Midday lunch break at local venue.",
                        start_time=current_time.strftime("%H:%M"),
                        end_time=lunch_end.strftime("%H:%M"),
                        duration_minutes=60,
                        cost_min_inr=round(lunch_unit * request.travelers_count, 2),
                        cost_max_inr=round(lunch_unit * 1.5 * request.travelers_count, 2),
                        currency="INR",
                        cost_status=CostStatus.ESTIMATED,
                        rationale="Nutritional pause and recharge.",
                    )
                )
                meals_covered.append("Lunch")
                day_cost_min += lunch_unit * request.travelers_count
                day_cost_max += lunch_unit * 1.5 * request.travelers_count
                current_time = lunch_end + timedelta(minutes=30)

            # 3. Dinner (20:00 - 21:15)
            if current_time.hour < 20:
                current_time = datetime(2026, 1, 1, 20, 0)
            dinner_end = current_time + timedelta(minutes=75)

            dinner_ref_coords = prev_coords
            nearby_dinner_rests = (
                places_svc.get_restaurants_near(
                    dinner_ref_coords.lat, dinner_ref_coords.lon, radius_km=35.0
                )
                if dinner_ref_coords
                else []
            )
            chosen_dinner_rest = (
                nearby_dinner_rests[1]
                if len(nearby_dinner_rests) > 1
                else (nearby_dinner_rests[0] if nearby_dinner_rests else None)
            )

            if chosen_dinner_rest:
                dinner_name = (
                    chosen_dinner_rest.name_en
                    if request.language == LanguageCode.EN
                    else chosen_dinner_rest.name_kn
                )
                dinner_desc = (
                    chosen_dinner_rest.user_notes_en or chosen_dinner_rest.address_en
                    if request.language == LanguageCode.EN
                    else chosen_dinner_rest.user_notes_kn
                    or chosen_dinner_rest.address_kn
                    or chosen_dinner_rest.address_en
                )
                unit_cost = chosen_dinner_rest.estimated_cost_per_person_inr or 250.0
                dinner_cost_min = unit_cost * request.travelers_count
                dinner_cost_max = dinner_cost_min * 1.3
                dinner_cost_status = (
                    CostStatus.VERIFIED
                    if chosen_dinner_rest.price_status == "verified"
                    else CostStatus.ESTIMATED
                )
                dinner_source = chosen_dinner_rest.source_name
                dinner_coords = Coordinates(
                    lat=chosen_dinner_rest.latitude,
                    lon=chosen_dinner_rest.longitude,
                )
            else:
                dinner_name = (
                    "Dinner & Evening Leisure"
                    if request.language == LanguageCode.EN
                    else "ರಾತ್ರಿಯ ಊಟ ಮತ್ತು ವಿಶ್ರಾಂತಿ"
                )
                dinner_desc = (
                    "Unwind with a relaxed dinner. Sample local dishes and plan the next leg."
                    if request.language == LanguageCode.EN
                    else "ಸ್ಥಳೀಯ ಶೈಲಿಯ ರಾತ್ರಿಯ ಊಟ ಮತ್ತು ಸಂಜೆಯ ವಿಶ್ರಾಂತಿ."
                )
                dinner_cost_min = round(dinner_unit * request.travelers_count, 2)
                dinner_cost_max = round(dinner_unit * 1.6 * request.travelers_count, 2)
                dinner_cost_status = CostStatus.ESTIMATED
                dinner_source = None
                dinner_coords = None

            stops.append(
                ItineraryStop(
                    stop_id=f"stop-d{day_num}-dinner",
                    destination_id=None,
                    stop_type=StopType.MEAL,
                    name=dinner_name,
                    description=dinner_desc,
                    start_time=current_time.strftime("%H:%M"),
                    end_time=dinner_end.strftime("%H:%M"),
                    duration_minutes=75,
                    coordinates=dinner_coords,
                    distance_from_prev_km=None,
                    transit_from_prev_minutes=None,
                    transit_method=None,
                    cost_min_inr=dinner_cost_min,
                    cost_max_inr=dinner_cost_max,
                    currency="INR",
                    cost_status=dinner_cost_status,
                    source_reference=dinner_source,
                    rationale="Evening dining and reflection.",
                )
            )
            meals_covered.append("Dinner")
            day_cost_min += dinner_cost_min
            day_cost_max += dinner_cost_max
            current_time = dinner_end + timedelta(minutes=15)

            # 4. Overnight stay for days 1 to N-1
            accommodation_name: str | None = None
            if day_num < request.duration_days:
                rooms = math.ceil(request.travelers_count / 2)
                nearby_accs = (
                    places_svc.get_accommodations_near(
                        dinner_ref_coords.lat,
                        dinner_ref_coords.lon,
                        radius_km=45.0,
                    )
                    if dinner_ref_coords
                    else []
                )

                if nearby_accs:
                    chosen_acc = nearby_accs[0]
                    stay_name = (
                        chosen_acc.name_en
                        if request.language == LanguageCode.EN
                        else chosen_acc.name_kn
                    )
                    stay_desc = (
                        chosen_acc.user_notes_en or chosen_acc.address_en
                        if request.language == LanguageCode.EN
                        else chosen_acc.user_notes_kn
                        or chosen_acc.address_kn
                        or chosen_acc.address_en
                    )
                    unit_night_cost = chosen_acc.estimated_cost_per_night_inr or 2200.0
                    stay_cost_min = unit_night_cost * rooms
                    stay_cost_max = stay_cost_min * 1.2
                    stay_cost_status = (
                        CostStatus.VERIFIED
                        if chosen_acc.price_status == "verified"
                        else CostStatus.ESTIMATED
                    )
                    stay_source = chosen_acc.source_name
                    stay_coords = Coordinates(lat=chosen_acc.latitude, lon=chosen_acc.longitude)
                else:
                    stay_name = (
                        f"Overnight Stay (Day {day_num})"
                        if request.language == LanguageCode.EN
                        else f"ರಾತ್ರಿ ವಾಸ್ತವ್ಯ (ದಿನ {day_num})"
                    )
                    stay_desc = (
                        "Overnight lodging nearby. Book verified accommodation in advance."
                        if request.language == LanguageCode.EN
                        else "ಹತ್ತಿರದಲ್ಲಿ ರಾತ್ರಿ ವಾಸ್ತವ್ಯ. ಮುಂಗಡ ಕಾಯ್ದಿರಿಸಿ."
                    )
                    stay_cost_min = round(stay_unit_min * rooms, 2)
                    stay_cost_max = round(stay_unit_max * rooms, 2)
                    stay_cost_status = CostStatus.ESTIMATED
                    stay_source = None
                    stay_coords = dinner_ref_coords or Coordinates(lat=12.9716, lon=77.5946)

                stay_dist_km: float | None = None
                stay_transit_mins: int | None = None
                stay_transit_method: str | None = None
                if prev_coords and stay_coords:
                    route_est = routing_svc.estimate_travel(
                        prev_coords.lat, prev_coords.lon, stay_coords.lat, stay_coords.lon
                    )
                    stay_dist_km = round(route_est.estimated_road_distance_km, 1)
                    stay_transit_mins = route_est.duration_minutes
                    stay_transit_method = "terrain_adjusted_estimate"
                    total_transit_mins += stay_transit_mins
                    day_driving_km += stay_dist_km
                    current_time += timedelta(minutes=stay_transit_mins)

                stay_leg_data = None
                if stay_dist_km is not None and stay_transit_mins is not None and prev_coords and stay_coords:
                    prev_name = stops[-1].name if stops else start_location_name
                    stay_leg_data = build_travel_leg_details(
                        origin_name=prev_name,
                        dest_name=stay_name,
                        dist_km=stay_dist_km,
                        duration_mins=stay_transit_mins,
                        prev_coords=prev_coords,
                        dest_coords=stay_coords,
                        request=request,
                    )

                stops.append(
                    ItineraryStop(
                        stop_id=f"stop-d{day_num}-stay",
                        destination_id=None,
                        stop_type=StopType.ACCOMMODATION,
                        name=stay_name,
                        description=stay_desc,
                        start_time=current_time.strftime("%H:%M"),
                        end_time="23:00",
                        duration_minutes=90,
                        coordinates=stay_coords,
                        distance_from_prev_km=stay_dist_km,
                        transit_from_prev_minutes=stay_transit_mins,
                        transit_method=stay_transit_method,
                        travel_leg=stay_leg_data,
                        cost_min_inr=stay_cost_min,
                        cost_max_inr=stay_cost_max,
                        currency="INR",
                        cost_status=stay_cost_status,
                        source_reference=stay_source,
                        rationale=f"Rest and overnight recharge for Day {day_num}.",
                    )
                )
                day_cost_min += stay_cost_min
                day_cost_max += stay_cost_max
                accommodation_name = stay_name
                end_location_name = stay_name
                end_coordinates = stay_coords
                current_loc_coords = stay_coords
                current_loc_name = stay_name
            else:
                # Final day of the trip
                if request.is_return_trip and origin_coords and prev_coords:
                    ret_est = routing_svc.estimate_travel(
                        prev_coords.lat, prev_coords.lon, origin_coords.lat, origin_coords.lon
                    )
                    day_driving_km += ret_est.estimated_road_distance_km
                    total_transit_mins += ret_est.duration_minutes
                    ret_name = (
                        f"Return Trip to {request.origin_label}"
                        if request.language == LanguageCode.EN
                        else f"{request.origin_label} ಗೆ ವಾಪಸ್ ಪ್ರಯಾಣ"
                    )
                    prev_name = stops[-1].name if stops else start_location_name
                    ret_leg_data = build_travel_leg_details(
                        origin_name=prev_name,
                        dest_name=request.origin_label,
                        dist_km=ret_est.estimated_road_distance_km,
                        duration_mins=ret_est.duration_minutes,
                        prev_coords=prev_coords,
                        dest_coords=origin_coords,
                        request=request,
                    )
                    stops.append(
                        ItineraryStop(
                            stop_id=f"stop-d{day_num}-return",
                            destination_id=None,
                            stop_type=StopType.TRANSPORT,
                            name=ret_name,
                            description=(
                                f"Drive / return transit back to {request.origin_label} "
                                f"({round(ret_est.estimated_road_distance_km, 1)} km, approx "
                                f"{ret_est.duration_minutes // 60}h "
                                f"{ret_est.duration_minutes % 60}m)."
                            ),
                            start_time=current_time.strftime("%H:%M"),
                            end_time=(
                                current_time + timedelta(minutes=ret_est.duration_minutes)
                            ).strftime("%H:%M"),
                            duration_minutes=min(720, ret_est.duration_minutes),
                            coordinates=origin_coords,
                            distance_from_prev_km=round(ret_est.estimated_road_distance_km, 1),
                            transit_from_prev_minutes=ret_est.duration_minutes,
                            transit_method="terrain_adjusted_estimate",
                            travel_leg=ret_leg_data,
                            cost_min_inr=0.0,
                            cost_max_inr=0.0,
                            currency="INR",
                            cost_status=CostStatus.VERIFIED,
                            source_reference=None,
                            rationale=f"Return transit to trip origin ({request.origin_label}).",
                        )
                    )
                    end_location_name = request.origin_label
                    end_coordinates = origin_coords
                else:
                    end_location_name = current_loc_name
                    end_coordinates = prev_coords or origin_coords

            day_warnings: list[str] = []
            if len(attraction_stops) < 2 and request.pace in (
                "balanced",
                "packed",
            ):
                day_warnings.append(
                    f"Day {day_num} has only {len(attraction_stops)} attraction(s)."
                )

            if total_transit_mins > 240:
                dur_str = f"{total_transit_mins // 60}h {total_transit_mins % 60}m"
                day_warnings.append(
                    f"High driving duration on Day {day_num} ({dur_str}). "
                    "Consider pacing stops or starting earlier to avoid driver fatigue."
                )
            elif total_transit_mins > 180:
                dur_str = f"{total_transit_mins // 60}h {total_transit_mins % 60}m"
                day_warnings.append(
                    f"Moderate travel duration on Day {day_num} ({dur_str}). "
                    "Plan midway refreshment stops."
                )

            total_activity_mins = sum(s.duration_minutes for s in stops)

            rescheduled_days.append(
                DayPlan(
                    day_number=day_num,
                    date=day.date,
                    theme=day.theme,
                    stops=stops,
                    total_duration_minutes=total_activity_mins,
                    transit_minutes=total_transit_mins,
                    driving_distance_km=round(day_driving_km, 1),
                    start_location_name=start_location_name,
                    start_coordinates=start_coordinates,
                    end_location_name=end_location_name,
                    end_coordinates=end_coordinates,
                    accommodation_name=accommodation_name,
                    meals_covered=meals_covered,
                    daily_cost_min_inr=round(day_cost_min, 2),
                    daily_cost_max_inr=round(day_cost_max, 2),
                    warnings=day_warnings,
                )
            )

        return rescheduled_days, recommended_items, schedule_warnings

    @classmethod
    def get_stop_alternatives(
        cls,
        request: PlanningRequest,
        current_plan: PlanningRecommendationResponse,
        day_number: int,
        stop_id: str,
        preferred_category: DestinationCategory | None = None,
    ) -> list[StopRegenerateCandidate]:
        """Find grounded destination alternatives from the 61-destination catalogue.

        Excludes currently used destinations, calculates road detours and cost deltas,
        and ranks candidates by district match, category alignment, and travel feasibility.
        """
        dest_repo = get_destination_repository()
        routing_svc = get_routing_service()

        target_day = next((d for d in current_plan.days if d.day_number == day_number), None)
        if target_day is None:
            raise AppError(
                code="DAY_NOT_FOUND",
                message=f"Day {day_number} not found in current itinerary.",
                status_code=404,
            )

        target_stop = next((s for s in target_day.stops if s.stop_id == stop_id), None)
        if target_stop is None:
            raise AppError(
                code="STOP_NOT_FOUND",
                message=f"Stop '{stop_id}' not found on day {day_number}.",
                status_code=404,
            )

        if target_stop.stop_type not in (StopType.ATTRACTION, StopType.ACTIVITY):
            raise AppError(
                code="INVALID_STOP_TYPE",
                message="Only attraction and activity stops can be regenerated.",
                status_code=400,
            )

        # Collect all destination IDs already used in the trip
        used_ids: set[str] = set()
        for d in current_plan.days:
            for s in d.stops:
                if s.destination_id:
                    used_ids.add(s.destination_id)
        for item in current_plan.items:
            used_ids.add(item.id)
            used_ids.add(item.slug)

        # Determine preceding and following coordinates
        attr_stops = [
            s for s in target_day.stops if s.stop_type in (StopType.ATTRACTION, StopType.ACTIVITY)
        ]
        target_idx = next((i for i, s in enumerate(attr_stops) if s.stop_id == stop_id), 0)
        prev_coords = attr_stops[target_idx - 1].coordinates if target_idx > 0 else None
        next_coords = (
            attr_stops[target_idx + 1].coordinates if target_idx + 1 < len(attr_stops) else None
        )

        target_dest = (
            dest_repo.get_by_id(target_stop.destination_id) if target_stop.destination_id else None
        )
        target_district = target_dest.district_code if target_dest else None
        target_cat = preferred_category or (target_dest.category if target_dest else None)

        # Original leg duration for comparison
        orig_transit_mins = target_stop.transit_from_prev_minutes or 0

        # Query all published destinations
        all_dests, _ = dest_repo.list_destinations(
            DestinationFilterParams(limit=100, offset=0), published_only=True
        )
        candidate_pool = [
            d
            for d in all_dests
            if d.id not in used_ids
            and d.slug not in used_ids
            and (target_dest is None or d.id != target_dest.id)
        ]

        scored_candidates: list[tuple[float, StopRegenerateCandidate]] = []
        for cand in candidate_pool:
            if not cand.coordinates:
                continue

            # Calculate route detour
            cand_transit_mins = 0
            cand_dist_km = 0.0

            if prev_coords:
                r1 = routing_svc.estimate_travel(
                    prev_coords.lat,
                    prev_coords.lon,
                    cand.coordinates.lat,
                    cand.coordinates.lon,
                )
                cand_transit_mins += r1.duration_minutes
                cand_dist_km += r1.estimated_road_distance_km

            if next_coords:
                r2 = routing_svc.estimate_travel(
                    cand.coordinates.lat,
                    cand.coordinates.lon,
                    next_coords.lat,
                    next_coords.lon,
                )
                cand_transit_mins += r2.duration_minutes
                cand_dist_km += r2.estimated_road_distance_km

            time_delta = cand_transit_mins - orig_transit_mins

            cand_fee = cand.entry_fee_min_inr or 0.0
            orig_fee = target_stop.cost_min_inr or 0.0
            fee_diff = round((cand_fee * request.travelers_count) - orig_fee, 2)

            is_same_district = cand.district_code == target_district if target_district else False
            is_cat_match = cand.category == target_cat if target_cat else False

            # Ranking score: lower is better
            # Heavily favor same district (-1000) and category match (-500)
            score = (
                (0.0 if is_same_district else 1000.0)
                + (0.0 if is_cat_match else 500.0)
                + abs(time_delta)
            )

            name = (
                cand.name_kn
                if request.language == LanguageCode.KN and cand.name_kn
                else cand.name_en
            )
            summary = (
                cand.summary_kn
                if request.language == LanguageCode.KN and cand.summary_kn
                else cand.summary_en
            )
            dist_name = (
                cand.district.name_kn
                if request.language == LanguageCode.KN and cand.district
                else (cand.district.name_en if cand.district else cand.district_code)
            )

            rationale = (
                f"Curated {cand.category} alternative in {dist_name}."
                if request.language == LanguageCode.EN
                else f"{dist_name} ದಲ್ಲಿರುವ ಪರಿಶೀಲಿಸಿದ {cand.category} ಪರ್ಯಾಯ ತಾಣ."
            )

            candidate_obj = StopRegenerateCandidate(
                destination_id=cand.id,
                slug=cand.slug,
                name=name,
                summary=summary,
                category=cand.category,
                district_code=cand.district_code,
                district_name=dist_name,
                coordinates=cand.coordinates,
                estimated_visit_minutes=cand.estimated_visit_minutes or 90,
                entry_fee_min_inr=cand.entry_fee_min_inr,
                entry_fee_max_inr=cand.entry_fee_max_inr,
                cost_status=(
                    CostStatus.VERIFIED
                    if cand.entry_fee_min_inr is not None
                    else CostStatus.UNKNOWN
                ),
                distance_delta_km=round(cand_dist_km, 1),
                transit_delta_minutes=time_delta,
                fee_difference_inr=fee_diff,
                rationale=rationale,
            )
            scored_candidates.append((score, candidate_obj))

        scored_candidates.sort(key=lambda x: x[0])
        return [c[1] for c in scored_candidates[:5]]

    @classmethod
    def regenerate_day(
        cls,
        request: PlanningRequest,
        current_plan: PlanningRecommendationResponse,
        day_number: int,
    ) -> DayPlan:
        """Regenerate attractions for a single day while preserving locked stops and other days."""
        target_day = next((d for d in current_plan.days if d.day_number == day_number), None)
        if target_day is None:
            raise AppError(
                code="DAY_NOT_FOUND",
                message=f"Day {day_number} not found in current itinerary.",
                status_code=404,
            )

        dest_repo = get_destination_repository()

        # Identify locked stops
        locked_stops = [
            s
            for s in target_day.stops
            if s.locked and s.stop_type in (StopType.ATTRACTION, StopType.ACTIVITY)
        ]
        locked_ids = {s.destination_id for s in locked_stops if s.destination_id}

        # Destinations on other days are excluded
        used_other_day_ids: set[str] = set()
        for d in current_plan.days:
            if d.day_number != day_number:
                for s in d.stops:
                    if s.destination_id:
                        used_other_day_ids.add(s.destination_id)

        target_count = 2 if request.pace == "relaxed" else (4 if request.pace == "packed" else 3)
        needed = max(1, target_count - len(locked_stops))

        all_dests, _ = dest_repo.list_destinations(
            DestinationFilterParams(limit=100, offset=0), published_only=True
        )

        # Dominant district from day or request
        dominant_district = None
        if locked_stops and locked_stops[0].coordinates:
            d_rec = dest_repo.get_by_id(locked_stops[0].destination_id or "")
            if d_rec:
                dominant_district = d_rec.district_code
        elif request.preferred_districts:
            dominant_district = request.preferred_districts[0]

        candidates = [
            d for d in all_dests if d.id not in used_other_day_ids and d.id not in locked_ids
        ]

        if dominant_district:
            district_cands = [d for d in candidates if d.district_code == dominant_district]
            other_cands = [d for d in candidates if d.district_code != dominant_district]
            candidates = district_cands + other_cands

        chosen_dests = candidates[:needed]

        # Rebuild attraction stops list for this day
        new_attraction_stops: list[ItineraryStop] = list(locked_stops)
        for idx, dest in enumerate(chosen_dests):
            name = (
                dest.name_kn
                if request.language == LanguageCode.KN and dest.name_kn
                else dest.name_en
            )
            summary = (
                dest.summary_kn
                if request.language == LanguageCode.KN and dest.summary_kn
                else dest.summary_en
            )
            visit_duration = dest.estimated_visit_minutes or 90
            fee_min = dest.entry_fee_min_inr
            fee_max = dest.entry_fee_max_inr or fee_min

            cost_min = fee_min * request.travelers_count if fee_min is not None else None
            cost_max = fee_max * request.travelers_count if fee_max is not None else None
            cost_status = CostStatus.VERIFIED if fee_min is not None else CostStatus.UNKNOWN

            dist_label = dest.district.name_en if dest.district else dest.district_code
            stop_item = ItineraryStop(
                stop_id=f"stop-d{day_number}-{dest.slug}",
                destination_id=dest.id,
                stop_type=StopType.ATTRACTION,
                name=name,
                description=summary,
                start_time="09:30",
                end_time="11:00",
                duration_minutes=visit_duration,
                coordinates=dest.coordinates,
                cost_min_inr=cost_min,
                cost_max_inr=cost_max,
                currency="INR",
                cost_status=cost_status,
                rationale=f"Regenerated stop in {dist_label}.",
            )
            new_attraction_stops.append(stop_item)

        # Build mock day plan with these new stops and reschedule it
        temp_day = DayPlan(
            day_number=day_number,
            date=target_day.date,
            theme=target_day.theme,
            stops=new_attraction_stops,
        )

        all_days = [(temp_day if d.day_number == day_number else d) for d in current_plan.days]

        rescheduled_days, _, _ = cls.reschedule_itinerary(request, all_days)
        return next(d for d in rescheduled_days if d.day_number == day_number)
