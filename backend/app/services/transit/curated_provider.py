"""Curated static transit provider backed by verified Karnataka network data."""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from app.services.routing.service import get_routing_service
from app.services.transit.models import (
    StationType,
    TransitComparison,
    TransitJourneyOption,
    TransitLeg,
    TransitMode,
    TransitStop,
)
from app.services.transit.provider import TransitProvider


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r_lat1, r_lon1 = math.radians(lat1), math.radians(lon1)
    r_lat2, r_lon2 = math.radians(lat2), math.radians(lon2)
    dlat = r_lat2 - r_lat1
    dlon = r_lon2 - r_lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


class CuratedTransitProvider(TransitProvider):
    """Provides validated public transit stop and corridor routing data."""

    def __init__(self, data_path: Path | None = None) -> None:
        if data_path is None:
            repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
            data_path = repo_root / "data" / "seed" / "transit_network.json"
        self._data_path = data_path
        self._stops: dict[str, TransitStop] = {}
        self._routes: list[dict[str, Any]] = []
        self._load_network()

    def _load_network(self) -> None:
        if not self._data_path.exists():
            return
        with open(self._data_path, encoding="utf-8") as f:
            data = json.load(f)

        for s in data.get("stops", []):
            stop_obj = TransitStop(
                stop_id=s["stop_id"],
                name_en=s["name_en"],
                name_kn=s["name_kn"],
                district_code=s["district_code"],
                station_type=StationType(s["station_type"]),
                latitude=s["latitude"],
                longitude=s["longitude"],
                address_en=s.get("address_en", ""),
                address_kn=s.get("address_kn", ""),
                operator=s.get("operator", "KSRTC / SWR"),
            )
            self._stops[stop_obj.stop_id] = stop_obj

        self._routes = data.get("routes", [])

    def get_all_stops(self) -> list[TransitStop]:
        """Return all curated transit stops in the network."""
        return list(self._stops.values())

    def search_nearby_stops(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        limit: int = 10,
    ) -> list[TransitStop]:
        results: list[tuple[TransitStop, float]] = []
        for stop in self._stops.values():
            dist = _haversine_km(latitude, longitude, stop.latitude, stop.longitude)
            if dist <= radius_km:
                stop_with_dist = TransitStop(
                    stop_id=stop.stop_id,
                    name_en=stop.name_en,
                    name_kn=stop.name_kn,
                    district_code=stop.district_code,
                    station_type=stop.station_type,
                    latitude=stop.latitude,
                    longitude=stop.longitude,
                    address_en=stop.address_en,
                    address_kn=stop.address_kn,
                    operator=stop.operator,
                    distance_km=round(dist, 1),
                )
                results.append((stop_with_dist, dist))

        results.sort(key=lambda x: x[1])
        return [r[0] for r in results[:limit]]

    def find_journeys(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        departure_time: str = "08:00",
        max_transfers: int = 2,
    ) -> list[TransitJourneyOption]:
        direct_dist_km = _haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
        # Short intra-city journeys (< 15 km) should be served by local transit / city buses / auto-rickshaws,
        # NOT by routing through intercity regional express terminals or circular hub transfers.
        if direct_dist_km < 15.0:
            return []

        # Catchment radius scaled proportionally to journey distance
        catchment_km = min(40.0, max(10.0, direct_dist_km * 0.40))
        origin_stops = self.search_nearby_stops(
            origin_lat, origin_lon, radius_km=catchment_km, limit=5
        )
        dest_stops = self.search_nearby_stops(dest_lat, dest_lon, radius_km=catchment_km, limit=5)

        if not origin_stops or not dest_stops:
            return []

        origin_stop_ids = {s.stop_id: s for s in origin_stops}
        dest_stop_ids = {s.stop_id: s for s in dest_stops}

        journeys: list[TransitJourneyOption] = []
        journey_counter = 1

        # 1. Direct Corridors
        for r in self._routes:
            orig_id = r["origin_stop_id"]
            dest_id = r["destination_stop_id"]

            # Direct match (or bidirectional if symmetric corridor)
            is_forward = orig_id in origin_stop_ids and dest_id in dest_stop_ids
            is_reverse = dest_id in origin_stop_ids and orig_id in dest_stop_ids

            if is_forward or is_reverse:
                # Corridor must be geographically compatible with direct journey
                if r["distance_km"] > direct_dist_km * 2.5:
                    continue
                o_stop = origin_stop_ids[orig_id if is_forward else dest_id]
                d_stop = dest_stop_ids[dest_id if is_forward else orig_id]
                if o_stop.stop_id == d_stop.stop_id:
                    continue

                # Select next scheduled departure at or after departure_time
                deps = r.get("scheduled_departures", ["08:00"])
                dep_time = self._find_next_departure(deps, departure_time)
                duration = r["typical_duration_minutes"]
                arr_time = self._add_minutes_to_time_str(dep_time, duration)

                leg = TransitLeg(
                    leg_id=f"leg-{r['route_id']}",
                    origin_stop=o_stop,
                    destination_stop=d_stop,
                    transit_mode=TransitMode(r["transit_mode"]),
                    line_name=r["line_name"],
                    route_number=r["route_number"],
                    departure_time=dep_time,
                    arrival_time=arr_time,
                    duration_minutes=duration,
                    distance_km=r["distance_km"],
                    fare_inr=r["fare_inr_min"],
                    fare_status=r.get("fare_status", "verified"),
                    frequency_summary=r.get("departure_frequency", "Scheduled"),
                    operator_name=r["operator_name"],
                    source_name=r["source_name"],
                    source_url=r.get("source_url"),
                )

                journeys.append(
                    TransitJourneyOption(
                        journey_id=f"journey-{journey_counter}",
                        origin_label=o_stop.name_en,
                        destination_label=d_stop.name_en,
                        total_duration_minutes=duration,
                        transfers_count=0,
                        legs=[leg],
                        total_fare_min_inr=r["fare_inr_min"],
                        total_fare_max_inr=r["fare_inr_max"],
                        fare_status=r.get("fare_status", "verified"),
                        calculation_basis=(
                            f"Direct {r['operator_name']} scheduled service ({r['route_number']})"
                        ),
                        operator_name=r["operator_name"],
                        feed_version="ksrtc_bmtc_swr_static_2026_v1",
                        is_realtime=False,
                    )
                )
                journey_counter += 1

        # 2. One-transfer connections through Bengaluru Majestic central hub
        if not journeys and max_transfers >= 1:
            hub_ids = {"stop-blr-majestic", "stop-blr-railway-sbc"}

            first_legs = [
                r
                for r in self._routes
                if (r["origin_stop_id"] in origin_stop_ids and r["destination_stop_id"] in hub_ids)
                or (r["destination_stop_id"] in origin_stop_ids and r["origin_stop_id"] in hub_ids)
            ]
            second_legs = [
                r
                for r in self._routes
                if (r["origin_stop_id"] in hub_ids and r["destination_stop_id"] in dest_stop_ids)
                or (r["destination_stop_id"] in hub_ids and r["origin_stop_id"] in dest_stop_ids)
            ]

            for r1 in first_legs:
                for r2 in second_legs:
                    r1_hub_id = (
                        r1["destination_stop_id"]
                        if r1["destination_stop_id"] in hub_ids
                        else r1["origin_stop_id"]
                    )
                    r2_hub_id = (
                        r2["origin_stop_id"]
                        if r2["origin_stop_id"] in hub_ids
                        else r2["destination_stop_id"]
                    )

                    hub_stop1 = self._stops.get(r1_hub_id)
                    hub_stop2 = self._stops.get(r2_hub_id)

                    o_stop = origin_stop_ids.get(r1["origin_stop_id"]) or origin_stop_ids.get(
                        r1["destination_stop_id"]
                    )
                    d_stop = dest_stop_ids.get(r2["destination_stop_id"]) or dest_stop_ids.get(
                        r2["origin_stop_id"]
                    )

                    if not (hub_stop1 and hub_stop2 and o_stop and d_stop):
                        continue
                    if o_stop.stop_id == d_stop.stop_id:
                        continue
                    if (r1["distance_km"] + r2["distance_km"]) > direct_dist_km * 2.5:
                        continue

                    dep1 = self._find_next_departure(
                        r1.get("scheduled_departures", ["07:00"]), departure_time
                    )
                    dur1 = r1["typical_duration_minutes"]
                    arr1 = self._add_minutes_to_time_str(dep1, dur1)

                    # Intermodal transfer buffer: 35 min if walking between rail and bus,
                    # 25 min within the same terminal
                    is_cross_station = r1_hub_id != r2_hub_id
                    min_buffer = 35 if is_cross_station else 25
                    min_dep2 = self._add_minutes_to_time_str(arr1, min_buffer)
                    dep2 = self._find_next_departure(
                        r2.get("scheduled_departures", ["12:00"]), min_dep2
                    )
                    dur2 = r2["typical_duration_minutes"]
                    arr2 = self._add_minutes_to_time_str(dep2, dur2)

                    layover_minutes = self._minutes_diff(arr1, dep2)
                    total_dur = dur1 + layover_minutes + dur2
                    fare_min = r1["fare_inr_min"] + r2["fare_inr_min"]
                    fare_max = r1["fare_inr_max"] + r2["fare_inr_max"]

                    leg1 = TransitLeg(
                        leg_id=f"leg-transfer-1-{r1['route_id']}",
                        origin_stop=o_stop,
                        destination_stop=hub_stop1,
                        transit_mode=TransitMode(r1["transit_mode"]),
                        line_name=r1["line_name"],
                        route_number=r1["route_number"],
                        departure_time=dep1,
                        arrival_time=arr1,
                        duration_minutes=dur1,
                        distance_km=r1["distance_km"],
                        fare_inr=r1["fare_inr_min"],
                        fare_status="verified",
                        frequency_summary=r1.get("departure_frequency", "Scheduled"),
                        operator_name=r1["operator_name"],
                        source_name=r1["source_name"],
                        source_url=r1.get("source_url"),
                    )

                    leg2 = TransitLeg(
                        leg_id=f"leg-transfer-2-{r2['route_id']}",
                        origin_stop=hub_stop2,
                        destination_stop=d_stop,
                        transit_mode=TransitMode(r2["transit_mode"]),
                        line_name=r2["line_name"],
                        route_number=r2["route_number"],
                        departure_time=dep2,
                        arrival_time=arr2,
                        duration_minutes=dur2,
                        distance_km=r2["distance_km"],
                        fare_inr=r2["fare_inr_min"],
                        fare_status="verified",
                        frequency_summary=r2.get("departure_frequency", "Scheduled"),
                        operator_name=r2["operator_name"],
                        source_name=r2["source_name"],
                        source_url=r2.get("source_url"),
                    )

                    trans_desc = (
                        f"1 transfer via Bengaluru Majestic hub ({layover_minutes} min layover"
                        + (", cross-terminal walk)" if is_cross_station else ")")
                    )

                    journeys.append(
                        TransitJourneyOption(
                            journey_id=f"journey-{journey_counter}",
                            origin_label=o_stop.name_en,
                            destination_label=d_stop.name_en,
                            total_duration_minutes=total_dur,
                            transfers_count=1,
                            legs=[leg1, leg2],
                            total_fare_min_inr=fare_min,
                            total_fare_max_inr=fare_max,
                            fare_status="verified",
                            calculation_basis=trans_desc,
                            operator_name=f"{r1['operator_name']} + {r2['operator_name']}",
                            feed_version="ksrtc_bmtc_swr_static_2026_v1",
                            is_realtime=False,
                        )
                    )
                    journey_counter += 1

        # Sort journeys by duration
        journeys.sort(key=lambda j: j.total_duration_minutes)
        return journeys

    def compare_transit_and_road(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        departure_time: str = "08:00",
    ) -> TransitComparison:
        routing_svc = get_routing_service()
        road_est = routing_svc.estimate_travel(origin_lat, origin_lon, dest_lat, dest_lon)

        # Estimate private taxi/cab cost: base ₹250 + ₹16/km in Karnataka
        road_cost = round(250.0 + (road_est.estimated_road_distance_km * 16.0), 2)

        transit_journeys = self.find_journeys(
            origin_lat, origin_lon, dest_lat, dest_lon, departure_time=departure_time
        )
        transit_available = len(transit_journeys) > 0

        if transit_available:
            best_opt = transit_journeys[0]
            cost_savings = round(max(0.0, road_cost - best_opt.total_fare_min_inr), 2)
            carbon_en = (
                f"Public transit saves approximately ₹{cost_savings} compared to private cab "
                f"and produces ~75% lower carbon emissions per passenger."
            )
            carbon_kn = (
                f"ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆಯು ಖಾಸಗಿ ಕ್ಯಾಬ್‌ಗಿಂತ ಸುಮಾರು ₹{cost_savings} ಉಳಿತಾಯ ಮಾಡುತ್ತದೆ "
                f"ಮತ್ತು ಪರಿಸರ ಮಾಲಿನ್ಯವನ್ನು ಗಣನೀಯವಾಗಿ ಕಡಿಮೆ ಮಾಡುತ್ತದೆ."
            )
        else:
            carbon_en = (
                "Direct scheduled public transit not found within terminal catchment. "
                "Terrain-adjusted cab/car travel recommended for this route."
            )
            carbon_kn = "ಈ ಮಾರ್ಗದಲ್ಲಿ ನೇರ ಸಾರ್ವಜನಿಕ ಸಾರಿಗೆ ಲಭ್ಯವಿಲ್ಲ. ಖಾಸಗಿ ವಾಹನ ಅಥವಾ ಕ್ಯಾಬ್ ಮೂಲಕ ಪ್ರಯಾಣಿಸುವುದು ಸೂಕ್ತ."

        return TransitComparison(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            road_distance_km=road_est.estimated_road_distance_km,
            road_duration_minutes=road_est.duration_minutes,
            road_method=str(road_est.calculation_method),
            road_estimated_cab_cost_inr=road_cost,
            transit_options=transit_journeys,
            transit_available=transit_available,
            carbon_comparison_note_en=carbon_en,
            carbon_comparison_note_kn=carbon_kn,
        )

    def _find_next_departure(self, deps: list[str], target_time: str) -> str:
        for d in sorted(deps):
            if d >= target_time:
                return d
        return deps[0] if deps else target_time

    def _add_minutes_to_time_str(self, time_str: str, minutes: int) -> str:
        try:
            t = datetime.strptime(time_str, "%H:%M")
            t_after = t + timedelta(minutes=minutes)
            return t_after.strftime("%H:%M")
        except Exception:
            return time_str

    def _minutes_diff(self, start_hhmm: str, end_hhmm: str) -> int:
        try:
            t1 = datetime.strptime(start_hhmm, "%H:%M")
            t2 = datetime.strptime(end_hhmm, "%H:%M")
            diff = int((t2 - t1).total_seconds() // 60)
            if diff < 0:
                diff += 1440
            return diff
        except Exception:
            return 30
