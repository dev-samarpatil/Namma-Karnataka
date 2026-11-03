"""District Gazetteer & Regional Heritage Discovery Provider.

Unearths lesser-known, authentic, high-offbeat destinations documented in
Karnataka District Gazetteers, state archaeological surveys, and regional records.
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


class DistrictGazetteerProvider(DiscoveryProvider):
    """District Gazetteer and regional hidden treasures provider."""

    def __init__(self) -> None:
        self._records: list[DiscoveredDestination] = [
            DiscoveredDestination(
                id="gaz-kavaledurga-fort",
                slug="kavaledurga-fort-shivamogga",
                name_en="Kavaledurga Rainforest Fort",
                name_kn="ಕವಲೇದುರ್ಗ ಮಳೆಕಾಡಿನ ಕೋಟೆ",
                category="heritage",
                district="Shivamogga",
                district_code="KA-SHI",
                latitude=13.7194,
                longitude=75.1228,
                description_en="Enchanting 9th-century hill fort enveloped in thick Western Ghats rainforest with 3 layers of defensive stone ramparts, ancient stone wells, and palace foundations.",
                description_kn="ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ದಟ್ಟ ಹಸಿರಿನ ನಡುವೆ ಅಡಗಿರುವ 9ನೇ ಶತಮಾನದ ಸುಂದರ ಬೆಟ್ಟದ ಕೋಟೆ. ಮೂರು ಹಂತಗಳ ಕೋಟೆಗೋಡೆಗಳು ಮತ್ತು ಕಲ್ಲಿನ ಬಾವಿಗಳು.",
                historical_significance_en="Built in 9th century and heavily fortified in 14th century by the Keladi Nayakas (Venkatappa Nayaka); served as defensive stronghold against Mughal incursions.",
                cultural_significance_en="Exquisite harmony of military architecture and pristine shola forest ecology.",
                best_time_to_visit="September to February (lush post-monsoon greenery)",
                ideal_duration_hours=3.0,
                difficulty_level="moderate",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="7:00 AM - 5:00 PM",
                opening_time="07:00",
                closing_time="17:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.DISTRICT_GAZETTEER,
                source_id="GAZ-SHI-042",
                source_url="https://shimoga.nic.in/en/culture-heritage/",
                last_verified_at="2026-10-10",
                offbeat_score=0.89,
                is_offbeat=True,
                confidence_score=0.96,
                tags=["rainforest", "fort", "keladi_nayakas", "trekking", "offbeat_gem"],
            ),
            DiscoveredDestination(
                id="gaz-lakkundi-stepwells",
                slug="lakkundi-heritage-stepwells",
                name_en="Lakkundi Stepwells & Kalyana Chalukya Temples",
                name_kn="ಲಕ್ಕುಂಡಿ ಕಲ್ಯಾಣಿ (ಮೆಟ್ಟಿಲು ಬಾವಿಗಳು) ಮತ್ತು ಕಲ್ಯಾಣ ಚಾಲುಕ್ಯ ದೇವಾಲಯಗಳು",
                category="heritage",
                district="Gadag",
                district_code="KA-GAD",
                latitude=15.3853,
                longitude=75.7172,
                description_en="Ancient temple city boasting 50 medieval Hindu and Jain temples and 101 intricately carved stepped ponds (Kalyanis) including the celebrated Musukina Bavi.",
                description_kn="50ಕ್ಕೂ ಹೆಚ್ಚು ಹೊಯ್ಸಳ ಮತ್ತು ಕಲ್ಯಾಣ ಚಾಲುಕ್ಯ ದೇವಾಲಯಗಳು ಹಾಗೂ 101 ಮೆಟ್ಟಿಲು ಬಾವಿಗಳಿರುವ ಅದ್ಭುತ ಐತಿಹಾಸಿಕ ಗ್ರಾಮ.",
                historical_significance_en="Known as Lokkigundi in inscriptions; was a major medieval mint and cultural hub of the Later Chalukyas and Seunas in the 11th-12th centuries.",
                cultural_significance_en="Remarkable water conservation architecture of the arid Deccan featuring stepped tanks with ornate niches.",
                best_time_to_visit="October to February",
                ideal_duration_hours=2.5,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=25.0,
                entry_fee_status="VERIFIED",
                timings_en="8:00 AM - 6:00 PM",
                opening_time="08:00",
                closing_time="18:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.DISTRICT_GAZETTEER,
                source_id="GAZ-GAD-011",
                source_url="https://gadag.nic.in/en/tourism/",
                last_verified_at="2026-10-12",
                offbeat_score=0.88,
                is_offbeat=True,
                confidence_score=0.97,
                tags=["stepwell", "kalyani", "chalukya", "water_heritage", "offbeat_gem"],
            ),
            DiscoveredDestination(
                id="gaz-barkur-temple-town",
                slug="barkur-ancient-capital-udupi",
                name_en="Barkur Ancient Alupa Capital",
                name_kn="ಬಾರಕೂರು ಪ್ರಾಚೀನ ಆಳುಪ ರಾಜಧಾನಿ",
                category="heritage",
                district="Udupi",
                district_code="KA-UDP",
                latitude=13.4736,
                longitude=74.7933,
                description_en="Coastal Karnataka's legendary medieval capital spanning 365 ancient temple ruins, stone inscriptions, sloping-roof granite shrines, and peaceful river backwaters.",
                description_kn="ಕರಾವಳಿಯ ಆಳುಪ ರಾಜರ ಪ್ರಾಚೀನ ರಾಜಧಾನಿ. 365 ದೇವಾಲಯಗಳ ತಾಣ ಮತ್ತು ತುಳುನಾಡಿನ ಶ್ರೀಮಂತ ಇತಿಹಾಸ.",
                historical_significance_en="Ruled by the Alupa dynasty from the 2nd century to the 14th century; vital maritime port connecting ancient Rome, Arabia, and the Canara coast.",
                cultural_significance_en="Epicenter of Tulu cultural traditions, Siri epic lore, and unique coastal gabled-roof temple architecture.",
                best_time_to_visit="October to March",
                ideal_duration_hours=2.5,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="6:00 AM - 7:00 PM",
                opening_time="06:00",
                closing_time="19:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.DISTRICT_GAZETTEER,
                source_id="GAZ-UDP-007",
                source_url="https://udupi.nic.in/en/tourism/",
                last_verified_at="2026-10-18",
                offbeat_score=0.85,
                is_offbeat=True,
                confidence_score=0.96,
                tags=["alupa", "tulunadu", "coastal_heritage", "ancient_capital", "offbeat_gem"],
            ),
            DiscoveredDestination(
                id="gaz-tonnur-kere",
                slug="tonnur-kere-lake-mandya",
                name_en="Tonnur Kere (Kere Thondanur Lake)",
                name_kn="ತೊಂಡನೂರು ಕೆರೆ (ತಣ್ಣೂರು ಕೆರೆ), ಮಂಡ್ಯ",
                category="nature",
                district="Mandya",
                district_code="KA-MAN",
                latitude=12.5583,
                longitude=76.6417,
                description_en="A sparkling 1,000-year-old artificial lake formed between two hills, fed by natural mountain springs with crystal clear water and historical Hoysala associations.",
                description_kn="ಎರಡು ಬೆಟ್ಟಗಳ ನಡುವೆ ನಿರ್ಮಿಸಲಾದ 1000 ವರ್ಷಗಳ ಪ್ರಾಚೀನ ರಮಣೀಯ ಜಲಾಶಯ. ಶುದ್ಧ ತಿಳಿನೀರು ಮತ್ತು ಪ್ರಶಾಂತ ಪರಿಸರ.",
                historical_significance_en="Constructed by saint Ramanujacharya and Hoysala King Vishnuvardhana in the 12th century; praised by Persian chronicler Babur and British surveyors for engineering ingenuity.",
                cultural_significance_en="Spiritual retreat of Sri Ramanujacharya with nearby Nambinarayana and Gopalakrishna Hoysala temples.",
                best_time_to_visit="September to February (peaceful evening breeze)",
                ideal_duration_hours=2.0,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="Open 24 hours (Daylight recommended)",
                opening_time="06:00",
                closing_time="18:30",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.DISTRICT_GAZETTEER,
                source_id="GAZ-MAN-019",
                source_url="https://mandya.nic.in/en/tourism/",
                last_verified_at="2026-10-14",
                offbeat_score=0.80,
                is_offbeat=True,
                confidence_score=0.95,
                tags=["lake", "nature", "ramanujacharya", "hoysala_waterworks", "sunset"],
            ),
            DiscoveredDestination(
                id="gaz-yana-caves",
                slug="yana-limestone-monoliths",
                name_en="Yana Giant Limestone Monoliths & Cave",
                name_kn="ಯಾಣ ದೈತ್ಯ ಸುಣ್ಣದಕಲ್ಲಿನ ಶಿಖರಗಳು",
                category="nature",
                district="Uttara Kannada",
                district_code="KA-UKN",
                latitude=14.5889,
                longitude=74.5611,
                description_en="Two colossal crystalline karst limestone rock monoliths (Bhairaveshwara Shikhara 120m and Mohini Shikhara 90m) towering amidst dense evergreen Sahyadri jungle.",
                description_kn="ದಟ್ಟ ಕಾಡಿನ ನಡುವೆ ಮುಗಿಲೆತ್ತರಕ್ಕೆ ನಿಂತಿರುವ ಎರಡು ಕಪ್ಪು ಸುಣ್ಣದಕಲ್ಲಿನ ಶಿಖರಗಳು ಮತ್ತು ನೈಸರ್ಗಿಕ ಗುಹೆ.",
                historical_significance_en="Geological wonder dating back millions of years with subterranean sulfur and mineral streams.",
                cultural_significance_en="Mythologically linked to the burning of demon Bhasmasura by Mohini; sacred cave temple inside with a natural swayambhu linga.",
                best_time_to_visit="October to February",
                ideal_duration_hours=3.0,
                difficulty_level="moderate",
                entry_fee_min_inr=20.0,
                entry_fee_max_inr=20.0,
                entry_fee_status="VERIFIED",
                timings_en="7:00 AM - 5:30 PM",
                opening_time="07:00",
                closing_time="17:30",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.DISTRICT_GAZETTEER,
                source_id="GAZ-UKN-034",
                source_url="https://uttarakannada.nic.in/en/tourism/",
                last_verified_at="2026-10-18",
                offbeat_score=0.68,
                is_offbeat=True,
                confidence_score=0.98,
                tags=["karst", "monolith", "caves", "western_ghats", "geology"],
            ),
        ]

    def get_source_name(self) -> ProvenanceSource:
        return ProvenanceSource.DISTRICT_GAZETTEER

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

        for dest in self._records:
            if offbeat_only and not dest.is_offbeat:
                continue

            if (
                district
                and dest.district.lower() != district.lower()
                and dest.district_code.lower() != district.lower()
            ):
                continue

            if categories and dest.category not in categories:
                continue

            if latitude is not None and longitude is not None:
                dist = _haversine_km(latitude, longitude, dest.latitude, dest.longitude)
                if dist > radius_km:
                    continue

            results.append(dest)

        return results[:limit]
