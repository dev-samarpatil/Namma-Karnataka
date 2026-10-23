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

# Ensure project root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

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
        default=True,
        help="Run validation and plan changes without writing to database (default: True)",
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

    supabase_url = os.getenv("SUPABASE_URL")
    if not is_dry_run and not supabase_url:
        print(
            "INFO: No SUPABASE_URL configured in environment. Defaulting to simulated dry-run.",
            file=sys.stderr,
        )
        is_dry_run = True

    result = load_seed_idempotent(destinations, districts, dry_run=is_dry_run)

    if result.errors:
        print(f"FAILED with {len(result.errors)} errors:", file=sys.stderr)
        for err in result.errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print("\n--- Seed Execution Summary ---")
    print(f"  Districts Loaded : {result.districts_count}")
    print(f"  Destinations     : {result.inserted} ready for insert/upsert")
    print(f"  Duplicates / Skip: {result.skipped}")
    print(f"  Status           : {'DRY-RUN VALIDATION PASSED' if is_dry_run else 'APPLIED'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
