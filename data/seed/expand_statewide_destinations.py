"""Statewide destination catalogue expansion for Phase 3.

Adds verified destinations to cover all 31 Karnataka administrative districts,
bringing the total destination catalogue to 61+ verified attractions.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DESTINATIONS_PATH = ROOT_DIR / "data" / "seed" / "destinations.json"

STATEWIDE_NEW_DESTINATIONS = [
    # 1. Ballari (KA-BAL)
    {
        "id": "22222222-2222-4222-8222-222222222201",
        "slug": "ballari-fort",
        "district_code": "KA-BAL",
        "category": "heritage",
        "latitude": 15.1485,
        "longitude": 76.9208,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 120,
        "entry_fee_min_inr": 25.0,
        "entry_fee_max_inr": 25.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Ballari Fort (Rock Fort)",
                "summary": "Historic fort built atop Ballari Gudda, the world's second largest monolithic rock hill.",
                "description": "Constructed in the 16th century by Hanumappa Nayaka and later reinforced by Hyder Ali and French engineers, Ballari Fort is divided into the Upper Fort on the rock summit and the Lower Fort at its base. It offers panoramic vistas of the surrounding plains.",
                "how_to_reach": "Located in the heart of Ballari city, approximately 3 km from Ballari Railway Station.",
                "accessibility_notes": "Steep stone steps lead to the Upper Fort; comfortable footwear and water recommended.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಬಳ್ಳಾರಿ ಕೋಟೆ",
                "summary": "ವಿಶ್ವದ ಎರಡನೇ ಅತಿ ದೊಡ್ಡ ಏಕಶಿಲಾ ಬಂಡೆಯಾದ ಬಳ್ಳಾರಿ ಗುಡ್ಡದ ಮೇಲೆ ನಿರ್ಮಿಸಲಾದ ಐತಿಹಾಸಿಕ ಕೋಟೆ.",
                "description": "16ನೇ ಶತಮಾನದಲ್ಲಿ ಹನುಮಪ್ಪ ನಾಯಕರಿಂದ ನಿರ್ಮಿಸಲ್ಪಟ್ಟು ನಂತರ ಹೈದರ್ ಅಲಿ ಮತ್ತು ಫ್ರೆಂಚ್ ಇಂಜಿನಿಯರ್‌ಗಳಿಂದ ಬಲಪಡಿಸಲ್ಪಟ್ಟ ಈ ಕೋಟೆಯು ಮೇಲ್ಕೋಟೆ ಮತ್ತು ಕೆಳಕೋಟೆ ಎಂಬ ಎರಡು ಭಾಗಗಳನ್ನು ಹೊಂದಿದೆ. ಕೋಟೆಯ ಮೇಲಿನಿಂದ ನಗರದ ವಿಹಂಗಮ ನೋಟ ಕಾಣುತ್ತದೆ.",
                "how_to_reach": "ಬಳ್ಳಾರಿ ನಗರದ ಮಧ್ಯಭಾಗದಲ್ಲಿದೆ, ಬಳ್ಳಾರಿ ರೈಲ್ವೆ ನಿಲ್ದಾಣದಿಂದ ಸುಮಾರು 3 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಮೇಲ್ಕೋಟೆಗೆ ಕಡಿದಾದ ಮೆಟ್ಟಿಲುಗಳಿವೆ; ಆರಾಮದಾಯಕ ಪಾದರಕ್ಷೆ ಮತ್ತು ಕುಡಿಯುವ ನೀರು ಅತ್ಯಗತ್ಯ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Dharwad Circle",
                "source_url": "https://asidharwadcircle.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official state heritage registry",
                "attribution_required": True
            }
        ]
    },

    # 2. Bengaluru Rural (KA-BLRR)
    {
        "id": "22222222-2222-4222-8222-222222222202",
        "slug": "devanahalli-fort",
        "district_code": "KA-BLRR",
        "category": "heritage",
        "latitude": 13.2486,
        "longitude": 77.7126,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 75,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Devanahalli Fort",
                "summary": "Sprawling 1501 stone fortress and the historic birthplace of Tipu Sultan.",
                "description": "Originally built of mud by Malla Byre Gowda in 1501 and rebuilt in stone by Hyder Ali in the late 18th century, Devanahalli Fort encloses historic temples such as Venugopalaswamy temple and the memorial park marking Tipu Sultan's birthplace.",
                "how_to_reach": "Located just 15 km north of Kempegowda International Airport on NH 44.",
                "accessibility_notes": "Level ground within the fort perimeter; easily walkable for all age groups.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ದೇವನಹಳ್ಳಿ ಕೋಟೆ",
                "summary": "1501 ರಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಕಲ್ಲಿನ ಕೋಟೆ ಮತ್ತು ಟಿಪ್ಪು ಸುಲ್ತಾನರ ಐತಿಹಾಸಿಕ ಜನ್ಮಸ್ಥಳ.",
                "description": "1501 ರಲ್ಲಿ ಮಲ್ಲ ಬೈರೇಗೌಡರಿಂದ ಮಣ್ಣಿನ ಕೋಟೆಯಾಗಿ ನಿರ್ಮಿಸಲ್ಪಟ್ಟು ನಂತರ ಹೈದರ್ ಅಲಿಯಿಂದ ಕಲ್ಲಿನ ಕೋಟೆಯಾಗಿ ಪುನರ್ನಿರ್ಮಿಸಲ್ಪಟ್ಟಿತು. ಕೋಟೆಯ ಒಳಗೆ ವೇಣುಗೋಪಾಲಸ್ವಾಮಿ ದೇವಾಲಯ ಹಾಗೂ ಟಿಪ್ಪು ಸುಲ್ತಾನರ ಜನ್ಮಸ್ಥಳದ ಸ್ಮಾರಕವಿದೆ.",
                "how_to_reach": "ಕೆಂಪೇಗೌಡ ಅಂತರಾಷ್ಟ್ರೀಯ ವಿಮಾನ ನಿಲ್ದಾಣದಿಂದ ಉತ್ತರಕ್ಕೆ ಕೇವಲ 15 ಕಿ.ಮೀ ದೂರದಲ್ಲಿ ರಾಷ್ಟ್ರೀಯ ಹೆದ್ದಾರಿ 44 ರಲ್ಲಿದೆ.",
                "accessibility_notes": "ಕೋಟೆಯ ಆವರಣ ಸಮತಟ್ಟಾಗಿದೆ; ಕುಟುಂಬ ಸಮೇತ ಸುಲಭವಾಗಿ ಸುತ್ತಾಡಬಹುದು.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Tourism - Devanahalli",
                "source_url": "https://karnatakatourism.org/tourist-place/devanahalli-fort/",
                "source_type": "tourism_board",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "State tourism portal",
                "attribution_required": True
            }
        ]
    },

    # 3. Chikkaballapura (KA-CBL)
    {
        "id": "22222222-2222-4222-8222-222222222203",
        "slug": "nandi-hills",
        "district_code": "KA-CBL",
        "category": "hill_station",
        "latitude": 13.3702,
        "longitude": 77.6835,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 180,
        "entry_fee_min_inr": 20.0,
        "entry_fee_max_inr": 20.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Nandi Hills (Nandidurga)",
                "summary": "Legendary hill fortress famed for misty sunrises, Tipu's Drop, and ancient temples.",
                "description": "Rising 1,478 meters above sea level, Nandi Hills is a historic fortress retreat with panoramic cloud-bed views. Key highlights include Tipu's Summer Residence, Tipu's Drop cliff, Amrita Sarovar lake, and the 9th-century Yoga Nandeeshwara temple.",
                "how_to_reach": "Situated 60 km north of Bengaluru city and 35 km from Chikkaballapura town via well-paved ghat road.",
                "accessibility_notes": "Paved walking pathways and viewing pavilions; electric buggy service available at summit.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ನಂದಿ ಬೆಟ್ಟ (ನಂದಿದುರ್ಗ)",
                "summary": "ಮಂಜು ಮುಸುಕಿದ ಸೂರ್ಯೋದಯ, ಟಿಪ್ಪು ಡ್ರಾಪ್ ಮತ್ತು ಪುರಾತನ ದೇವಾಲಯಗಳಿಗೆ ಪ್ರಸಿದ್ಧವಾದ ಗಿರಿಧಾಮ.",
                "description": "ಸಮುದ್ರ ಮಟ್ಟದಿಂದ 1,478 ಮೀಟರ್ ಎತ್ತರದಲ್ಲಿರುವ ನಂದಿ ಬೆಟ್ಟವು ಪ್ರಸಿದ್ಧ ಗಿರಿಧಾಮ. ಟಿಪ್ಪು ಸುಲ್ತಾನರ ಬೇಸಿಗೆ ಅರಮನೆ, ಟಿಪ್ಪು ಡ್ರಾಪ್, ಅಮೃತ ಸರೋವರ ಮತ್ತು ಯೋಗ ನಂದೀಶ್ವರ ದೇವಾಲಯಗಳು ಇಲ್ಲಿನ ಪ್ರಮುಖ ಆಕರ್ಷಣೆಗಳು.",
                "how_to_reach": "ಬೆಂಗಳೂರಿನಿಂದ ಉತ್ತರಕ್ಕೆ 60 ಕಿ.ಮೀ ಮತ್ತು ಚಿಕ್ಕಬಳ್ಳಾಪುರದಿಂದ 35 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಬೆಟ್ಟದ ಮೇಲೆ ಸುಸಜ್ಜಿತ ರಸ್ತೆ ಮತ್ತು ಕಾಲುದಾರಿಗಳಿವೆ; ಪರಿಸರ ಸ್ನೇಹಿ ವಾಹನಗಳ ಸೌಲಭ್ಯವಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Department of Horticulture, Government of Karnataka",
                "source_url": "https://horticulturedir.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official state agency",
                "attribution_required": True
            }
        ]
    },

    # 4. Davanagere (KA-DAV)
    {
        "id": "22222222-2222-4222-8222-222222222204",
        "slug": "kondajji-lake",
        "district_code": "KA-DAV",
        "category": "nature",
        "latitude": 14.5385,
        "longitude": 75.9080,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": True,
        "estimated_visit_minutes": 90,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Kondajji Lake & Nature Sanctuary",
                "summary": "Serene freshwater lake and scouting centre flanked by rolling hills and migratory bird habitats.",
                "description": "Kondajji Lake is a picturesque wetland destination nestled between hillocks in Davanagere district. It hosts numerous resident and migratory waterfowl and serves as a premier Bharat Scouts & Guides adventure training camp.",
                "how_to_reach": "Located 14 km north-west of Davanagere city via Harihar-Kondajji road.",
                "accessibility_notes": "Lakeside bund and nature trail accessible; best visited during early morning or late afternoon.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಕೊಂಡಜ್ಜಿ ಕೆರೆ ಮತ್ತು ಪ್ರಕೃತಿ ಧಾಮ",
                "summary": "ಗುಡ್ಡಗಳ ನಡುವೆ ನೆಲೆಸಿರುವ ವಲಸೆ ಹಕ್ಕಿಗಳ ಆವಾಸಸ್ಥಾನವಾದ ಸುಂದರ ಶುದ್ಧ ನೀರಿನ ಕೆರೆ.",
                "description": "ದಾವಣಗೆರೆ ಸಮೀಪದ ಕೊಂಡಜ್ಜಿ ಕೆರೆಯು ನೈಸರ್ಗಿಕ ಸೌಂದರ್ಯಕ್ಕೆ ಹೆಸರುವಾಸಿ. ಇದು ಪ್ರಸಿದ್ಧ ಭಾರತ್ ಸ್ಕೌಟ್ಸ್ ಮತ್ತು ಗೈಡ್ಸ್ ತರಬೇತಿ ಕೇಂದ್ರವಾಗಿದ್ದು, ಚಳಿಗಾಲದಲ್ಲಿ ದೇಶ-ವಿದೇಶಗಳ ಅಪರೂಪದ ಜಲಪಕ್ಷಿಗಳು ಇಲ್ಲಿಗೆ ವಲಸೆ ಬರುತ್ತವೆ.",
                "how_to_reach": "ದಾವಣಗೆರೆ ನಗರದಿಂದ ವಾಯುವ್ಯಕ್ಕೆ ಸುಮಾರು 14 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಕೆರೆಯ ದಂಡೆಯಲ್ಲಿ ವಾಕಿಂಗ್ ಪಾತ್ ಇದೆ; ಬೆಳಗಿನ ಸಮಯದಲ್ಲಿ ಪಕ್ಷಿ ವೀಕ್ಷಣೆಗೆ ಅತ್ಯುತ್ತಮ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Davanagere District Administration Official Portal",
                "source_url": "https://davanagere.nic.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official district portal",
                "attribution_required": True
            }
        ]
    },

    # 5. Dharwad (KA-DHW)
    {
        "id": "22222222-2222-4222-8222-222222222205",
        "slug": "chandramouleshwara-temple",
        "district_code": "KA-DHW",
        "category": "architecture",
        "latitude": 15.3789,
        "longitude": 75.1121,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 60,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Chandramouleshwara Temple (Unkal)",
                "summary": "900-year-old Western Chalukyan architectural masterpiece with four carved entrance doorways.",
                "description": "Dedicated to Lord Shiva, this 11th-century national protected monument features intricate stone lattice screens, ornate pillars, and sculpted ceiling medallions. Unlike typical temples, it features four cardinal doorways facing the four directions.",
                "how_to_reach": "Located in Unkal, Hubballi-Dharwad twin city, adjacent to Unkal Lake on Old PB Road.",
                "accessibility_notes": "Stone courtyard accessible with gentle ramps; footwear to be removed at temple threshold.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಚಂದ್ರಮೌಳೇಶ್ವರ ದೇವಾಲಯ (ಉಣಕಲ್)",
                "summary": "ನಾಲ್ಕು ದಿಕ್ಕುಗಳಲ್ಲೂ ಪ್ರವೇಶ ದ್ವಾರಗಳನ್ನು ಹೊಂದಿರುವ 900 ವರ್ಷ ಹಳೆಯ ಕಲ್ಯಾಣಿ ಚಾಲುಕ್ಯರ ವಾಸ್ತುಶಿಲ್ಪದ ಅದ್ಭುತ.",
                "description": "11ನೇ ಶತಮಾನದಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಈ ರಾಷ್ಟ್ರೀಯ ಸಂರಕ್ಷಿತ ಸ್ಮಾರಕವು ಶಿವನಿಗೆ ಸಮರ್ಪಿತವಾಗಿದೆ. ಸುಂದರವಾದ ಕೆತ್ತನೆಯ ಕಂಬಗಳು, ಶಿಲಾ ಜಾಲಂಧ್ರಗಳು ಮತ್ತು ನಾಲ್ಕು ಪ್ರವೇಶದ್ವಾರಗಳು ಈ ದೇಗುಲದ ವೈಶಿಷ್ಟ್ಯ.",
                "how_to_reach": "ಹುಬ್ಬಳ್ಳಿ-ಧಾರವಾಡದ ಉಣಕಲ್ ಕೆರೆಯ ಬಳಿ ಹಳೆಯ ಪುಣೆ-ಬೆಂಗಳೂರು ರಸ್ತೆಯಲ್ಲಿದೆ.",
                "accessibility_notes": "ದೇವಾಲಯದ ಆವರಣ ಸುಗಮವಾಗಿದೆ; ದೇವಾಲಯ ಪ್ರವೇಶಿಸುವಾಗ ಪಾದರಕ್ಷೆ ಹೊರಗಿಡಬೇಕು.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Dharwad Circle",
                "source_url": "https://asidharwadcircle.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official monument directory",
                "attribution_required": True
            }
        ]
    },

    # 6. Gadag (KA-GAD)
    {
        "id": "22222222-2222-4222-8222-222222222206",
        "slug": "trikuteshwara-temple",
        "district_code": "KA-GAD",
        "category": "architecture",
        "latitude": 15.4290,
        "longitude": 75.6320,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 90,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Trikuteshwara Temple Complex",
                "summary": "11th-century Western Chalukya triple-shrine complex famous for the ornate Saraswati Temple.",
                "description": "Built between 1050 and 1200 CE, the Trikuteshwara complex is a crowning jewel of Gadag style architecture. It houses three Shiva lingas on a single pedestal and an adjacent shrine of Goddess Saraswati renowned for its lathe-turned polished stone pillars.",
                "how_to_reach": "Located in the heart of Gadag town, 2 km from Gadag Junction Railway Station.",
                "accessibility_notes": "Paved temple courtyard; wheelchair assistance available at entrance.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ತ್ರಿಕೂಟೇಶ್ವರ ದೇವಾಲಯ ಸಮುಚ್ಚಯ",
                "summary": "ಒಂದೇ ಪೀಠದ ಮೇಲಿರುವ ಮೂರು ಲಿಂಗಗಳು ಮತ್ತು ಅದ್ಭುತ ಸರಸ್ವತಿ ದೇಗುಲಕ್ಕೆ ಹೆಸರುವಾಸಿಯಾದ ಚಾಲುಕ್ಯ ಶೈಲಿಯ ದೇಗುಲ.",
                "description": "ಗದಗ ಶೈಲಿಯ ವಾಸ್ತುಶಿಲ್ಪಕ್ಕೆ ಉದಾಹರಣೆಯಾಗಿರುವ ಈ ದೇವಾಲಯವು ಬ್ರಹ್ಮ, ವಿಷ್ಣು ಮತ್ತು ಮಹೇಶ್ವರರನ್ನು ಪ್ರತಿನಿಧಿಸುವ ಮೂರು ಲಿಂಗಗಳನ್ನು ಒಂದೇ ಪೀಠದಲ್ಲಿ ಹೊಂದಿದೆ. ಪಕ್ಕದಲ್ಲಿರುವ ಸರಸ್ವತಿ ದೇವಾಲಯದ ಕಂಬಗಳ ನಯವಾದ ಕೆತ್ತನೆ ಜಗತ್ಪ್ರಸಿದ್ಧವಾಗಿದೆ.",
                "how_to_reach": "ಗದಗ ನಗರದ ಕೇಂದ್ರಭಾಗದಲ್ಲಿದೆ, ಗದಗ ರೈಲ್ವೆ ನಿಲ್ದಾಣದಿಂದ 2 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಆವರಣ ಸಮತಟ್ಟಾಗಿದೆ; ಹಿರಿಯರಿಗೆ ಪ್ರವೇಶಿಸಲು ಅನುಕೂಲಕರವಾಗಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Tourism - Gadag Heritage",
                "source_url": "https://karnatakatourism.org/tourist-place/trikuteshwara-temple/",
                "source_type": "tourism_board",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official state tourism directory",
                "attribution_required": True
            }
        ]
    },

    # 7. Haveri (KA-HAV)
    {
        "id": "22222222-2222-4222-8222-222222222207",
        "slug": "siddheshwara-temple-haveri",
        "district_code": "KA-HAV",
        "category": "architecture",
        "latitude": 14.7930,
        "longitude": 75.4020,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 60,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Siddheshwara Temple",
                "summary": "11th-century Western Chalukya stone temple celebrated for exquisite geometric symmetry.",
                "description": "A protected monument under the Archaeological Survey of India, Siddheshwara Temple faces east and showcases staggered square hall designs, lathe-turned soapstone columns, and intricately sculpted friezes of deities and musicians.",
                "how_to_reach": "Located in Haveri town, 1.5 km from Haveri Railway Station on the Pune-Bengaluru line.",
                "accessibility_notes": "Well-maintained grassy lawn and paved pathways surround the temple.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಸಿದ್ಧೇಶ್ವರ ದೇವಾಲಯ (ಹಾವೇರಿ)",
                "summary": "11ನೇ ಶತಮಾನದ ಕಲ್ಯಾಣಿ ಚಾಲುಕ್ಯರ ವಾಸ್ತುಶಿಲ್ಪ ಕಲೆಯ ಅತ್ಯುನ್ನತ ಕಲಾಕೃತಿ.",
                "description": "ಪುರಾತತ್ವ ಇಲಾಖೆಯ ಸಂರಕ್ಷಿತ ಸ್ಮಾರಕವಾಗಿರುವ ಈ ದೇವಾಲಯವು ಸುಂದರವಾದ ಕೆತ್ತನೆಯ ಕಂಬಗಳು ಮತ್ತು ಸೂಕ್ಷ್ಮ ಕೆತ್ತನೆಯ ಮೂರ್ತಿಗಳಿಂದ ಕಂಗೊಳಿಸುತ್ತಿದೆ. ಚಾಲುಕ್ಯ ಶಿಲ್ಪಿಗಳ ಜ್ಯಾಮಿತೀಯ ಕೌಶಲ್ಯಕ್ಕೆ ಇದು ಸಾಕ್ಷಿಯಾಗಿದೆ.",
                "how_to_reach": "ಹಾವೇರಿ ನಗರದಲ್ಲಿದೆ, ಹಾವೇರಿ ರೈಲ್ವೆ ನಿಲ್ದಾಣದಿಂದ ಕೇವಲ 1.5 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ದೇವಾಲಯದ ಸುತ್ತಲೂ ಸುಂದರ ಹುಲ್ಲುಹಾಸು ಮತ್ತು ಸುಗಮ ದಾರಿಯಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Dharwad Circle",
                "source_url": "https://asidharwadcircle.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official heritage records",
                "attribution_required": True
            }
        ]
    },

    # 8. Kolar (KA-KOL)
    {
        "id": "22222222-2222-4222-8222-222222222208",
        "slug": "someshwara-temple-kolar",
        "district_code": "KA-KOL",
        "category": "architecture",
        "latitude": 13.1365,
        "longitude": 78.1340,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 75,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Kolar Someshwara Temple",
                "summary": "14th-century Vijayanagara architectural wonder famed for its ornate Kalyana Mantapa.",
                "description": "Originally founded by the Cholas and extensively expanded during the Vijayanagara Empire, the temple features an awe-inspiring marriage hall (Kalyana Mantapa) supported by monolithic granite pillars with detailed warrior and mythological carvings.",
                "how_to_reach": "Located in Fort Area, Kolar town, 70 km east of Bengaluru on Old Madras Road.",
                "accessibility_notes": "Spacious stone courtyards; flat stone walkways around the main sanctum.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಕೋಲಾರ ಸೋಮೇಶ್ವರ ದೇವಾಲಯ",
                "summary": "ಅದ್ಭುತ ಕಲ್ಯಾಣ ಮಂಟಪ ಮತ್ತು ವಿಜಯನಗರ ವಾಸ್ತುಶಿಲ್ಪಕ್ಕೆ ಹೆಸರಾದ ಪ್ರಾಚೀನ ದೇಗುಲ.",
                "description": "ಚೋಳರಿಂದ ಪ್ರಾರಂಭಿಸಲ್ಪಟ್ಟು ವಿಜಯನಗರದ ಅರಸರಿಂದ ವಿಸ್ತರಿಸಲ್ಪಟ್ಟ ಈ ದೇವಾಲಯವು ತನ್ನ ಭವ್ಯ ಕಲ್ಯಾಣ ಮಂಟಪಕ್ಕೆ ಪ್ರಸಿದ್ಧ. ಏಕಶಿಲಾ ಕಂಬಗಳಲ್ಲಿ ಕೆತ್ತಲಾದ ಯೋಧರು, ಕುದುರೆಗಳು ಮತ್ತು ಪೌರಾಣಿಕ ಚಿತ್ರಗಳು ನಯನಮನೋಹರವಾಗಿವೆ.",
                "how_to_reach": "ಕೋಲಾರ ನಗರದಲ್ಲಿದೆ, ಬೆಂಗಳೂರಿನಿಂದ ಹಳೆಯ ಮದ್ರಾಸ್ ರಸ್ತೆಯಲ್ಲಿ 70 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ದೇವಾಲಯದ ಆವರಣ ವಿಶಾಲವಾಗಿದೆ ಮತ್ತು ಪ್ರದಕ್ಷಿಣೆಗೆ ಸುಲಭವಾಗಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Bengaluru Circle",
                "source_url": "https://asibengalurucircle.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "National protected monument",
                "attribution_required": True
            }
        ]
    },

    # 9. Koppal (KA-KOP)
    {
        "id": "22222222-2222-4222-8222-222222222209",
        "slug": "mahadeva-temple-itagi",
        "district_code": "KA-KOP",
        "category": "architecture",
        "latitude": 15.4610,
        "longitude": 75.9860,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": True,
        "estimated_visit_minutes": 90,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Mahadeva Temple (Itagi)",
                "summary": "Acclaimed in historic inscriptions as 'Devalaya Chakravarti' (Emperor among Temples).",
                "description": "Built in 1112 CE by Mahadeva, a high-ranking military commander of Western Chalukya King Vikramaditya VI, this temple represents the pinnacle of Chalukya stone craft. Its pillared hall (navaranga) houses 68 columns with breathtaking filigree work.",
                "how_to_reach": "Located at Itagi in Yalburga taluk, 35 km from Koppal and 22 km from Kuknur.",
                "accessibility_notes": "Stone plinth with low steps; quiet rural heritage setting with manicured lawns.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಮಹಾದೇವ ದೇವಾಲಯ (ಇಟಗಿ)",
                "summary": "ಶಾಸನಗಳಲ್ಲಿ 'ದೇವಾಲಯ ಚಕ್ರವರ್ತಿ' ಎಂದು ಪ್ರಶಂಸಿಸಲ್ಪಟ್ಟ ಕಲ್ಯಾಣಿ ಚಾಲುಕ್ಯರ ಅಪೂರ್ವ ಕಲಾಕೃತಿ.",
                "description": "ಕ್ರಿ.ಶ. 1112 ರಲ್ಲಿ ವಿಕ್ರಮಾದಿತ್ಯ-VI ನ ದಂಡನಾಯಕ ಮಹಾದೇವನಿಂದ ನಿರ್ಮಿತವಾದ ಈ ದೇವಾಲಯವು ಚಾಲುಕ್ಯ ವಾಸ್ತುಶಿಲ್ಪದ ಶಿಖರಪ್ರಾಯವಾಗಿದೆ. 68 ಕಂಬಗಳ ವಿಶಾಲ ರಂಗಮಂಟಪ ಮತ್ತು ಸೂಕ್ಷ್ಮ ಶಿಲ್ಪಕಲೆಗಳು ನೋಡುಗರನ್ನು ಮಂತ್ರಮುಗ್ಧಗೊಳಿಸುತ್ತವೆ.",
                "how_to_reach": "ಕೊಪ್ಪಳ ಜಿಲ್ಲೆಯ ಯಲಬುರ್ಗಾ ತಾಲೂಕಿನ ಇಟಗಿಯಲ್ಲಿದೆ. ಕೊಪ್ಪಳ ನಗರದಿಂದ 35 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ದೇವಾಲಯದ ಸುತ್ತಲೂ ಸುಂದರ ಉದ್ಯಾನವಿದೆ; ಪ್ರವೇಶ ಸುಗಮವಾಗಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Dharwad Circle",
                "source_url": "https://asidharwadcircle.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official state heritage records",
                "attribution_required": True
            }
        ]
    },

    # 10. Raichur (KA-RAI)
    {
        "id": "22222222-2222-4222-8222-222222222210",
        "slug": "raichur-fort",
        "district_code": "KA-RAI",
        "category": "heritage",
        "latitude": 16.2050,
        "longitude": 77.3560,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 100,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Raichur Fort",
                "summary": "Formidable 1294 CE Kakatiya fortress with cyclopean stone masonry and historic cannons.",
                "description": "Guarding the fertile Doab region between Krishna and Tungabhadra rivers, Raichur Fort features massive mortar-less stone ramparts. Inside are ancient Persian, Arabic, and Sanskrit inscriptions, the Sailani Mosque, and the 25-foot long bronze cannon.",
                "how_to_reach": "Located in the heart of Raichur city, 2 km from Raichur Railway Station.",
                "accessibility_notes": "Walkable trails along the ramparts; some uneven stone pathways inside inner courtyards.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ರಾಯಚೂರು ಕೋಟೆ",
                "summary": "ಕೃಷ್ಣಾ-ತುಂಗಭದ್ರಾ ದೋಆಬ್ ಪ್ರದೇಶದ ರಕ್ಷಣೆಗೆ 1294 ರಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಬೃಹತ್ ಕಲ್ಲಿನ ಕೋಟೆ.",
                "description": "ಕಾಕತೀಯ ಅರಸರಿಂದ ಪ್ರಾರಂಭಿಸಲ್ಪಟ್ಟು ಬಹುಮನಿ ಮತ್ತು ವಿಜಯನಗರದ ಕಾಲದಲ್ಲಿ ಬಲಪಡಿಸಲ್ಪಟ್ಟ ಈ ಕೋಟೆಯು ಬೃಹತ್ ಕಲ್ಲುಗಳ ಜೋಡಣೆಗೆ ಪ್ರಸಿದ್ಧ. ಕೋಟೆಯಲ್ಲಿ ಸಂಸ್ಕೃತ, ಅರೇಬಿಕ್ ಮತ್ತು ಪರ್ಷಿಯನ್ ಶಾಸನಗಳು ಹಾಗೂ ಪುರಾತನ ಫಿರಂಗಿಗಳಿವೆ.",
                "how_to_reach": "ರಾಯಚೂರು ನಗರ ಕೇಂದ್ರದಲ್ಲಿದೆ, ರೈಲ್ವೆ ನಿಲ್ದಾಣದಿಂದ 2 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಕೋಟೆಯ ಒಳಗೆ ಕಾಲುದಾರಿಗಳಿವೆ; ಪ್ರಾಚೀನ ಗೋಡೆಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಸುಲಭವಾಗಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Tourism - Raichur Fort",
                "source_url": "https://karnatakatourism.org/tourist-place/raichur-fort/",
                "source_type": "tourism_board",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "State tourism official registry",
                "attribution_required": True
            }
        ]
    },

    # 11. Ramanagara (KA-RAM)
    {
        "id": "22222222-2222-4222-8222-222222222211",
        "slug": "ramadevara-betta",
        "district_code": "KA-RAM",
        "category": "nature",
        "latitude": 12.7485,
        "longitude": 77.3015,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 150,
        "entry_fee_min_inr": 25.0,
        "entry_fee_max_inr": 25.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Ramadevara Betta Vulture Sanctuary",
                "summary": "India's only dedicated vulture sanctuary set amid iconic dramatic granite boulders.",
                "description": "Spread over 346 hectares of rugged boulder hills, this protected sanctuary shelters critically endangered Indian Long-billed Vultures. At the summit sits the ancient Pattabhirama Temple with scenic vistas of silk city Ramanagara.",
                "how_to_reach": "Located 48 km south-west of Bengaluru along the Bengaluru-Mysuru Expressway.",
                "accessibility_notes": "Flight of approximately 350 stone steps leads to the hilltop temple and bird sanctuary viewpoint.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ರಾಮದೇವರ ಬೆಟ್ಟ ರಣಹದ್ದು ಅಭಯಾರಣ್ಯ",
                "summary": "ಭಾರತದ ಏಕೈಕ ರಣಹದ್ದು ಅಭಯಾರಣ್ಯ ಮತ್ತು ಪ್ರಸಿದ್ಧ ಬೃಹತ್ ಬಂಡೆಗಲ್ಲುಗಳ ಗಿರಿಧಾಮ.",
                "description": "ರಾಮನಗರದ ಬಳಿ ಇರುವ ಈ ರಮಣೀಯ ಬೆಟ್ಟವು ಅಳಿವಿನಂಚಿನಲ್ಲಿರುವ ರಣಹದ್ದುಗಳ ಸಂರಕ್ಷಣಾ ತಾಣವಾಗಿದೆ. ಬೆಟ್ಟದ ತುದಿಯಲ್ಲಿ ಪುರಾತನ ಪಟ್ಟಾಭಿರಾಮ ದೇವಾಲಯವಿದ್ದು, ಸುತ್ತಲಿನ ಹಚ್ಚಹಸಿರಿನ ಪ್ರಕೃತಿ ಮತ್ತು ಬಂಡೆಗಳ ರಮಣೀಯ ನೋಟ ಕಾಣುತ್ತದೆ.",
                "how_to_reach": "ಬೆಂಗಳೂರು-ಮೈಸೂರು ಎಕ್ಸ್‌ಪ್ರೆಸ್‌ವೇಯಲ್ಲಿ ಬೆಂಗಳೂರಿನಿಂದ ಕೇವಲ 48 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಬೆಟ್ಟದ ಮೇಲಿನ ದೇವಾಲಯಕ್ಕೆ ಸುಮಾರು 350 ಮೆಟ್ಟಿಲುಗಳಿವೆ; ವಿಶ್ರಾಂತಿ ತಾಣಗಳಿವೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Forest Department",
                "source_url": "https://aranya.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official state wildlife notification",
                "attribution_required": True
            }
        ]
    },

    # 12. Tumakuru (KA-TUM)
    {
        "id": "22222222-2222-4222-8222-222222222212",
        "slug": "devarayanadurga",
        "district_code": "KA-TUM",
        "category": "hill_station",
        "latitude": 13.3725,
        "longitude": 77.2105,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 150,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Devarayanadurga Hill Sanctuary",
                "summary": "Scenic forest-clad hill station featuring the Yoga Narasimha and Bhoga Narasimha temples.",
                "description": "Rising 1,204 meters amidst dense reserve forests, Devarayanadurga offers tranquil mountain breezes and historic Chola-era temples. Nearby is Namada Chilume, a sacred natural rock spring, and a lush deer park.",
                "how_to_reach": "Situated 15 km from Tumakuru city and 70 km north-west of Bengaluru via NH 48.",
                "accessibility_notes": "Ghat road reaches the mid-level Bhoga Narasimha temple; steps lead to the summit Yoga Narasimha shrine.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ದೇವರಾಯನದುರ್ಗ ಬೆಟ್ಟ",
                "summary": "ದಟ್ಟ ಅರಣ್ಯದ ನಡುವೆ ನೆಲೆಸಿರುವ ಯೋಗ ನರಸಿಂಹ ಮತ್ತು ಭೋಗ ನರಸಿಂಹ ದೇವಾಲಯಗಳ ಸುಂದರ ಗಿರಿಧಾಮ.",
                "description": "ಸಮುದ್ರ ಮಟ್ಟದಿಂದ 1,204 ಮೀಟರ್ ಎತ್ತರದಲ್ಲಿರುವ ದೇವರಾಯನದುರ್ಗವು ಪ್ರಕೃತಿ ಪ್ರಿಯರು ಮತ್ತು ಯಾತ್ರಿಕರ ನೆಚ್ಚಿನ ತಾಣ. ಇಲ್ಲಿನ ಬೆಟ್ಟದ ತಪ್ಪಲಿನಲ್ಲಿ ಭೋಗ ನರಸಿಂಹ ಹಾಗೂ ತುದಿಯಲ್ಲಿ ಯೋಗ ನರಸಿಂಹ ದೇವಾಲಯಗಳಿವೆ. ಸಮೀಪದಲ್ಲೇ ನಾಮದ ಚಿಲುಮೆ ನೈಸರ್ಗಿಕ ಜಲಧಾರೆ ಇದೆ.",
                "how_to_reach": "ತುಮಕೂರು ನಗರದಿಂದ 15 ಕಿ.ಮೀ ಮತ್ತು ಬೆಂಗಳೂರಿನಿಂದ 70 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಬೆಟ್ಟದ ಮಧ್ಯಭಾಗದವರೆಗೆ ವಾಹನಗಳು ಹೋಗುತ್ತವೆ; ತುದಿಯ ದೇವಾಲಯಕ್ಕೆ ಮೆಟ್ಟಿಲುಗಳಿವೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Tourism - Devarayanadurga",
                "source_url": "https://karnatakatourism.org/tourist-place/devarayanadurga/",
                "source_type": "tourism_board",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official state tourism registry",
                "attribution_required": True
            }
        ]
    },

    # 13. Yadgir (KA-YAD)
    {
        "id": "22222222-2222-4222-8222-222222222213",
        "slug": "yadgir-hill-fort",
        "district_code": "KA-YAD",
        "category": "heritage",
        "latitude": 16.7680,
        "longitude": 77.1420,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": True,
        "estimated_visit_minutes": 90,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Yadgir Hill Fort",
                "summary": "10th-century Yadava dynasty monolithic hill fortress with defensive scarps and cannons.",
                "description": "Constructed atop a monolithic granite hill by the Seuna (Yadava) rulers and later fortified by Bahmani Sultans, Yadgir Fort boasts three tiers of defensive stone walls, ancient water reservoirs, and historical bastions commanding the North Karnataka plains.",
                "how_to_reach": "Located 1.5 km from Yadgir Railway Station in the city centre.",
                "accessibility_notes": "Stone steps lead up the hillside; best climbed in morning hours.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಯಾದಗಿರಿ ಬೆಟ್ಟದ ಕೋಟೆ",
                "summary": "10ನೇ ಶತಮಾನದ ಯಾದವ ರಾಜವಂಶದ ಏಕಶಿಲಾ ಬೆಟ್ಟದ ಮೇಲಿರುವ ಭವ್ಯ ಐತಿಹಾಸಿಕ ಕೋಟೆ.",
                "description": "ಯಾದವ ಅರಸರಿಂದ ನಿರ್ಮಿಸಲ್ಪಟ್ಟು ನಂತರ ಬಹುಮನಿ ಸುಲ್ತಾನರಿಂದ ಬಲಪಡಿಸಲ್ಪಟ್ಟ ಈ ಗಿರಿ ಕೋಟೆಯು ಮೂರು ಸುತ್ತಿನ ಕಲ್ಲಿನ ಗೋಡೆಗಳು, ಬೃಹತ್ ಕಾವಲು ಗೋಪುರಗಳು ಮತ್ತು ಪ್ರಾಚೀನ ನೀರಿನ ಹೊಂಡಗಳನ್ನು ಒಳಗೊಂಡಿದೆ.",
                "how_to_reach": "ಯಾದಗಿರಿ ನಗರದಲ್ಲಿದೆ, ಯಾದಗಿರಿ ರೈಲ್ವೆ ನಿಲ್ದಾಣದಿಂದ ಕೇವಲ 1.5 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಬೆಟ್ಟವನ್ನು ಹತ್ತಲು ಮೆಟ್ಟಿಲುಗಳಿವೆ; ಮುಂಜಾನೆಯ ಸಮಯದಲ್ಲಿ ಭೇಟಿ ನೀಡುವುದು ಸೂಕ್ತ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Yadgir District Administration Official Portal",
                "source_url": "https://yadgir.nic.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official district portal",
                "attribution_required": True
            }
        ]
    },

    # 14. Additional High-Value Destination: Aihole Durga Temple (KA-BAG)
    {
        "id": "22222222-2222-4222-8222-222222222214",
        "slug": "aihole-durga-temple",
        "district_code": "KA-BAG",
        "category": "architecture",
        "latitude": 16.0200,
        "longitude": 75.8820,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 100,
        "entry_fee_min_inr": 25.0,
        "entry_fee_max_inr": 25.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Aihole Durga Temple & Heritage Complex",
                "summary": "World-renowned apsidal temple hailed as the cradle of Hindu rock and structural architecture.",
                "description": "Dating to the late 7th century CE, the Durga Temple features a unique apsidal (horseshoe-shaped) sanctum inspired by Buddhist chaitya halls. Its peristyle corridor is lined with celebrated sculptures of Shiva, Vishnu, and Durga Mahishasuramardini.",
                "how_to_reach": "Situated 35 km from Badami and 13 km from Pattadakal in Bagalkote district.",
                "accessibility_notes": "Manicured ASI gardens with stone pathways; wheelchair friendly across the primary complex.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಐಹೊಳೆ ದುರ್ಗಾ ದೇವಾಲಯ ಸಮುಚ್ಚಯ",
                "summary": "ಭಾರತೀಯ ದೇವಾಲಯ ವಾಸ್ತುಶಿಲ್ಪದ ತೊಟ್ಟಿಲು ಎಂದು ಕರೆಸಿಕೊಳ್ಳುವ ಐತಿಹಾಸಿಕ ಗಜಪೃಷ್ಠಾಕಾರದ ದೇಗುಲ.",
                "description": "7ನೇ ಶತಮಾನದ ಬಾದಾಮಿ ಚಾಲುಕ್ಯರ ಅಪೂರ್ವ ಕಲಾಕೃತಿಯಾದ ಈ ದೇವಾಲಯವು ವಿಶಿಷ್ಟ ಗಜಪೃಷ್ಠಾಕಾರದ ಗರ್ಭಗುಡಿ ಹೊಂದಿದೆ. ಇಲ್ಲಿನ ಕಂಬಗಳಲ್ಲಿರುವ ಮಹಿಷಾಸುರಮರ್ದಿನಿ, ಶಿವ ಮತ್ತು ವಿಷ್ಣುವಿನ ಶಿಲ್ಪಗಳು ವಿಶ್ವವಿಖ್ಯಾತವಾಗಿವೆ.",
                "how_to_reach": "ಬಾಗಲಕೋಟೆ ಜಿಲ್ಲೆಯ ಬಾದಾಮಿಯಿಂದ 35 ಕಿ.ಮೀ ಮತ್ತು ಪಟ್ಟದಕಲ್ಲಿನಿಂದ 13 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಎ.ಎಸ್.ಐ ಸಂರಕ್ಷಿತ ಉದ್ಯಾನವನವಿದೆ; ಸುಗಮ ಕಾಲುದಾರಿಗಳ ಸೌಲಭ್ಯವಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Dharwad Circle",
                "source_url": "https://asidharwadcircle.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "National protected monument",
                "attribution_required": True
            }
        ]
    },

    # 15. Additional High-Value Destination: Mirjan Fort (KA-UKN)
    {
        "id": "22222222-2222-4222-8222-222222222215",
        "slug": "mirjan-fort",
        "district_code": "KA-UKN",
        "category": "heritage",
        "latitude": 14.4920,
        "longitude": 74.4230,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": True,
        "estimated_visit_minutes": 75,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Mirjan Fort",
                "summary": "16th-century laterite coastal fort on the Aghanashini River built by Queen Chennabhairadevi.",
                "description": "Renowned for its double-walled laterite ramparts, moats, and secret passages, Mirjan Fort was the seat of Queen Chennabhairadevi, known to Portuguese traders as the 'Pepper Queen' (Raina de Pimenta). It is draped in vibrant green moss post-monsoon.",
                "how_to_reach": "Located 22 km south of Gokarna and 11 km north of Kumta along NH 66.",
                "accessibility_notes": "Level lawn inside the fort gates; rampart walks have short stone staircases.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಮಿರ್ಜಾನ್ ಕೋಟೆ",
                "summary": "ಮೆಣಸಿನ ರಾಣಿ ಚೆನ್ನಭೈರಾದೇವಿ ಆಳ್ವಿಕೆಯಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಅಘನಾಶಿನಿ ನದಿತೀರದ ಕೆಂಪು ಕಲ್ಲಿನ ಕೋಟೆ.",
                "description": "16ನೇ ಶತಮಾನದಲ್ಲಿ ಗೇರುಸೊಪ್ಪೆಯ ರಾಣಿ ಚೆನ್ನಭೈರಾದೇವಿಯಿಂದ ನಿರ್ಮಿಸಲ್ಪಟ್ಟ ಈ ಕೋಟೆಯು ತನ್ನ ಸುಂದರ ಕೆಂಪು ಜಂಬಿಟ್ಟಿಗೆ ಕಲ್ಲಿನ ರಚನೆಗೆ ಹೆಸರಾಗಿದೆ. ಮಳೆಗಾಲದ ನಂತರ ಕೋಟೆಯ ಗೋಡೆಗಳು ಹಸಿರು ಹುಲ್ಲಿನಿಂದ ಆವೃತವಾಗಿ ರಮಣೀಯವಾಗಿ ಕಾಣುತ್ತವೆ.",
                "how_to_reach": "ಗೋಕರ್ಣದಿಂದ ದಕ್ಷಿಣಕ್ಕೆ 22 ಕಿ.ಮೀ ಮತ್ತು ಕುಮಟಾದಿಂದ 11 ಕಿ.ಮೀ ದೂರದಲ್ಲಿ ರಾಷ್ಟ್ರೀಯ ಹೆದ್ದಾರಿ 66 ರ ಬಳಿ ಇದೆ.",
                "accessibility_notes": "ಕೋಟೆಯ ಪ್ರವೇಶದ್ವಾರ ಸುಗಮವಾಗಿದೆ; ಕೋಟೆಯ ಗೋಡೆಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಮೆಟ್ಟಿಲುಗಳಿವೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Dharwad Circle",
                "source_url": "https://asidharwadcircle.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "State heritage monument",
                "attribution_required": True
            }
        ]
    },

    # 16. Additional High-Value Destination: Belagavi Fort & Kamal Basti (KA-BLG)
    {
        "id": "22222222-2222-4222-8222-222222222216",
        "slug": "belagavi-fort-kamal-basti",
        "district_code": "KA-BLG",
        "category": "architecture",
        "latitude": 15.8590,
        "longitude": 74.5220,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 90,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Belagavi Fort & Kamal Basti",
                "summary": "Historic 1204 CE moated fortress housing the exquisite Kamal Basti lotus-ceiling Jain temple.",
                "description": "Originally constructed by Jaya Raya of the Ratta dynasty, Belagavi Fort is encircled by a deep moat. Inside lies Kamal Basti, an exquisite Chalukyan black stone temple renowned for its 72-petal inverted lotus carving in the central dome ceiling.",
                "how_to_reach": "Located in the heart of Belagavi city, 2 km from Belagavi Central Bus Stand.",
                "accessibility_notes": "Paved pathways and shaded courtyard gardens; accessible to all visitors.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಬೆಳಗಾವಿ ಕೋಟೆ ಮತ್ತು ಕಮಲ ಬಸದಿ",
                "summary": "1204 ರಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಕಮಲದ ಹೂವಿನ ಆಕಾರದ ಛಾವಣಿ ಹೊಂದಿರುವ ಐತಿಹಾಸಿಕ ಜೈನ ದೇಗುಲ ಮತ್ತು ಕೋಟೆ.",
                "description": "ರಟ್ಟ ರಾಜವಂಶಸ್ಥರಿಂದ ನಿರ್ಮಿತವಾದ ಈ ಕೋಟೆಯು ಆಳವಾದ ಕಂದಕವನ್ನು ಹೊಂದಿದೆ. ಕೋಟೆಯೊಳಗಿರುವ ಕಮಲ ಬಸದಿಯು ತನ್ನ ಕಪ್ಪು ಶಿಲೆಯ 72 ದಳಗಳ ತಲೆಕೆಳಗಾದ ಕಮಲದ ಕೆತ್ತನೆಯ ಭವ್ಯ ಛಾವಣಿಗೆ ಜಗತ್ಪ್ರಸಿದ್ಧವಾಗಿದೆ.",
                "how_to_reach": "ಬೆಳಗಾವಿ ನಗರದ ಕೇಂದ್ರಭಾಗದಲ್ಲಿದೆ, ಕೇಂದ್ರ ಬಸ್ ನಿಲ್ದಾಣದಿಂದ ಕೇವಲ 2 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಕೋಟೆಯ ಒಳಗೆ ಸುಸಜ್ಜಿತ ರಸ್ತೆಗಳಿವೆ; ವೀಕ್ಷಣೆಗೆ ಸುಲಭವಾಗಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Dharwad Circle",
                "source_url": "https://asidharwadcircle.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "National heritage monument",
                "attribution_required": True
            }
        ]
    },

    # 17. Additional High-Value Destination: St. Philomena's Cathedral (KA-MYS)
    {
        "id": "22222222-2222-4222-8222-222222222217",
        "slug": "st-philomenas-cathedral",
        "district_code": "KA-MYS",
        "category": "architecture",
        "latitude": 12.3210,
        "longitude": 76.6580,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 60,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "St. Philomena's Cathedral",
                "summary": "Towering Neo-Gothic cathedral inspired by Germany's Cologne Cathedral with twin 175-foot spires.",
                "description": "Constructed in 1936 under Maharaja Nalwadi Krishnaraja Wadiyar, this magnificent cathedral features French stained glass windows depicting the life of Christ, beautiful marble altars, and an underground crypt holding the relics of Saint Philomena.",
                "how_to_reach": "Located in northern Mysuru on Ashoka Road, 2 km from Mysore Palace.",
                "accessibility_notes": "Ramp access provided at entrance; quiet prayer area within the cathedral.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಸೇಂಟ್ ಫಿಲೋಮಿನಾ ಚರ್ಚ್ (ಮೈಸೂರು)",
                "summary": "ಜರ್ಮನಿಯ ಕಲೋನ್ ಕ್ಯಾಥೆಡ್ರಲ್ ಮಾದರಿಯಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ 175 ಅಡಿ ಎತ್ತರದ ಭವ್ಯ ಗೋಪುರಗಳ ಗೋಥಿಕ್ ಶೈಲಿಯ ದೇವಾಲಯ.",
                "description": "1936 ರಲ್ಲಿ ನಾಲ್ವಡಿ ಕೃಷ್ಣರಾಜ ಒಡೆಯರ್ ಕಾಲದಲ್ಲಿ ನಿರ್ಮಿಸಲಾದ ಈ ಸುಂದರ ಚರ್ಚ್ ಯುರೋಪಿಯನ್ ಗಾಜಿನ ಚಿತ್ರಕಲೆಗಳು ಮತ್ತು ಅದ್ಭುತ ವಾಸ್ತುಶಿಲ್ಪಕ್ಕೆ ಹೆಸರುವಾಸಿ. ಕೆಳಮಹಡಿಯಲ್ಲಿ ಸೈಂಟ್ ಫಿಲೋಮಿನಾ ಅವರ ಪವಿತ್ರ ಅವಶೇಷಗಳ ನೆಲಮನೆ ಇದೆ.",
                "how_to_reach": "ಮೈಸೂರಿನ ಅಶೋಕ ರಸ್ತೆಯಲ್ಲಿದೆ, ಮೈಸೂರು ಅರಮನೆಯಿಂದ ಕೇವಲ 2 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಪ್ರವೇಶದ್ವಾರದಲ್ಲಿ ವೀಲ್‌ಚೇರ್ ರ‍್ಯಾಂಪ್ ಸೌಲಭ್ಯವಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Mysuru Tourism Official Directory",
                "source_url": "https://mysuru.nic.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official district portal",
                "attribution_required": True
            }
        ]
    },

    # 18. Additional High-Value Destination: Tipu Sultan's Summer Palace (KA-BLRU)
    {
        "id": "22222222-2222-4222-8222-222222222218",
        "slug": "tipu-sultans-summer-palace",
        "district_code": "KA-BLRU",
        "category": "heritage",
        "latitude": 12.9592,
        "longitude": 77.5738,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 60,
        "entry_fee_min_inr": 20.0,
        "entry_fee_max_inr": 20.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Tipu Sultan's Summer Palace",
                "summary": "1791 Indo-Islamic teakwood palace renowned for ornate carved pillars, arches, and museum.",
                "description": "Completed in 1791 by Tipu Sultan as his 'Rashk-e-Jannat' (Envy of Heaven), the two-storey palace is built almost entirely of carved teakwood. It features floral fresco work on the walls and houses a museum showcasing 18th-century rockets, coins, and paintings.",
                "how_to_reach": "Located near Kalasipalya, Chamrajpet, Bengaluru, walking distance from Krishna Rajendra Market metro station.",
                "accessibility_notes": "Ground floor and gardens wheelchair accessible; first floor reached by wooden stairs.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಟಿಪ್ಪು ಸುಲ್ತಾನರ ಬೇಸಿಗೆ ಅರಮನೆ",
                "summary": "1791 ರಲ್ಲಿ ತೇಗದ ಮರದಿಂದ ನಿರ್ಮಿಸಲಾದ ಸುಂದರ ಇಂಡೋ-ಇಸ್ಲಾಮಿಕ್ ಶೈಲಿಯ ಅರಮನೆ ಮತ್ತು ವಸ್ತುಸಂಗ್ರಹಾಲಯ.",
                "description": "1791 ರಲ್ಲಿ ಪೂರ್ಣಗೊಂಡ ಈ ಎರಡು ಅಂತಸ್ತಿನ ಅರಮನೆಯು ಸಂಪೂರ್ಣವಾಗಿ ನಯವಾದ ತೇಗದ ಮರದಿಂದ ಕೂಡಿದೆ. ಗೋಡೆಗಳ ಮೇಲಿನ ಹೂವಿನ ಚಿತ್ರಕಲೆಗಳು ಮತ್ತು ಟಿಪ್ಪುವಿನ ರಾಕೆಟ್‌ಗಳು, ನಾಣ್ಯಗಳು ಮತ್ತು ಕತ್ತಿಗಳ ಪ್ರದರ್ಶನ ಇಲ್ಲಿನ ಪ್ರಮುಖ ಆಕರ್ಷಣೆ.",
                "how_to_reach": "ಬೆಂಗಳೂರಿನ ಚಾಮರಾಜಪೇಟೆಯಲ್ಲಿದೆ, ಕೆ.ಆರ್. ಮಾರ್ಕೆಟ್ ಮೆಟ್ರೋ ನಿಲ್ದಾಣದಿಂದ ನಡೆದು ಹೋಗುವ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ನೆಲಮಹಡಿ ಮತ್ತು ಉದ್ಯಾನ ಸುಗಮವಾಗಿದೆ; ಮೊದಲ ಮಹಡಿಗೆ ಮರದ ಮೆಟ್ಟಿಲುಗಳಿವೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Bengaluru Circle",
                "source_url": "https://asibengalurucircle.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "National protected monument",
                "attribution_required": True
            }
        ]
    },

    # 19. Additional High-Value Destination: Keladi Rameshwara Temple (KA-SHI)
    {
        "id": "22222222-2222-4222-8222-222222222219",
        "slug": "keladi-rameshwara-temple",
        "district_code": "KA-SHI",
        "category": "architecture",
        "latitude": 14.2180,
        "longitude": 75.0110,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": True,
        "estimated_visit_minutes": 60,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Keladi Rameshwara Temple",
                "summary": "16th-century Keladi Nayaka capital temple with unique Gandaberunda twin-headed bird ceiling.",
                "description": "Built during the reign of Chaudappa Nayaka, the temple blends Hoysala, Kadamba, and Dravida styles. The central ceiling features an exquisite carving of Gandaberunda (the mythical double-headed bird symbol of Karnataka) clutching elephants in its talons.",
                "how_to_reach": "Located 8 km north of Sagar town in Shivamogga district.",
                "accessibility_notes": "Quiet village surroundings with level stone walkways.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಕೆಳದಿ ರಾಮೇಶ್ವರ ದೇವಾಲಯ",
                "summary": "ಕೆಳದಿ ನಾಯಕರ ರಾಜಧಾನಿಯಲ್ಲಿದ್ದ, ಛಾವಣಿಯಲ್ಲಿ ಗಂಡಭೇರುಂಡದ ಕೆತ್ತನೆ ಹೊಂದಿರುವ ಐತಿಹಾಸಿಕ ದೇಗುಲ.",
                "description": "ಹೊಯ್ಸಳ ಮತ್ತು ದ್ರಾವಿಡ ಶೈಲಿಯ ಸಮ್ಮಿಶ್ರಣವಾಗಿರುವ ಈ ದೇವಾಲಯವು ಕೆಳದಿ ಸಂಸ್ಥಾನದ ಇತಿಹಾಸಕ್ಕೆ ಸಾಕ್ಷಿ. ದೇವಾಲಯದ ನವರಂಗದ ಛಾವಣಿಯಲ್ಲಿ ಆನೆಗಳನ್ನು ಹಿಡಿದಿರುವ ಕರ್ನಾಟಕದ ಲಾಂಛನ ಗಂಡಭೇರುಂಡದ ಕೆತ್ತನೆ ಅತ್ಯಂತ ಆಕರ್ಷಕವಾಗಿದೆ.",
                "how_to_reach": "ಶಿವಮೊಗ್ಗ ಜಿಲ್ಲೆಯ ಸಾಗರ ಪಟ್ಟಣದಿಂದ ಉತ್ತರಕ್ಕೆ ಕೇವಲ 8 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಗ್ರಾಮೀಣ ಪರಿಸರದ ಶಾಂತ ದೇವಾಲಯ; ಪ್ರವೇಶ ಸುಲಭವಾಗಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Tourism - Keladi",
                "source_url": "https://karnatakatourism.org/tourist-place/keladi/",
                "source_type": "tourism_board",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "State tourism official registry",
                "attribution_required": True
            }
        ]
    },

    # 20. Additional High-Value Destination: Male Mahadeshwara Hills (KA-CHA)
    {
        "id": "22222222-2222-4222-8222-222222222220",
        "slug": "male-mahadeshwara-hills",
        "district_code": "KA-CHA",
        "category": "spiritual_cultural",
        "latitude": 11.9960,
        "longitude": 77.5620,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 180,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Male Mahadeshwara Hills (MM Hills)",
                "summary": "Sacred forested hill range in the Eastern Ghats dedicated to Lord Mahadeshwara.",
                "description": "Rising 3,000 feet amidst 77 hillocks surrounded by deciduous forests and wildlife corridors, MM Hills is a major pilgrimage centre. Pilgrims trek through scenic mountain passes to seek blessings at the ancient Sri Male Mahadeshwara Swamy temple.",
                "how_to_reach": "Situated 80 km from Kollegal and 150 km south-east of Mysuru via scenic ghat roads.",
                "accessibility_notes": "Ghat road leads directly to temple town; battery vehicle services available for elderly pilgrims.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಮಲೆ ಮಹಾದೇಶ್ವರ ಬೆಟ್ಟ (ಎಂ.ಎಂ. ಹಿಲ್ಸ್)",
                "summary": "77 ಬೆಟ್ಟಗಳ ನಡುವೆ ದಟ್ಟ ಕಾನನದ ಮಡಿಲಲ್ಲಿ ನೆಲೆಸಿರುವ ಮಾದಪ್ಪನ ಪವಿತ್ರ ಯಾತ್ರಾ ಕ್ಷೇತ್ರ.",
                "description": "ಪೂರ್ವ ಘಟ್ಟಗಳ ಸಮೃದ್ಧ ಅರಣ್ಯದ ನಡುವೆ ಸಮುದ್ರ ಮಟ್ಟದಿಂದ 3,000 ಅಡಿ ಎತ್ತರದಲ್ಲಿರುವ ಈ ಪುಣ್ಯಕ್ಷೇತ್ರವು ಲಕ್ಷಾಂತರ ಭಕ್ತರ ಆರಾಧ್ಯ ದೈವ. ಸುಂದರ ಗಿರಿಶ್ರೇಣಿಗಳು, ಚಾರಣ ಮಾರ್ಗಗಳು ಮತ್ತು ಪ್ರಶಾಂತ ಪರಿಸರ ಇಲ್ಲಿನ ಆಕರ್ಷಣೆ.",
                "how_to_reach": "ಕೊಳ್ಳೇಗಾಲದಿಂದ 80 ಕಿ.ಮೀ ಮತ್ತು ಮೈಸೂರಿನಿಂದ 150 ಕಿ.ಮೀ ದೂರದಲ್ಲಿ ಸುಂದರ ಘಾಟಿ ರಸ್ತೆಯಲ್ಲಿದೆ.",
                "accessibility_notes": "ಬೆಟ್ಟದ ಮೇಲೆ ದೇವಾಲಯದವರೆಗೆ ರಸ್ತೆಯಿದೆ; ಹಿರಿಯರಿಗೆ ಬ್ಯಾಟರಿ ವಾಹನದ ಸೌಲಭ್ಯವಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Sri Male Mahadeshwara Swamy Kshetra Development Authority",
                "source_url": "https://mmhills.karnataka.gov.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "Official temple authority portal",
                "attribution_required": True
            }
        ]
    },

    # 21. Additional High-Value Destination: Anthargange Caves (KA-KOL)
    {
        "id": "22222222-2222-4222-8222-222222222221",
        "slug": "anthargange-caves",
        "district_code": "KA-KOL",
        "category": "adventure",
        "latitude": 13.1420,
        "longitude": 78.1020,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": True,
        "estimated_visit_minutes": 150,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Anthargange Caves & Spring",
                "summary": "Natural perennial underground spring emerging through volcanic boulders with spelunking caves.",
                "description": "Known as the 'Kashi of the South', Anthargange features a temple where water flows continuously from the mouth of a stone bull (Basava) from an unknown subterranean source. The surrounding hills offer thrilling granite boulder cave crawls and trekking trails.",
                "how_to_reach": "Located 4 km west of Kolar town and 68 km from Bengaluru via NH 75.",
                "accessibility_notes": "Paved stone steps lead to the temple; cave exploration requires crawling and good physical agility.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಅಂತರಗಂಗೆ ಗುಹೆಗಳು ಮತ್ತು ಜಲಧಾರೆ",
                "summary": "ಬಂಡೆಗಳ ನಡುವಿನಿಂದ ನಿರಂತರವಾಗಿ ಹರಿಯುವ ಪವಿತ್ರ ನೈಸರ್ಗಿಕ ಜಲಧಾರೆ ಮತ್ತು ರೋಮಾಂಚಕ ಗುಹೆಗಳು.",
                "description": "ದಕ್ಷಿಣ ಕಾಶಿ ಎಂದೇ ಪ್ರಸಿದ್ಧವಾದ ಅಂತರಗಂಗೆಯಲ್ಲಿ ಕಲ್ಲಿನ ಬಸವನ ಬಾಯಿಯಿಂದ ನಿರಂತರವಾಗಿ ನೀರು ಹರಿಯುತ್ತದೆ. ಇದರ ಸುತ್ತಮುತ್ತಲಿನ ಬೃಹತ್ ಬಂಡೆಗಲ್ಲುಗಳ ನಡುವೆ ನೈಸರ್ಗಿಕ ಗುಹೆಗಳಿದ್ದು, ಚಾರಣಿಗರಿಗೆ ಅತ್ಯಂತ ನೆಚ್ಚಿನ ಸಾಹಸ ತಾಣವಾಗಿದೆ.",
                "how_to_reach": "ಕೋಲಾರ ನಗರದಿಂದ 4 ಕಿ.ಮೀ ಮತ್ತು ಬೆಂಗಳೂರಿನಿಂದ 68 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ದೇವಾಲಯದವರೆಗೆ ಮೆಟ್ಟಿಲುಗಳಿವೆ; ಗುಹೆಗಳ ಪರಿಶೋಧನೆಗೆ ಸೂಕ್ತ ದೈಹಿಕ ಕ್ಷಮತೆ ಅಗತ್ಯ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Tourism - Anthargange",
                "source_url": "https://karnatakatourism.org/tourist-place/anthargange/",
                "source_type": "tourism_board",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "State tourism official registry",
                "attribution_required": True
            }
        ]
    },

    # 22. Shravanabelagola Gommateshwara (KA-HAS)
    {
        "id": "22222222-2222-4222-8222-222222222222",
        "slug": "shravanabelagola-gommateshwara",
        "district_code": "KA-HAS",
        "category": "spiritual_cultural",
        "latitude": 12.8575,
        "longitude": 76.4855,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 150,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Shravanabelagola Gommateshwara Statue",
                "summary": "World's tallest free-standing monolithic statue of Lord Bahubali (57 ft) sculpted in 981 CE.",
                "description": "Carved out of a single granite block atop Vindhyagiri Hill by Chavundaraya, prime minister of the Western Ganga dynasty, this colossal 57-foot statue depicts Lord Bahubali in meditative kayotsarga posture. It is a premier Jain pilgrimage site famous for the Mahamastakabhisheka festival.",
                "how_to_reach": "Located 50 km from Hassan and 145 km west of Bengaluru via NH 75.",
                "accessibility_notes": "Flight of approximately 650 stone steps cut into granite; doli (palanquin) service available for elderly visitors.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಶ್ರವಣಬೆಳಗೊಳ ಗೊಮ್ಮಟೇಶ್ವರ ಬಾಹುಬಲಿ",
                "summary": "ಕ್ರಿ.ಶ. 981 ರಲ್ಲಿ ಕೆತ್ತಲಾದ ವಿಶ್ವದ ಅತಿ ಎತ್ತರದ 57 ಅಡಿಗಳ ಏಕಶಿಲಾ ಬಾಹುಬಲಿ ಪ್ರತಿಮೆ.",
                "description": "ಗಂಗ ರಾಜವಂಶದ ದಂಡನಾಯಕ ಚಾವುಂಡರಾಯನಿಂದ ವಿಂಧ್ಯಗಿರಿ ಬೆಟ್ಟದ ಮೇಲೆ ಏಕಶಿಲೆಯಲ್ಲಿ ಕೆತ್ತಲ್ಪಟ್ಟ ಈ ಬೃಹತ್ ಪ್ರತಿಮೆಯು ತ್ಯಾಗ ಮತ್ತು ಅಹಿಂಸೆಯ ಸಂಕೇತವಾಗಿದೆ. 12 ವರ್ಷಗಳಿಗೊಮ್ಮೆ ನಡೆಯುವ ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ ಜಗತ್ಪ್ರಸಿದ್ಧವಾಗಿದೆ.",
                "how_to_reach": "ಹಾಸನದಿಂದ 50 ಕಿ.ಮೀ ಮತ್ತು ಬೆಂಗಳೂರಿನಿಂದ ರಾಷ್ಟ್ರೀಯ ಹೆದ್ದಾರಿ 75 ರ ಮೂಲಕ 145 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ಬೆಟ್ಟವನ್ನು ಹತ್ತಲು ಸುಮಾರು 650 ಮೆಟ್ಟಿಲುಗಳಿವೆ; ಹಿರಿಯರಿಗೆ ಡೋಲಿ ವ್ಯವಸ್ಥೆ ಲಭ್ಯವಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Archaeological Survey of India - Bengaluru Circle",
                "source_url": "https://asibengalurucircle.in",
                "source_type": "government_official",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "National heritage monument",
                "attribution_required": True
            }
        ]
    },

    # 23. Murudeshwara Temple & Beach (KA-UKN)
    {
        "id": "22222222-2222-4222-8222-222222222223",
        "slug": "murudeshwara-temple-beach",
        "district_code": "KA-UKN",
        "category": "spiritual_cultural",
        "latitude": 14.0945,
        "longitude": 74.4849,
        "access_status": "open_reported",
        "verification_status": "source_checked",
        "content_status": "published",
        "is_offbeat": False,
        "estimated_visit_minutes": 150,
        "entry_fee_min_inr": 0.0,
        "entry_fee_max_inr": 0.0,
        "currency_code": "INR",
        "active": True,
        "translations": [
            {
                "language_code": "en",
                "name": "Murudeshwara Temple & Coastal Beach",
                "summary": "Iconic coastal peninsula temple hosting the world's second tallest Lord Shiva statue (123 ft).",
                "description": "Perched on Kanduka Hill surrounded by the Arabian Sea on three sides, Murudeshwara is famous for its colossal 123-foot Lord Shiva statue and the 249-foot high 20-storey Raja Gopura equipped with a high-speed lift offering breathtaking coastal views.",
                "how_to_reach": "Located on the Karavali coastline along NH 66, 160 km north of Mangaluru and 80 km south of Gokarna.",
                "accessibility_notes": "Elevator access available to the 18th floor of the Raja Gopura; beach and temple complex wheelchair accessible.",
                "translation_status": "human_reviewed"
            },
            {
                "language_code": "kn",
                "name": "ಮುರುಡೇಶ್ವರ ದೇವಾಲಯ ಮತ್ತು ಕಡಲತೀರ",
                "summary": "ಅರಬ್ಬಿ ಸಮುದ್ರದ ದಂಡೆಯಲ್ಲಿರುವ ವಿಶ್ವದ ಎರಡನೇ ಅತಿ ಎತ್ತರದ 123 ಅಡಿಗಳ ಶಿವನ ಬೃಹತ್ ಪ್ರತಿಮೆ ಮತ್ತು ರಾಜಗೋಪುರ.",
                "description": "ಕಂದುಕ ಗಿರಿಯ ಮೇಲೆ ಮೂರು ಕಡೆ ಸಮುದ್ರದಿಂದ ಆವೃತವಾದ ಈ ಪುಣ್ಯಕ್ಷೇತ್ರವು 123 ಅಡಿಗಳ ಬೃಹತ್ ಶಿವನ ಮೂರ್ತಿ ಮತ್ತು 20 ಅಂತಸ್ತುಗಳ 249 ಅಡಿ ಎತ್ತರದ ಭವ್ಯ ರಾಜಗೋಪುರವನ್ನು ಹೊಂದಿದೆ. ಲಿಫ್ಟ್ ಮೂಲಕ ಗೋಪುರದ ಮೇಲಕ್ಕೆ ಹೋಗಿ ಕಡಲತೀರದ ಸುಂದರ ನೋಟ ಸವಿಯಬಹುದು.",
                "how_to_reach": "ರಾಷ್ಟ್ರೀಯ ಹೆದ್ದಾರಿ 66 ರಲ್ಲಿ ಮಂಗಳೂರಿನಿಂದ 160 ಕಿ.ಮೀ ಮತ್ತು ಗೋಕರ್ಣದಿಂದ 80 ಕಿ.ಮೀ ದೂರದಲ್ಲಿದೆ.",
                "accessibility_notes": "ರಾಜಗೋಪುರದಲ್ಲಿ ಲಿಫ್ಟ್ ಸೌಲಭ್ಯವಿದೆ; ದೇವಾಲಯ ಮತ್ತು ಕಡಲತೀರ ಸುಗಮವಾಗಿದೆ.",
                "translation_status": "human_reviewed"
            }
        ],
        "sources": [
            {
                "source_name": "Karnataka Tourism - Murudeshwar",
                "source_url": "https://karnatakatourism.org/tourist-place/murudeshwar/",
                "source_type": "tourism_board",
                "claim_scope": "all",
                "checked_at": "2026-10-24T00:00:00Z",
                "license_notes": "State tourism official portal",
                "attribution_required": True
            }
        ]
    }
]


def expand_destinations() -> int:
    with open(DESTINATIONS_PATH, encoding="utf-8") as f:
        existing = json.load(f)

    existing_slugs = {d["slug"] for d in existing}
    added_count = 0

    for new_dest in STATEWIDE_NEW_DESTINATIONS:
        if new_dest["slug"] not in existing_slugs:
            existing.append(new_dest)
            existing_slugs.add(new_dest["slug"])
            added_count += 1

    with open(DESTINATIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Successfully added {added_count} destinations. Total now: {len(existing)}")
    return added_count


if __name__ == "__main__":
    expand_destinations()
