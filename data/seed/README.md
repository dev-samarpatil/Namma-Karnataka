# Namma Karnataka — Curated Destination Seed Data Guide

## 1. Overview & Principles

This directory contains the canonical ground truth seed datasets for **Namma Karnataka**:
- `destinations.json`: Curated destinations spanning diverse Karnataka regions (Malenadu, Karavali, Bayaluseeme, Kalyan Karnataka).
- `districts.json`: Canonical list of Karnataka's administrative districts.

### Non-Negotiable Editorial Principles
1. **Zero Fabrication:** Never fabricate coordinates, ticket prices, schedules, or accessibility.
2. **Honest Unknown Values:** If an entry fee or schedule is unverified, it is stored as `null` (never as ₹0). ₹0 is reserved solely for verified free-entry sites (e.g. public beaches, temples with free darshan, municipal viewpoints).
3. **Traceable Provenance:** Every destination record includes official source references (`source_name`, `source_url`, `claim_scope`, `checked_at`).
4. **Bilingual Requirement:** Both English (`en`) and Kannada (`kn`) translations must be provided with verified translation review states.
5. **Offbeat Classification:** `is_offbeat: true` designates lesser-known editorial recommendations, but carries NO guarantee of paved access or commercial infrastructure.

---

## 2. Seed Schema Specification

### `destinations.json` Object Structure:
```json
{
  "id": "UUID (stable)",
  "slug": "url-safe-string",
  "district_code": "KA-XXX",
  "category": "nature | waterfall | hill_station | viewpoint | heritage | architecture | beach | wildlife | food_culture | spiritual_cultural | adventure | museum | town_city | other",
  "latitude": 12.3456,
  "longitude": 75.6789,
  "access_status": "open_reported | restricted | seasonal | closed_reported | unknown",
  "verification_status": "human_reviewed | source_checked | needs_review | stale | unknown",
  "content_status": "draft | reviewed | published | archived",
  "is_offbeat": false,
  "estimated_visit_minutes": 90,
  "entry_fee_min_inr": 50.0,
  "entry_fee_max_inr": 50.0,
  "currency_code": "INR",
  "active": true,
  "translations": [
    {
      "language_code": "en",
      "name": "English Display Name",
      "summary": "Short 1-2 sentence overview",
      "description": "Curated factual historical/geographical narrative",
      "how_to_reach": "Transit and connectivity instructions",
      "accessibility_notes": "Physical accessibility details",
      "translation_status": "human_reviewed | provider_generated | needs_review | not_available"
    },
    {
      "language_code": "kn",
      "name": "ಕನ್ನಡ ಹೆಸರು",
      "summary": "ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆ",
      "description": "ವಿಸ್ತೃತ ವಿವರಣೆ",
      "how_to_reach": "ತಲುಪುವ ಮಾರ್ಗ",
      "accessibility_notes": "ಪ್ರವೇಶ ಸೌಲಭ್ಯಗಳು",
      "translation_status": "human_reviewed"
    }
  ],
  "sources": [
    {
      "source_name": "Official Authority or Survey Name",
      "source_url": "https://official.gov.in/link",
      "source_type": "government_official | tourism_board | verified_editorial | academic | field_report | other",
      "claim_scope": "all | coordinates | entry_fee | heritage_history",
      "checked_at": "ISO-8601 UTC timestamp",
      "license_notes": "Public Domain / Open Data / Fair Use Attribution",
      "attribution_required": true
    }
  ]
}
```

---

## 3. Validation & Idempotent Loading

### Validation Command
Run the automated seed validator from repository root:
```bash
python data/validation/validate_seed.py
```

The validator verifies:
- Unique IDs and URL-safe slugs.
- Valid foreign key references to `districts.json`.
- Coordinate ranges within Karnataka bounds ($11.5^\circ\text{N} \le \text{lat} \le 18.5^\circ\text{N}$, $74.0^\circ\text{E} \le \text{lon} \le 78.6^\circ\text{E}$).
- Fee constraints ($0 \le \min \le \max$; null fee stays null).
- Presence of both English and Kannada translations.
- Valid provenance and audit timestamps.

### Seed Loading Command
To execute idempotent dry-run or database load:
```bash
# Dry-run validation mode (no DB connection required)
python data/seed/load_seed.py --dry-run

# Live idempotent database upsert (when SUPABASE_SERVICE_ROLE_KEY is configured)
python data/seed/load_seed.py --target-env development
```
- Re-running the seed loader uses `slug` as the unique conflict key.
- It will NOT overwrite reviewed manual changes in a production environment.
