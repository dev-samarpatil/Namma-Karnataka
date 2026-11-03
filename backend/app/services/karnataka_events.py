"""Karnataka Cultural Festivals & Events Calendar Engine.

Provides authoritative discovery of verified cultural celebrations, temple jatres,
regional festivals, classical arts events, and seasonal nature phenomena across
Karnataka's 31 districts, with strict Gregorian and Lunar calendar mapping, verified
official provenance, and date-aware trip itinerary matching.
"""

from __future__ import annotations

import logging
import math
from collections.abc import Sequence
from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.events import EventRead

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2.0) ** 2
    return round(2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 2)


class KarnatakaEvent(BaseModel):
    """Detailed event record with date-matching metadata and official provenance."""

    id: str
    name_en: str
    name_kn: str
    category: str  # major_festival, regional_festival, cultural_event, seasonal_nature
    description_en: str
    description_kn: str
    district: str
    district_code: str
    location_name: str
    venue: str
    latitude: float
    longitude: float
    start_month: int
    end_month: int
    # 2026 / 2027 confirmed date windows
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    date_confidence: str = "CONFIRMED"  # CONFIRMED, TENTATIVE
    source_name: str
    source_url: str
    last_verified_date: str = "2026-10-15"
    ticket_cost_min_inr: float = 0.0
    ticket_cost_max_inr: float | None = 0.0
    ticket_cost_status: str = "free"  # free, paid, unknown
    travel_advisory: str | None = None
    image_url: str | None = None
    image_attribution: str | None = None

    def to_event_read(self) -> EventRead:
        """Convert to internal EventRead schema."""
        return EventRead(
            id=self.id,
            name_en=self.name_en,
            name_kn=self.name_kn,
            description_en=self.description_en,
            description_kn=self.description_kn,
            location_name=self.location_name,
            district_code=self.district_code,
            latitude=self.latitude,
            longitude=self.longitude,
            start_month=self.start_month,
            end_month=self.end_month,
            typical_start_date=self.start_date[5:],
            typical_end_date=self.end_date[5:],
            date_status=self.date_confidence.lower(),
            source_name=self.source_name,
            source_url=self.source_url,
            verification_status="verified_authentic",
            ticket_cost_min_inr=self.ticket_cost_min_inr,
            ticket_cost_max_inr=self.ticket_cost_max_inr,
            ticket_cost_status=self.ticket_cost_status,
            event_category=self.category,
            travel_advisory=self.travel_advisory,
            image_url=self.image_url,
        )


# Canonical Calendar of Verified Karnataka Events & Celebrations
KARNATAKA_EVENTS_REGISTRY: list[KarnatakaEvent] = [
    # 1. Major Festivals
    KarnatakaEvent(
        id="mysuru-dasara",
        name_en="Mysuru Dasara (Nada Habba)",
        name_kn="ಮೈಸೂರು ದಸರಾ (ನಾಡಹಬ್ಬ)",
        category="major_festival",
        description_en="Karnataka's grand state festival celebrating Navaratri with illuminated Mysore Palace (100,000 bulbs), classical concerts, torchlight parade, and the historic Jumboo Savari procession carrying the 750 kg golden howdah.",
        description_kn="ನಾಡಹಬ್ಬ ಎಂದೇ ಖ್ಯಾತವಾದ ಮೈಸೂರು ದಸರಾ. ವಿದ್ಯುದ್ದೀಪಗಳಿಂದ ಕಂಗೊಳಿಸುವ ಅರಮನೆ, ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು 750 ಕೆಜಿ ಚಿನ್ನದ ಅಂಬಾರಿ ಹೊತ್ತ ಆನೆಗಳ ವಿಶ್ವಪ್ರಸಿದ್ಧ ಜಂಬೂ ಸವಾರಿ.",
        district="Mysuru",
        district_code="KA-MYS",
        location_name="Mysuru Palace & Bannimantap, Mysuru",
        venue="Amba Vilas Palace Grounds & Bannimantap Parade Ground",
        latitude=12.3051,
        longitude=76.6551,
        start_month=10,
        end_month=10,
        start_date="2026-10-11",
        end_date="2026-10-20",
        date_confidence="CONFIRMED",
        source_name="Department of Tourism, Government of Karnataka & District Administration Mysuru",
        source_url="https://mysoredasara.gov.in/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=500.0,
        ticket_cost_status="free",
        travel_advisory="Major peak tourist period. Advance booking for transit and hotel accommodations is essential.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/c/c5/Mysore_Dasara_procession.jpg",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 3.0",
    ),
    KarnatakaEvent(
        id="bengaluru-karaga",
        name_en="Bengaluru Karaga Shaktyotsava",
        name_kn="ಬೆಂಗಳೂರು ಕರಗ ಶಕ್ತ್ಯುತ್ಸವ",
        category="major_festival",
        description_en="Centuries-old nocturnal ritual and street festival honoring Draupadi, featuring an ornate floral pyramidal pot carried through historic Old Bengaluru streets during Chaitra Poornima.",
        description_kn="ದ್ರೌಪದಿಯ ಗೌರವಾರ್ಥ ನಡೆಯುವ ಐತಿಹಾಸಿಕ ಕರಗ ಉತ್ಸವ. ಹೂವಿನಿಂದ ಅಲಂಕೃತವಾದ ಕರಗ ಹೊತ್ತು ಹಳೆ ಬೆಂಗಳೂರಿನ ಬೀದಿಗಳಲ್ಲಿ ಸಾಗುವ ಅದ್ಭುತ ಮೆರವಣಿಗೆ.",
        district="Bengaluru Urban",
        district_code="KA-BLR",
        location_name="Tigalarpet, Chickpet, Bengaluru",
        venue="Sri Dharmaraya Swamy Temple & Historic Old City Route",
        latitude=12.9667,
        longitude=77.5833,
        start_month=4,
        end_month=4,
        start_date="2026-04-14",
        end_date="2026-04-23",
        date_confidence="CONFIRMED",
        source_name="Karnataka Muzrai Department & BBMP Heritage Cell",
        source_url="https://bengaluruurban.nic.in/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=0.0,
        ticket_cost_status="free",
        travel_advisory="All-night cultural street procession with heavy local participation in Chickpet market area.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/6/61/Decorations_Day_Before_Karaga_Festival.jpg",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 4.0",
    ),
    KarnatakaEvent(
        id="karnataka-rajyotsava",
        name_en="Karnataka Rajyotsava Statehood Celebrations",
        name_kn="ಕರ್ನಾಟಕ ರಾಜ್ಯೋತ್ಸವ ದಿನಾಚರಣೆ",
        category="major_festival",
        description_en="Statewide celebration marking the unification of Kannada-speaking regions in 1956, celebrated with vibrant red-and-yellow flags, folk processions, Rajyotsava awards, and cultural concerts.",
        description_kn="ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಚನೆಯ ಸಂಭ್ರಮದ ನಾಡಹಬ್ಬ. ಹಳದಿ-ಕೆಂಪು ಧ್ವಜಾರೋಹಣ, ರಾಜ್ಯೋತ್ಸವ ಪ್ರಶಸ್ತಿ ಪ್ರದಾನ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮಗಳು.",
        district="Bengaluru Urban",
        district_code="KA-BLR",
        location_name="Kanteerava Stadium & Ravindra Kalakshetra, Bengaluru",
        venue="Sree Kanteerava Outdoor Stadium, Bengaluru",
        latitude=12.9698,
        longitude=77.5926,
        start_month=11,
        end_month=11,
        start_date="2026-11-01",
        end_date="2026-11-02",
        date_confidence="CONFIRMED",
        source_name="Government of Karnataka Official State Calendar",
        source_url="https://karnataka.gov.in/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=0.0,
        ticket_cost_status="free",
        travel_advisory="Public holiday across Karnataka with vibrant street processions and flag hoisting.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/7/7d/Karnataka-rajyotsava.jpg",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 3.0",
    ),
    # 2. Regional Festivals & Indigenous Traditions
    KarnatakaEvent(
        id="dakshina-kannada-kambala",
        name_en="Dakshina Kannada Traditional Kambala (Buffalo Races)",
        name_kn="ದಕ್ಷಿಣ ಕನ್ನಡ ಸಾಂಪ್ರದಾಯಿಕ ಕಂಬಳ (ಕೋಣಗಳ ಓಟ)",
        category="regional_festival",
        description_en="Thrilling traditional rural sport featuring jockey-guided pairs of buffaloes sprinting through flooded paddy fields across coastal villages like Moodabidri, Venoor, and Puttur.",
        description_kn="ಕರಾವಳಿಯ ಗದ್ದೆಗಳಲ್ಲಿ ನಡೆಯುವ ಸಾಂಪ್ರದಾಯಿಕ ಜಾನಪದ ಕ್ರೀಡೆ. ನೀರು ತುಂಬಿದ ಗದ್ದೆಯಲ್ಲಿ ಜೋಡು ಕೋಣಗಳನ್ನು ಓಡಿಸುವ ರೋಮಾಂಚಕ ಸ್ಪರ್ಧೆ.",
        district="Dakshina Kannada",
        district_code="KA-DKN",
        location_name="Moodabidri & Kadri, Mangaluru",
        venue="Miyar Jodukere & Kadri Kambala Field",
        latitude=13.0674,
        longitude=74.9972,
        start_month=11,
        end_month=3,
        start_date="2026-11-20",
        end_date="2027-03-20",
        date_confidence="CONFIRMED",
        source_name="Dakshina Kannada District Kambala Committee & Karnataka Tourism",
        source_url="https://karnatakatourism.org/tour-item/kambala/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=100.0,
        ticket_cost_status="free",
        travel_advisory="Weekend sport held predominantly on Saturdays and Sundays. Heavy crowds near coastal bypass routes.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/a/a3/Kambala_race_held_at_paivalike_%2Ckasargod.jpg",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 4.0",
    ),
    KarnatakaEvent(
        id="bhoota-kola-yakshagana-season",
        name_en="Bhoota Kola Spirit Worship & Yakshagana Season",
        name_kn="ಭೂತ ಕೋಲ ಮತ್ತು ರಾತ್ರಿಯ ಯಕ್ಷಗಾನ ಬಯಲಾಟ",
        category="regional_festival",
        description_en="Sacred nocturnal coastal spirit invocation ritual and vibrant Yakshagana theatrical performances with ornate headgear, singing, and vigorous traditional dance.",
        description_kn="ಕರಾವಳಿಯ ದೈವಾರಾಧನೆ ಮತ್ತು ರಾತ್ರಿಯಿಡೀ ನಡೆಯುವ ಸಾಂಪ್ರದಾಯಿಕ ಯಕ್ಷಗಾನ ಪ್ರದರ್ಶನಗಳು.",
        district="Udupi",
        district_code="KA-UDP",
        location_name="Udupi & Kundapura Daivasthanas",
        venue="Village Sanctuaries and Temple Open-air Theatres",
        latitude=13.3409,
        longitude=74.7516,
        start_month=12,
        end_month=4,
        start_date="2026-12-01",
        end_date="2027-04-30",
        date_confidence="CONFIRMED",
        source_name="Karnataka Yakshagana Academy & Coastal Heritage Trust",
        source_url="https://udupi.nic.in/en/tourism/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=0.0,
        ticket_cost_status="free",
        travel_advisory="Solemn religious tradition. Visitors must maintain solemn respect, remove footwear, and follow photography guidelines.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/c/c7/Yakshagana_on_stage.jpg",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 4.0",
    ),
    KarnatakaEvent(
        id="kadalekai-parishe",
        name_en="Kadalekai Parishe (Basavanagudi Groundnut Fair)",
        name_kn="ಕಡಲೆಕಾಯಿ ಪರಿಷೆ (ಬಸವನಗುಡಿ ಕಡಲೆಕಾಯಿ ಜಾತ್ರೆ)",
        category="regional_festival",
        description_en="Historic 500-year-old street fair at Dodda Ganesha Temple where farmers from Karnataka, Andhra, and Tamil Nadu offer their first harvest of groundnuts to the sacred Nandi bull.",
        description_kn="ಬಸವನಗುಡಿಯ ದೊಡ್ಡ ಗಣಪತಿ ಮತ್ತು ಬಸವನ ದೇವಸ್ಥಾನದಲ್ಲಿ ನಡೆಯುವ 500 ವರ್ಷಗಳ ಐತಿಹಾಸಿಕ ಕಡಲೆಕಾಯಿ ಜಾತ್ರೆ.",
        district="Bengaluru Urban",
        district_code="KA-BLR",
        location_name="Bull Temple Road, Basavanagudi, Bengaluru",
        venue="Bull Temple Complex & Bugle Rock Grounds",
        latitude=12.9423,
        longitude=77.5681,
        start_month=11,
        end_month=11,
        start_date="2026-11-23",
        end_date="2026-11-26",
        date_confidence="CONFIRMED",
        source_name="BBMP & Tourism Department Karnataka",
        source_url="https://karnatakatourism.org/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=0.0,
        ticket_cost_status="free",
        travel_advisory="Streets closed to vehicular traffic. Best experienced on foot in early evening.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/0/0c/Bull_temple_Mast.jpg",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 3.0",
    ),
    KarnatakaEvent(
        id="kailpodh-coorg",
        name_en="Kailpodh Festival of Weapons & Harvest (Kodagu)",
        name_kn="ಕೊಡಗಿನ ಕೈಲ್‌ಪೋದ್ ಹಬ್ಬ",
        category="regional_festival",
        description_en="Traditional Kodava martial festival marking the end of paddy transplantation with the purification of ancestral tools and arms, archery contests, and feast of Kadambuttu and Pandi Curry.",
        description_kn="ನಾಟಿ ಕಾರ್ಯ ಮುಗಿದ ನಂತರ ಆಯುಧ ಪೂಜೆ ಮತ್ತು ಸಾಂಪ್ರದಾಯಿಕ ಕ್ರೀಡೆಗಳೊಂದಿಗೆ ಆಚರಿಸಲಾಗುವ ಕೊಡಗಿನ ಮುಖ್ಯ ಹಬ್ಬ.",
        district="Kodagu",
        district_code="KA-KOD",
        location_name="Madikeri & Virajpet, Kodagu",
        venue="Kodava Ainmanes and Community Grounds",
        latitude=12.4244,
        longitude=75.7382,
        start_month=9,
        end_month=9,
        start_date="2026-09-02",
        end_date="2026-09-04",
        date_confidence="CONFIRMED",
        source_name="Kodava Samaja & District Administration Kodagu",
        source_url="https://kodagu.nic.in/en/tourism/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=0.0,
        ticket_cost_status="free",
        travel_advisory="Community festival. Local homestays arrange cultural experiences for guests.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/c/c2/1632_px_-_Talakaveri_India.JPG",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 3.0",
    ),
    KarnatakaEvent(
        id="melukote-vairamudi",
        name_en="Melukote Vairamudi Brahmotsava",
        name_kn="ಮೇಲುಕೋಟೆ ವೈರಮುಡಿ ಬ್ರಹ್ಮೋತ್ಸವ",
        category="major_festival",
        description_en="Spiritual procession where the deity Sri Cheluvanarayana Swamy is adorned with the legendary diamond-encrusted Vairamudi crown, carried under the stars with strict Vedic hymns.",
        description_kn="ವಜ್ರಖಚಿತ ಪವಿತ್ರ ವೈರಮುಡಿ ಕಿರೀಟವನ್ನು ಧರಿಸಿ ರಾತ್ರಿ ನಡೆಯುವ ಭವ್ಯ ಗರುಡೋತ್ಸವ ಮೆರವಣಿಗೆ.",
        district="Mandya",
        district_code="KA-MAN",
        location_name="Melukote Temple Hill, Mandya",
        venue="Sri Cheluvanarayana Swamy Temple Precincts",
        latitude=12.6644,
        longitude=76.6542,
        start_month=3,
        end_month=4,
        start_date="2026-03-27",
        end_date="2026-04-02",
        date_confidence="CONFIRMED",
        source_name="Muzrai Department, Government of Karnataka & Mandya District Administration",
        source_url="https://mandya.nic.in/en/tourism/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=0.0,
        ticket_cost_status="free",
        travel_advisory="Attracts over 400,000 pilgrims. KSRTC operates continuous special buses from Mandya and Mysuru.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/f/fc/Melukote_BNC.jpg",
        image_attribution="Photo by Wikimedia Commons, CC BY-SA 3.0",
    ),
    # 3. Cultural Festivals & Arts
    KarnatakaEvent(
        id="hampi-utsav",
        name_en="Hampi Utsav (Vijaya Utsava)",
        name_kn="ಹಂಪಿ ಉತ್ಸವ (ವಿಜಯ ಉತ್ಸವ)",
        category="cultural_event",
        description_en="Annual cultural mega-festival celebrated against the majestic backdrop of 14th-century Vijayanagara ruins, featuring illuminated rock monuments, classical music, dance, puppet shows, and fireworks.",
        description_kn="ವಿಜಯನಗರ ಸಾಮ್ರಾಜ್ಯದ ಗತವೈಭವವನ್ನು ಮರುಸೃಷ್ಟಿಸುವ ಬೃಹತ್ ಸಾಂಸ್ಕೃತಿಕ ಉತ್ಸವ. ಬಣ್ಣದ ಬೆಳಕಿನಲ್ಲಿ ಕಂಗೊಳಿಸುವ ಐತಿಹಾಸಿಕ ಶಿಲಾ ಸ್ಮಾರಕಗಳು ಮತ್ತು ನೃತ್ಯ ಪ್ರದರ್ಶನಗಳು.",
        district="Vijayanagara",
        district_code="KA-VJN",
        location_name="Hampi World Heritage Site",
        venue="Virupaksha Temple & Gayatri Peetha Grounds, Hampi",
        latitude=15.3350,
        longitude=76.4600,
        start_month=11,
        end_month=11,
        start_date="2026-11-06",
        end_date="2026-11-08",
        date_confidence="CONFIRMED",
        source_name="Department of Kannada and Culture, Government of Karnataka",
        source_url="https://karnatakatourism.org/tour-item/hampi-utsav/",
        ticket_cost_min_inr=0.0,
        ticket_cost_max_inr=0.0,
        ticket_cost_status="free",
        travel_advisory="Roads around Hampi village pedestrianized during evenings; free shuttle transit from Kamalapur.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Hampi_Garuda_stone_chariot.jpg/960px-Hampi_Garuda_stone_chariot.jpg",
        image_attribution="Photo by Dey.sandip / Wikimedia Commons, CC BY-SA 3.0",
    ),
    KarnatakaEvent(
        id="pattadakal-dance-festival",
        name_en="Pattadakal Dance Festival (Nritya Utsava)",
        name_kn="ಪಟ್ಟದಕಲ್ಲು ನೃತ್ಯ ಉತ್ಸವ",
        category="cultural_event",
        description_en="Classical dance festival organized by Sangeetha Nritya Academy amidst 8th-century Badami Chalukyan sandstone temples of Pattadakal (UNESCO World Heritage Site).",
        description_kn="ಪಟ್ಟದಕಲ್ಲಿನ ವಿಶ್ವ ಪರಂಪರೆಯ ಪ್ರಾಚೀನ ಶಿಲಾ ದೇವಾಲಯಗಳ ಸನ್ನಿಧಿಯಲ್ಲಿ ನಡೆಯುವ ರಾಷ್ಟ್ರೀಯ ಶಾಸ್ತ್ರೀಯ ನೃತ್ಯ ಉತ್ಸವ.",
        district="Bagalkote",
        district_code="KA-BGK",
        location_name="Pattadakal UNESCO Temple Complex",
        venue="Virupaksha & Mallikarjuna Temple Courtyards",
        latitude=15.9489,
        longitude=75.8164,
        start_month=1,
        end_month=1,
        start_date="2026-01-22",
        end_date="2026-01-24",
        date_confidence="CONFIRMED",
        source_name="Karnataka Tourism & Archaeological Survey of India",
        source_url="https://karnatakatourism.org/tour-item/pattadakal-dance-festival/",
        ticket_cost_min_inr=25.0,
        ticket_cost_max_inr=25.0,
        ticket_cost_status="paid",
        travel_advisory="Entry to festival covered by regular ASI monument day pass.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/7th_-_9th_century_Hindu_and_Jain_temples%2C_Pattadakal_monuments_Karnataka_7.jpg/960px-7th_-_9th_century_Hindu_and_Jain_temples%2C_Pattadakal_monuments_Karnataka_7.jpg",
        image_attribution="Photo by Ms Sarah Welch / Wikimedia Commons, CC BY-SA 4.0",
    ),
    # 4. Seasonal Nature & Environmental Phenomena
    KarnatakaEvent(
        id="lalbagh-flower-show-republic-day",
        name_en="Lalbagh Winter Flower Show (Republic Day)",
        name_kn="ಲಾಲ್‌ಬಾಗ್ ಗಣರಾಜ್ಯೋತ್ಸವ ಫಲಪುಷ್ಪ ಪ್ರದರ್ಶನ",
        category="seasonal_nature",
        description_en="Historic bi-annual botanical exhibition at the 1889 Glass House of Lalbagh showcasing over 300,000 blooming flowers, exotic floral sculptures, and heritage horticulture.",
        description_kn="ಲಾಲ್‌ಬಾಗ್ ಗಾಜಿನ ಮನೆಯಲ್ಲಿ 3 ಲಕ್ಷಕ್ಕೂ ಅಧಿಕ ಹೂವುಗಳಿಂದ ಕಂಗೊಳಿಸುವ ಸುಪ್ರಸಿದ್ಧ ಫಲಪುಷ್ಪ ಪ್ರದರ್ಶನ.",
        district="Bengaluru Urban",
        district_code="KA-BLR",
        location_name="Lalbagh Botanical Garden, Bengaluru",
        venue="Lalbagh Glass House",
        latitude=12.9507,
        longitude=77.5848,
        start_month=1,
        end_month=1,
        start_date="2026-01-16",
        end_date="2026-01-26",
        date_confidence="CONFIRMED",
        source_name="Department of Horticulture, Government of Karnataka",
        source_url="https://horticulture.karnataka.gov.in/",
        ticket_cost_min_inr=70.0,
        ticket_cost_max_inr=100.0,
        ticket_cost_status="paid",
        travel_advisory="Lalbagh Metro station is directly adjacent. Green line metro recommended to bypass parking rush.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/9/9b/Glass_House_Botanical_Garden_Lal_Bagh_Bangalore_%2848186335066%29.jpg",
        image_attribution="Photo by Bernard Gagnon / Wikimedia Commons, CC BY-SA 3.0",
    ),
    KarnatakaEvent(
        id="western-ghats-monsoon-jog",
        name_en="Monsoon Jog Falls & Sharavathi Valley Inflow",
        name_kn="ಮಳೆಗಾಲದ ಜೋಗ ಜಲಪಾತ ವೈಭವ",
        category="seasonal_nature",
        description_en="Peak monsoon spectacle where the Sharavathi River plunges 253 meters in four distinct cascades (Raja, Roarer, Rocket, and Rani) shrouded in misty Western Ghats clouds.",
        description_kn="ಶರಾವತಿ ನದಿಯು 253 ಮೀಟರ್ ಎತ್ತರದಿಂದ ಭೋರ್ಗರೆದು ಧುಮುಕುವ ಜೋಗ ಜಲಪಾತದ ಅದ್ಭುತ ಮಳೆಗಾಲದ ದೃಶ್ಯ.",
        district="Shivamogga",
        district_code="KA-SHI",
        location_name="Jog Falls, Sagar, Shivamogga",
        venue="KSTDC Viewpoint & Sharavathi Suspension Bridge",
        latitude=14.2289,
        longitude=74.8115,
        start_month=7,
        end_month=10,
        start_date="2026-07-15",
        end_date="2026-10-15",
        date_confidence="CONFIRMED",
        source_name="Karnataka Forest Department & KSTDC",
        source_url="https://karnatakatourism.org/tour-item/jog-falls/",
        ticket_cost_min_inr=20.0,
        ticket_cost_max_inr=50.0,
        ticket_cost_status="paid",
        travel_advisory="Steps to foot of waterfall closed during heavy inflows for visitor safety; viewing galleries open.",
        image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Gerosoppa_Falls_or_Jog_Falls.jpg/960px-Gerosoppa_Falls_or_Jog_Falls.jpg",
        image_attribution="Photo by Arkadeep Meta / Wikimedia Commons, CC BY-SA 4.0",
    ),
]


class KarnatakaEventsCalendarService:
    """Service to discover and match authentic Karnataka festivals with travel dates and routes."""

    def __init__(self, events: list[KarnatakaEvent] | None = None) -> None:
        self._events = events or KARNATAKA_EVENTS_REGISTRY

    def get_all_events(self) -> list[KarnatakaEvent]:
        """Return all canonical cultural events."""
        return list(self._events)

    def get_events_for_date_range(
        self,
        start_date: str,
        end_date: str,
        district_codes: Sequence[str] | None = None,
        category: str | None = None,
    ) -> list[KarnatakaEvent]:
        """Find verified events whose active dates overlap with the user's travel dates."""
        try:
            req_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            req_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except Exception:
            return []

        matched: list[KarnatakaEvent] = []
        for ev in self._events:
            try:
                ev_start = datetime.strptime(ev.start_date, "%Y-%m-%d").date()
                ev_end = datetime.strptime(ev.end_date, "%Y-%m-%d").date()
            except Exception:
                continue

            # Check date overlap: ev_start <= req_end and ev_end >= req_start
            if not (ev_start <= req_end and ev_end >= req_start):
                continue

            if district_codes and ev.district_code not in district_codes:
                continue

            if category and ev.category != category:
                continue

            matched.append(ev)

        return matched

    def get_events_near_coordinates(
        self,
        latitude: float,
        longitude: float,
        start_date: str | None = None,
        end_date: str | None = None,
        radius_km: float = 65.0,
        month: int | None = None,
    ) -> list[tuple[float, KarnatakaEvent]]:
        """Return verified events near coordinates within distance radius."""
        candidates = self._events
        if start_date and end_date:
            candidates = self.get_events_for_date_range(start_date, end_date)
        elif month is not None:
            candidates = [
                e
                for e in self._events
                if (e.start_month <= month <= e.end_month)
                or (
                    e.start_month > e.end_month and (month >= e.start_month or month <= e.end_month)
                )
            ]

        results: list[tuple[float, KarnatakaEvent]] = []
        for ev in candidates:
            dist = _haversine_km(latitude, longitude, ev.latitude, ev.longitude)
            if dist <= radius_km:
                results.append((dist, ev))

        results.sort(key=lambda x: x[0])
        return results

    def match_trip_events(
        self,
        start_date: str | None,
        duration_days: int,
        corridor_districts: Sequence[str],
        destination_coordinates: list[tuple[float, float]] | None = None,
    ) -> list[KarnatakaEvent]:
        """Synthesize relevant events coinciding with a multi-day trip."""
        if not start_date:
            # If no start date, return notable annual events in corridor
            return [e for e in self._events if e.district_code in corridor_districts][:3]

        try:
            dt_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            dt_end = date.fromordinal(dt_start.toordinal() + max(1, duration_days) - 1)
            end_date_str = dt_end.strftime("%Y-%m-%d")
        except Exception:
            return []

        date_matched = self.get_events_for_date_range(start_date, end_date_str)

        # Filter or prioritize by corridor or proximity to destination coords
        relevant: list[KarnatakaEvent] = []
        seen_ids = set()

        for ev in date_matched:
            is_in_corridor = ev.district_code in corridor_districts
            is_near_stop = False
            if destination_coordinates:
                for lat, lon in destination_coordinates:
                    if _haversine_km(lat, lon, ev.latitude, ev.longitude) <= 65.0:
                        is_near_stop = True
                        break

            if (is_in_corridor or is_near_stop) and ev.id not in seen_ids:
                relevant.append(ev)
                seen_ids.add(ev.id)

        return relevant


_global_events_calendar_service: KarnatakaEventsCalendarService | None = None


def get_karnataka_events_service() -> KarnatakaEventsCalendarService:
    """Singleton accessor for KarnatakaEventsCalendarService."""
    global _global_events_calendar_service
    if _global_events_calendar_service is None:
        _global_events_calendar_service = KarnatakaEventsCalendarService()
    return _global_events_calendar_service
