"""Unified Multi-Source Destination Discovery Engine.

Orchestrates multi-provider discovery across Official Karnataka Tourism,
Archaeological Survey of India (ASI), District Gazetteers, and OpenStreetMap,
with geodesic deduplication within 300m and authentic offbeat scoring.
"""

from __future__ import annotations

import logging
import math
from typing import Sequence

from app.schemas.destinations import (
    AccessStatus,
    ContentStatus,
    Coordinates,
    DestinationCategory,
    DestinationRead,
    DestinationSourceRead,
    DestinationTranslationRead,
    DistrictSummary,
    LanguageCode,
    SourceType,
    TranslationStatus,
    VerificationStatus as DestVerificationStatus,
)
from app.schemas.planning import RecommendedDestination
from app.services.destination_image_service import get_destination_image_service
from app.services.discovery_providers import (
    ASIProvider,
    DiscoveredDestination,
    DiscoveryProvider,
    DistrictGazetteerProvider,
    OfficialTourismProvider,
    OSMProvider,
    ProvenanceSource,
    VerificationStatus,
)

logger = get_logger("app.services.destination_discovery") if "get_logger" in globals() else logging.getLogger(__name__)

CATEGORY_MAP: dict[str, DestinationCategory] = {
    "heritage": DestinationCategory.HERITAGE,
    "temple": DestinationCategory.SPIRITUAL_CULTURAL,
    "spiritual_cultural": DestinationCategory.SPIRITUAL_CULTURAL,
    "nature": DestinationCategory.NATURE,
    "waterfall": DestinationCategory.WATERFALL,
    "beach": DestinationCategory.BEACH,
    "architecture": DestinationCategory.ARCHITECTURE,
    "hill_station": DestinationCategory.HILL_STATION,
    "viewpoint": DestinationCategory.VIEWPOINT,
    "wildlife": DestinationCategory.WILDLIFE,
    "food_culture": DestinationCategory.FOOD_CULTURE,
    "adventure": DestinationCategory.ADVENTURE,
    "museum": DestinationCategory.MUSEUM,
    "town_city": DestinationCategory.TOWN_CITY,
}


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class DestinationDiscoveryService:
    """Core aggregation and discovery service."""

    def __init__(self, providers: list[DiscoveryProvider] | None = None) -> None:
        self.providers: list[DiscoveryProvider] = providers or [
            OfficialTourismProvider(),
            ASIProvider(),
            DistrictGazetteerProvider(),
            OSMProvider(),
        ]

    def discover_destinations(
        self,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float = 60.0,
        district: str | None = None,
        categories: Sequence[str] | None = None,
        offbeat_only: bool = False,
        min_offbeat_score: float = 0.0,
        max_entry_fee_inr: float | None = None,
        limit: int = 30,
    ) -> list[DiscoveredDestination]:
        """Query all providers, deduplicate by distance, and rank."""
        raw_candidates: list[DiscoveredDestination] = []

        for provider in self.providers:
            try:
                results = provider.search(
                    latitude=latitude,
                    longitude=longitude,
                    radius_km=radius_km,
                    district=district,
                    categories=categories,
                    offbeat_only=offbeat_only,
                    limit=limit,
                )
                raw_candidates.extend(results)
            except Exception as exc:
                logger.warning("Provider %s error during search: %s", provider.get_source_name(), exc)

        # Deduplicate candidates within 300 meters
        deduped: list[DiscoveredDestination] = []
        for cand in raw_candidates:
            matched_idx = -1
            for idx, existing in enumerate(deduped):
                dist_m = _haversine_meters(
                    cand.latitude, cand.longitude, existing.latitude, existing.longitude
                )
                if dist_m <= 300.0:
                    matched_idx = idx
                    break

            if matched_idx >= 0:
                # Merge: prefer VERIFIED status over unverified/community
                existing = deduped[matched_idx]
                if (
                    cand.verification_status == VerificationStatus.VERIFIED
                    and existing.verification_status != VerificationStatus.VERIFIED
                ):
                    deduped[matched_idx] = cand
            else:
                deduped.append(cand)

        # Apply filtering
        filtered: list[DiscoveredDestination] = []
        for d in deduped:
            if offbeat_only and not d.is_offbeat:
                continue
            if d.offbeat_score < min_offbeat_score:
                continue
            if max_entry_fee_inr is not None:
                fee = d.entry_fee_min_inr or 0.0
                if fee > max_entry_fee_inr:
                    continue
            filtered.append(d)

        # Sort: offbeat preference, confidence score, name
        filtered.sort(
            key=lambda x: (
                x.offbeat_score if offbeat_only else -x.confidence_score,
                x.confidence_score,
            ),
            reverse=True,
        )

        # Auto-enrich with verified authentic photography
        img_svc = get_destination_image_service()
        for cand in filtered:
            if not cand.image_url:
                meta = img_svc.get_verified_media_for_id(cand.id)
                if meta and meta.image_url:
                    cand.image_url = meta.image_url

        return filtered[:limit]

    def to_destination_read(self, discovered: DiscoveredDestination) -> DestinationRead:
        """Convert a discovered record to a standard DestinationRead schema."""
        cat = CATEGORY_MAP.get(discovered.category.lower(), DestinationCategory.OTHER)
        img_svc = get_destination_image_service()
        meta = img_svc.get_verified_media_for_id(discovered.id)
        effective_image_url = discovered.image_url or (meta.image_url if meta else None)
        media_list = [meta.to_destination_media(discovered.name_en)] if meta and meta.image_url else []

        return DestinationRead(
            id=discovered.id,
            slug=discovered.slug,
            district_code=discovered.district_code,
            category=cat,
            coordinates=Coordinates(lat=discovered.latitude, lon=discovered.longitude),
            district=DistrictSummary(
                code=discovered.district_code,
                name_en=discovered.district,
                name_kn=discovered.district,
            ),
            access_status=AccessStatus.OPEN_REPORTED,
            verification_status=DestVerificationStatus.SOURCE_CHECKED,
            content_status=ContentStatus.PUBLISHED,
            is_offbeat=discovered.is_offbeat,
            estimated_visit_minutes=int(discovered.ideal_duration_hours * 60),
            entry_fee_min_inr=discovered.entry_fee_min_inr,
            entry_fee_max_inr=discovered.entry_fee_max_inr,
            currency_code="INR",
            active=True,
            primary_image_url=effective_image_url,
            media=media_list,
            translations=[
                DestinationTranslationRead(
                    language_code=LanguageCode.EN,
                    name=discovered.name_en,
                    summary=discovered.description_en[:150],
                    description=discovered.description_en,
                    translation_status=TranslationStatus.HUMAN_REVIEWED,
                ),
                DestinationTranslationRead(
                    language_code=LanguageCode.KN,
                    name=discovered.name_kn,
                    summary=(discovered.description_kn or discovered.name_kn)[:150],
                    description=discovered.description_kn or discovered.name_kn,
                    translation_status=TranslationStatus.HUMAN_REVIEWED,
                ),
            ],
            sources=[
                DestinationSourceRead(
                    source_name=discovered.provenance_source.value,
                    source_url=discovered.source_url,
                    source_type=SourceType.GOVERNMENT_OFFICIAL,
                    claim_scope="heritage_and_tariffs",
                )
            ],
        )

    def to_recommended_destination(self, discovered: DiscoveredDestination, order_index: int = 1) -> RecommendedDestination:
        """Convert a discovered record to a RecommendedDestination schema."""
        img_svc = get_destination_image_service()
        meta = img_svc.get_verified_media_for_id(discovered.id)
        effective_image_url = discovered.image_url or (meta.image_url if meta else None)

        return RecommendedDestination(
            id=discovered.id,
            slug=discovered.slug,
            name=discovered.name_en,
            summary=discovered.description_en[:200],
            category=discovered.category,
            district_code=discovered.district_code,
            district_name=discovered.district,
            coordinates=Coordinates(lat=discovered.latitude, lon=discovered.longitude),
            order=order_index,
            rationale=discovered.description_en,
            entry_fee_min_inr=discovered.entry_fee_min_inr,
            entry_fee_max_inr=discovered.entry_fee_max_inr,
            currency_code="INR",
            access_status=AccessStatus.OPEN_REPORTED,
            is_offbeat=discovered.is_offbeat,
            sources=[
                DestinationSourceRead(
                    source_name=discovered.provenance_source.value,
                    source_url=discovered.source_url,
                    source_type=SourceType.GOVERNMENT_OFFICIAL,
                    claim_scope="heritage_and_tariffs",
                )
            ],
            primary_image_url=effective_image_url,
        )


_global_discovery_service: DestinationDiscoveryService | None = None


def get_destination_discovery_service() -> DestinationDiscoveryService:
    """Singleton provider for DestinationDiscoveryService."""
    global _global_discovery_service
    if _global_discovery_service is None:
        _global_discovery_service = DestinationDiscoveryService()
    return _global_discovery_service
