# Destination Data Provenance & Verification Protocol — Namma Karnataka

## 1. Provenance Integrity Mandate

A foundational principle of Namma Karnataka is that **no fabricated or hallucinated data may ever be presented to travellers**. All destinations, timings, entry tariffs, and accommodations must maintain documented provenance with verifiable sources.

Unknown or unverified data must remain explicitly identified as unknown, rather than substituted with ₹0 or speculative estimates.

---

## 2. Provenance Taxonomy

Every record returned by the discovery and planning systems carries a `ProvenanceSource`:

| Provenance Source Code | Authority | Verification Level | Verification Protocol |
| :--- | :--- | :--- | :--- |
| `OFFICIAL_KARNATAKA_TOURISM` | Department of Tourism / KSTDC | `VERIFIED` | Matched with official government gazettes, KSTDC portal, or departmental ticket tariffs. |
| `ASI_ARCHAEOLOGICAL_SURVEY` | Archaeological Survey of India | `VERIFIED` | Centrally protected monument records, national ticket tariffs, official circulars. |
| `DISTRICT_GAZETTEER` | Govt of Karnataka Gazetteers | `VERIFIED` | Official district administrative publications and district archaeological surveys. |
| `OPEN_STREET_MAP` | OpenStreetMap contributors | `COMMUNITY_SOURCED` | Verified GPS coordinates with community edits; requires cross-verification for ticket fees. |
| `COMMUNITY_CURATED` | Curated regional experts | `COMMUNITY_SOURCED` | On-ground field reports, local travel logs, verified photographs. |

---

## 3. Verification Status Lifecycle

```
[DISCOVERED_UNVERIFIED]
           │
           ▼
[COMMUNITY_SOURCED] ──(Source verification)──► [VERIFIED]
                                                   │
                                                   ├──(Maintenance)──► [TEMPORARILY_CLOSED]
                                                   └──(Permit rules)──► [RESTRICTED]
```

1. **`VERIFIED`**:
   * Verified physical existence, official coordinates, documented operating hours, and official ticket tariffs.
2. **`COMMUNITY_SOURCED`**:
   * Sourced from crowdsourced maps (OSM) or field blogs. Timings and entry tariffs flagged as estimated.
3. **`DISCOVERED_UNVERIFIED`**:
   * Recently discovered geospatial node pending manual audit. Never used as primary anchor stops without fallback.
4. **`RESTRICTED`**:
   * Requires special forest department permits (e.g., Kudremukh Peak, Brahmagiri Wildlife Sanctuary) or seasonal entry restrictions.
5. **`TEMPORARILY_CLOSED`**:
   * Monsoon closures (e.g. waterfalls during flash floods), restoration work, or renovation.

---

## 4. Entry Tariff Transparency

* `VERIFIED`: Official ASI or Karnataka Tourism tariff (e.g., Mysore Palace ₹100, Pattadakal ₹40, Aihole ₹25).
* `FREE`: Explicitly confirmed public natural sites, rivers, and public stepwells (₹0).
* `ESTIMATED`: Private viewpoint or local vehicle parking fees.
* `UNKNOWN`: Missing reliable fee data; excluded from minimum total calculation with prominent disclosure.

