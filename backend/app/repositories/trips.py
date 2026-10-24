"""Trip repository layer for Namma Karnataka.

Implements multi-tenant isolation guaranteeing User A cannot read, modify,
or delete User B's private saved trips.
"""

from __future__ import annotations

import datetime
import secrets
import threading
import time
import uuid
from typing import Any, Protocol

import httpx

from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import get_logger
from app.schemas.trips import (
    SavedTripDetail,
    SavedTripSummary,
    SaveTripRequest,
    SharedTripDetail,
    TripAuditEvent,
    TripShareInfo,
    UpdateSharedTripRequest,
    UpdateTripRequest,
)

logger = get_logger("app.repositories.trips")


class TripRepository(Protocol):
    """Protocol defining the repository contract for saved trips."""

    def create_trip(self, user_id: str, request: SaveTripRequest) -> SavedTripDetail:
        """Create a new saved trip for the authenticated user."""
        ...

    def list_user_trips(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[SavedTripSummary], int]:
        """List trips belonging strictly to the specified user."""
        ...

    def get_trip(self, user_id: str, trip_id: str) -> SavedTripDetail | None:
        """Fetch trip detail if owned by user_id; returns None if not found or unauthorized."""
        ...

    def update_trip(
        self, user_id: str, trip_id: str, request: UpdateTripRequest
    ) -> SavedTripDetail | None:
        """Update an existing trip if owned by user_id; returns None if unauthorized."""
        ...

    def delete_trip(self, user_id: str, trip_id: str) -> bool:
        """Delete trip if owned by user_id; returns True if deleted, False if not found."""
        ...

    def create_share_link(
        self, user_id: str, trip_id: str, role: str, expires_in_days: int | None = 30
    ) -> TripShareInfo | None:
        """Generate a secure share token for an owned trip."""
        ...

    def list_shares(self, user_id: str, trip_id: str) -> list[TripShareInfo] | None:
        """List all share links created for an owned trip."""
        ...

    def revoke_share(self, user_id: str, trip_id: str, share_id: str) -> bool:
        """Revoke a previously created share link for an owned trip."""
        ...

    def get_shared_trip(self, share_token: str) -> tuple[SharedTripDetail | None, str | None]:
        """Retrieve shared trip by access token. Returns (detail, error_reason)."""
        ...

    def update_shared_trip(
        self, share_token: str, request: UpdateSharedTripRequest
    ) -> tuple[SharedTripDetail | None, str | None]:
        """Update shared itinerary by authorized collaborator under optimistic concurrency."""
        ...

    def get_trip_history(
        self, trip_id: str, user_id: str | None = None, share_token: str | None = None
    ) -> list[TripAuditEvent] | None:
        """Retrieve chronological change audit events for a trip."""
        ...



class InMemoryTripRepository:
    """Thread-safe in-memory trip repository for offline/test environments.

    Strictly enforces multi-tenant boundary checks.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._trips: dict[str, SavedTripDetail] = {}
        self._shares: dict[str, TripShareInfo] = {}
        self._audit_events: dict[str, list[TripAuditEvent]] = {}
        self._idempotency_records: dict[tuple[str, str], Any] = {}

    def create_trip(self, user_id: str, request: SaveTripRequest) -> SavedTripDetail:
        with self._lock:
            if request.idempotency_key:
                cached = self._idempotency_records.get((user_id, request.idempotency_key))
                if cached:
                    logger.info(
                        "Idempotent create_trip replay hit for user %s and key %s",
                        user_id,
                        request.idempotency_key,
                    )
                    return cached

            now_str = datetime.datetime.now(datetime.UTC).isoformat()
            trip_id = f"trip-{uuid.uuid4()}"

            detail = SavedTripDetail(
                id=trip_id,
                user_id=user_id,
                title=request.title,
                origin_label=request.origin_label,
                duration_days=request.duration_days,
                pace=request.pace,
                is_offbeat_preferred=request.is_offbeat_preferred,
                preferences=request.preferences,
                budget_min_inr=request.budget_min_inr,
                budget_max_inr=request.budget_max_inr,
                currency_code=request.currency_code,
                status="active",
                version=1,
                last_modified_by=user_id,
                snapshot=request.itinerary,
                created_at=now_str,
                updated_at=now_str,
            )

            self._trips[trip_id] = detail
            init_event = TripAuditEvent(
                id=f"audit-{uuid.uuid4()}",
                trip_id=trip_id,
                actor_type="owner",
                actor_id=user_id,
                action="created",
                summary=f"Trip '{request.title}' created",
                version_before=None,
                version_after=1,
                created_at=now_str,
            )
            self._audit_events[trip_id] = [init_event]

            if request.idempotency_key:
                self._idempotency_records[(user_id, request.idempotency_key)] = detail

        logger.info("Saved trip created: trip_id=%s, user_id=%s", trip_id, user_id)
        return detail

    def list_user_trips(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[SavedTripSummary], int]:
        with self._lock:
            # Multi-tenant isolation: strictly filter by user_id
            user_trips = [
                t for t in self._trips.values() if t.user_id == user_id and t.status == "active"
            ]

        # Order by created_at descending
        user_trips.sort(key=lambda t: t.created_at, reverse=True)
        total = len(user_trips)
        paginated = user_trips[offset : offset + limit]

        summaries = [
            SavedTripSummary(
                id=t.id,
                title=t.title,
                origin_label=t.origin_label,
                duration_days=t.duration_days,
                pace=t.pace,
                budget_min_inr=t.budget_min_inr,
                budget_max_inr=t.budget_max_inr,
                currency_code=t.currency_code,
                total_stops=len(t.snapshot.items),
                version=t.version,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in paginated
        ]
        return summaries, total

    def get_trip(self, user_id: str, trip_id: str) -> SavedTripDetail | None:
        with self._lock:
            trip = self._trips.get(trip_id)
            if trip is None:
                return None
            # Multi-tenant isolation: deny access if owned by another user
            if trip.user_id != user_id:
                logger.warning(
                    "Cross-user trip access denied: requested trip_id=%s, requester=%s, owner=%s",
                    trip_id,
                    user_id,
                    trip.user_id,
                )
                return None
            return trip

    def update_trip(
        self, user_id: str, trip_id: str, request: UpdateTripRequest
    ) -> SavedTripDetail | None:
        with self._lock:
            trip = self._trips.get(trip_id)
            if trip is None or trip.user_id != user_id:
                return None

            if request.idempotency_key:
                cached = self._idempotency_records.get((user_id, request.idempotency_key))
                if cached is not None:
                    return cached

            if request.expected_version is not None and request.expected_version != trip.version:
                logger.warning(
                    "Trip version conflict: trip_id=%s, expected=%s, actual=%s",
                    trip_id,
                    request.expected_version,
                    trip.version,
                )
                raise AppError(
                    code="TRIP_VERSION_CONFLICT",
                    message=(
                        f"Trip version conflict: expected v{request.expected_version}, "
                        f"but current version is v{trip.version}."
                    ),
                    status_code=409,
                )

            now_str = datetime.datetime.now(datetime.UTC).isoformat()
            updated_title = request.title if request.title is not None else trip.title
            budget_min = (
                request.itinerary.budget_breakdown.grand_total_min_inr
                if request.itinerary.budget_breakdown
                else trip.budget_min_inr
            )
            budget_max = (
                request.itinerary.budget_breakdown.grand_total_max_inr
                if request.itinerary.budget_breakdown
                else trip.budget_max_inr
            )
            new_version = trip.version + 1
            updated_trip = SavedTripDetail(
                id=trip.id,
                user_id=trip.user_id,
                title=updated_title,
                origin_label=trip.origin_label,
                duration_days=request.itinerary.duration_days,
                pace=trip.pace,
                is_offbeat_preferred=trip.is_offbeat_preferred,
                preferences=trip.preferences,
                budget_min_inr=budget_min,
                budget_max_inr=budget_max,
                currency_code=trip.currency_code,
                status=trip.status,
                version=new_version,
                last_modified_by=user_id,
                snapshot=request.itinerary,
                created_at=trip.created_at,
                updated_at=now_str,
            )
            self._trips[trip_id] = updated_trip

            event = TripAuditEvent(
                id=f"audit-{uuid.uuid4()}",
                trip_id=trip_id,
                actor_type="owner",
                actor_id=user_id,
                action="updated",
                summary=f"Trip updated to version {new_version}",
                version_before=trip.version,
                version_after=new_version,
                created_at=now_str,
            )
            self._audit_events.setdefault(trip_id, []).append(event)

            logger.info(
                "Saved trip updated: trip_id=%s, user_id=%s, version=%s",
                trip_id,
                user_id,
                new_version,
            )
            if request.idempotency_key:
                self._idempotency_records[(user_id, request.idempotency_key)] = updated_trip
            return updated_trip


    def delete_trip(self, user_id: str, trip_id: str) -> bool:
        with self._lock:
            trip = self._trips.get(trip_id)
            if trip is None or trip.user_id != user_id:
                return False
            del self._trips[trip_id]
            logger.info("Trip deleted: trip_id=%s, user_id=%s", trip_id, user_id)
            return True

    def create_share_link(
        self, user_id: str, trip_id: str, role: str, expires_in_days: int | None = 30
    ) -> TripShareInfo | None:
        with self._lock:
            trip = self._trips.get(trip_id)
            if trip is None or trip.user_id != user_id:
                return None
            now = datetime.datetime.now(datetime.UTC)
            now_str = now.isoformat()
            expires_at = (
                (now + datetime.timedelta(days=expires_in_days)).isoformat()
                if expires_in_days
                else None
            )
            token = f"nk_share_{secrets.token_urlsafe(32)}"
            share_id = f"share-{uuid.uuid4()}"
            share = TripShareInfo(
                id=share_id,
                trip_id=trip_id,
                created_by=user_id,
                role=role,
                share_token=token,
                expires_at=expires_at,
                is_revoked=False,
                created_at=now_str,
            )
            self._shares[token] = share
            event = TripAuditEvent(
                id=f"audit-{uuid.uuid4()}",
                trip_id=trip_id,
                actor_type="owner",
                actor_id=user_id,
                action="shared",
                summary=f"Created {role} share link",
                version_before=trip.version,
                version_after=trip.version,
                created_at=now_str,
            )
            self._audit_events.setdefault(trip_id, []).append(event)
            return share

    def list_shares(self, user_id: str, trip_id: str) -> list[TripShareInfo] | None:
        with self._lock:
            trip = self._trips.get(trip_id)
            if trip is None or trip.user_id != user_id:
                return None
            return [s for s in self._shares.values() if s.trip_id == trip_id]

    def revoke_share(self, user_id: str, trip_id: str, share_id: str) -> bool:
        with self._lock:
            trip = self._trips.get(trip_id)
            if trip is None or trip.user_id != user_id:
                return False
            found = False
            for s in list(self._shares.values()):
                if s.id == share_id and s.trip_id == trip_id:
                    self._shares[s.share_token] = s.model_copy(update={"is_revoked": True})
                    found = True
                    break
            if found:
                now_str = datetime.datetime.now(datetime.UTC).isoformat()
                event = TripAuditEvent(
                    id=f"audit-{uuid.uuid4()}",
                    trip_id=trip_id,
                    actor_type="owner",
                    actor_id=user_id,
                    action="revoked",
                    summary=f"Revoked share link {share_id}",
                    version_before=trip.version,
                    version_after=trip.version,
                    created_at=now_str,
                )
                self._audit_events.setdefault(trip_id, []).append(event)
            return found

    def get_shared_trip(self, share_token: str) -> tuple[SharedTripDetail | None, str | None]:
        with self._lock:
            share = self._shares.get(share_token)
            if share is None:
                return None, "not_found"
            if share.is_revoked:
                return None, "revoked"
            if share.expires_at:
                exp = datetime.datetime.fromisoformat(share.expires_at)
                if datetime.datetime.now(datetime.UTC) > exp:
                    return None, "expired"
            trip = self._trips.get(share.trip_id)
            if trip is None or trip.status != "active":
                return None, "not_found"
            return (
                SharedTripDetail(
                    id=trip.id,
                    title=trip.title,
                    origin_label=trip.origin_label,
                    duration_days=trip.duration_days,
                    pace=trip.pace,
                    is_offbeat_preferred=trip.is_offbeat_preferred,
                    budget_min_inr=trip.budget_min_inr,
                    budget_max_inr=trip.budget_max_inr,
                    currency_code=trip.currency_code,
                    version=trip.version,
                    role=share.role,
                    snapshot=trip.snapshot,
                    created_at=trip.created_at,
                    updated_at=trip.updated_at,
                ),
                None,
            )

    def update_shared_trip(
        self, share_token: str, request: UpdateSharedTripRequest
    ) -> tuple[SharedTripDetail | None, str | None]:
        with self._lock:
            share = self._shares.get(share_token)
            if share is None:
                return None, "not_found"
            if share.is_revoked:
                return None, "revoked"
            if share.expires_at:
                exp = datetime.datetime.fromisoformat(share.expires_at)
                if datetime.datetime.now(datetime.UTC) > exp:
                    return None, "expired"
            if share.role != "editor":
                return None, "forbidden"

            trip = self._trips.get(share.trip_id)
            if trip is None or trip.status != "active":
                return None, "not_found"

            if request.idempotency_key:
                cached = self._idempotency_records.get((share_token, request.idempotency_key))
                if cached is not None:
                    return cached, None

            now_str = datetime.datetime.now(datetime.UTC).isoformat()
            if request.expected_version != trip.version:
                event = TripAuditEvent(
                    id=f"audit-{uuid.uuid4()}",
                    trip_id=trip.id,
                    actor_type="editor",
                    actor_id=f"share:{share.id}",
                    action="conflict_detected",
                    summary=(
                        f"Stale update rejected. Expected v{request.expected_version}, "
                        f"current v{trip.version}."
                    ),
                    version_before=trip.version,
                    version_after=trip.version,
                    created_at=now_str,
                )

                self._audit_events.setdefault(trip.id, []).append(event)
                return None, "conflict"

            new_version = trip.version + 1
            updated_title = request.title if request.title is not None else trip.title
            budget_min = (
                request.itinerary.budget_breakdown.grand_total_min_inr
                if request.itinerary.budget_breakdown
                else trip.budget_min_inr
            )
            budget_max = (
                request.itinerary.budget_breakdown.grand_total_max_inr
                if request.itinerary.budget_breakdown
                else trip.budget_max_inr
            )
            updated_trip = SavedTripDetail(
                id=trip.id,
                user_id=trip.user_id,
                title=updated_title,
                origin_label=trip.origin_label,
                duration_days=request.itinerary.duration_days,
                pace=trip.pace,
                is_offbeat_preferred=trip.is_offbeat_preferred,
                preferences=trip.preferences,
                budget_min_inr=budget_min,
                budget_max_inr=budget_max,
                currency_code=trip.currency_code,
                status=trip.status,
                version=new_version,
                last_modified_by=f"editor:{share.id}",
                snapshot=request.itinerary,
                created_at=trip.created_at,
                updated_at=now_str,
            )
            self._trips[trip.id] = updated_trip

            event = TripAuditEvent(
                id=f"audit-{uuid.uuid4()}",
                trip_id=trip.id,
                actor_type="editor",
                actor_id=f"share:{share.id}",
                action="updated",
                summary=f"Itinerary updated by collaborator to version {new_version}",
                version_before=trip.version,
                version_after=new_version,
                created_at=now_str,
            )
            self._audit_events.setdefault(trip.id, []).append(event)

            shared_detail = SharedTripDetail(
                id=updated_trip.id,
                title=updated_trip.title,
                origin_label=updated_trip.origin_label,
                duration_days=updated_trip.duration_days,
                pace=updated_trip.pace,
                is_offbeat_preferred=updated_trip.is_offbeat_preferred,
                budget_min_inr=updated_trip.budget_min_inr,
                budget_max_inr=updated_trip.budget_max_inr,
                currency_code=updated_trip.currency_code,
                version=new_version,
                role=share.role,
                snapshot=updated_trip.snapshot,
                created_at=updated_trip.created_at,
                updated_at=updated_trip.updated_at,
            )
            if request.idempotency_key:
                self._idempotency_records[(share_token, request.idempotency_key)] = shared_detail
            return shared_detail, None

    def get_trip_history(
        self, trip_id: str, user_id: str | None = None, share_token: str | None = None
    ) -> list[TripAuditEvent] | None:
        with self._lock:
            trip = self._trips.get(trip_id)
            if trip is None:
                return None
            if user_id is not None:
                if trip.user_id != user_id:
                    return None
            elif share_token is not None:
                share = self._shares.get(share_token)
                if share is None or share.trip_id != trip_id or share.is_revoked:
                    return None
            else:
                return None
            return list(self._audit_events.get(trip_id, []))



class SupabaseTripRepository:
    """Supabase PostgREST repository for live trips with user-isolated queries."""

    def __init__(self, supabase_url: str, service_role_key: str) -> None:
        clean_url = supabase_url.rstrip("/")
        if clean_url.endswith("/rest/v1"):
            clean_url = clean_url[: -len("/rest/v1")]
        self._base_url = clean_url
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        self._fallback_repo = InMemoryTripRepository()
        self._schema_unmigrated: bool = False
        self._last_unmigrated_check: float = 0.0
        self._unmigrated_cooldown_seconds: float = 60.0

    def _is_schema_unmigrated(self) -> bool:
        return self._schema_unmigrated and (
            time.time() - self._last_unmigrated_check < self._unmigrated_cooldown_seconds
        )

    def _mark_schema_unmigrated(self) -> None:
        self._schema_unmigrated = True
        self._last_unmigrated_check = time.time()

    def _mark_schema_migrated(self) -> None:
        self._schema_unmigrated = False

    def create_trip(self, user_id: str, request: SaveTripRequest) -> SavedTripDetail:
        if self._is_schema_unmigrated():
            return self._fallback_repo.create_trip(user_id, request)
        # Check if remote table is present
        try:
            with httpx.Client(timeout=10.0) as client:
                trip_payload = {
                    "user_id": user_id,
                    "title": request.title,
                    "origin_label": request.origin_label,
                    "duration_days": request.duration_days,
                    "pace": request.pace,
                    "is_offbeat_preferred": request.is_offbeat_preferred,
                    "preferences": request.preferences,
                    "budget_min_inr": request.budget_min_inr,
                    "budget_max_inr": request.budget_max_inr,
                    "currency_code": request.currency_code,
                    "status": "active",
                }
                res = client.post(
                    f"{self._base_url}/rest/v1/trips",
                    headers={**self._headers, "Prefer": "return=representation"},
                    json=trip_payload,
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    logger.warning(
                        "Supabase table 'trips' not yet migrated; "
                        "caching unmigrated state for 60s and using in-memory store."
                    )
                    self._mark_schema_unmigrated()
                    return self._fallback_repo.create_trip(user_id, request)

                if res.status_code not in (200, 201):
                    raise AppError(
                        code="DATABASE_ERROR",
                        message="Failed to persist trip in cloud database",
                        status_code=502,
                    )

                self._mark_schema_migrated()
                created_rows = res.json()
                trip_record = created_rows[0]
                trip_id = trip_record["id"]

                # Insert snapshot
                snapshot_payload = {
                    "trip_id": trip_id,
                    "user_id": user_id,
                    "schema_version": "1.0",
                    "generation_mode": request.itinerary.generation_mode,
                    "provider_used": request.itinerary.provider_used,
                    "items": [item.model_dump() for item in request.itinerary.items],
                    "total_destinations": request.itinerary.total_destinations,
                }
                snap_res = client.post(
                    f"{self._base_url}/rest/v1/itinerary_snapshots",
                    headers=self._headers,
                    json=snapshot_payload,
                )
                if snap_res.status_code not in (200, 201):
                    logger.error("Failed saving snapshot for trip %s", trip_id)

                return SavedTripDetail(
                    id=trip_id,
                    user_id=user_id,
                    title=trip_record["title"],
                    origin_label=trip_record["origin_label"],
                    duration_days=trip_record["duration_days"],
                    pace=trip_record["pace"],
                    is_offbeat_preferred=trip_record.get("is_offbeat_preferred", False),
                    preferences=trip_record.get("preferences", {}),
                    budget_min_inr=trip_record.get("budget_min_inr"),
                    budget_max_inr=trip_record.get("budget_max_inr"),
                    currency_code=trip_record.get("currency_code", "INR"),
                    status=trip_record.get("status", "active"),
                    snapshot=request.itinerary,
                    created_at=trip_record["created_at"],
                    updated_at=trip_record["updated_at"],
                )
        except httpx.RequestError as exc:
            logger.warning("Supabase connection error; falling back to in-memory store: %s", exc)
            return self._fallback_repo.create_trip(user_id, request)

    def list_user_trips(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[SavedTripSummary], int]:
        if self._is_schema_unmigrated():
            return self._fallback_repo.list_user_trips(user_id, limit, offset)
        try:
            with httpx.Client(timeout=10.0) as client:
                query_params = {
                    "user_id": f"eq.{user_id}",
                    "status": "eq.active",
                    "order": "created_at.desc",
                    "limit": str(limit),
                    "offset": str(offset),
                }
                res = client.get(
                    f"{self._base_url}/rest/v1/trips",
                    headers={**self._headers, "Prefer": "count=exact"},
                    params=query_params,
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    logger.warning(
                        "Supabase table 'trips' not yet migrated; "
                        "caching unmigrated state for 60s and using in-memory store."
                    )
                    self._mark_schema_unmigrated()
                    return self._fallback_repo.list_user_trips(user_id, limit, offset)

                if res.status_code not in (200, 206):
                    raise AppError(
                        code="DATABASE_ERROR",
                        message="Failed to list cloud trips",
                        status_code=502,
                    )

                self._mark_schema_migrated()
                total = len(res.json())
                content_range = res.headers.get("Content-Range")
                if content_range and "/" in content_range:
                    t_str = content_range.split("/")[1]
                    if t_str.isdigit():
                        total = int(t_str)

                rows = res.json()
                summaries = [
                    SavedTripSummary(
                        id=r["id"],
                        title=r["title"],
                        origin_label=r["origin_label"],
                        duration_days=r["duration_days"],
                        pace=r["pace"],
                        budget_min_inr=r.get("budget_min_inr"),
                        budget_max_inr=r.get("budget_max_inr"),
                        currency_code=r.get("currency_code", "INR"),
                        total_stops=0,
                        created_at=r["created_at"],
                        updated_at=r["updated_at"],
                    )
                    for r in rows
                ]
                return summaries, total
        except httpx.RequestError:
            return self._fallback_repo.list_user_trips(user_id, limit, offset)

    def get_trip(self, user_id: str, trip_id: str) -> SavedTripDetail | None:
        if self._is_schema_unmigrated():
            return self._fallback_repo.get_trip(user_id, trip_id)
        try:
            with httpx.Client(timeout=10.0) as client:
                # Query with explicit user_id filter for multi-tenant isolation
                res = client.get(
                    f"{self._base_url}/rest/v1/trips",
                    headers=self._headers,
                    params={
                        "id": f"eq.{trip_id}",
                        "user_id": f"eq.{user_id}",
                    },
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    logger.warning(
                        "Supabase table 'trips' not yet migrated; "
                        "caching unmigrated state for 60s and using in-memory store."
                    )
                    self._mark_schema_unmigrated()
                    return self._fallback_repo.get_trip(user_id, trip_id)

                if res.status_code != 200:
                    raise AppError(
                        code="DATABASE_ERROR",
                        message="Failed to query trip detail",
                        status_code=502,
                    )

                self._mark_schema_migrated()
                rows = res.json()
                if not rows:
                    return None

                trip_record = rows[0]
                # Fetch snapshot
                snap_res = client.get(
                    f"{self._base_url}/rest/v1/itinerary_snapshots",
                    headers=self._headers,
                    params={
                        "trip_id": f"eq.{trip_id}",
                        "user_id": f"eq.{user_id}",
                    },
                )
                snap_rows = snap_res.json() if snap_res.status_code == 200 else []
                snapshot_data = snap_rows[0] if snap_rows else {}

                return SavedTripDetail(
                    id=trip_record["id"],
                    user_id=user_id,
                    title=trip_record["title"],
                    origin_label=trip_record["origin_label"],
                    duration_days=trip_record["duration_days"],
                    pace=trip_record["pace"],
                    is_offbeat_preferred=trip_record.get("is_offbeat_preferred", False),
                    preferences=trip_record.get("preferences", {}),
                    budget_min_inr=trip_record.get("budget_min_inr"),
                    budget_max_inr=trip_record.get("budget_max_inr"),
                    currency_code=trip_record.get("currency_code", "INR"),
                    status=trip_record.get("status", "active"),
                    snapshot=snapshot_data,
                    created_at=trip_record["created_at"],
                    updated_at=trip_record["updated_at"],
                )
        except httpx.RequestError:
            return self._fallback_repo.get_trip(user_id, trip_id)

    def update_trip(
        self, user_id: str, trip_id: str, request: UpdateTripRequest
    ) -> SavedTripDetail | None:
        if self._is_schema_unmigrated():
            return self._fallback_repo.update_trip(user_id, trip_id, request)
        try:
            with httpx.Client(timeout=10.0) as client:
                now_str = datetime.datetime.now(datetime.UTC).isoformat()
                update_body: dict[str, str | float | int] = {
                    "updated_at": now_str,
                    "duration_days": request.itinerary.duration_days,
                }
                if request.title:
                    update_body["title"] = request.title
                if request.itinerary.budget_breakdown:
                    if request.itinerary.budget_breakdown.grand_total_min_inr is not None:
                        update_body["budget_min_inr"] = (
                            request.itinerary.budget_breakdown.grand_total_min_inr
                        )
                    if request.itinerary.budget_breakdown.grand_total_max_inr is not None:
                        update_body["budget_max_inr"] = (
                            request.itinerary.budget_breakdown.grand_total_max_inr
                        )

                res = client.patch(
                    f"{self._base_url}/rest/v1/trips",
                    headers={**self._headers, "Prefer": "return=representation"},
                    params={"id": f"eq.{trip_id}", "user_id": f"eq.{user_id}"},
                    json=update_body,
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    self._mark_schema_unmigrated()
                    return self._fallback_repo.update_trip(user_id, trip_id, request)
                if res.status_code != 200 or not res.json():
                    return None

                self._mark_schema_migrated()
                trip_record = res.json()[0]

                # Insert updated snapshot
                snapshot_payload = {
                    "trip_id": trip_id,
                    "user_id": user_id,
                    "schema_version": "1.0",
                    "generation_mode": request.itinerary.generation_mode,
                    "provider_used": request.itinerary.provider_used,
                    "items": [item.model_dump() for item in request.itinerary.items],
                    "total_destinations": request.itinerary.total_destinations,
                }
                client.post(
                    f"{self._base_url}/rest/v1/itinerary_snapshots",
                    headers=self._headers,
                    json=snapshot_payload,
                )

                return SavedTripDetail(
                    id=trip_id,
                    user_id=user_id,
                    title=trip_record["title"],
                    origin_label=trip_record["origin_label"],
                    duration_days=trip_record["duration_days"],
                    pace=trip_record["pace"],
                    is_offbeat_preferred=trip_record.get("is_offbeat_preferred", False),
                    preferences=trip_record.get("preferences", {}),
                    budget_min_inr=trip_record.get("budget_min_inr"),
                    budget_max_inr=trip_record.get("budget_max_inr"),
                    currency_code=trip_record.get("currency_code", "INR"),
                    status=trip_record.get("status", "active"),
                    snapshot=request.itinerary,
                    created_at=trip_record["created_at"],
                    updated_at=trip_record["updated_at"],
                )
        except httpx.RequestError:
            return self._fallback_repo.update_trip(user_id, trip_id, request)

    def delete_trip(self, user_id: str, trip_id: str) -> bool:
        if self._is_schema_unmigrated():
            return self._fallback_repo.delete_trip(user_id, trip_id)
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.delete(
                    f"{self._base_url}/rest/v1/trips",
                    headers=self._headers,
                    params={
                        "id": f"eq.{trip_id}",
                        "user_id": f"eq.{user_id}",
                    },
                )
                if res.status_code == 404 and "PGRST205" in res.text:
                    logger.warning(
                        "Supabase table 'trips' not yet migrated; "
                        "caching unmigrated state for 60s and using in-memory store."
                    )
                    self._mark_schema_unmigrated()
                    return self._fallback_repo.delete_trip(user_id, trip_id)
                self._mark_schema_migrated()
                return res.status_code in (200, 204)
        except httpx.RequestError:
            return self._fallback_repo.delete_trip(user_id, trip_id)

    def create_share_link(
        self, user_id: str, trip_id: str, role: str, expires_in_days: int | None = 30
    ) -> TripShareInfo | None:
        return self._fallback_repo.create_share_link(user_id, trip_id, role, expires_in_days)

    def list_shares(self, user_id: str, trip_id: str) -> list[TripShareInfo] | None:
        return self._fallback_repo.list_shares(user_id, trip_id)

    def revoke_share(self, user_id: str, trip_id: str, share_id: str) -> bool:
        return self._fallback_repo.revoke_share(user_id, trip_id, share_id)

    def get_shared_trip(self, share_token: str) -> tuple[SharedTripDetail | None, str | None]:
        return self._fallback_repo.get_shared_trip(share_token)

    def update_shared_trip(
        self, share_token: str, request: UpdateSharedTripRequest
    ) -> tuple[SharedTripDetail | None, str | None]:
        return self._fallback_repo.update_shared_trip(share_token, request)

    def get_trip_history(
        self, trip_id: str, user_id: str | None = None, share_token: str | None = None
    ) -> list[TripAuditEvent] | None:
        return self._fallback_repo.get_trip_history(trip_id, user_id, share_token)



_trip_repository_instance: TripRepository | None = None


def get_trip_repository() -> TripRepository:
    """Return the configured TripRepository instance."""
    global _trip_repository_instance
    if _trip_repository_instance is None:
        if (
            settings.SUPABASE_URL
            and settings.SUPABASE_SERVICE_ROLE_KEY
            and not settings.SUPABASE_URL.startswith("placeholder")
        ):
            _trip_repository_instance = SupabaseTripRepository(
                supabase_url=settings.SUPABASE_URL,
                service_role_key=settings.SUPABASE_SERVICE_ROLE_KEY,
            )
        else:
            _trip_repository_instance = InMemoryTripRepository()
    return _trip_repository_instance
