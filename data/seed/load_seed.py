"""Idempotent seed loading utility for Namma Karnataka.

Supports dry-run validation mode and safe upsert on conflict key (slug)
when database connectivity is configured.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

# Ensure project root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Load environment from backend/.env if present
env_path = REPO_ROOT / "backend" / ".env"
if env_path.exists():
    load_dotenv(env_path)

from data.validation.validate_seed import validate_seed_data


class SeedLoadResult:
    """Summary of seed loading operations."""

    def __init__(self) -> None:
        self.districts_count: int = 0
        self.inserted: int = 0
        self.updated: int = 0
        self.skipped: int = 0
        self.errors: list[str] = []

    def to_dict(self) -> dict[str, Any]:
        return {
            "districts_count": self.districts_count,
            "inserted": self.inserted,
            "updated": self.updated,
            "skipped": self.skipped,
            "errors": self.errors,
            "is_success": len(self.errors) == 0,
        }


def apply_seed_to_supabase(
    supabase_url: str,
    service_role_key: str,
    destinations: list[dict[str, Any]],
    districts: list[dict[str, Any]],
) -> list[str]:
    """Idempotently apply canonical seed data to Supabase PostgREST."""
    errors: list[str] = []
    base_url = supabase_url.rstrip("/")
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            # 1. Upsert districts
            res_dist = client.post(f"{base_url}/rest/v1/districts", headers=headers, json=districts)
            if res_dist.status_code not in (200, 201):
                errors.append(f"Failed upserting districts ({res_dist.status_code}): {res_dist.text}")

            # 2. Prepare destination entities
            dest_rows: list[dict[str, Any]] = []
            trans_rows: list[dict[str, Any]] = []
            source_rows: list[dict[str, Any]] = []

            for d in destinations:
                dest_rows.append({
                    "id": d["id"],
                    "slug": d["slug"],
                    "district_code": d["district_code"],
                    "category": d["category"],
                    "latitude": d.get("latitude"),
                    "longitude": d.get("longitude"),
                    "access_status": d.get("access_status", "open_reported"),
                    "verification_status": d.get("verification_status", "source_checked"),
                    "content_status": d.get("content_status", "published"),
                    "is_offbeat": d.get("is_offbeat", False),
                    "estimated_visit_minutes": d.get("estimated_visit_minutes"),
                    "entry_fee_min_inr": d.get("entry_fee_min_inr"),
                    "entry_fee_max_inr": d.get("entry_fee_max_inr"),
                    "currency_code": d.get("currency_code", "INR"),
                    "active": d.get("active", True),
                })

                for t in d.get("translations", []):
                    trans_rows.append({
                        "destination_id": d["id"],
                        "language_code": t["language_code"],
                        "name": t["name"],
                        "summary": t.get("summary"),
                        "description": t.get("description"),
                        "how_to_reach": t.get("how_to_reach"),
                        "accessibility_notes": t.get("accessibility_notes"),
                        "translation_status": t.get("translation_status", "human_reviewed"),
                    })

                for s in d.get("sources", []):
                    source_rows.append({
                        "destination_id": d["id"],
                        "source_name": s["source_name"],
                        "source_url": s.get("source_url"),
                        "source_type": s.get("source_type", "other"),
                        "claim_scope": s.get("claim_scope", "general_info"),
                        "checked_at": s.get("checked_at"),
                        "license_notes": s.get("license_notes"),
                        "attribution_required": s.get("attribution_required", False),
                    })

            # 3. Upsert destinations
            res_dest = client.post(f"{base_url}/rest/v1/destinations", headers=headers, json=dest_rows)
            if res_dest.status_code not in (200, 201):
                errors.append(f"Failed upserting destinations ({res_dest.status_code}): {res_dest.text}")

            # 4. Upsert translations
            res_trans = client.post(
                f"{base_url}/rest/v1/destination_translations", headers=headers, json=trans_rows
            )
            if res_trans.status_code not in (200, 201):
                errors.append(
                    f"Failed upserting destination translations ({res_trans.status_code}): {res_trans.text}"
                )

            # 5. Upsert sources
            res_sources = client.post(
                f"{base_url}/rest/v1/destination_sources", headers=headers, json=source_rows
            )
            if res_sources.status_code not in (200, 201):
                errors.append(
                    f"Failed upserting destination sources ({res_sources.status_code}): {res_sources.text}"
                )

    except Exception as exc:
        errors.append(f"Network error during Supabase seed apply: {exc}")

    return errors


def load_seed_idempotent(
    destinations: list[dict[str, Any]],
    districts: list[dict[str, Any]],
    dry_run: bool = True,
    client: Any | None = None,
    existing_slugs: set[str] | None = None,
) -> SeedLoadResult:
    """Execute idempotent seed loading or dry-run audit.

    In dry-run mode, checks integrity, detects duplicates, and simulates upserts.
    With an active client or existing_slugs, performs idempotent upserts on conflict key `slug`.
    """
    result = SeedLoadResult()
    result.districts_count = len(districts)

    valid_district_codes = {d["code"] for d in districts if "code" in d}
    validation_errors = validate_seed_data(destinations, valid_district_codes)
    if validation_errors:
        result.errors.extend(validation_errors)
        return result

    seen_slugs = set(existing_slugs or set())
    for dest in destinations:
        slug = dest["slug"]
        if slug in seen_slugs:
            result.skipped += 1
            continue
        seen_slugs.add(slug)

        if dry_run or client is None:
            # Simulate insertion in dry-run
            result.inserted += 1
        else:
            # Live database upsert through client interface
            try:
                client.upsert_destination(dest)
                result.inserted += 1
            except Exception as e:
                result.errors.append(f"Failed upserting slug '{slug}': {e}")

    return result


def main() -> int:
    """CLI entrypoint for seed loader."""
    parser = argparse.ArgumentParser(description="Namma Karnataka Idempotent Seed Loader")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Run validation and plan changes without writing to database",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes to the configured database environment",
    )
    parser.add_argument(
        "--target-env",
        type=str,
        default="development",
        choices=["development", "test", "staging"],
        help="Target environment (never production)",
    )

    args = parser.parse_args()
    is_dry_run = not args.apply

    base_dir = Path(__file__).resolve().parent
    destinations_file = base_dir / "destinations.json"
    districts_file = base_dir / "districts.json"

    if not destinations_file.exists() or not districts_file.exists():
        print("ERROR: Seed data files missing from data/seed/", file=sys.stderr)
        return 1

    with open(districts_file, encoding="utf-8") as f:
        districts = json.load(f)

    with open(destinations_file, encoding="utf-8") as f:
        destinations = json.load(f)

    print(
        f"Starting seed process (mode: {'DRY RUN' if is_dry_run else 'APPLY'}, "
        f"target: {args.target_env})..."
    )

    result = load_seed_idempotent(destinations, districts, dry_run=is_dry_run)

    if result.errors:
        print(f"FAILED with {len(result.errors)} validation errors:", file=sys.stderr)
        for err in result.errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    if not is_dry_run:
        supabase_url = os.getenv("SUPABASE_URL")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not service_role_key:
            print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --apply", file=sys.stderr)
            return 1

        print(f"Applying seed data to Supabase at {supabase_url}...")
        apply_errors = apply_seed_to_supabase(supabase_url, service_role_key, destinations, districts)
        if apply_errors:
            print(f"FAILED with {len(apply_errors)} database errors:", file=sys.stderr)
            for err in apply_errors:
                print(f"  - {err}", file=sys.stderr)
            return 1

    print("\n--- Seed Execution Summary ---")
    print(f"  Districts Loaded : {result.districts_count}")
    print(f"  Destinations     : {result.inserted} ready for insert/upsert")
    print(f"  Duplicates / Skip: {result.skipped}")
    print(f"  Status           : {'DRY-RUN VALIDATION PASSED' if is_dry_run else 'APPLIED TO SUPABASE'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
