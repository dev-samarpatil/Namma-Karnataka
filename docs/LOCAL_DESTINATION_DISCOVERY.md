# Local Destination Discovery Engine

## 1. Executive Summary
The Namma Karnataka destination catalogue extends beyond the static 61 curated landmark places to include genuine offbeat and lesser-known destinations across Karnataka's diverse geographic terrains (Heritage, Nature, Coastal, Malnad, and Northern monuments).

Discovery is driven by multi-provider geographic aggregation (`DestinationDiscoveryService`), combining:
- Archaeological Survey of India (ASI) verified heritage monuments.
- District Gazetteers and Tourism Department repositories.
- OpenStreetMap (OSM) heritage and natural reserve nodes.
- Local community knowledge bases.

## 2. Recommendation Labels & Taxonomy
Discovered destinations are tagged with verified classification tiers:
1. `Popular`: Major iconic landmarks with heavy tourist traffic (e.g., Mysuru Palace, Hampi Virupaksha, Jog Falls).
2. `Hidden Gem`: Exceptional cultural or natural quality with lower crowds (e.g., Tonnur Kere, Kavaledurga Fort, Barkur).
3. `Lesser Known`: Legitimate historical sites outside primary tour itineraries (e.g., Lakkundi Stepwells, Doddagaddavalli).
4. `Newly Discovered`: Geodesically clustered local sites dynamically verified via providers.
5. `Local Favourite`: Beloved local recreation and natural retreats.

## 3. Geodesic Deduplication & Routing Feasibility
- **Haversine Proximity Grouping**: Newly discovered points within a 1.2 km radius of an existing destination are clustered or merged to avoid duplicate stops.
- **Circuit Integration**: Discovered destinations are evaluated by `RouteOptimizer` and `DeterministicScheduler` based on daily driving thresholds (max 4.0 hours driving per day) and road distance calculations.
- **Budget Integrity**: Discovered stops retain explicit entry fee status (`VERIFIED` or `UNKNOWN` with documented rationale) without fabricating zero-cost entry fees.

## 4. Discovered Highlights Sample
| Destination ID | Name | District | Category | Classification | Verification Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `gaz-tonnur-kere` | Tonnur Kere (Thondanur Lake) | Mandya | Nature / Heritage | Hidden Gem | Mandya Gazetteer & Ramanuja Heritage Trail |
| `gaz-kavaledurga-fort` | Kavaledurga Fort | Shivamogga | Heritage / Trek | Hidden Gem | ASI & Keladi Nayaka Archaeological Records |
| `gaz-lakkundi-stepwells` | Lakkundi Kalyani & Temples | Gadag | Heritage | Lesser Known | ASI North Karnataka Heritage Division |
| `gaz-barkur-temple-town` | Barkur Ancient Capital | Udupi | Culture | Lesser Known | Coastal Karnataka Historical Society |
| `gaz-yana-caves` | Yana Karst Rock Formations | Uttara Kannada | Nature / Adventure | Hidden Gem | Karnataka Forest Department & KSTDC |
| `osm-node-shettihalli-church`| Shettihalli Rosary Church | Hassan | Heritage | Hidden Gem | Gorur Dam Reservoir Heritage Survey |

