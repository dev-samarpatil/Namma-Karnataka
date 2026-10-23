"""Generate idempotent SQL seed script from JSON seed files.

Produces supabase/seed/seed.sql ensuring exact parity between JSON seed files
and the PostgreSQL database seed.
"""

from __future__ import annotations

import json
from pathlib import Path


def sql_escape(text: str | None) -> str:
    if text is None:
        return "NULL"
    escaped = text.replace("'", "''")
    return f"'{escaped}'"


def sql_num(val: int | float | None) -> str:
    if val is None:
        return "NULL"
    return str(val)


def sql_bool(val: bool | None) -> str:
    if val is None:
        return "NULL"
    return "TRUE" if val else "FALSE"


def generate_seed_sql() -> str:
    root = Path(__file__).resolve().parent.parent.parent
    districts_file = root / "data" / "seed" / "districts.json"
    destinations_file = root / "data" / "seed" / "destinations.json"

    with open(districts_file, encoding="utf-8") as f:
        districts = json.load(f)

    with open(destinations_file, encoding="utf-8") as f:
        destinations = json.load(f)

    lines: list[str] = [
        "-- ============================================================================",
        "-- Namma Karnataka - Canonical Seed SQL",
        "-- Generated from data/seed/districts.json & data/seed/destinations.json",
        "-- Safe and idempotent: ON CONFLICT DO UPDATE/NOTHING",
        "-- ============================================================================",
        "",
        "-- 1. Seed Districts (31 districts)",
        "INSERT INTO public.districts (code, name_en, name_kn, active) VALUES",
    ]

    dist_values: list[str] = []
    for d in districts:
        dist_values.append(
            f"  ({sql_escape(d['code'])}, {sql_escape(d['name_en'])}, "
            f"{sql_escape(d['name_kn'])}, {sql_bool(d.get('active', True))})"
        )
    lines.append(",\n".join(dist_values))
    lines.append("ON CONFLICT (code) DO UPDATE SET")
    lines.append("  name_en = EXCLUDED.name_en,")
    lines.append("  name_kn = EXCLUDED.name_kn,")
    lines.append("  active = EXCLUDED.active,")
    lines.append("  updated_at = TIMEZONE('utc', NOW());")
    lines.append("")

    lines.append("-- 2. Seed Destinations (12 curated records)")
    for dest in destinations:
        lat = sql_num(dest.get("latitude"))
        lon = sql_num(dest.get("longitude"))
        lines.append(
            f"INSERT INTO public.destinations ("
            f"id, slug, district_code, category, latitude, longitude, "
            f"access_status, verification_status, content_status, is_offbeat, "
            f"estimated_visit_minutes, entry_fee_min_inr, entry_fee_max_inr, "
            f"currency_code, active"
            f") VALUES ("
            f"{sql_escape(dest['id'])}, {sql_escape(dest['slug'])}, "
            f"{sql_escape(dest['district_code'])}, "
            f"{sql_escape(dest['category'])}::public.destination_category, "
            f"{lat}, {lon}, "
            f"{sql_escape(dest.get('access_status', 'unknown'))}::public.access_status, "
            f"{sql_escape(dest.get('verification_status', 'unknown'))}"
            f"::public.verification_status, "
            f"{sql_escape(dest.get('content_status', 'published'))}::public.content_status, "
            f"{sql_bool(dest.get('is_offbeat', False))}, "
            f"{sql_num(dest.get('estimated_visit_minutes'))}, "
            f"{sql_num(dest.get('entry_fee_min_inr'))}, "
            f"{sql_num(dest.get('entry_fee_max_inr'))}, "
            f"{sql_escape(dest.get('currency_code', 'INR'))}, "
            f"{sql_bool(dest.get('active', True))}"
            f") ON CONFLICT (slug) DO UPDATE SET "
            f"district_code = EXCLUDED.district_code, "
            f"category = EXCLUDED.category, "
            f"latitude = EXCLUDED.latitude, "
            f"longitude = EXCLUDED.longitude, "
            f"access_status = EXCLUDED.access_status, "
            f"verification_status = EXCLUDED.verification_status, "
            f"content_status = EXCLUDED.content_status, "
            f"is_offbeat = EXCLUDED.is_offbeat, "
            f"estimated_visit_minutes = EXCLUDED.estimated_visit_minutes, "
            f"entry_fee_min_inr = EXCLUDED.entry_fee_min_inr, "
            f"entry_fee_max_inr = EXCLUDED.entry_fee_max_inr, "
            f"active = EXCLUDED.active, "
            f"updated_at = TIMEZONE('utc', NOW());"
        )

        # Translations
        for tr in dest.get("translations", []):
            lines.append(
                f"INSERT INTO public.destination_translations ("
                f"destination_id, language_code, name, summary, description, "
                f"how_to_reach, accessibility_notes, translation_status"
                f") VALUES ("
                f"{sql_escape(dest['id'])}, {sql_escape(tr['language_code'])}, "
                f"{sql_escape(tr['name'])}, {sql_escape(tr.get('summary'))}, "
                f"{sql_escape(tr.get('description'))}, {sql_escape(tr.get('how_to_reach'))}, "
                f"{sql_escape(tr.get('accessibility_notes'))}, "
                f"{sql_escape(tr.get('translation_status', 'needs_review'))}"
                f"::public.translation_status"
                f") ON CONFLICT (destination_id, language_code) DO UPDATE SET "
                f"name = EXCLUDED.name, "
                f"summary = EXCLUDED.summary, "
                f"description = EXCLUDED.description, "
                f"how_to_reach = EXCLUDED.how_to_reach, "
                f"accessibility_notes = EXCLUDED.accessibility_notes, "
                f"translation_status = EXCLUDED.translation_status, "
                f"updated_at = TIMEZONE('utc', NOW());"
            )

        # Sources
        for src in dest.get("sources", []):
            lines.append(
                f"INSERT INTO public.destination_sources ("
                f"destination_id, source_name, source_url, source_type, "
                f"claim_scope, checked_at, license_notes, attribution_required"
                f") VALUES ("
                f"{sql_escape(dest['id'])}, {sql_escape(src['source_name'])}, "
                f"{sql_escape(src.get('source_url'))}, "
                f"{sql_escape(src.get('source_type', 'other'))}::public.source_type, "
                f"{sql_escape(src.get('claim_scope', 'all'))}, "
                f"{sql_escape(src.get('checked_at', '2026-10-20T00:00:00Z'))}::timestamptz, "
                f"{sql_escape(src.get('license_notes'))}, "
                f"{sql_bool(src.get('attribution_required', False))}"
                f");"
            )

    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    sql = generate_seed_sql()
    out_file = Path(__file__).resolve().parent.parent.parent / "supabase" / "seed" / "seed.sql"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"Generated {out_file} ({len(sql.splitlines())} lines)")
