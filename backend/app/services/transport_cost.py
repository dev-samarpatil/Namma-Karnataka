"""Deterministic transportation cost estimation engine.

Provides transparent, mathematically grounded cost models for private driving,
intercity cabs, scheduled public transit, and mixed multimodal journeys across Karnataka.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import StrEnum

from app.schemas.planning import CostStatus


class SupportedTransportMode(StrEnum):
    DRIVING_CAR = "driving_car"
    CAB_TAXI = "cab_taxi"
    PUBLIC_TRANSIT = "public_transit"
    MIXED = "mixed"


@dataclass(frozen=True)
class TransportCostEstimate:
    """Detailed transportation estimate result."""

    mode: SupportedTransportMode
    total_cost_min_inr: float
    total_cost_max_inr: float
    per_person_min_inr: float
    per_person_max_inr: float
    billable_distance_km: float
    is_return_trip: bool
    vehicles_count: int
    cost_status: CostStatus
    calculation_basis: str
    assumptions: list[str] = field(default_factory=list)
    toll_and_parking_note: str = (
        "National/State highway tolls (FASTag) and destination parking fees are excluded."
    )


class TransportCostCalculator:
    """Calculates deterministic travel costs for Karnataka journey corridors."""

    DEFAULT_FUEL_EFFICIENCY_KM_PER_LITRE = 14.0  # Standard midsize petrol vehicle
    DEFAULT_FUEL_PRICE_PER_LITRE = 102.86  # Published Karnataka petrol tariff (2026 baseline)
    CAB_BASE_FARE = 150.0  # Includes first 4 km
    CAB_RATE_PER_KM = 16.0  # Standard outstation tariff per km
    CAB_DRIVER_BATA_PER_DAY = 400.0  # Driver daily outstation allowance
    SEATS_PER_CAR = 4  # Standard sedan / hatchback passenger capacity

    @classmethod
    def calculate_car_fuel(
        cls,
        road_distance_km: float,
        travelers_count: int,
        fuel_efficiency_km_per_litre: float | None = None,
        fuel_price_per_litre: float | None = None,
        is_return_trip: bool = True,
    ) -> TransportCostEstimate:
        """Calculate private car fuel consumption and expense."""
        travelers = max(1, travelers_count)
        distance = max(0.0, road_distance_km)
        efficiency = (
            fuel_efficiency_km_per_litre
            if (fuel_efficiency_km_per_litre is not None and fuel_efficiency_km_per_litre > 0)
            else cls.DEFAULT_FUEL_EFFICIENCY_KM_PER_LITRE
        )
        price = (
            fuel_price_per_litre
            if (fuel_price_per_litre is not None and fuel_price_per_litre >= 0)
            else cls.DEFAULT_FUEL_PRICE_PER_LITRE
        )

        billable_km = distance * 2.0 if is_return_trip else distance
        vehicles = math.ceil(travelers / cls.SEATS_PER_CAR)

        # Fuel cost = (Distance / km/L) * Price/L * Vehicles
        litres_per_vehicle = billable_km / efficiency if efficiency > 0 else 0.0
        fuel_cost_per_vehicle = litres_per_vehicle * price
        total_fuel_cost = round(fuel_cost_per_vehicle * vehicles, 2)

        per_person = round(total_fuel_cost / travelers, 2)
        trip_type_desc = "return round-trip" if is_return_trip else "one-way leg"

        basis = (
            f"Private car fuel for {billable_km:.1f} km ({trip_type_desc}) across "
            f"{vehicles} vehicle(s) at {efficiency:.1f} km/L efficiency "
            f"and ₹{price:.2f}/L fuel tariff"
        )
        assumptions = [
            f"Assumes {efficiency:.1f} km/L fuel efficiency for midsize petrol vehicle.",
            f"Fuel tariff assumption: ₹{price:.2f}/L (Karnataka baseline).",
            "Excludes vehicle wear-and-tear, engine oil, FASTag tolls, and parking fees.",
        ]

        return TransportCostEstimate(
            mode=SupportedTransportMode.DRIVING_CAR,
            total_cost_min_inr=total_fuel_cost,
            total_cost_max_inr=round(total_fuel_cost * 1.08, 2),  # +8% AC / traffic buffer
            per_person_min_inr=per_person,
            per_person_max_inr=round((total_fuel_cost * 1.08) / travelers, 2),
            billable_distance_km=round(billable_km, 1),
            is_return_trip=is_return_trip,
            vehicles_count=vehicles,
            cost_status=CostStatus.ESTIMATED,
            calculation_basis=basis,
            assumptions=assumptions,
        )

    @classmethod
    def calculate_cab_fare(
        cls,
        road_distance_km: float,
        travelers_count: int,
        duration_days: int = 1,
        is_return_trip: bool = True,
    ) -> TransportCostEstimate:
        """Calculate commercial outstation cab/taxi fare."""
        travelers = max(1, travelers_count)
        distance = max(0.0, road_distance_km)
        days = max(1, duration_days)
        billable_km = distance * 2.0 if is_return_trip else distance
        vehicles = math.ceil(travelers / cls.SEATS_PER_CAR)

        # Base tariff + distance rate + driver day allowance
        # Minimum outstation billable distance per day is usually 250 km or actual km
        driver_bata_total = cls.CAB_DRIVER_BATA_PER_DAY * days * vehicles
        distance_charge = max(
            cls.CAB_BASE_FARE * vehicles,
            billable_km * cls.CAB_RATE_PER_KM * vehicles,
        )

        total_min = round(distance_charge + driver_bata_total, 2)
        total_max = round(total_min * 1.15, 2)  # Higher class sedan / peak seasonal variation
        per_person_min = round(total_min / travelers, 2)
        per_person_max = round(total_max / travelers, 2)
        trip_type_desc = "return round-trip" if is_return_trip else "one-way leg"

        basis = (
            f"Outstation cab for {billable_km:.1f} km ({trip_type_desc}) across "
            f"{vehicles} vehicle(s) at ₹{cls.CAB_RATE_PER_KM:.0f}/km + "
            f"₹{cls.CAB_DRIVER_BATA_PER_DAY:.0f}/day driver bata ({days} day(s))"
        )
        assumptions = [
            f"Commercial outstation taxi tariff at ₹{cls.CAB_RATE_PER_KM:.0f}/km.",
            f"Includes ₹{cls.CAB_DRIVER_BATA_PER_DAY:.0f}/day driver allowance.",
            "Excludes interstate permits, FASTag toll charges, and airport/station parking.",
        ]

        return TransportCostEstimate(
            mode=SupportedTransportMode.CAB_TAXI,
            total_cost_min_inr=total_min,
            total_cost_max_inr=total_max,
            per_person_min_inr=per_person_min,
            per_person_max_inr=per_person_max,
            billable_distance_km=round(billable_km, 1),
            is_return_trip=is_return_trip,
            vehicles_count=vehicles,
            cost_status=CostStatus.ESTIMATED,
            calculation_basis=basis,
            assumptions=assumptions,
        )

    @classmethod
    def calculate_public_transit(
        cls,
        road_distance_km: float,
        travelers_count: int,
        is_return_trip: bool = True,
        corridor_fare_min: float | None = None,
        corridor_fare_max: float | None = None,
    ) -> TransportCostEstimate:
        """Calculate public transit (KSRTC express bus / SWR railway) fare."""
        travelers = max(1, travelers_count)
        distance = max(0.0, road_distance_km)
        multiplier = 2.0 if is_return_trip else 1.0

        # If a verified corridor fare range is provided from curated transit network
        if corridor_fare_min is not None and corridor_fare_min > 0:
            single_min = corridor_fare_min
            single_max = corridor_fare_max if corridor_fare_max is not None else single_min
            status = CostStatus.VERIFIED
            basis_prefix = "Verified KSRTC/SWR scheduled corridor tariff"
        else:
            # Fallback to standard Karnataka state bus tariff (₹1.75 to ₹2.50 per passenger-km)
            single_min = max(30.0, distance * 1.75)
            single_max = max(50.0, distance * 2.60)
            status = CostStatus.ESTIMATED
            basis_prefix = "Standard KSRTC Sarige/Rajahamsa passenger tariff rate"

        total_min = round(single_min * multiplier * travelers, 2)
        total_max = round(single_max * multiplier * travelers, 2)
        per_person_min = round(single_min * multiplier, 2)
        per_person_max = round(single_max * multiplier, 2)
        trip_type_desc = "round-trip" if is_return_trip else "one-way"

        basis = (
            f"{basis_prefix} for {travelers} passenger(s) "
            f"({trip_type_desc}, ~{distance:.1f} km corridor)"
        )
        assumptions = [
            "Fares represent standard adult one-way passenger tickets.",
            "Optional seat reservation fee (₹15–₹30) and passenger cess included in upper band.",
            "Local town bus / auto transfer required for last-mile segments > 2 km.",
        ]

        return TransportCostEstimate(
            mode=SupportedTransportMode.PUBLIC_TRANSIT,
            total_cost_min_inr=total_min,
            total_cost_max_inr=total_max,
            per_person_min_inr=per_person_min,
            per_person_max_inr=per_person_max,
            billable_distance_km=round(distance * multiplier, 1),
            is_return_trip=is_return_trip,
            vehicles_count=0,
            cost_status=status,
            calculation_basis=basis,
            assumptions=assumptions,
        )

    @classmethod
    def calculate_mixed_mode(
        cls,
        road_distance_km: float,
        travelers_count: int,
        duration_days: int = 1,
        is_return_trip: bool = True,
        corridor_fare_min: float | None = None,
        corridor_fare_max: float | None = None,
    ) -> TransportCostEstimate:
        """Calculate mixed mode: intercity public transit + first/last-mile local transfers."""
        travelers = max(1, travelers_count)
        transit_est = cls.calculate_public_transit(
            road_distance_km=road_distance_km,
            travelers_count=travelers,
            is_return_trip=is_return_trip,
            corridor_fare_min=corridor_fare_min,
            corridor_fare_max=corridor_fare_max,
        )

        # Add local auto / cab connection (₹150 to ₹300 per day for group)
        days = max(1, duration_days)
        local_min = 150.0 * days * math.ceil(travelers / 3)
        local_max = 300.0 * days * math.ceil(travelers / 3)

        total_min = round(transit_est.total_cost_min_inr + local_min, 2)
        total_max = round(transit_est.total_cost_max_inr + local_max, 2)
        per_person_min = round(total_min / travelers, 2)
        per_person_max = round(total_max / travelers, 2)

        basis = (
            f"Intercity public transit ({transit_est.calculation_basis}) + "
            f"₹{local_min:.0f}–₹{local_max:.0f} first/last-mile local auto transfers"
        )
        assumptions = transit_est.assumptions + [
            "Local transfers assume metered auto-rickshaw or town shuttle connections.",
        ]

        return TransportCostEstimate(
            mode=SupportedTransportMode.MIXED,
            total_cost_min_inr=total_min,
            total_cost_max_inr=total_max,
            per_person_min_inr=per_person_min,
            per_person_max_inr=per_person_max,
            billable_distance_km=transit_est.billable_distance_km,
            is_return_trip=is_return_trip,
            vehicles_count=0,
            cost_status=CostStatus.ESTIMATED,
            calculation_basis=basis,
            assumptions=assumptions,
        )

    @classmethod
    def estimate_transport(
        cls,
        mode: SupportedTransportMode | str,
        road_distance_km: float,
        travelers_count: int,
        duration_days: int = 1,
        fuel_efficiency_km_per_litre: float | None = None,
        fuel_price_per_litre: float | None = None,
        is_return_trip: bool = True,
        corridor_fare_min: float | None = None,
        corridor_fare_max: float | None = None,
    ) -> TransportCostEstimate:
        """Route to appropriate estimation model based on requested transport mode."""
        clean_mode = str(mode).lower()
        if clean_mode in (SupportedTransportMode.DRIVING_CAR, "driving", "car"):
            return cls.calculate_car_fuel(
                road_distance_km=road_distance_km,
                travelers_count=travelers_count,
                fuel_efficiency_km_per_litre=fuel_efficiency_km_per_litre,
                fuel_price_per_litre=fuel_price_per_litre,
                is_return_trip=is_return_trip,
            )
        elif clean_mode in (SupportedTransportMode.CAB_TAXI, "cab", "taxi"):
            return cls.calculate_cab_fare(
                road_distance_km=road_distance_km,
                travelers_count=travelers_count,
                duration_days=duration_days,
                is_return_trip=is_return_trip,
            )
        elif clean_mode in (SupportedTransportMode.PUBLIC_TRANSIT, "transit", "bus", "train"):
            return cls.calculate_public_transit(
                road_distance_km=road_distance_km,
                travelers_count=travelers_count,
                is_return_trip=is_return_trip,
                corridor_fare_min=corridor_fare_min,
                corridor_fare_max=corridor_fare_max,
            )
        else:  # Mixed / fallback
            return cls.calculate_mixed_mode(
                road_distance_km=road_distance_km,
                travelers_count=travelers_count,
                duration_days=duration_days,
                is_return_trip=is_return_trip,
                corridor_fare_min=corridor_fare_min,
                corridor_fare_max=corridor_fare_max,
            )
