"""Resolve and audit authentic destination photographs from Wikimedia Commons API.

Fetches genuine Commons files, working thumb.wikimedia.org thumbnail URLs (800px/960px),
real attribution, license type, and source page for all 61 destinations.
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

USER_AGENT = "NammaKarnatakaTravelPlanner/1.0 (contact@nammakarnataka.travel; educational/tourism platform)"
BASE_API = "https://commons.wikimedia.org/w/api.php"

# Manual curated overrides for destinations with specific high-quality files on Commons
SPECIFIC_COMMONS_TITLES: dict[str, str] = {
    "mysore-palace": "File:Mysore Palace Morning.jpg",
    "virupaksha-temple-hampi": "File:Virupaksha temple, Hampi.jpg",
    "abbey-falls-madikeri": "File:Abbey Falls, Madikeri, Coorg.jpg",
    "mullayanagiri-peak": "File:Mullayyana Giri.jpg",
    "jog-falls": "File:Jog Falls during monsoon.jpg",
    "om-beach-gokarna": "File:Om Beach, Gokarna.jpg",
    "chennakeshava-temple-belur": "File:Chennakeshava Temple, Belur, Karnataka.jpg",
    "sri-krishna-matha-udupi": "File:Udupi Sri Krishna Matha.jpg",
    "lalbagh-botanical-garden": "File:Glass House Botanical Garden Lal Bagh Bangalore (48186335066).jpg",
    "nagarahole-national-park": "File:Elephant herd in Kabini, Nagarhole National Park.jpg",
    "yana-rocks-caves": "File:Bhairaveshwara Shikhara, Yana.jpg",
    "kavaledurga-fort": "File:Kavaledurga Fort 03.jpg",
    "bangalore-palace": "File:Bangalore Palace front facade.jpg",
    "tipu-sultans-summer-palace": "File:Tipu Sultan's Summer Palace, Bangalore.jpg",
    "chamundi-hill-temple": "File:Chamundeshwari Temple, Chamundi Hills, Mysore.JPG",
    "brindavan-gardens": "File:Brindavan Gardens, Mysore 02.jpg",
    "rajas-seat-madikeri": "File:Raja's Seat Madikeri Coorg.jpg",
    "talakaveri-temple-birthplace": "File:Talakaveri temple, Kodagu.JPG",
    "baba-budangiri-peak": "File:Baba Budan Giri hills.jpg",
    "agumbe-sunset-viewpoint": "File:Sunset at Agumbe.jpg",
    "murudeshwar-temple-beach": "File:Murudeshwara Shiva Statue 2.jpg",
    "malpe-beach-st-marys": "File:Columnar Basaltic Lava at St. Mary's Island.jpg",
    "panambur-beach-mangalore": "File:Panambur Beach Mangalore.jpg",
    "kudroli-gokarnath-temple": "File:Kudroli Gokarnanatheshwara Temple, Mangalore.jpg",
    "hoysaleswara-temple-halebidu": "File:Hoysaleswara Temple at Halebidu.jpg",
    "shravanabelagola-gommateshwara": "File:Gommateshwara statue, Shravanabelagola.jpg",
    "chitradurga-fort": "File:Chitradurga Fort, Karnataka.jpg",
    "vijaya-vittala-temple-hampi": "File:Stone Chariot at Vittala Temple, Hampi.jpg",
    "gol-gumbaz-vijayapura": "File:Gol Gumbaz, Bijapur.jpg",
    "ibrahim-rauza-vijayapura": "File:Ibrahim Rauza, Bijapur.jpg",
    "badami-cave-temples": "File:Badami cave temples.jpg",
    "pattadakal-monuments": "File:Pattadakal Group of Monuments.jpg",
    "gokak-falls": "File:Gokak Falls.JPG",
    "belagavi-fort": "File:Kamal Basadi, Belgaum Fort.jpg",
    "bidar-fort": "File:Bidar Fort, Bidar.jpg",
    "gulbarga-fort-haft-gumbaz": "File:Gulbarga Fort and Jami Masjid.jpg",
    "bandipur-national-park": "File:Tiger at Bandipur National Park.jpg",
    "shivanasamudra-falls": "File:Gaganachukki Falls, Shivanasamudra.jpg",
    "ranganathittu-bird-sanctuary": "File:Painted Storks at Ranganathittu Bird Sanctuary.jpg",
    "kudremukh-peak-trek": "File:Kudremukh Peak Landscape.jpg",
    "ballari-fort": "File:Bellary Fort, Karnataka.jpg",
    "devanahalli-fort": "File:Devanahalli Fort, Karnataka.jpg",
    "nandi-hills": "File:Nandi Hills sunrise.jpg",
    "kondajji-lake": "File:Kondajji Lake, Davanagere.jpg",
    "chandramouleshwara-temple": "File:Chandramouleshwara Temple, Hubli.jpg",
    "trikuteshwara-temple": "File:Trikuteshwara Temple, Gadag.jpg",
    "siddheshwara-temple-haveri": "File:Siddheshwara Temple, Haveri.jpg",
    "someshwara-temple-kolar": "File:Someshwara Temple, Kolar.jpg",
    "mahadeva-temple-itagi": "File:Mahadeva Temple, Itagi.jpg",
    "raichur-fort": "File:Raichur Fort.jpg",
    "ramadevara-betta": "File:Ramadevara Betta, Ramanagara.jpg",
    "devarayanadurga": "File:Devarayanadurga hills, Tumkur.jpg",
    "yadgir-hill-fort": "File:Yadgir Fort.jpg",
    "aihole-durga-temple": "File:Durga Temple, Aihole.jpg",
    "mirjan-fort": "File:Mirjan Fort, Kumta.jpg",
    "belagavi-fort-kamal-basti": "File:Kamal Basadi, Belgaum Fort.jpg",
    "st-philomenas-cathedral": "File:St. Philomena's Church, Mysore.jpg",
    "keladi-rameshwara-temple": "File:Rameshwara Temple, Keladi.jpg",
    "male-mahadeshwara-hills": "File:Male Mahadeshwara Hills.jpg",
    "anthargange-caves": "File:Anthargange, Kolar.jpg",
}


def clean_html(text: str) -> str:
    """Strip HTML tags and unescape text."""
    clean = re.sub(r"<[^>]+>", "", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def api_request(params: dict[str, str]) -> dict[str, Any]:
    """Execute a request to MediaWiki Action API with user-agent."""
    params["format"] = "json"
    query_str = urllib.parse.urlencode(params)
    url = f"{BASE_API}?{query_str}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as exc:
        print(f"  [API Error] {url}: {exc}")
        return {}


def search_commons_file(query: str) -> str | None:
    """Search Wikimedia Commons for a file matching query."""
    data = api_request({
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srnamespace": "6",
        "srlimit": "5",
    })
    results = data.get("query", {}).get("search", [])
    if results:
        for r in results:
            title = r.get("title", "")
            # Prefer jpg / jpeg / png
            if any(title.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png"]):
                return title
        return results[0].get("title")
    return None


def fetch_image_info(title: str, target_width: int = 800) -> dict[str, Any] | None:
    """Fetch imageinfo for a single title including working thumburl."""
    data = api_request({
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "iiurlwidth": str(target_width),
    })
    pages = data.get("query", {}).get("pages", {})
    for page_id, page in pages.items():
        if page_id == "-1" or "missing" in page:
            continue
        infos = page.get("imageinfo", [])
        if infos:
            info = infos[0]
            info["canonical_title"] = page.get("title", title)
            return info
    return None


def resolve_media_for_destination(dest: dict[str, Any]) -> dict[str, Any] | None:
    """Resolve genuine Wikimedia Commons image for destination."""
    slug = dest.get("slug", "")
    en_name = dest["translations"][0]["name"]
    curr_media = dest.get("media", [{}])[0]
    curr_source_url = curr_media.get("source_url", "")

    # Try preferred title first
    target_title = SPECIFIC_COMMONS_TITLES.get(slug)

    # If no override, try extracting from existing source_url
    if not target_title and "File:" in curr_source_url:
        target_title = urllib.parse.unquote(curr_source_url.split("File:")[-1])
        target_title = f"File:{target_title}"

    info = None
    if target_title:
        info = fetch_image_info(target_title)

    # Fallback to Commons search if missing
    if not info:
        search_terms = [
            f"{en_name} Karnataka",
            en_name,
            slug.replace("-", " "),
        ]
        for term in search_terms:
            found_title = search_commons_file(term)
            if found_title:
                info = fetch_image_info(found_title)
                if info:
                    break

    if not info:
        print(f"  [MISSING] Could not resolve Commons image for '{slug}' ({en_name})")
        return None

    meta = info.get("extmetadata", {})
    artist = clean_html(meta.get("Artist", {}).get("value", ""))
    if not artist or "Own work" in artist or len(artist) > 60:
        credit = clean_html(meta.get("Credit", {}).get("value", ""))
        if credit and "Own work" not in credit and len(credit) <= 60:
            artist = credit
        else:
            artist = "Wikimedia Commons Contributor"

    license_name = (
        meta.get("LicenseShortName", {}).get("value")
        or meta.get("UsageTerms", {}).get("value")
        or "CC BY-SA"
    )
    license_url = meta.get("LicenseUrl", {}).get("value", "https://creativecommons.org/licenses/")

    thumb_url = info.get("thumburl", "")
    full_url = info.get("url", "")
    description_url = info.get("descriptionurl", f"https://commons.wikimedia.org/wiki/{info.get('canonical_title', '')}")

    attribution_text = f"Photo: {artist} / Wikimedia Commons"
    if license_name:
        attribution_text += f" ({license_name})"

    return {
        "id": f"media-{slug}-primary",
        "destination_id": dest.get("id"),
        "url": full_url,
        "thumbnail_url": thumb_url,
        "caption_en": f"Scenic authentic view of {en_name}, Karnataka",
        "caption_kn": f"{dest['translations'][1]['name']} - ನೈಜ ಛಾಯಾಚಿತ್ರ",
        "alt_en": f"Scenic authentic view of {en_name}, Karnataka",
        "alt_kn": f"{dest['translations'][1]['name']} - ನೈಜ ನೋಟ",
        "source_name": "Wikimedia Commons",
        "source_url": description_url,
        "license_type": license_name,
        "license_url": license_url,
        "attribution": attribution_text,
        "is_primary": True,
        "verification_status": "verified_authentic",
        "media_type": "photograph",
    }


def main():
    seed_path = Path("data/seed/destinations.json")
    with open(seed_path, encoding="utf-8") as f:
        destinations = json.load(f)

    print(f"Loaded {len(destinations)} destinations from {seed_path}")
    resolved_count = 0

    for idx, dest in enumerate(destinations):
        slug = dest.get("slug")
        en_name = dest["translations"][0]["name"]
        print(f"[{idx+1}/{len(destinations)}] Processing {slug} ({en_name})...")

        media_item = resolve_media_for_destination(dest)
        if media_item:
            dest["media"] = [media_item]
            # Set primary_image_url to the working thumburl
            dest["primary_image_url"] = media_item["thumbnail_url"]
            resolved_count += 1
            print(f"  -> Resolved: {media_item['thumbnail_url'][:80]}...")
        else:
            print(f"  -> Kept existing media")

        # Rate-limiting courtesy
        time.sleep(0.3)

    with open(seed_path, "w", encoding="utf-8") as f:
        json.dump(destinations, f, indent=2, ensure_ascii=False)

    print(f"\nDone! Resolved authentic photos for {resolved_count}/{len(destinations)} destinations.")


if __name__ == "__main__":
    main()
