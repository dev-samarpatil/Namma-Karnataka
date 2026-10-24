"""Domain schemas and models for public transit discovery and comparison."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class TransitMode(StrEnum):
    KSRTC_EXPRESS_BUS = "ksrtc_express_bus"
    BMTC_CITY_BUS = "bmtc_city_bus"
    SWR_RAILWAY = "swr_railway"
    NAMMA_METRO = "namma_metro"


class StationType(StrEnum):
    BUS_TERMINAL = "bus_terminal"
    RAILWAY_STATION = "railway_station"
    METRO_STATION = "metro_station"
    BUS_STOP = "bus_stop"


class TransitStop(BaseModel):
    model_config = ConfigDict(frozen=True)

    stop_id: str
    name_en: str
    name_kn: str
    district_code: str
    station_type: StationType
    latitude: float
    longitude: float
    address_en: str
    address_kn: str
    operator: str
    distance_km: float | None = None


class TransitLeg(BaseModel):
    model_config = ConfigDict(frozen=True)

    leg_id: str
    origin_stop: TransitStop
    destination_stop: TransitStop
    transit_mode: TransitMode
    line_name: str
    route_number: str
    departure_time: str
    arrival_time: str
    duration_minutes: int
    distance_km: float
    fare_inr: float
    fare_status: str = "verified"
    frequency_summary: str
    operator_name: str
    source_name: str
    source_url: str | None = None


class TransitJourneyOption(BaseModel):
    model_config = ConfigDict(frozen=True)

    journey_id: str
    origin_label: str
    destination_label: str
    total_duration_minutes: int
    transfers_count: int
    legs: list[TransitLeg]
    total_fare_min_inr: float
    total_fare_max_inr: float
    fare_status: str = "verified"
    calculation_basis: str
    operator_name: str
    feed_version: str = "ksrtc_bmtc_swr_static_2026_v1"
    disclaimer: str = (
        "Static scheduled transit data. Live vehicle delays, real-time platform changes, "
        "and seat reservation availability are not tracked in this schedule."
    )
    is_realtime: bool = False


class TransitComparison(BaseModel):
    model_config = ConfigDict(frozen=True)

    origin_lat: float
    origin_lon: float
    dest_lat: float
    dest_lon: float
    road_distance_km: float
    road_duration_minutes: int
    road_method: str = "terrain_adjusted_estimate"
    road_estimated_cab_cost_inr: float
    transit_options: list[TransitJourneyOption]
    transit_available: bool
    carbon_comparison_note_en: str
    carbon_comparison_note_kn: str
