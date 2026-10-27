"""Destination Media Validation Utility for Namma Karnataka.

Validates destination media entries against provenance, attribution, licensing,
syntax, deduplication, and bilingual caption standards. Includes optional
--check-online flag for verifying remote HTTP status and content type.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from typing import Any

URL_REGEX = re.compile(
    r"^(?:https?://"
    r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"
    r"localhost|"
    r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"
    r"(?::\d+)?"
    r"(?:/?|[/?]\S+)|/(?:[A-Za-z0-9_.-]+/)*[A-Za-z0-9_.-]+)$",
    re.IGNORECASE,
)

REQUIRED_MEDIA_FIELDS = {
    "id",
    "destination_id",
    "url",
    "thumbnail_url",
    "caption_en",
    "caption_kn",
    "source_name",
    "source_url",
    "license_type",
    "attribution",
    "is_primary",
    "verification_status",
}

VALID_VERIFICATION_STATUSES = {
    "verified_authentic",
    "human_reviewed",
    "source_checked",
    "needs_review",
    "unverified",
}


def validate_destination_media(
    destinations: list[dict[str, Any]],
    check_online: bool = False,
    timeout_sec: int = 5,
) -> list[str]:
    """Validate media objects for all destinations."""
    errors: list[str] = []
    seen_media_ids: set[str] = set()
    primary_urls: dict[str, str] = {}  # url -> destination_id (to detect unintended duplication)

    dest_ids = {d.get("id") for d in destinations if d.get("id")}

    for d_idx, dest in enumerate(destinations):
        dest_id = dest.get("id")
        slug = dest.get("slug", f"dest-{d_idx}")
        en_name = dest.get("translations", [{}])[0].get("name", slug)
        dest_label = f"Destination '{slug}' ({en_name})"

        media_list = dest.get("media", [])
        if not isinstance(media_list, list):
            errors.append(f"{dest_label}: 'media' must be a list")
            continue

        if len(media_list) == 0:
            errors.append(f"{dest_label}: Has no media records")
            continue

        primary_count = 0
        for m_idx, media in enumerate(media_list):
            m_label = f"{dest_label} media #{m_idx + 1}"

            # 1. Required fields
            missing_fields = REQUIRED_MEDIA_FIELDS - set(media.keys())
            if missing_fields:
                errors.append(f"{m_label}: Missing required fields: {sorted(missing_fields)}")

            # 2. Destination reference matches
            m_dest_id = media.get("destination_id")
            if not m_dest_id or m_dest_id != dest_id:
                errors.append(
                    f"{m_label}: media.destination_id '{m_dest_id}' does not match destination.id '{dest_id}'"
                )

            # 3. Media ID uniqueness
            m_id = media.get("id")
            if not m_id:
                errors.append(f"{m_label}: Missing 'id'")
            elif m_id in seen_media_ids:
                errors.append(f"{m_label}: Duplicate media ID '{m_id}'")
            else:
                seen_media_ids.add(m_id)

            # 4. URL Syntax and Provenance Hygiene
            for url_field in ["url", "thumbnail_url", "source_url"]:
                val = media.get(url_field)
                if val is None and url_field == "thumbnail_url" and media.get("verification_status") == "needs_review":
                    continue
                if not val or not isinstance(val, str) or not URL_REGEX.match(val):
                    errors.append(f"{m_label}: Field '{url_field}' has invalid URL '{val}'")
                elif "thumb.wikimedia.org" in val:
                    errors.append(
                        f"{m_label}: Field '{url_field}' uses invalid host 'thumb.wikimedia.org'; must use 'upload.wikimedia.org'"
                    )
                elif "utm_" in val:
                    errors.append(f"{m_label}: Field '{url_field}' contains tracking parameter '{val}'")

            # Source URL must be distinct description page when authentic Commons photo
            if (
                media.get("verification_status") != "needs_review"
                and "wikimedia.org" in (media.get("url") or "")
                and "File:" not in (media.get("source_url") or "")
            ):
                errors.append(f"{m_label}: Commons media must have a description page source_url containing 'File:'")

            # 5. Captions (Bilingual)
            cap_en = media.get("caption_en")
            if not cap_en or not isinstance(cap_en, str) or not cap_en.strip():
                errors.append(f"{m_label}: Missing or empty English caption 'caption_en'")

            cap_kn = media.get("caption_kn")
            if not cap_kn or not isinstance(cap_kn, str) or not cap_kn.strip():
                errors.append(f"{m_label}: Missing or empty Kannada caption 'caption_kn'")

            # 6. Attribution and Source
            attribution = media.get("attribution")
            if not attribution or not isinstance(attribution, str) or not attribution.strip():
                errors.append(f"{m_label}: Missing required 'attribution'")

            source_name = media.get("source_name")
            if not source_name or not isinstance(source_name, str) or not source_name.strip():
                errors.append(f"{m_label}: Missing required 'source_name'")

            # 7. License
            license_type = media.get("license_type")
            if not license_type or not isinstance(license_type, str) or not license_type.strip():
                errors.append(f"{m_label}: Missing required 'license_type'")

            # 8. Primary status & Duplication
            if media.get("is_primary"):
                primary_count += 1
                thumb = media.get("thumbnail_url")
                if thumb:
                    if thumb in primary_urls and primary_urls[thumb] != dest_id:
                        errors.append(
                            f"{m_label}: Primary image URL '{thumb}' is unexpectedly shared with destination '{primary_urls[thumb]}'"
                        )
                    else:
                        primary_urls[thumb] = dest_id

            # 9. Verification status
            v_status = media.get("verification_status")
            if v_status not in VALID_VERIFICATION_STATUSES:
                errors.append(
                    f"{m_label}: Invalid verification_status '{v_status}'. Valid: {VALID_VERIFICATION_STATUSES}"
                )

            # 10. Optional Online Reachability Check
            if check_online:
                thumb = media.get("thumbnail_url")
                if thumb and URL_REGEX.match(thumb):
                    req = urllib.request.Request(
                        thumb,
                        headers={"User-Agent": "NammaKarnatakaTravelPlanner/1.0 (validation)"},
                    )
                    try:
                        with urllib.request.urlopen(req, timeout=timeout_sec) as res:
                            ctype = res.headers.get("Content-Type", "")
                            if res.status != 200:
                                errors.append(f"{m_label}: HTTP status {res.status} for thumbnail_url")
                            elif not ctype.startswith("image/"):
                                errors.append(
                                    f"{m_label}: thumbnail_url returned non-image content type '{ctype}'"
                                )
                    except Exception as exc:
                        errors.append(f"{m_label}: Failed online fetch for thumbnail_url: {exc}")

        if primary_count != 1:
            errors.append(f"{dest_label}: Expected exactly 1 primary media item, found {primary_count}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Namma Karnataka destination media records.")
    parser.add_argument(
        "--destinations",
        type=Path,
        default=Path("data/seed/destinations.json"),
        help="Path to destinations.json",
    )
    parser.add_argument(
        "--check-online",
        action="store_true",
        help="Perform online HTTP check for thumbnail URLs",
    )
    args = parser.parse_args()

    if not args.destinations.exists():
        print(f"Error: Destinations seed file not found: {args.destinations}")
        return 1

    with open(args.destinations, encoding="utf-8") as f:
        destinations = json.load(f)

    print(f"Validating media for {len(destinations)} destinations (check_online={args.check_online})...")
    errors = validate_destination_media(destinations, check_online=args.check_online)

    if errors:
        print(f"\n[FAIL] Found {len(errors)} media validation error(s):")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(f"\n[PASS] All {len(destinations)} destinations have valid, authentic media records!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
