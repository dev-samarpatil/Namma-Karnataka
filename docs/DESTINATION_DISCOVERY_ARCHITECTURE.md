# Multi-Source Destination Discovery Engine Architecture — Namma Karnataka

## 1. Architectural Philosophy

Prior versions of Namma Karnataka relied exclusively on a static 59-item curated catalog in `destinations.json`. With only 9 destinations marked `is_offbeat: true`, users exploring alternative circuits frequently received repetitive suggestions.

The Phase 3 **Destination Discovery Engine** decouples the application from static catalogs via an extensible, multi-provider pluggable architecture that discovers verified, authentic destinations across official government datasets, historical gazetteers, and geospatial records.

---

## 2. Multi-Provider Architecture

```
                       ┌────────────────────────────────────────┐
                       │     DestinationDiscoveryService        │
                       └───────────────────┬────────────────────┘
                                           │
         ┌───────────────────┬─────────────┴───────┬───────────────────┐
         ▼                   ▼                     ▼                   ▼
┌──────────────────┐┌──────────────────┐┌──────────────────┐┌──────────────────┐
│  OfficialTourism ││   ASIProvider    ││ DistrictGazetteer││   OSMProvider    │
│  (KSTDC / DOT)   ││  (Monuments)     ││ (Hidden Heritage)││  (Geospatial)    │
└──────────────────┘└──────────────────┘└──────────────────┘└──────────────────┘
```

### Provider Responsibilities:
1. **OfficialTourismProvider** (`OFFICIAL_KARNATAKA_TOURISM`):
   * Sources: Department of Tourism, Government of Karnataka & KSTDC.
   * Focus: Premier verified state heritage, beaches, and national monuments with verified tariffs.
2. **ASIProvider** (`ASI_ARCHAEOLOGICAL_SURVEY`):
   * Sources: Archaeological Survey of India (ASI) Bengaluru and Dharwad circles.
   * Focus: UNESCO World Heritage sites (Pattadakal, Hampi), protected monuments (Aihole, Badami, Chitradurga Fort, Bidar Madrasa).
3. **DistrictGazetteerProvider** (`DISTRICT_GAZETTEER`):
   * Sources: Karnataka District Gazetteers and local archaeology monographs.
   * Focus: High-offbeat regional treasures (Kavaledurga Fort, Lakkundi Stepwells, Barkur Alupa capital, Tonnur Kere, Yana Rocks).
4. **OSMProvider** (`OPEN_STREET_MAP`):
   * Sources: OpenStreetMap nodes with tourism/historic/natural tags.
   * Focus: Geospatial points of interest with offline cached resilience (Shettihalli Rosary Church, Maravanthe Beach view).

---

## 3. Geodesic Deduplication Algorithm

When aggregating records across multiple providers, physical locations frequently overlap under slightly different naming conventions (e.g. "Aihole Temples" vs "Durga Temple Complex, Aihole").

The engine executes **300m geodesic Haversine deduplication**:
1. For each candidate $C$, calculate Haversine distance to all established candidates in $D$.
2. If $\text{dist}(C, D_i) \le 300\text{ meters}$, a match is recognized.
3. The merge policy awards precedence to `VERIFIED` status over `COMMUNITY_SOURCED` or `DISCOVERED_UNVERIFIED`.
4. Detailed descriptions, official fees, and high-resolution media from verified sources overwrite generic records.

---

## 4. Offbeat Scoring Model

Instead of an arbitrary boolean flag, each destination possesses an `offbeat_score` $\in [0.0, 1.0]$ computed from:
* **Footfall Proxy ($F$)**: Annual visitors ($>500k \implies 0.05$, $<25k \implies 0.85$).
* **Highway Proximity ($H$)**: Distance from Golden Quadrilateral / National Highways.
* **District HQ Distance ($D$)**: Remote rural location bonus.
* **Gazetteer Prominence ($G$)**: Historical obscurity indicator.

$$ \text{Offbeat Score} = 0.40(1 - F) + 0.25(H) + 0.20(D) + 0.15(G) $$

* Mainstream spot: `offbeat_score` $< 0.35$ (e.g. Mysore Palace: $0.05$).
* Balanced spot: $0.35 \le \text{offbeat\_score} \le 0.65$ (e.g. Aihole: $0.55$).
* High offbeat gem: $\text{offbeat\_score} > 0.65$ (e.g. Kavaledurga Fort: $0.89$, Lakkundi: $0.88$).

