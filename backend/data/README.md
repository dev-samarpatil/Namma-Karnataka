# Data Governance & Seed Assets

This directory contains version-controlled, non-sensitive seed datasets, JSON schemas, and validation scripts for **Namma Karnataka**.

---

## Directory Layout

```text
data/
├── seed/            # Verified JSON/CSV seed records for districts, categories, and destinations
├── schemas/         # JSON schema definitions for seed data validation
└── validation/      # Automated Python scripts to validate destination coordinates, URLs, and completeness
```

---

## Data Quality & Licensing Guidelines

1. **Zero Fictional Data:** Destination records must represent real places in Karnataka with verifiable sources.
2. **Approved Sources Only:** Seed facts must be derived from official government tourism publications, district administration records, OpenStreetMap, or Wikimedia Commons.
3. **Licensing & Attribution:** Media assets must use Creative Commons (CC-BY, CC-BY-SA) or public domain licenses, with license notes recorded in `destination_sources`.
4. **No Private User Data:** Never place user trip records, personal notes, or proprietary contact information in this directory.
5. **No Secrets:** Never commit API keys or credentials in data files.
