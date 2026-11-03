"""Official Karnataka Tourism Discovery Provider.

Supplies official Department of Tourism & KSTDC verified attractions with
authoritative provenance, district gazetteer details, and official entry tariffs.
"""

from __future__ import annotations

import math
from collections.abc import Sequence

from app.services.discovery_providers.base import (
    DiscoveredDestination,
    DiscoveryProvider,
    ProvenanceSource,
    VerificationStatus,
)


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


class OfficialTourismProvider(DiscoveryProvider):
    """Discovers verified destinations from the official Karnataka Tourism knowledge base."""

    def __init__(self) -> None:
        self._destinations: list[DiscoveredDestination] = [
            DiscoveredDestination(
                id="kstdc-mysore-palace",
                slug="mysore-palace-official",
                name_en="Mysore Palace (Amba Vilas)",
                name_kn="ಮೈಸೂರು ಅರಮನೆ (ಅಂಬಾ ವಿಲಾಸ)",
                category="heritage",
                district="Mysuru",
                district_code="KA-MYS",
                latitude=12.3051,
                longitude=76.6551,
                description_en="The official royal residence of the Wadiyar dynasty, renowned for Indo-Saracenic grandeur, stained glass ceilings, and festive illuminations.",
                description_kn="ಒಡೆಯರ್ ರಾಜಮನೆತನದ ಭವ್ಯ ಅಧಿಕೃತ ಅರಮನೆ. ಇಂಡೋ-ಸಾರ್ಸೆನಿಕ್ ಶೈಲಿಯ ಶಿಲ್ಪಕಲೆಗೆ ವಿಶ್ವವಿಖ್ಯಾತ.",
                historical_significance_en="Commissioned in 1897 and completed in 1912 after the wooden palace burnt down; designed by British architect Henry Irwin.",
                cultural_significance_en="Centerpiece of the world-famous Mysuru Dasara festival, carrying 400+ years of royal tradition.",
                best_time_to_visit="October to March (especially during Dasara)",
                ideal_duration_hours=2.5,
                difficulty_level="easy",
                entry_fee_min_inr=100.0,
                entry_fee_max_inr=100.0,
                entry_fee_status="VERIFIED",
                timings_en="10:00 AM - 5:30 PM (Illumination Sundays/Holidays 7:00 PM - 7:45 PM)",
                opening_time="10:00",
                closing_time="17:30",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM,
                source_id="KSTDC-MYS-001",
                source_url="https://www.karnatakatourism.org/destinations/mysuru-palace/",
                last_verified_at="2026-10-01",
                offbeat_score=0.05,
                is_offbeat=False,
                confidence_score=1.0,
                tags=["palace", "heritage", "wadaiyar", "dasara", "architecture"],
            ),
            DiscoveredDestination(
                id="kstdc-chamundi-hills",
                slug="chamundi-hills-official",
                name_en="Chamundi Hill & Sri Chamundeshwari Temple",
                name_kn="ಚಾಮುಂಡಿ ಬೆಟ್ಟ ಮತ್ತು ಶ್ರೀ ಚಾಮುಂಡೇಶ್ವರಿ ದೇವಾಲಯ",
                category="temple",
                district="Mysuru",
                district_code="KA-MYS",
                latitude=12.2753,
                longitude=76.6708,
                description_en="Sacred hill dedicated to Goddess Chamundeshwari, featuring a 17th-century Dravidian temple, monolithic Nandi statue, and sweeping views of Mysuru.",
                description_kn="ಮೈಸೂರು ನಗರದ ರಕ್ಷಕ ದೇವತೆ ಶ್ರೀ ಚಾಮುಂಡೇಶ್ವರಿ ದೇವಾಲಯವಿರುವ ಪವಿತ್ರ ಬೆಟ್ಟ ಮತ್ತು ಏಕಶಿಲಾ ನಂದಿ ವಿಗ್ರಹ.",
                historical_significance_en="Mentioned in ancient Skanda Purana; temple tower enhanced by Krishnaraja Wadiyar III in 1827.",
                cultural_significance_en="Presiding deity of the Royal House of Mysuru and the state festival of Nada Habba.",
                best_time_to_visit="Year-round, early morning or sunset",
                ideal_duration_hours=2.0,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=100.0,
                entry_fee_status="VERIFIED",
                timings_en="7:30 AM - 2:00 PM, 3:30 PM - 6:00 PM, 7:30 PM - 9:00 PM",
                opening_time="07:30",
                closing_time="21:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM,
                source_id="KSTDC-MYS-002",
                source_url="https://www.karnatakatourism.org/destinations/chamundi-hills/",
                last_verified_at="2026-10-01",
                offbeat_score=0.10,
                is_offbeat=False,
                confidence_score=1.0,
                tags=["temple", "hilltop", "panoramic", "nandi"],
            ),
            DiscoveredDestination(
                id="kstdc-jog-falls",
                slug="jog-falls-official",
                name_en="Jog Falls (Gersoppa)",
                name_kn="ಜೋಗ್ ಜಲಪಾತ (ಗೇರುಸೊಪ್ಪೆ)",
                category="nature",
                district="Shivamogga",
                district_code="KA-SHI",
                latitude=14.2289,
                longitude=74.8117,
                description_en="The second-highest plunge waterfall in India, where the Sharavathi River drops 253 meters in four distinct cascades: Raja, Roarer, Rocket, and Rani.",
                description_kn="ಭಾರತದ ಎರಡನೇ ಅತಿ ಎತ್ತರದ ಧುಮ್ಮಿಕ್ಕುವ ಜಲಪಾತ. ರಾಜ, ರೋರರ್, ರಾಕೆಟ್, ರಾಣಿ ಎಂಬ ನಾಲ್ಕು ಕವಲುಗಳಾಗಿ ಶರಾವತಿ ನದಿ ಧುಮುಕುತ್ತದೆ.",
                historical_significance_en="Associated with the historic Linganamakki and Mahatma Gandhi hydroelectric projects powering early Karnataka industrialization.",
                cultural_significance_en="Celebrated in timeless Kannada poetry by Kuvempu and Bendre.",
                best_time_to_visit="July to November (peak monsoon flow)",
                ideal_duration_hours=3.0,
                difficulty_level="easy",
                entry_fee_min_inr=50.0,
                entry_fee_max_inr=50.0,
                entry_fee_status="VERIFIED",
                timings_en="7:30 AM - 6:30 PM",
                opening_time="07:30",
                closing_time="18:30",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM,
                source_id="KSTDC-SHI-001",
                source_url="https://www.karnatakatourism.org/destinations/jog-falls/",
                last_verified_at="2026-10-01",
                offbeat_score=0.12,
                is_offbeat=False,
                confidence_score=1.0,
                tags=["waterfall", "nature", "monsoon", "western_ghats"],
            ),
            DiscoveredDestination(
                id="kstdc-gokarna-kudle",
                slug="kudle-beach-gokarna",
                name_en="Kudle Beach",
                name_kn="ಕುಡ್ಲೆ ಕಡಲತೀರ, ಗೋಕರ್ಣ",
                category="nature",
                district="Uttara Kannada",
                district_code="KA-UKN",
                latitude=14.5378,
                longitude=74.3164,
                description_en="Crescent-shaped serene beach nestled between hillocks south of Gokarna town, famed for dramatic Arabian Sea sunsets and beach shacks.",
                description_kn="ಬೆಟ್ಟಗಳ ನಡುವೆ ಅರ್ಧಚಂದ್ರಾಕಾರದ ಸುಂದರ ಕಡಲತೀರ. ಶಾಂತ ವಾತಾವರಣ ಮತ್ತು ಸೂರ್ಯಾಸ್ತಕ್ಕೆ ಹೆಸರುವಾಸಿ.",
                historical_significance_en="Ancient coastal landing haven on the Konkan-Canara maritime trade route.",
                cultural_significance_en="Coastal sanctuary popular with pilgrims after performing rituals at Mahabaleshwara temple.",
                best_time_to_visit="October to March",
                ideal_duration_hours=2.5,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="Open 24 hours (Daylight recommended)",
                opening_time="06:00",
                closing_time="19:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM,
                source_id="KSTDC-UKN-002",
                source_url="https://www.karnatakatourism.org/destinations/gokarna/",
                last_verified_at="2026-10-01",
                offbeat_score=0.25,
                is_offbeat=False,
                confidence_score=0.95,
                tags=["beach", "sunset", "coastal", "arabian_sea"],
            ),
            DiscoveredDestination(
                id="kstdc-talakaveri",
                slug="talakaveri-kodagu",
                name_en="Talakaveri & Brahmagiri Hills",
                name_kn="ತಲಕಾವೇರಿ ಮತ್ತು ಬ್ರಹ್ಮಗಿರಿ ಬೆಟ್ಟಗಳು",
                category="nature",
                district="Kodagu",
                district_code="KA-KOD",
                latitude=12.3857,
                longitude=75.4939,
                description_en="The sacred origin point of the holy River Kaveri on the slopes of the Brahmagiri hill range at 1,276 meters altitude.",
                description_kn="ಬ್ರಹ್ಮಗಿರಿ ಬೆಟ್ಟದ ತಪ್ಪಲಿನಲ್ಲಿರುವ ಕಾವೇರಿ ನದಿಯ ಪವಿತ್ರ ಉಗಮ ಸ್ಥಾನ.",
                historical_significance_en="Revered across South India for centuries as Dakshina Ganga.",
                cultural_significance_en="Hosts the annual Tula Sankramana (Kaveri Theerthodbhava) when holy water emerges from the sacred kundike.",
                best_time_to_visit="September to March",
                ideal_duration_hours=2.0,
                difficulty_level="moderate",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="6:00 AM - 6:00 PM",
                opening_time="06:00",
                closing_time="18:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM,
                source_id="KSTDC-KOD-001",
                source_url="https://www.karnatakatourism.org/destinations/talacauvery/",
                last_verified_at="2026-10-01",
                offbeat_score=0.30,
                is_offbeat=False,
                confidence_score=0.98,
                tags=["pilgrimage", "river_origin", "hills", "brahmagiri"],
            ),
        ]

    def get_source_name(self) -> ProvenanceSource:
        return ProvenanceSource.OFFICIAL_KARNATAKA_TOURISM

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

        for dest in self._destinations:
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

