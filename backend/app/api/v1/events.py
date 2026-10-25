"""API route handlers for Karnataka cultural events and festivals."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.events import EventRead
from app.services.events.service import get_events_service

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
    service = get_events_service()
    if lat is not None and lon is not None:
        return service.get_events_near(lat, lon, radius_km=radius_km, month=month)
    if district_code:
        return service.get_events_for_districts([district_code], month=month)
    all_events = service.get_all_events()
    if month is not None:
        filtered: list[EventRead] = []
        for e in all_events:
            if e.start_month <= e.end_month:
                if e.start_month <= month <= e.end_month:
                    filtered.append(e)
            else:
                if month >= e.start_month or month <= e.end_month:
                    filtered.append(e)
        return filtered
    return all_events


@router.get("/{event_id}", response_model=EventRead)
def get_event(event_id: str) -> EventRead:
    """Fetch a single verified cultural event by ID."""
    service = get_events_service()
    for e in service.get_all_events():
        if e.id == event_id:
            return e
    raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")
