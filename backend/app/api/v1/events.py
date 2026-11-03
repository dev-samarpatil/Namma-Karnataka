"""API route handlers for Karnataka cultural events and festivals."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.events import EventRead
from app.services.events.service import get_events_service
from app.services.karnataka_events import (
    KarnatakaEvent,
    get_karnataka_events_service,
)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventRead])
def list_events(
    district_code: str | None = Query(
        None, description="Optional district code filter e.g. KA-MYS"
    ),
    month: int | None = Query(None, ge=1, le=12, description="Month of travel (1-12)"),
    lat: float | None = Query(None, ge=11.0, le=19.0, description="Latitude for proximity search"),
    lon: float | None = Query(None, ge=74.0, le=79.0, description="Longitude for proximity search"),
    radius_km: float = Query(60.0, ge=1.0, le=300.0, description="Search radius in km"),
) -> list[EventRead]:
    """Retrieve verified Karnataka festivals and cultural events."""
    k_service = get_karnataka_events_service()
    if lat is not None and lon is not None:
        kevs = k_service.get_events_near_coordinates(lat, lon, radius_km=radius_km, month=month)
        if kevs:
            return [k.to_event_read() for k in kevs]
        return get_events_service().get_events_near(lat, lon, radius_km=radius_km, month=month)

    if district_code:
        kevs = [k for k in k_service.get_all_events() if k.district_code == district_code]
        if month is not None:
            kevs = [
                k
                for k in kevs
                if (k.start_month <= month <= k.end_month)
                or (
                    k.start_month > k.end_month and (month >= k.start_month or month <= k.end_month)
                )
            ]
        if kevs:
            return [k.to_event_read() for k in kevs]
        return get_events_service().get_events_for_districts([district_code], month=month)

    all_k = [k.to_event_read() for k in k_service.get_all_events()]
    if month is not None:
        all_k = [
            e
            for e in all_k
            if (e.start_month <= month <= e.end_month)
            or (e.start_month > e.end_month and (month >= e.start_month or month <= e.end_month))
        ]
    return all_k


@router.get("/calendar", response_model=list[KarnatakaEvent])
def get_events_calendar(
    category: str | None = Query(
        None,
        description="major_festival, regional_festival, cultural_performance, seasonal_celebration",
    ),
    month: int | None = Query(None, ge=1, le=12, description="Month of travel (1-12)"),
) -> list[KarnatakaEvent]:
    """Retrieve canonical Karnataka events calendar with dates, venues, and photos."""
    svc = get_karnataka_events_service()
    events = svc.get_all_events()
    if category:
        events = [e for e in events if e.category.lower() == category.lower()]
    if month:
        events = [
            e
            for e in events
            if (e.start_month <= month <= e.end_month)
            or (e.start_month > e.end_month and (month >= e.start_month or month <= e.end_month))
        ]
    return events


@router.get("/happening-during-trip", response_model=list[EventRead])
def get_happening_during_trip(
    start_date: str = Query(..., description="Trip start date YYYY-MM-DD"),
    duration_days: int = Query(3, ge=1, le=14, description="Trip duration in days"),
    districts: str | None = Query(
        None, description="Comma-separated district codes e.g. KA-MYS,KA-BLR"
    ),
) -> list[EventRead]:
    """Retrieve verified events specifically happening during the traveler's dates."""
    svc = get_karnataka_events_service()
    corridor_districts = [d.strip() for d in districts.split(",")] if districts else []
    matched = svc.match_trip_events(
        start_date=start_date,
        duration_days=duration_days,
        corridor_districts=corridor_districts,
    )
    return [e.to_event_read() for e in matched]


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: str) -> EventRead:
    """Fetch a single verified cultural event by ID."""
    k_service = get_karnataka_events_service()
    for k in k_service.get_all_events():
        if k.id == event_id:
            return k.to_event_read()
    service = get_events_service()
    for e in service.get_all_events():
        if e.id == event_id:
            return e
    raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")
