# Local Guide Recommendation Engine — Principles & System Architecture

## 1. Local Guide Philosophy

A true local travel guide does not merely list tourist spots in random order; they provide cultural context, insider knowledge on local timing, authentic dining traditions, and practical advice on navigating Karnataka's varied landscapes.

Namma Karnataka is engineered to embody the wisdom of a seasoned local travel companion across four pillars:
1. **Contextual Cultural Grounding**: Explaining *why* a monument matters rather than just reciting its Wikipedia date.
2. **Geographical Feasibility**: Preventing impossible daily drives across ghat sections and prioritizing circular circuits.
3. **Budget Realism**: Protecting the traveler from unexpected commercial traps and suggesting authentic high-value alternatives.
4. **Daylight and Weather Awareness**: Guiding travelers to waterfalls and viewpoints at peak light hours while scheduling temples and palaces during midday heat.

---

## 2. Micro-Regional Geographic Clustering Engine

Travel across Karnataka involves diverse topographies: four-lane national highways (NH 48, NH 66), narrow winding Western Ghat mountain roads (Charmadi, Shiradi, Agumbe Ghats), and rural Deccan single-lane corridors.

### Clustering Rules:
* **Micro-Cluster Radius**: Daily stops are clustered within 30–50 km road corridors.
* **Nearest-Neighbor Day Sequencing**: Destinations within each day are sequenced using Haversine nearest-neighbor heuristics to eliminate backtracking.
* **Maximum Daily Driving Threshold**: Daily driving time is restricted to $\le 4.5\text{ hours}$ when visiting 3+ attractions.
* **Return Leg Preservation**: When return trip is enabled, final day scheduling reserves 3–4 hours for safe daytime return to origin.

---

## 3. Accommodation Recommendation Strategy

Accommodation recommendations follow a tiered budget-scenario paradigm:
1. **Budget Scenario (`budget`)**:
   * Priority: Verified Department of Tourism registered homestays (₹1,000–₹1,400) and KSTDC non-AC budget units (₹1,200).
   * Fallback: Authentic clean dormitories or local town budget lodges.
2. **Standard Scenario (`standard`)**:
   * Priority: KSTDC Hotel Mayura standard properties (₹1,800–₹2,800) and verified 3-star town hotels.
3. **Comfort Scenario (`comfort`)**:
   * Priority: Jungle Lodges & Resorts (JLR) eco-cottages, heritage plantation bungalows, and premium boutique retreats.

Room count calculations strictly enforce $R = \lceil T / 2 \rceil$ where solo travelers ($T = 1$) are never billed for double occupancy buffers.

---

## 4. AI Orchestration with Strict Catalog Grounding

The AI pipeline employs a hybrid architecture:
1. **Candidate Retrieval & Budget Pruning**:
   * The repository and `DestinationDiscoveryService` assemble relevant corridor candidates.
   * `BudgetOptimizer.filter_and_rank_by_budget` prunes candidates that violate strict budget parameters.
2. **LLM Generation**:
   * Gemini 3.8 Flash / Groq processes the structured candidate payload, formulating cohesive narrative itineraries.
3. **Catalog Re-Grounding**:
   * `AIValidator.parse_and_ground_plan` verifies every destination ID, coordinates, and entry fee against the authoritative database. Any hallucinated attraction is stripped.
4. **Deterministic Fallback Engine**:
   * If remote LLMs timeout or fail, `DeterministicScheduler` immediately produces a complete, mathematically verified itinerary within 100 milliseconds.

