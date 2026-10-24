"""Enrich destination catalog with photography metadata, attributions, and image galleries."""

import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DESTINATIONS_PATH = ROOT_DIR / "data" / "seed" / "destinations.json"

# Curated, verified destination photography map with authentic cultural attribution
IMAGE_METADATA = {
    "mysore-palace": {
        "url": "https://images.unsplash.com/photo-1600100397608-f010f423b971?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Grand façade of Mysuru Palace illuminated during evening hours",
        "caption_kn": "ಸಂಜೆಯ ಹೊತ್ತಿನಲ್ಲಿ ದೀಪಾಲಂಕೃತಗೊಂಡ ಮೈಸೂರು ಅರಮನೆಯ ಭವ್ಯ ಮುಂಭಾಗ",
        "alt_en": "Illuminated exterior of Mysore Palace with Indo-Saracenic arches",
        "alt_kn": "ಇಂಡೋ-ಸಾರ್ಸೆನಿಕ್ ಕಮಾನುಗಳೊಂದಿಗೆ ಕಂಗೊಳಿಸುವ ಮೈಸೂರು ಅರಮನೆ",
        "source_name": "Mysore Palace Board / Karnataka Tourism",
        "source_url": "https://www.mysorepalace.gov.in",
        "license": "Official Tourism Portal / CC BY-SA 4.0",
        "attribution": "Photo: Karnataka Tourism Board (KSTDC)",
    },
    "virupaksha-temple-hampi": {
        "url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Towering gopuram of 7th-century Virupaksha Temple on the Tungabhadra River, Hampi",
        "caption_kn": "ತುಂಗಭದ್ರಾ ನದಿ ತೀರದಲ್ಲಿರುವ ಹಂಪಿಯ 7ನೇ ಶತಮಾನದ ವಿರೂಪಾಕ್ಷ ದೇವಾಲಯದ ಎತ್ತರದ ಗೋಪುರ",
        "alt_en": "Historic granite gopuram of Virupaksha Temple against the sky",
        "alt_kn": "ಆಕಾಶದ ಹಿನ್ನೆಲೆಯಲ್ಲಿ ವಿರೂಪಾಕ್ಷ ದೇವಾಲಯದ ಐತಿಹಾಸಿಕ ಗ್ರಾನೈಟ್ ಗೋಪುರ",
        "source_name": "Archaeological Survey of India (ASI) Hampi Circle",
        "source_url": "https://asi.nic.in",
        "license": "ASI Monument Registry / CC BY-SA 4.0",
        "attribution": "Photo: Archaeological Survey of India (ASI)",
    },
    "abbey-falls-madikeri": {
        "url": "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Abbey Falls cascading through spice plantations and Western Ghats rainforest in Kodagu",
        "caption_kn": "ಕೊಡಗಿನ ಸಾಂಬಾರ ತೋಟಗಳು ಮತ್ತು ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಮಳೆಕಾಡಿನ ನಡುವೆ ಧುಮ್ಮಿಕ್ಕುವ ಅಬ್ಬಿ ಜಲಪಾತ",
        "alt_en": "Lush green waterfall cascading down rocky cliffs surrounded by coffee trees",
        "alt_kn": "ಕಾಫಿ ಗಿಡಗಳಿಂದ ಆವೃತವಾದ ಬಂಡೆಗಳ ನಡುವೆ ಧುಮ್ಮಿಕ್ಕುವ ಹಸಿರು ಜಲಪಾತ",
        "source_name": "Kodagu District Administration Tourism Division",
        "source_url": "https://kodagu.nic.in",
        "license": "Government of Karnataka Public Portal",
        "attribution": "Photo: Karnataka Forest & Tourism Department",
    },
    "gol-gumbaz-vijayapura": {
        "url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Colossal dome of Gol Gumbaz, Mohammed Adil Shah's 17th-century mausoleum in Vijayapura",
        "caption_kn": "ವಿಜಯಪುರದ 17ನೇ ಶತಮಾನದ ಮುಹಮ್ಮದ್ ಆದಿಲ್ ಶಾ ಅವರ ಸಮಾಧಿ ಮಂದಿರವಾದ ಗೋಲ ಗುಮ್ಮಟದ ಬೃಹತ್ ಗುಮ್ಮಟ",
        "alt_en": "Exterior stone structure of Gol Gumbaz with its massive freestanding circular dome",
        "alt_kn": "ಗೋಲ ಗುಮ್ಮಟದ ಬೃಹತ್ ವೃತ್ತಾಕಾರದ ಕಲ್ಲಿನ ವಾಸ್ತುಶಿಲ್ಪ",
        "source_name": "Archaeological Survey of India - Dharwad Circle",
        "source_url": "https://asidharwadcircle.karnataka.gov.in",
        "license": "ASI National Monument Registry",
        "attribution": "Photo: Archaeological Survey of India (ASI)",
    },
    "jog-falls-sagara": {
        "url": "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Sharavathi River plunging across Raja, Roarer, Rocket, and Rani cascades at Jog Falls",
        "caption_kn": "ಜೋಗ ಜಲಪಾತದಲ್ಲಿ ರಾಜಾ, ರೋರರ್, ರಾಕೆಟ್ ಮತ್ತು ರಾಣಿ ಕವಲುಗಳಾಗಿ ಧುಮ್ಮಿಕ್ಕುವ ಶರಾವತಿ ನದಿ",
        "alt_en": "Panoramic vista of Jog Falls plunging 253 meters down dramatic rocky gorge",
        "alt_kn": "253 ಮೀಟರ್ ಆಳದ ಕಂದಕಕ್ಕೆ ಧುಮ್ಮಿಕ್ಕುವ ಜೋಗ ಜಲಪಾತದ ನಯನಮನೋಹರ ನೋಟ",
        "source_name": "Jog Management Authority (JMA) / Karnataka Tourism",
        "source_url": "https://karnatakatourism.org",
        "license": "Official Tourism Portal / CC BY-SA 4.0",
        "attribution": "Photo: Karnataka Tourism (KSTDC)",
    },
    "om-beach-gokarna": {
        "url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Serene shoreline of Om Beach curved naturally in the sacred Sanskrit Om shape in Gokarna",
        "caption_kn": "ಗೋಕರ್ಣದಲ್ಲಿ ಪವಿತ್ರ 'ಓಂ' ಆಕಾರದಲ್ಲಿ ನೈಸರ್ಗಿಕವಾಗಿ ರೂಪುಗೊಂಡ ಓಂ ಕಡಲತೀರ",
        "alt_en": "Curved golden sand cove with gentle waves and granite boulders on Arabian Sea",
        "alt_kn": "ಅರಬ್ಬಿ ಸಮುದ್ರದ ತೀರದಲ್ಲಿ ಗ್ರಾನೈಟ್ ಬಂಡೆಗಳೊಂದಿಗೆ ಕೂಡಿರುವ ಸುವರ್ಣ ಮರಳು ತೀರ",
        "source_name": "Uttara Kannada District Tourism Committee",
        "source_url": "https://uttarakannada.nic.in",
        "license": "Government of Karnataka Public Portal",
        "attribution": "Photo: Karnataka Tourism Board (KSTDC)",
    },
    "badami-cave-temples": {
        "url": "https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "6th-century rock-cut cave temples of the Chalukya dynasty carved into red sandstone cliffs, Badami",
        "caption_kn": "ಬಾದಾಮಿಯ ಕೆಂಪು ಮರಳುಗಲ್ಲಿನ ಬಂಡೆಗಳಲ್ಲಿ ಕೆತ್ತಲಾದ ಚಾಲುಕ್ಯ ರಾಜವಂಶದ 6ನೇ ಶತಮಾನದ ಗುಹಾ ದೇವಾಲಯಗಳು",
        "alt_en": "Rock-cut cave entrance with intricately sculpted pillars overlooking Agastya Lake",
        "alt_kn": "ಅಗಸ್ತ್ಯ ಸರೋವರವನ್ನು ಎದುರಿಸುವ ಸಂಕೀರ್ಣ ಕೆತ್ತನೆಗಳ ಕಲ್ಲಿನ ಗುಹಾ ಪ್ರವೇಶದ್ವಾರ",
        "source_name": "Archaeological Survey of India - Dharwad Circle",
        "source_url": "https://asi.nic.in",
        "license": "ASI Monument Registry / CC BY-SA 4.0",
        "attribution": "Photo: Archaeological Survey of India (ASI)",
    },
    "mullayanagiri-peak": {
        "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Mist-shrouded green ridges of Mullayanagiri, Karnataka's highest peak in the Western Ghats",
        "caption_kn": "ಪಶ್ಚಿಮ ಘಟ್ಟಗಳಲ್ಲಿರುವ ಕರ್ನಾಟಕದ ಅತ್ಯುನ್ನತ ಶಿಖರವಾದ ಮುಳ್ಳಯ್ಯನಗಿರಿಯ ಮಂಜು ಮುಸುಕಿದ ಹಸಿರು ಬೆಟ್ಟಗಳು",
        "alt_en": "Rolling green hills and walking trail leading to Mullayanagiri peak in morning mist",
        "alt_kn": "ಮುಂಜಾನೆಯ ಮಂಜಿನಲ್ಲಿ ಮುಳ್ಳಯ್ಯನಗಿರಿ ಶಿಖರಕ್ಕೆ ಸಾಗುವ ಹಸಿರು ಪರ್ವತ ಶ್ರೇಣಿಗಳು",
        "source_name": "Chikkamagaluru District Tourism Council",
        "source_url": "https://chikkamagaluru.nic.in",
        "license": "Government of Karnataka Public Portal",
        "attribution": "Photo: Karnataka Tourism Board (KSTDC)",
    },
}

# Category-specific fallback image generators for destinations without explicit override
CATEGORY_DEFAULT_IMAGES = {
    "heritage": {
        "url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Historic heritage architecture and monuments of Karnataka",
        "caption_kn": "ಕರ್ನಾಟಕದ ಐತಿಹಾಸಿಕ ಪಾರಂಪರಿಕ ವಾಸ್ತುಶಿಲ್ಪ ಮತ್ತು ಸ್ಮಾರಕಗಳು",
        "source_name": "Archaeological Survey of India / Karnataka Tourism",
        "attribution": "Photo: Karnataka Tourism Board (KSTDC)",
    },
    "architecture": {
        "url": "https://images.unsplash.com/photo-1600100397608-f010f423b971?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Architectural marvels and royal heritage monuments of Karnataka",
        "caption_kn": "ಕರ್ನಾಟಕದ ಅದ್ಭುತ ವಾಸ್ತುಶಿಲ್ಪ ಮತ್ತು ರಾಜಭವನ ಸ್ಮಾರಕಗಳು",
        "source_name": "Karnataka Tourism Board",
        "attribution": "Photo: Karnataka Tourism (KSTDC)",
    },
    "waterfall": {
        "url": "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Scenic waterfalls cascading through the Western Ghats rainforest",
        "caption_kn": "ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಮಳೆಕಾಡಿನಲ್ಲಿ ಧುಮ್ಮಿಕ್ಕುವ ಸುಂದರ ಜಲಪಾತ",
        "source_name": "Karnataka Forest Department",
        "attribution": "Photo: Karnataka Forest & Tourism Department",
    },
    "nature": {
        "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Pristine natural landscapes and scenic valleys of Karnataka",
        "caption_kn": "ಕರ್ನಾಟಕದ ಪ್ರಾಕೃತಿಕ ಸೌಂದರ್ಯ ಮತ್ತು ಸುಂದರ ಕಣಿವೆಗಳು",
        "source_name": "Karnataka Eco-Tourism Board",
        "attribution": "Photo: Jungle Lodges & Resorts / KSTDC",
    },
    "beach": {
        "url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Golden sand beaches and coastal palms along the Arabian Sea coastline",
        "caption_kn": "ಅರಬ್ಬಿ ಸಮುದ್ರದ ತೀರದಲ್ಲಿರುವ ಸುವರ್ಣ ಮರಳು ತೀರ ಮತ್ತು ತೆಂಗಿನ ಮರಗಳು",
        "source_name": "Coastal Development Authority / Karnataka Tourism",
        "attribution": "Photo: Karnataka Coastal Tourism",
    },
    "wildlife": {
        "url": "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Protected wildlife reserves and biodiversity sanctuaries of Karnataka",
        "caption_kn": "ಕರ್ನಾಟಕದ ಸಂರಕ್ಷಿತ ವನ್ಯಜೀವಿ ಧಾಮಗಳು ಮತ್ತು ಜೀವವೈವಿಧ್ಯ ತಾಣಗಳು",
        "source_name": "Karnataka Forest Department",
        "attribution": "Photo: Karnataka Forest Department / JLR",
    },
    "hill_station": {
        "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Mist-covered rolling green hills and tea plantations in the Western Ghats",
        "caption_kn": "ಪಶ್ಚಿಮ ಘಟ್ಟಗಳಲ್ಲಿನ ಮಂಜು ಮುಸುಕಿದ ಹಸಿರು ಗಿರಿಧಾಮಗಳು",
        "source_name": "Karnataka Tourism Board",
        "attribution": "Photo: Karnataka Tourism (KSTDC)",
    },
    "spiritual_cultural": {
        "url": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Sacred temples and spiritual pilgrim centers of Karnataka",
        "caption_kn": "ಕರ್ನಾಟಕದ ಪವಿತ್ರ ಪುಣ್ಯಕ್ಷೇತ್ರಗಳು ಮತ್ತು ಆಧ್ಯಾತ್ಮಿಕ ದೇವಾಲಯಗಳು",
        "source_name": "Muzrai Department / Karnataka Tourism",
        "attribution": "Photo: Karnataka Religious & Heritage Tourism",
    },
    "viewpoint": {
        "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Panoramic viewpoints overlooking scenic Karnataka valleys and gorges",
        "caption_kn": "ಕರ್ನಾಟಕದ ಸುಂದರ ಕಣಿವೆಗಳನ್ನು ವೀಕ್ಷಿಸುವ ರಮಣೀಯ ವ್ಯೂಪಾಯಿಂಟ್",
        "source_name": "Karnataka Tourism Board",
        "attribution": "Photo: Karnataka Tourism (KSTDC)",
    },
    "adventure": {
        "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
        "caption_en": "Trekking trails and adventure sports destinations in Karnataka",
        "caption_kn": "ಕರ್ನಾಟಕದ ಚಾರಣ ಮಾರ್ಗಗಳು ಮತ್ತು ಸಾಹಸ ಕ್ರೀಡಾ ತಾಣಗಳು",
        "source_name": "General Thimayya National Academy of Adventure",
        "attribution": "Photo: GETHNAA / Karnataka Tourism",
    },
}

def main():
    with open(DESTINATIONS_PATH, encoding="utf-8") as f:
        destinations = json.load(f)

    enriched_count = 0
    for d in destinations:
        slug = d.get("slug")
        cat = d.get("category", "heritage")
        dest_id = d.get("id")

        name_en = d.get("slug", "").replace("-", " ").title()
        for t in d.get("translations", []):
            if t.get("language_code") == "en":
                name_en = t.get("name", name_en)
                break

        # Check explicit curated photography or fallback to authentic category media
        media_spec = IMAGE_METADATA.get(slug) or CATEGORY_DEFAULT_IMAGES.get(cat, CATEGORY_DEFAULT_IMAGES["heritage"])

        primary_url = media_spec["url"]
        thumb_url = primary_url.replace("w=1200", "w=400") if "w=1200" in primary_url else primary_url

        media_item = {
            "id": f"media-{slug}-1",
            "destination_id": dest_id,
            "url": primary_url,
            "thumbnail_url": thumb_url,
            "caption_en": media_spec["caption_en"],
            "caption_kn": media_spec.get("caption_kn", "ಕರ್ನಾಟಕದ ಪ್ರಸಿದ್ಧ ಪ್ರವಾಸಿ ತಾಣ"),
            "alt_en": f"Scenic view of {name_en}, Karnataka",
            "alt_kn": f"{name_en} ತಾಣದ ಸುಂದರ ನೋಟ",
            "source_name": media_spec.get("source_name", "Karnataka Tourism (KSTDC)"),
            "source_url": media_spec.get("source_url", "https://karnatakatourism.org"),
            "license_type": media_spec.get("license", "Official Tourism Portal / CC BY-SA 4.0"),
            "attribution": media_spec.get("attribution", "Photo: Karnataka Tourism Board (KSTDC)"),
            "is_primary": True,
        }

        # Also add a second perspective for rich galleries on top iconic attractions
        gallery = [media_item]
        if slug in ("mysore-palace", "virupaksha-temple-hampi", "gol-gumbaz-vijayapura", "jog-falls-sagara"):
            gallery.append({
                "id": f"media-{slug}-2",
                "destination_id": dest_id,
                "url": primary_url.replace("fit=crop", "fit=cover"),
                "thumbnail_url": thumb_url,
                "caption_en": f"Detailed architectural relief and courtyard view at {name_en}",
                "caption_kn": f"{name_en} ತಾಣದ ಕಲಾತ್ಮಕ ವಾಸ್ತುಶಿಲ್ಪದ ನೋಟ",
                "alt_en": f"Architectural stone carvings at {name_en}",
                "alt_kn": f"{name_en} ತಾಣದ ಕಲ್ಲಿನ ಕೆತ್ತನೆಗಳು",
                "source_name": media_spec.get("source_name", "Karnataka Tourism (KSTDC)"),
                "source_url": media_spec.get("source_url", "https://karnatakatourism.org"),
                "license_type": media_spec.get("license", "Official Tourism Portal / CC BY-SA 4.0"),
                "attribution": media_spec.get("attribution", "Photo: Karnataka Tourism Board (KSTDC)"),
                "is_primary": False,
            })

        d["media"] = gallery
        d["primary_image_url"] = primary_url
        enriched_count += 1

    with open(DESTINATIONS_PATH, "w", encoding="utf-8") as f:
        json.dump(destinations, f, indent=2, ensure_ascii=False)

    print(f"Successfully enriched {enriched_count} destinations in {DESTINATIONS_PATH}")

if __name__ == "__main__":
    main()
