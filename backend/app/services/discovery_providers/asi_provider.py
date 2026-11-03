"""Archaeological Survey of India (ASI) Protected Monuments Discovery Provider.

Provides authoritative data on Karnataka's ASI-protected monuments, UNESCO
World Heritage sites, national protected treasures, and architectural wonders.
"""

from __future__ import annotations

import math
from typing import Sequence

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


class ASIProvider(DiscoveryProvider):
    """ASI Protected Monuments Provider for Karnataka."""

    def __init__(self) -> None:
        self._monuments: list[DiscoveredDestination] = [
            DiscoveredDestination(
                id="asi-pattadakal-group",
                slug="pattadakal-group-of-monuments",
                name_en="Pattadakal Group of Monuments",
                name_kn="ಪಟ್ಟದಕಲ್ಲು ಸ್ಮಾರಕಗಳ ಸಮೂಹ",
                category="heritage",
                district="Bagalkote",
                district_code="KA-BAG",
                latitude=15.9493,
                longitude=75.8163,
                description_en="UNESCO World Heritage site representing the high point of 7th-8th century Badami Chalukyan eclectic architecture, blending Rekha-Nagara and Dravida Vimana temple styles on the banks of Malaprabha River.",
                description_kn="ಯುನೆಸ್ಕೋ ವಿಶ್ವ ಪರಂಪರೆಯ ತಾಣ. 7-8ನೇ ಶತಮಾನದ ಬಾದಾಮಿ ಚಾಲುಕ್ಯರ ನವಿರಾದ ವಾಸ್ತುಶಿಲ್ಪ, ನಕ್ಷತ್ರಾಕಾರದ ಮತ್ತು ದ್ರಾವಿಡ ದೇವಾಲಯಗಳ ಸಂಗಮ.",
                historical_significance_en="Coronation city ('Pattada Kisuvolal') of the Chalukya kings; Virupaksha Temple built in 740 CE by Queen Lokamahadevi to celebrate victory over Pallavas.",
                cultural_significance_en="A living university of medieval temple architecture; prototype for the magnificent Kailasa temple at Ellora.",
                best_time_to_visit="October to March",
                ideal_duration_hours=2.5,
                difficulty_level="easy",
                entry_fee_min_inr=40.0,
                entry_fee_max_inr=40.0,
                entry_fee_status="VERIFIED",
                timings_en="6:00 AM - 6:00 PM",
                opening_time="06:00",
                closing_time="18:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.ASI_ARCHAEOLOGICAL_SURVEY,
                source_id="ASI-N-KA-001",
                source_url="https://asi.nic.in/protected-monuments-in-karnataka/",
                last_verified_at="2026-10-15",
                offbeat_score=0.45,
                is_offbeat=False,
                confidence_score=1.0,
                tags=["unesco", "chalukya", "heritage", "sculpture", "malaprabha"],
            ),
            DiscoveredDestination(
                id="asi-aihole-durga-complex",
                slug="aihole-durga-temple-complex",
                name_en="Aihole Cradle of Indian Temple Architecture",
                name_kn="ಐಹೊಳೆ ದೇವಾಲಯಗಳ ಸಂಕೀರ್ಣ (ಭಾರತೀಯ ವಾಸ್ತುಶಿಲ್ಪದ ತೊಟ್ಟಿಲು)",
                category="heritage",
                district="Bagalkote",
                district_code="KA-BAG",
                latitude=16.0197,
                longitude=75.8828,
                description_en="Historic open-air laboratory containing over 120 stone temples dating from 450 CE to 1200 CE, showcasing the earliest apsidal and shikhara experimental structures.",
                description_kn="120ಕ್ಕೂ ಹೆಚ್ಚು ಪ್ರಾಚೀನ ಶಿಲಾ ದೇವಾಲಯಗಳ ತಾಣ. ಭಾರತೀಯ ಹಿಂದೂ ವಾಸ್ತುಶಿಲ್ಪದ ತೊಟ್ಟಿಲು ಎಂದೇ ಪ್ರಸಿದ್ಧ.",
                historical_significance_en="Ancient capital of early Badami Chalukyas (Aryapura); famous Aihole Inscription composed by court poet Ravikirti in 634 CE praising Pulakeshin II.",
                cultural_significance_en="Seminal foundation where master artisans evolved stone structural temple design in South India.",
                best_time_to_visit="October to February",
                ideal_duration_hours=3.0,
                difficulty_level="easy",
                entry_fee_min_inr=25.0,
                entry_fee_max_inr=25.0,
                entry_fee_status="VERIFIED",
                timings_en="6:00 AM - 6:00 PM",
                opening_time="06:00",
                closing_time="18:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.ASI_ARCHAEOLOGICAL_SURVEY,
                source_id="ASI-N-KA-002",
                source_url="https://asi.nic.in/protected-monuments-in-karnataka/",
                last_verified_at="2026-10-15",
                offbeat_score=0.55,
                is_offbeat=True,
                confidence_score=1.0,
                tags=["asi", "chalukya", "apsidal", "inscriptions", "offbeat"],
            ),
            DiscoveredDestination(
                id="asi-lakshmi-devi-doddagaddavalli",
                slug="lakshmi-devi-temple-doddagaddavalli",
                name_en="Lakshmi Devi Temple, Doddagaddavalli",
                name_kn="ಲಕ್ಷ್ಮೀ ದೇವಿ ದೇವಾಲಯ, ದೊಡ್ಡಗದ್ದವಳ್ಳಿ",
                category="temple",
                district="Hassan",
                district_code="KA-HAS",
                latitude=13.0975,
                longitude=76.0028,
                description_en="Rare Chatushkuta (four-shrine) Hoysala temple constructed in 1114 CE inside a tranquil village coconut grove, predating Belur and Halebidu.",
                description_kn="ಹಾಸನದ ಬಳಿ 1114ರಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಅಪರೂಪದ ಚತುಷ್ಕೂಟ ಹೊಯ್ಸಳ ದೇವಾಲಯ. ಪ್ರಶಾಂತ ಗ್ರಾಮೀಣ ಪರಿಸರ.",
                historical_significance_en="Built by a merchant couple Kallahana Rahuta and Sahaja Devi during the reign of King Vishnuvardhana; one of the earliest preserved Hoysala structures.",
                cultural_significance_en="Unique quadrangle plan with dedicated shrines to Lakshmi, Shiva, Kali, and Vishnu.",
                best_time_to_visit="Year-round, especially morning light",
                ideal_duration_hours=1.5,
                difficulty_level="easy",
                entry_fee_min_inr=0.0,
                entry_fee_max_inr=0.0,
                entry_fee_status="FREE",
                timings_en="8:00 AM - 5:30 PM",
                opening_time="08:00",
                closing_time="17:30",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.ASI_ARCHAEOLOGICAL_SURVEY,
                source_id="ASI-N-KA-003",
                source_url="https://asi.nic.in/protected-monuments-in-karnataka/",
                last_verified_at="2026-10-15",
                offbeat_score=0.82,
                is_offbeat=True,
                confidence_score=0.98,
                tags=["hoysala", "offbeat_gem", "chatushkuta", "hidden_heritage"],
            ),
            DiscoveredDestination(
                id="asi-chitradurga-fort",
                slug="chitradurga-stone-fort",
                name_en="Chitradurga Kallina Kote (Seven-Ring Fort)",
                name_kn="ಚಿತ್ರದುರ್ಗದ ಕಲ್ಲಿನ ಕೋಟೆ (ಏಳು ಸುತ್ತಿನ ಕೋಟೆ)",
                category="heritage",
                district="Chitradurga",
                district_code="KA-CHI",
                latitude=14.2186,
                longitude=76.3986,
                description_en="Massive granite hill fortress spanning 1,500 acres with seven concentric circumvallate lines of ramparts, 19 gateways, 38 posterns, and ingenious rainwater harvesting tanks.",
                description_kn="ಬೃಹತ್ ಗ್ರಾನೈಟ್ ಬಂಡೆಗಳ ಏಳು ಸುತ್ತಿನ ಅದ್ಭುತ ಕೋಟೆ. ಒನಕೆ ಓಬವ್ವನ ಸಾಹಸಗಾಥೆ ನೆಲೆಸಿರುವ ಐತಿಹಾಸಿಕ ತಾಣ.",
                historical_significance_en="Constructed between the 10th and 18th centuries by Chalukyas, Hoysalas, and famously the Nayakas of Chitradurga; defended bravely by Onake Obavva against Hyder Ali's forces.",
                cultural_significance_en="An epitome of military stone fortifications in the Deccan plateau with active folk legends of warrior queen Obavva.",
                best_time_to_visit="October to March (cool mornings)",
                ideal_duration_hours=3.5,
                difficulty_level="moderate",
                entry_fee_min_inr=25.0,
                entry_fee_max_inr=25.0,
                entry_fee_status="VERIFIED",
                timings_en="6:00 AM - 5:30 PM",
                opening_time="06:00",
                closing_time="17:30",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.ASI_ARCHAEOLOGICAL_SURVEY,
                source_id="ASI-N-KA-004",
                source_url="https://asi.nic.in/protected-monuments-in-karnataka/",
                last_verified_at="2026-10-15",
                offbeat_score=0.38,
                is_offbeat=False,
                confidence_score=1.0,
                tags=["fort", "military_architecture", "nayakas", "obavva", "granite"],
            ),
            DiscoveredDestination(
                id="asi-mahmud-gawan-madrasa-bidar",
                slug="mahmud-gawan-madrasa-bidar",
                name_en="Mahmud Gawan Madrasa, Bidar",
                name_kn="ಮಹಮೂದ್ ಗವಾನ್ ಮದರಸಾ, ಬೀದರ್",
                category="heritage",
                district="Bidar",
                district_code="KA-BID",
                latitude=17.9133,
                longitude=77.5312,
                description_en="A monumental 1472 CE residential college built in Islamic Persian architectural style, adorned with glazed blue-and-yellow ceramic tilework and towering minarets.",
                description_kn="1472ರಲ್ಲಿ ನಿರ್ಮಿತವಾದ ಭವ್ಯ ಪರ್ಷಿಯನ್ ಶೈಲಿಯ ವಸತಿ ಶಿಕ್ಷಣ ಸಂಸ್ಥೆ. ಸುಂದರ ನೀಲಿ-ಹಳದಿ ಟೈಲ್ಸ್‌ಗಳು ಮತ್ತು ಮಿನಾರಗಳು.",
                historical_significance_en="Founded by Bahmani Prime Minister Khwaja Mahmud Gawan; once housed 3,000 precious handwritten manuscripts and hosted scholars across Asia.",
                cultural_significance_en="Prime testament to medieval Deccan Islamic scholarship, mathematics, and cosmopolitan trade connections.",
                best_time_to_visit="October to March",
                ideal_duration_hours=1.5,
                difficulty_level="easy",
                entry_fee_min_inr=25.0,
                entry_fee_max_inr=25.0,
                entry_fee_status="VERIFIED",
                timings_en="8:00 AM - 6:00 PM",
                opening_time="08:00",
                closing_time="18:00",
                verification_status=VerificationStatus.VERIFIED,
                provenance_source=ProvenanceSource.ASI_ARCHAEOLOGICAL_SURVEY,
                source_id="ASI-N-KA-005",
                source_url="https://asi.nic.in/protected-monuments-in-karnataka/",
                last_verified_at="2026-10-15",
                offbeat_score=0.74,
                is_offbeat=True,
                confidence_score=0.98,
                tags=["bahmani", "persian_architecture", "bidar", "heritage", "offbeat"],
            ),
        ]

    def get_source_name(self) -> ProvenanceSource:
        return ProvenanceSource.ASI_ARCHAEOLOGICAL_SURVEY

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

        for dest in self._monuments:
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

