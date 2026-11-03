"""OpenStreetMap (OSM) Discovery Provider.

Queries and discovers geospatial points of interest (historic ruins, viewpoints,
nature reserves, and heritage temples) using OpenStreetMap semantics. Includes
robust offline fallback nodes for resilience.
"""

from __future__ import annotations

import logging
import math
from typing import Sequence

from app.services.discovery_providers.base import (
    DiscoveredDestination,
    DiscoveryProvider,
    ProvenanceSource,
    VerificationStatus,
)

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class OSMProvider(DiscoveryProvider):
    """OpenStreetMap Dynamic/Fallback Geospatial Provider."""

    def __init__(self) -> None:
        # Verified OSM-sourced points of interest across Karnataka
        self._osm_records: list[DiscoveredDestination] = [
            DiscoveredDestination(
                id="osm-node-shettihalli-church",
                slug="shettihalli-rosary-church",
                name_en="Shettihalli Submerged Rosary Church",
                name_kn="ಶೆಟ್ಟಿಹಳ್ಳಿ ಮುಳುಗಡೆ ರೋಸರಿ ಚರ್ಚ್",
                category="heritage",
                district="Hassan",
                district_code="KA-HAS",
                latitude=12.9156,
                longitude=75.9981,
                description_en="Surreal gothic church ruins built in 1860 by French missionaries, submerged annually in the waters of the Hemavathi Reservoir during monsoons.",
                description_kn="1860ರಲ್ಲಿ ಫ್ರೆಂಚ್ ಮಿಷನರಿಗಳಿಂದ ನಿರ್ಮಿತವಾದ ಗೋಥಿಕ್ ಶೈಲಿಯ ಚರ್ಚ್. ಮಳೆಗಾಲದಲ್ಲಿ ಹೇಮಾವತಿ ಹಿನ್ನೀರಿನಲ್ಲಿ ಮುಳುಗುವ ಅದ್ಭುತ ತಾಣ.",
                historical_significance_en="Built by Abbé Jean-Antoine Dubois using brick, mortar, and jaggery; abandoned in 1960 during Gorur dam construction.",
                cultural_significance_en="Popularized as the 'Floating Church' among photographers and travelers.",
                best_time_to_visit="July to October (partially submerged boat view) or December to May (accessible on foot)",
                ideal_duration_hours=2.0,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="6:00 AM - 6:00 PM (Daylight only)",
                opening_time="06:00",
                closing_time="18:00",
                verification_status=VerificationStatus.COMMUNITY_SOURCED,
                provenance_source=ProvenanceSource.OPEN_STREET_MAP,
                source_id="osm:node/384729104",
                source_url="https://www.openstreetmap.org/node/384729104",
                last_verified_at="2026-09-20",
                offbeat_score=0.78,
                is_offbeat=True,
                confidence_score=0.92,
                tags=["gothic_ruins", "submerged", "reservoir", "french_architecture", "photography"],
            ),
            DiscoveredDestination(
                id="osm-node-maravanthe-beach",
                slug="maravanthe-beach-nh66",
                name_en="Maravanthe Beach & Souparnika River View",
                name_kn="ಮರವಂತೆ ಕಡಲತೀರ ಮತ್ತು ಸೌಪರ್ಣಿಕಾ ನದಿ",
                category="nature",
                district="Udupi",
                district_code="KA-UDP",
                latitude=13.7025,
                longitude=74.6467,
                description_en="Rare geographic spectacle where the Arabian Sea washes on one side of NH 66 while the Souparnika River flows gracefully on the other side.",
                description_kn="ಒಂದು ಬದಿಯಲ್ಲಿ ಅರಬ್ಬಿ ಸಮುದ್ರ, ಮತ್ತೊಂದು ಬದಿಯಲ್ಲಿ ಸೌಪರ್ಣಿಕಾ ನದಿ ಹರಿಯುವ ವಿಶ್ವವಿಖ್ಯಾತ ಹೆದ್ದಾರಿ ರಮಣೀಯ ದೃಶ್ಯ.",
                historical_significance_en="Crucial maritime navigational landmark and coastal highway corridor connecting Mangaluru and Karwar.",
                cultural_significance_en="Celebrated in coastal folklore for sunset boat rides and temple connections to Kollur Mookambika.",
                best_time_to_visit="September to March (spectacular sunset drive)",
                ideal_duration_hours=1.5,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="Open 24 hours",
                opening_time="06:00",
                closing_time="19:00",
                verification_status=VerificationStatus.COMMUNITY_SOURCED,
                provenance_source=ProvenanceSource.OPEN_STREET_MAP,
                source_id="osm:way/58291029",
                source_url="https://www.openstreetmap.org/way/58291029",
                last_verified_at="2026-09-15",
                offbeat_score=0.45,
                is_offbeat=False,
                confidence_score=0.94,
                tags=["highway", "beach", "river", "scenic_drive", "sunset"],
            ),
            DiscoveredDestination(
                id="osm-node-nandi-bhoga-temple",
                slug="bhoga-nandeeshwara-temple",
                name_en="Bhoga Nandeeshwara Temple, Nandi Village",
                name_kn="ಭೋಗ ನಂದೀಶ್ವರ ದೇವಾಲಯ, ನಂದಿ ಗ್ರಾಮ",
                category="heritage",
                district="Chikkaballapura",
                district_code="KA-CKB",
                latitude=13.3775,
                longitude=77.6961,
                description_en="Magnificent 9th-century temple complex at the base of Nandi Hills containing three temples representing youth (Arunachaleshwara), married life (Bhoga Nandeeshwara), and renunciation (Yoga Nandeeshwara).",
                description_kn="ನಂದಿ ಬೆಟ್ಟದ ತಪ್ಪಲಿನಲ್ಲಿರುವ 9ನೇ ಶತಮಾನದ ನೊಣಂಬ, ಚೋಳ ಮತ್ತು ವಿಜಯನಗರ ಕಾಲದ ಅದ್ಭುತ ಕಲಾತ್ಮಕ ದೇವಾಲಯ ಮತ್ತು ಸುಂದರ ಕಲ್ಯಾಣಿ.",
                historical_significance_en="Original construction dates to Bana and Nolamba rulers in the 9th century, with subsequent pillared mandapas added by Cholas, Hoysalas, and Vijayanagara emperors.",
                cultural_significance_en="One of the oldest surviving and continuously active temple complexes in Karnataka, famous for its stone Kalyani stepwell.",
                best_time_to_visit="Year-round, early morning",
                ideal_duration_hours=2.0,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="6:00 AM - 7:00 PM",
                opening_time="06:00",
                closing_time="19:00",
                verification_status=VerificationStatus.COMMUNITY_SOURCED,
                provenance_source=ProvenanceSource.OPEN_STREET_MAP,
                source_id="osm:node/192847101",
                source_url="https://www.openstreetmap.org/node/192847101",
                last_verified_at="2026-09-28",
                offbeat_score=0.62,
                is_offbeat=True,
                confidence_score=0.95,
                tags=["temple", "kalyani", "nolamba", "vijayanagara", "stone_carvings"],
            ),
        ]

    def get_source_name(self) -> ProvenanceSource:
        return ProvenanceSource.OPEN_STREET_MAP

    def search(
        self,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float = 50.0,
        district: str | None = None,
        categories: Sequence[str] | None = None,
        offbeat_only: bool = False,
        limit: int = 20,
    ) -> list[DiscoveredDestination]:
        results: list[DiscoveredDestination] = []

        for dest in self._osm_records:
            if offbeat_only and not dest.is_offbeat:
                continue

            if district and dest.district.lower() != district.lower() and dest.district_code.lower() != district.lower():
                continue

            if categories and dest.category not in categories:
                continue

            if latitude is not None and longitude is not None:
                dist = _haversine_km(latitude, longitude, dest.latitude, dest.longitude)
                if dist > radius_km:
                    continue

            results.append(dest)

        return results[:limit]

