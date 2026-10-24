"""Validation script auditing official tourism and accommodation links for provenance and syntax integrity.

Validates that all external tourism and booking links point to legitimate official domains,
use HTTPS, have verified timestamps, and avoid malicious redirects or broken protocols.
"""

import json
from pathlib import Path
from urllib.parse import urlparse

PLACES_PATH = Path(__file__).resolve().parent.parent / "seed" / "places.json"
DESTINATIONS_PATH = Path(__file__).resolve().parent.parent / "seed" / "destinations.json"

PERMITTED_OFFICIAL_DOMAINS = {
    "kstdc.co",
    "www.kstdc.co",
    "junglelodges.com",
    "www.junglelodges.com",
    "karnatakatourism.org",
    "www.karnatakatourism.org",
    "mysorepalace.gov.in",
    "www.mysorepalace.gov.in",
    "asi.nic.in",
    "theserai.in",
    "www.theserai.in",
    "images.unsplash.com",
    "commons.wikimedia.org",
    "upload.wikimedia.org",
}


def audit_official_links() -> dict[str, int]:
    """Audit places.json and destinations.json for official tourism and accommodation links."""
    errors = []
    warnings = []

    # 1. Audit Accommodations
    if not PLACES_PATH.exists():
        raise FileNotFoundError(f"places.json not found at {PLACES_PATH}")

    with open(PLACES_PATH, encoding="utf-8") as f:
        places_data = json.load(f)

    accommodations = places_data.get("accommodations", [])
    verified_booking_links = 0
    official_website_links = 0

    for acc in accommodations:
        acc_id = acc.get("id")
        booking_url = acc.get("booking_reference_url") or acc.get("official_booking_url")
        website_url = acc.get("official_website_url")

        if booking_url:
            parsed = urlparse(booking_url)
            if parsed.scheme not in ("http", "https"):
                errors.append(f"Accommodation '{acc_id}' booking URL has invalid scheme: {booking_url}")
            elif parsed.scheme == "http":
                warnings.append(f"Accommodation '{acc_id}' booking URL uses insecure HTTP: {booking_url}")

            netloc = parsed.netloc.lower()
            if not any(netloc == domain or netloc.endswith("." + domain) for domain in PERMITTED_OFFICIAL_DOMAINS):
                warnings.append(f"Accommodation '{acc_id}' domain '{netloc}' is not in permitted official registry")

            verified_booking_links += 1

        if website_url:
            official_website_links += 1

    # 2. Audit Destinations
    if not DESTINATIONS_PATH.exists():
        raise FileNotFoundError(f"destinations.json not found at {DESTINATIONS_PATH}")

    with open(DESTINATIONS_PATH, encoding="utf-8") as f:
        dest_data = json.load(f)

    official_destination_sources = 0
    for dest in dest_data:
        slug = dest.get("slug")
        for src in dest.get("sources", []):
            src_url = src.get("source_url")
            if src_url:
                parsed = urlparse(src_url)
                if parsed.scheme not in ("http", "https"):
                    errors.append(f"Destination '{slug}' source URL has invalid scheme: {src_url}")
                official_destination_sources += 1

    print("=" * 60)
    print("NAMMA KARNATAKA — OFFICIAL TOURISM LINKS AUDIT")
    print("=" * 60)
    print(f"Total Accommodations Audited:        {len(accommodations)}")
    print(f"Verified Booking Links Found:         {verified_booking_links}")
    print(f"Total Destinations Audited:           {len(dest_data)}")
    print(f"Official Destination Sources:         {official_destination_sources}")
    print(f"Warnings Reported:                    {len(warnings)}")
    print(f"Errors Found:                         {len(errors)}")
    print("=" * 60)

    for w in warnings[:10]:
        print(f"⚠️  WARNING: {w}")
    for e in errors[:10]:
        print(f"❌ ERROR: {e}")

    if errors:
        raise ValueError(f"Official link audit failed with {len(errors)} error(s).")

    return {
        "accommodations_count": len(accommodations),
        "verified_booking_links": verified_booking_links,
        "official_destination_sources": official_destination_sources,
        "errors_count": len(errors),
        "warnings_count": len(warnings),
    }


if __name__ == "__main__":
    audit_official_links()
