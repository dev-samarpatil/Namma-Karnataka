"""Pydantic schemas for verified Karnataka festivals, cultural events, and seasonal experiences."""

from __future__ import annotations

from app.schemas.destinations import StrictSchema


class EventRead(StrictSchema):
    """Schema representing a verified Karnataka cultural event or festival."""

    id: str
    name_en: str
    name_kn: str
    description_en: str
    description_kn: str
    location_name: str
    district_code: str
    latitude: float
    longitude: float
    start_month: int
    end_month: int
    typical_start_date: str | None = None
    typical_end_date: str | None = None
    date_status: str = "annual_recurring"
    source_name: str
    source_url: str
    verification_status: str = "verified_authentic"
    ticket_cost_min_inr: float = 0.0
    ticket_cost_max_inr: float = 0.0
    ticket_cost_status: str = "free"
    event_category: str = "cultural_festival"
    travel_advisory: str | None = None

    @property
    def event_id(self) -> str:
        return self.id


class EventFilterParams(StrictSchema):
    """Query parameters for searching cultural events."""

    district_code: str | None = None
    category: str | None = None
    month: int | None = None
    start_date: str | None = None
    end_date: str | None = None
