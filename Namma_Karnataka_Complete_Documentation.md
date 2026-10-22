# Namma Karnataka

## Complete Product and Technical Documentation

**Document version:** 1.0\
**Status:** Planning baseline for implementation\
**Product name:** Namma Karnataka\
**Working tagline:** *Discover the Karnataka You Haven't Seen*\
**Initial languages:** English and Kannada\
**Initial geography:** Karnataka, India\
**Development environment:** Google Antigravity IDE

------------------------------------------------------------------------

## 1. Executive Summary

**Namma Karnataka** is an AI-powered travel-planning web application
focused on helping people discover Karnataka, build practical
itineraries, estimate trip costs, understand route sequences, and
explore well-known as well as lesser-known destinations.

It is not intended to be merely a chatbot that generates attractive
travel text. Its core value is the combination of a curated destination
catalogue, source and verification metadata, route-aware planning,
deterministic budget calculations, bilingual output, and resilient AI
orchestration.

The proposed AI strategy uses **Groq and Google Gemini together** to
produce candidate itineraries. Their outputs are validated and
reconciled rather than blindly combined. If one provider fails, the
other can be used. If both fail, a deterministic planner should attempt
a simpler itinerary from the destination database and routing data.

The application will support English and Kannada end to end. Both AI
providers should be prompted to produce the selected language. **Sarvam
AI** can translate only the fields that need correction or localization.
**AI4Bharat IndicTrans2** is an optional self-hosted alternative to
evaluate if its quality, deployment requirements, and operating cost
make sense.

The central principle is: **AI proposes; verified data and deterministic
services validate.** Unknown prices, opening hours, access restrictions,
and route conditions must remain unknown instead of being invented.

------------------------------------------------------------------------

## 2. Product Identity

### 2.1 Name and meaning

"Namma Karnataka" is Kannada for "Our Karnataka." It suggests regional
familiarity, pride, and a welcoming invitation to explore the state.

This is a working name. Before commercial launch, check domain
availability, social handles, and relevant trademark or business-name
conflicts.

### 2.2 Tagline

Primary working tagline:

> **Discover the Karnataka You Haven't Seen**

Alternatives: - Our Land. Your Journey. - Explore Beyond the Usual. -
Karnataka, Your Way. - Find Your Own Karnataka.

### 2.3 Product principles

1.  Karnataka-first discovery and regional context.
2.  Data-grounded recommendations rather than unsupported AI claims.
3.  Practical itineraries that respect distance, duration, pace, and
    budget.
4.  Transparent estimates and visible uncertainty.
5.  Consistent English and Kannada experiences.
6.  Responsible recommendations for lesser-known places.
7.  Graceful degradation when a third-party service fails.
8.  Privacy, accessibility, and safety by design.

------------------------------------------------------------------------

## 3. Problem Statement

Travel planning often requires users to combine information from tourism
pages, blogs, maps, social media, transport websites, and local sources.
Generic AI planners can create appealing plans but may invent
destinations or prices, combine places that are too far apart, overlook
access restrictions, or provide inaccurate information about
lesser-known locations.

Language support is another challenge: translating static website labels
does not ensure that dynamically generated itineraries, warnings, tips,
and chatbot responses use the selected language.

Namma Karnataka aims to solve this by combining: - A Karnataka-specific
destination catalogue. - Provenance and verification metadata. -
Preference-aware itinerary generation. - Geographic and route
feasibility checks. - Deterministic budget calculation. - Dual-provider
AI generation with validation. - End-to-end English/Kannada
localization. - A rule-based fallback planner.

**Core question:** How can we help people discover Karnataka and plan
personalized, geographically practical, budget-aware trips in English or
Kannada without trusting unverified AI output as fact?

------------------------------------------------------------------------

## 4. Goals, Non-Goals, and Success Criteria

### 4.1 MVP goals

-   Accept an origin, dates or trip duration, group size, budget,
    transport mode, interests, travel pace, and language.
-   Recommend known Karnataka destinations, including curated offbeat
    options.
-   Generate a day-wise itinerary with activities and travel sequence.
-   Display destinations and route order on a map.
-   Calculate an itemized estimated budget.
-   Support English and Kannada across static and dynamic content.
-   Use Groq and Gemini in a resilient workflow.
-   Validate model output against structured destination data and
    deterministic constraints.
-   Recover from provider failures where possible.
-   Let users revise preferences and regenerate a plan.
-   Preserve source provenance and verification status.

### 4.2 Non-goals for the first release

Unless deliberately added later, the MVP will not book transport or
hotels, guarantee live availability or exact prices, replace official
safety advice, guarantee access to every offbeat location, provide
guaranteed live traffic, or build a full social network and review
platform.

### 4.3 Success criteria

The MVP should demonstrate that: - Valid trip requests return
schema-valid itineraries. - A provider failure does not crash the whole
request flow. - The selected language is maintained through generation,
translation, revision, and errors. - Every recommended destination maps
to a stable internal ID. - Budget totals reconcile with line items. -
Unknown prices and route details are not fabricated. - The user can
revise a plan without starting over. - The product labels estimates and
data limitations clearly.

Set quantitative targets after measuring a working baseline; do not
treat targets as already achieved.

------------------------------------------------------------------------

## 5. Target Users and Example Use Cases

### Target users

-   Students and young adults planning budget or weekend trips.
-   Families who need manageable travel legs and relaxed pacing.
-   Solo travelers interested in nature, heritage, food, or culture.
-   Visitors who want to explore beyond the most famous attractions.
-   Kannada-speaking travelers who prefer localized guidance.
-   People who know their starting city but do not know which places to
    combine.

### Use cases

1.  **Weekend trip:** Two days from Bengaluru with a nature-focused
    interest and a defined budget.
2.  **Offbeat discovery:** Lesser-known heritage and nature stops, with
    source and access caveats.
3.  **Family trip:** Shorter travel legs, a relaxed schedule, and
    family-friendly options where verified.
4.  **Budget trip:** An itemized group budget with unknown costs clearly
    identified.
5.  **Kannada itinerary:** Itinerary descriptions, tips, warnings, and
    errors are in Kannada, not just the navigation menu.
6.  **Plan revision:** Remove a stop, change duration, or reduce budget
    and recalculate the itinerary.

------------------------------------------------------------------------

## 6. Differentiation and Value Proposition

The product should differentiate through the quality and grounding of
its plans, not simply by adding an AI chat interface.

1.  **Karnataka-specific curation:** A catalogue organized around
    Karnataka regions, districts, attractions, and local experiences.
2.  **Offbeat discovery with provenance:** Lesser-known places are
    recommended with sources, verification dates, and access-confidence
    information.
3.  **Geographic feasibility:** The planner checks coordinates, route
    order, travel estimates, and duration.
4.  **Transparent budget:** Costs are itemized and labeled as verified,
    estimated, user-provided, or unknown.
5.  **Dual-model planning:** Groq and Gemini provide candidate plans;
    deterministic logic validates and reconciles them.
6.  **End-to-end English/Kannada:** Both static UI and generated content
    follow one language preference.
7.  **Graceful fallback:** A rule-based itinerary remains possible when
    both AI providers are unavailable.
8.  **Regional expansion potential:** Future support can include
    festivals, cuisine, responsible tourism, accessibility, and seasonal
    considerations.

Do not claim that every hidden place has been discovered, every price is
current, or all routes are live-traffic-aware unless those capabilities
are implemented and backed by reliable sources.

------------------------------------------------------------------------

## 7. Feature Scope

### 7.1 MVP features

#### A. Home and onboarding

-   Brand, tagline, language selector, and start-planning action.
-   A small set of discovery highlights supported by actual destination
    data.
-   Clear note that prices and travel times may be estimates.

#### B. Trip planner

-   Origin city or location.
-   Start/end dates or number of days.
-   Number of travelers.
-   Budget and currency.
-   Transport preference.
-   Interests: nature, waterfalls, trekking, heritage, temples, beaches,
    food, wildlife, architecture, culture, family-friendly, photography,
    and offbeat.
-   Pace: relaxed, balanced, or packed.
-   Optional stay preference, must-visit destinations, exclusions, and
    accessibility needs.
-   Selected language.

#### C. Itinerary results

-   Trip title and summary.
-   Day-wise schedule and activity descriptions.
-   Suggested destination sequence.
-   Estimated visit duration and travel legs.
-   Itemized budget.
-   Practical tips, warnings, and alternatives.
-   Explanation of why the places match the user's preferences.
-   Source and uncertainty notes.

#### D. Map and route

-   Destination markers and route order.
-   Distance and duration estimates when supported by the routing
    provider.
-   Marker details and a navigation hand-off.
-   Clear distinction between a suggested route and live turn-by-turn
    navigation.

#### E. Destination explorer

-   Search and filter by region, district, category, interests,
    accessibility, and offbeat status.
-   Destination detail page.
-   English and Kannada fields where available.
-   Source links, verification status, and last-checked date.

#### F. Budget estimator

-   Intercity and local transport.
-   Accommodation.
-   Food.
-   Entry fees and activities.
-   Miscellaneous and contingency.
-   Group total and per-person estimate.
-   Unknown prices remain unknown rather than becoming zero.

#### G. Localization

-   English and Kannada UI dictionaries.
-   Persistent language preference.
-   Language included in every planning and revision request.
-   Dynamic content validation and controlled translation fallback.

#### H. Saved trips

Optional for the first release if authentication increases scope
significantly. If included, saved trips must preserve language and
generation metadata.

### 7.2 Post-MVP candidates

-   Weather-aware planning.
-   Festival and event calendar.
-   Public transport timetable integration.
-   Accommodation and booking integrations.
-   User feedback and moderated destination corrections.
-   Collaborative trips and sharing.
-   Offline saved itineraries.
-   Additional Indian languages.
-   Better accessibility and seasonal planning.
-   Community-contributed offbeat places with moderation.

------------------------------------------------------------------------

## 8. User Experience and Screens

Suggested screens: 1. **Home:** Brand, tagline, language toggle,
discovery highlights, planning CTA. 2. **Plan Your Trip:** Origin,
duration, group, budget, interests, pace, transport, language. 3.
**Generating Plan:** Accurate progress feedback without pretending to
know an upstream provider's internal status. 4. **Itinerary Results:**
Day cards, budget summary, source notes, edit/regenerate controls. 5.
**Map View:** Destination markers and route sequence. 6. **Explore
Karnataka:** Searchable destination catalogue. 7. **Destination
Details:** Description, location, categories, practical notes, source,
verification status. 8. **Saved Trips:** Optional authenticated feature.
9. **Settings:** Language and privacy settings. 10. **Error and empty
states:** Localized messages and actionable retry controls.

UX principles: - Keep the form short; make advanced preferences
optional. - Show why each place is recommended. - Label estimates and
unknown values. - Make editing easier than restarting. - Prioritize
itinerary cards and map access on mobile. - Support keyboard navigation,
readable contrast, and responsive layouts. - Never display a "verified"
badge unless verification has actually happened.

------------------------------------------------------------------------

## 9. Recommended Technology Stack

### Frontend

-   **React + Vite + TypeScript** --- web application.
-   **Tailwind CSS** --- styling and responsive layout.
-   **shadcn/ui** --- accessible UI components where useful.
-   **React Router** --- navigation.
-   **i18next / React i18next** --- English/Kannada static UI
    localization.
-   **Leaflet + OpenStreetMap-compatible tiles** --- maps.
-   **TanStack Query or equivalent** --- server-state fetching and
    caching.
-   **Zod or equivalent** --- optional client-side response validation.
-   **Recharts** --- optional budget charts; avoid a chart if a simple
    breakdown is clearer.

### Backend

-   **Python + FastAPI** --- API layer.
-   **Pydantic** --- request and response schemas.
-   **httpx** --- asynchronous external API requests.
-   **SQLAlchemy or Supabase client** --- database access, depending on
    chosen pattern.
-   **pytest** --- tests.
-   Structured, sanitized logging.

### AI and translation

-   **Groq API** --- candidate itinerary generation.
-   **Google Gemini API** --- second candidate itinerary generation.
-   **Sarvam AI Translate** --- hosted translation option to evaluate
    for English/Kannada.
-   **AI4Bharat IndicTrans2** --- optional self-hosted translation
    alternative if quality, hardware, licensing, latency, and operations
    justify it.

Keep model names and provider configuration in environment variables.
Verify current supported model IDs, quotas, rate limits, regional
availability, and prices before deployment.

### Data and deployment

-   **Supabase PostgreSQL** --- destinations, sources, itineraries,
    preferences, and metadata.
-   **Supabase Auth** --- optional user authentication.
-   **Supabase Storage** --- optional media storage, subject to rights
    and licensing.
-   **OpenStreetMap-compatible data and tiles** --- mapping, subject to
    attribution and usage policies.
-   **Configurable routing provider** --- distance and travel-duration
    estimates.
-   **Vercel** --- frontend deployment candidate.
-   **Render** --- backend deployment candidate.
-   **GitHub** --- version control.

### Important security decisions

-   Keep all AI and translation API keys on the backend.
-   Never expose a Supabase service-role/secret key in the browser.
-   If browser access to Supabase is used, configure row-level security
    and use an appropriate publishable key.
-   Keep routing behind an abstraction so its provider can be changed
    without rewriting planning logic.

------------------------------------------------------------------------

## 10. High-Level Architecture

``` text
React + Vite + TypeScript Frontend
  ├── Trip form
  ├── Itinerary results
  ├── Destination explorer
  ├── Map and route
  └── English/Kannada i18n
                │ HTTPS / JSON
                ▼
FastAPI Backend
  ├── Request validation (Pydantic)
  ├── Planning orchestrator
  ├── Destination retrieval
  ├── Routing adapter
  ├── Budget calculator
  ├── Itinerary/schema validator
  └── Language validation/translation
        │           │             │
        ▼           ▼             ▼
  Supabase       Groq API      Gemini API
  PostgreSQL     Plan A        Plan B
                     \          /
                      \        /
                  Parse and validate
                          │
                Compare and reconcile
                          │
                 Language validation
                 Sarvam / IndicTrans2
                    only if needed
                          │
                 Final validation
                          │
                 Itinerary response

External integrations:
- Geocoding and place lookup, if needed
- Routing / distance estimates
- Optional weather and official tourism sources
```

### Request flow

1.  Frontend submits a validated trip request including language.
2.  Backend validates and assigns a request ID.
3.  Candidate destinations are retrieved from the curated catalogue.
4.  Route and geographic feasibility information is retrieved where
    available.
5.  Groq and Gemini receive the same normalized request and schema.
6.  Responses are parsed and validated independently.
7.  If both are valid, deterministic rules compare and reconcile them.
8.  If one is valid, use it after validation.
9.  If both fail, attempt deterministic planning.
10. Check human-readable text against the selected language and
    translate only necessary fields.
11. Validate destination IDs, dates, route feasibility, durations, and
    budget totals.
12. Return the plan with estimates and data-quality notes.

------------------------------------------------------------------------

## 11. Dual-LLM Strategy: Groq + Gemini

### 11.1 Purpose

Two providers can provide resilience and different candidate plans. They
do not guarantee truth: both models may hallucinate or make similar
mistakes. Structured data and deterministic validation remain essential.

### 11.2 Recommended policy

For the initial design, use parallel generation behind a configuration
flag: - Send both providers the same normalized trip constraints. - Use
the same output schema and language instruction. - Set independent
timeouts. - Limit retries and use exponential backoff with jitter only
for transient errors. - Classify rate limits, timeouts, authentication
errors, outages, and invalid outputs. - Compare valid outputs for
destination IDs, trip constraints, route feasibility, budget, interests,
and language. - Merge only compatible elements that pass validation. -
If one provider fails, use the other valid result. - If both fail, use
the deterministic planner. - If no valid plan can be produced, return a
localized actionable error.

### 11.3 Cost and quota trade-off

Parallel calls consume both providers' quotas and can cost more than a
single call. Keep the mode configurable. Cost controls can include: -
Parallel mode for higher-value requests. - Single-provider mode with
fallback for routine requests. - Candidate limits and concise prompts. -
Caching where appropriate. - Translating only fields that need
translation.

### 11.4 Merge and scoring rules

Use deterministic checks for: - Compliance with trip duration and
dates. - Valid destination IDs. - Route sequence and distance. - Match
to interests. - Budget arithmetic and limits. - Source and verification
quality. - Language validity. - Completeness of required fields.

Do not trust a model's self-reported confidence as the sole acceptance
criterion.

### 11.5 Provider reliability

-   Keep each provider behind an independent adapter.
-   Configure model IDs externally.
-   Do not retry authentication/configuration errors until the
    configuration changes.
-   Use concurrency limits and circuit-breaker behavior if a provider
    repeatedly fails.
-   Do not log keys, authorization headers, or unnecessary personal
    data.

------------------------------------------------------------------------

## 12. English and Kannada Localization

Localization is an end-to-end requirement, not a frontend-only
translation task.

### 12.1 Language state

Use internal codes `en` and `kn`. Map them to each provider's required
language identifiers. The user's explicit selection is authoritative.
Persist it locally for anonymous users and in the profile for
authenticated users.

Every itinerary generation and revision request must include the
selected language.

### 12.2 Static UI

Maintain dictionaries such as:

``` text
frontend/src/locales/
  en/translation.json
  kn/translation.json
```

Translate navigation, form labels, buttons, filters, loading states,
validation messages, errors, empty states, budget labels, map controls,
dialogs, and accessibility labels. Avoid hard-coded visible strings in
components.

### 12.3 AI output

Both providers must receive explicit instructions to use the selected
language for all human-readable fields. The schema should distinguish
natural-language text from machine-readable values.

Translate text fields such as: - Itinerary title and summary. - Day
titles and descriptions. - Activity names and notes. - Tips, warnings,
alternatives, and explanations. - User-facing budget explanations.

Do not translate IDs, coordinates, numeric prices, dates, schema keys,
machine codes, or stable identifiers. Preserve official place names
where appropriate; use aliases/transliterations only when verified.

### 12.4 Sarvam AI

Evaluate Sarvam Translate for English ↔ Kannada. Use it when: - A model
produces an otherwise valid itinerary but some text is in the wrong
language. - A destination field needs on-demand translation. - A user
asks to translate an existing itinerary.

Implementation requirements: - Verify the current endpoint, supported
language codes, character limits, price, and rate limits. - Keep a
stable mapping between each text field and its translation. - Batch only
when safe and supported. - Validate translated output. - Cache reusable
translations with language pair and version/expiry metadata. - Treat
translation as language conversion, not factual verification.

### 12.5 IndicTrans2

Evaluate IndicTrans2 as an optional self-hosted translation path. Test
Kannada travel vocabulary, deployment size, hardware/memory, cold-start
time, throughput, license, and maintenance burden. Self-hosting is not
automatically cheaper; compare total operating cost.

### 12.6 Language validation and recovery

Script detection, including Kannada Unicode-range checks, is only a
heuristic---not proof of quality.

Recommended bounded recovery: 1. Generate in the selected language. 2.
Flag empty or likely wrong-language fields. 3. Translate or request one
limited correction. 4. Validate again. 5. If still invalid, show a clear
fallback notice rather than retrying indefinitely.

### 12.7 Kannada quality assurance

Create human-reviewed test examples for place names, transliteration,
dates, currency, numerals, directions, safety warnings, food/cultural
vocabulary, mixed-script phrases, and long itinerary descriptions.
Native-speaker review is strongly recommended before public release.

------------------------------------------------------------------------

## 13. Destination Data Strategy

The destination catalogue is the foundation of reliability and one of
the product's most important differentiators.

### 13.1 Sources to evaluate

-   Karnataka Tourism and official attraction pages.
-   District administration and government tourism information.
-   Karnataka/Indian open-data portals where relevant datasets exist.
-   OpenStreetMap for geographic features and community-maintained place
    information, following licensing and attribution requirements.
-   Approved place or mapping APIs, subject to their terms, quotas, and
    caching rules.
-   Manual research and local verification.
-   User corrections after moderation.

Online availability does not automatically grant permission to copy,
scrape, republish, or permanently store all information. Review the
license and terms of every source.

### 13.2 Data acquisition phases

**Phase A --- Curated seed catalogue** - Start with a manageable set of
destinations across Karnataka regions. - Prioritize reliable records
over volume. - Include major attractions and selected offbeat places. -
Verify coordinates and sources. - Mark unknown prices, hours, and access
conditions as unknown.

**Phase B --- Controlled enrichment** - Add permitted geographic
metadata. - Geocode only when necessary. - Deduplicate aliases and
nearby duplicates. - Record sources, retrieval dates, and verification
status. - Keep an audit trail for important field changes.

**Phase C --- Maintenance** - Flag stale records. - Recheck access, fee,
seasonal, and opening-hour details. - Review user-submitted corrections
before publication. - Use field-level verification; verifying
coordinates does not verify opening hours.

An initial target of roughly **100--200 curated destinations** is a
planning goal, not an existing dataset claim. Launch with fewer
high-quality records if necessary.

### 13.3 Offbeat destination policy

"Offbeat" is an editorial classification, not a guarantee that a place
is undiscovered or safe. Before recommending one, try to verify: -
Identity and location. - Credible source. - Access status or explicit
unknown status. - Permit/guide requirements where known. - Nearby
facilities where known. - Seasonal and environmental cautions. -
Last-verified date.

Do not encourage trespassing or access to restricted places. Avoid
publicizing sensitive ecological or cultural locations where exposure
could cause harm.

### 13.4 Verification states

-   `unreviewed`
-   `needs_review`
-   `partially_verified`
-   `verified`
-   `stale`
-   `restricted`

Apply status at field level where possible. A destination can have
verified coordinates but unknown access conditions.

------------------------------------------------------------------------

## 14. Destination Data Model

### 14.1 Example JSON

``` json
{
  "id": "dest_example_001",
  "slug": "example-destination",
  "name": {
    "en": "Example Destination",
    "kn": null
  },
  "aliases": {
    "en": [],
    "kn": []
  },
  "description": {
    "en": "A short sourced description.",
    "kn": null
  },
  "region": "Coastal Karnataka",
  "district": null,
  "coordinates": {
    "latitude": null,
    "longitude": null
  },
  "categories": ["nature"],
  "tags": ["offbeat_candidate", "photography"],
  "best_season": [],
  "estimated_visit_minutes": null,
  "access_status": "unknown",
  "entry_fee": {
    "amount": null,
    "currency": "INR",
    "basis": "unknown",
    "last_verified_at": null
  },
  "opening_hours": null,
  "offbeat_status": "editorial_candidate",
  "verification_status": "unreviewed",
  "sources": [
    {
      "source_name": "Source name",
      "source_url": "https://example.org",
      "source_type": "official",
      "fields_supported": ["name", "description"],
      "checked_at": null
    }
  ]
}
```

This is a schema example only. Replace placeholders with verified data
before production.

### 14.2 Data quality rules

-   IDs must be stable and unique.
-   Coordinates must be numeric and within valid bounds.
-   Unknown values must be distinct from zero.
-   Prices should include currency and price basis when known.
-   Dates must use consistent formats and timezone rules.
-   Source records should identify which fields they support.
-   Similar names alone are not enough to merge records.
-   Preserve alternate spellings and aliases for search.
-   Never invent a source URL or verification timestamp.

------------------------------------------------------------------------

## 15. Suggested Database Design

Use Supabase PostgreSQL. Suggested tables:

### `destinations`

Core identity and location: - `id` (primary key) - `slug` (unique) -
`region`, `district` - `latitude`, `longitude` - `access_status` -
`offbeat_status` - `verification_status` - `estimated_visit_minutes` -
`created_at`, `updated_at`

### `destination_localizations`

-   `id`
-   `destination_id` (foreign key)
-   `language_code` (`en` or `kn`)
-   `name`, `description`
-   `access_notes`, `practical_notes`
-   `translation_source`
-   `review_status`
-   `updated_at`

### `destination_sources`

-   `id`
-   `destination_id`
-   `source_name`, `source_url`, `source_type`
-   `fields_supported`
-   `checked_at`
-   `license_or_terms_note`
-   `notes`

### `destination_prices` (optional)

-   `id`, `destination_id`
-   `price_type`, `amount`, `currency`, `price_basis`
-   `valid_from`, `last_verified_at`
-   `source_id`, `confidence_status`

### `itineraries`

-   `id`
-   `user_id` nullable for anonymous planning
-   `title`, `language_code`
-   `origin`, `start_date`, `end_date`, `duration_days`
-   `traveler_count`, `budget_amount`, `budget_currency`
-   `preferences_json`, `itinerary_json`
-   `generation_mode`, `created_at`, `updated_at`

### `llm_request_logs`

Minimal operational metadata: - `id`, `request_id`, `provider`,
`model_id` - `status`, `latency_ms`, `error_category`, `schema_valid` -
`created_at`

Avoid storing full prompts and provider responses by default. If
detailed logging is required, define redaction, retention, and access
rules.

### `user_feedback` (optional)

-   `id`, `itinerary_id`, `destination_id`
-   `feedback_type`, moderated `comment`
-   `created_at`, `review_status`

------------------------------------------------------------------------

## 16. Itinerary Generation and Validation

### 16.1 Planning pipeline

1.  Validate user input.
2.  Normalize dates, language, budget, group size, and preferences.
3.  Retrieve candidate destinations matching interests and geography.
4.  Exclude restricted or unsuitable records.
5.  Use coordinates to cluster candidates.
6.  Retrieve route estimates where available.
7.  Send a compact, grounded candidate set to both models.
8.  Parse model outputs into the required schema.
9.  Validate destination IDs and required fields.
10. Check schedule duration, route legs, and trip length.
11. Recalculate budget in backend code.
12. Validate language.
13. Return itinerary with estimates, caveats, and provenance.

### 16.2 Do not let the model invent the catalogue

The model should select from supplied destination IDs. If it proposes a
destination outside the catalogue, mark it as a proposal requiring
review; do not silently include it as a verified recommendation.

### 16.3 Feasibility checks

-   All destination IDs exist and are eligible.
-   Day count matches the request.
-   Time allocations are plausible.
-   Route data is sourced or explicitly labeled approximate/unavailable.
-   Budget arithmetic reconciles.
-   User exclusions and must-visit preferences are respected.
-   Duplicate stops are avoided unless intentional.
-   Known access and safety notes are surfaced.
-   Dates and local opening hours are considered where data exists.

### 16.4 Deterministic fallback

When both LLMs fail: - Select eligible destinations by interest and
geographic proximity. - Group stops using coordinates and available
route estimates. - Build a simple day-wise sequence based on visit
duration and travel pace. - Use known prices only; unknown prices stay
unknown. - Label the plan as rule-based. - If data is insufficient,
return a localized explanation or ask for a simpler request.

A transparent simple plan is better than a sophisticated fabricated one.

------------------------------------------------------------------------

## 17. Budget Estimation

### 17.1 Categories

-   Intercity transport.
-   Local transport.
-   Accommodation.
-   Food and drinks.
-   Entry fees and activities.
-   Guide/equipment costs where supported.
-   Miscellaneous.
-   Contingency.

### 17.2 Calculation

`estimated_total = transport + accommodation + food + activities + local_transport + miscellaneous + contingency`

`estimated_per_person = estimated_total / traveler_count`

Only include numeric amounts when sourced, user-provided, or calculated
by a documented estimate rule. Unknown values must not be converted into
zero.

### 17.3 Metadata and display

Each cost should indicate amount, currency, price basis, source or
estimation method, last-checked date, and whether it is verified,
estimated, user-provided, or unknown. Present the budget as an estimate,
not a quote.

------------------------------------------------------------------------

## 18. Maps, Geocoding, and Routing

### 18.1 Maps

Leaflet with OpenStreetMap-compatible data is a reasonable starting
point. Follow the selected tile provider's attribution, caching, and
usage policies. OpenStreetMap attribution is required under its
applicable license.

### 18.2 Geocoding

Use a geocoding service to resolve user-entered locations or enrich
records when necessary. Record provider metadata and avoid repeating the
same lookup on every render.

### 18.3 Routing abstraction

``` python
class RoutingService:
    async def get_route(self, origin, destination, mode):
        # Return distance, duration estimate, geometry if available,
        # and source metadata.
        ...
```

Choose a provider based on coverage, terms, quotas, and cost. Do not
assume that a routing API provides live traffic or public-transport
timetables unless its documentation confirms it.

### 18.4 Routing failure

If routing fails, label unavailable or approximate values, avoid
inventing exact travel times, and retry only within a bounded policy.
Cache responses only where permitted.

------------------------------------------------------------------------

## 19. API Design

Illustrative endpoints; implement final contracts with Pydantic and
FastAPI.

### `GET /api/health`

Service health without exposing secrets.

### `GET /api/destinations`

Possible query parameters: `q`, `region`, `district`, `category`, `tag`,
`language`, `limit`, `cursor`.

### `GET /api/destinations/{destination_id}`

Returns requested-language content, provenance, and verification status.

### `POST /api/itineraries/generate`

Example request:

``` json
{
  "origin": "Bengaluru",
  "start_date": "2026-11-07",
  "duration_days": 2,
  "traveler_count": 3,
  "budget": {
    "amount": 12000,
    "currency": "INR",
    "basis": "total_group"
  },
  "transport_mode": "flexible",
  "interests": ["nature", "heritage", "offbeat"],
  "pace": "balanced",
  "language": "en",
  "must_visit_destination_ids": [],
  "excluded_destination_ids": []
}
```

### `POST /api/itineraries/{itinerary_id}/revise`

Accepts a revision request and language. Verify ownership before
modifying a saved itinerary.

### `GET /api/itineraries/{itinerary_id}`

Returns a saved itinerary if persistence and authorization are enabled.

### `POST /api/feedback`

Accepts feedback subject to rate limits and moderation.

------------------------------------------------------------------------

## 20. Suggested Itinerary Response Schema

``` json
{
  "itinerary_id": null,
  "language": "en",
  "generation_mode": "dual_llm_validated",
  "title": "Example Karnataka Weekend",
  "summary": "A short description of the proposed trip.",
  "days": [
    {
      "day_number": 1,
      "title": "Nature and Local Exploration",
      "items": [
        {
          "destination_id": "dest_example_001",
          "title": "Visit the destination",
          "description": "What to do there.",
          "start_time": "09:00",
          "duration_minutes": 120,
          "travel_from_previous": {
            "distance_km": null,
            "duration_minutes": null,
            "source": null,
            "is_estimate": true
          },
          "estimated_cost": {
            "amount": null,
            "currency": "INR",
            "status": "unknown"
          },
          "notes": []
        }
      ]
    }
  ],
  "budget": {
    "currency": "INR",
    "total_estimate": null,
    "per_person_estimate": null,
    "items": [],
    "unknown_costs": []
  },
  "travel_tips": [],
  "warnings": [],
  "alternatives": [],
  "data_notes": [],
  "sources": [],
  "validation": {
    "schema_valid": true,
    "destinations_valid": true,
    "budget_reconciled": true,
    "language_checked": true
  }
}
```

This is an illustrative structure. Unknown costs must not be represented
as zero. The backend must validate the response before returning it.

------------------------------------------------------------------------

## 21. Reliability and Error Handling

Handle: - Authentication/configuration errors. - Rate limits and quota
exhaustion. - Timeouts and network errors. - Provider outages. - Invalid
or truncated output. - Schema validation failure. - Wrong-language
fields. - Translation failures. - Routing failures.

Recommended controls: - Independent provider timeouts. - Concurrency
limits. - Bounded retries for transient errors only. - Exponential
backoff with jitter. - No retries for authentication errors until
configuration changes. - Circuit breaker for repeatedly failing
providers. - Other-provider fallback and deterministic planning. -
Localized, actionable user-facing errors.

Monitor total generation latency, provider latency/success rate, schema
failures, language correction rate, routing failure rate, fallback
usage, and estimated cost. Do not log secrets or unnecessary personal
information.

------------------------------------------------------------------------

## 22. Security, Privacy, and Responsible Travel

### 22.1 Secrets

-   Store keys in backend environment variables or a managed secret
    store.
-   Exclude `.env` from Git.
-   Keep `.env.example` limited to empty placeholders.
-   Never embed provider keys in frontend source.
-   Rotate keys if exposed.
-   Do not return raw upstream provider errors to users.

### 22.2 Supabase

-   Enable row-level security on client-accessible tables.
-   Enforce ownership for saved itinerary reads, edits, and deletes.
-   Keep privileged service-role credentials on the server.
-   Use least-privilege credentials.

### 22.3 Privacy

-   Collect only data needed for planning.
-   Do not require accounts unless needed.
-   Define retention and deletion rules for saved trips.
-   Avoid storing precise location history without clear user benefit
    and consent.
-   Redact personal information from logs.
-   Explain third-party processing of trip requests.

### 22.4 Responsible travel

-   Do not recommend trespassing or restricted sites.
-   Show known permit/access warnings.
-   Do not claim a place is safe based only on model output.
-   Encourage checking current official/local guidance for remote,
    seasonal, wildlife, trekking, and weather-sensitive travel.
-   Avoid exposing sensitive ecological or cultural locations where
    publication could cause harm.
-   Do not claim accessibility without supporting information.

------------------------------------------------------------------------

## 23. Testing Strategy

### 23.1 Unit tests

Test request/response schemas, destination filtering, geographic
distance calculations, budget arithmetic, language mapping, translation
field selection, route-duration aggregation, fallback planning, and
eligibility rules.

### 23.2 Integration tests

Test database access, mocked Groq and Gemini responses, mocked
translation and routing, provider timeouts, rate limits, authorization,
saved trips, language persistence, and fallback behavior.

Live API tests should be optional and rate-limited. CI should not fail
solely because a third-party service is temporarily unavailable.

### 23.3 End-to-end scenarios

1.  Generate an English weekend itinerary.
2.  Generate a Kannada itinerary.
3.  Change language and regenerate.
4.  Remove a destination from a plan.
5.  Request a low-budget trip.
6.  Request offbeat locations with access caveats.
7.  Simulate Groq failure; verify Gemini can be used.
8.  Simulate Gemini failure; verify Groq can be used.
9.  Simulate both failures; verify deterministic fallback.
10. Simulate translation failure; verify bounded fallback.
11. Simulate routing failure; verify no fabricated exact route.
12. Reject invalid destination IDs.
13. Reconcile budget totals.
14. Confirm saved trips are private to their owners.

### 23.4 Localization and data QA

Review Kannada UI and generated text, names, transliteration, numbers,
dates, currency, units, directions, safety warnings, text overflow,
duplicate destinations, coordinate validity, source links, stale
records, and conflicting facts.

### 23.5 MVP acceptance criteria

-   Core flow works on desktop and mobile.
-   Destination search returns known records.
-   Itineraries pass schema and destination-ID validation.
-   Budget totals are calculated deterministically.
-   English and Kannada cover the full user-facing flow.
-   Provider failures do not cause unhandled crashes.
-   Keys are not exposed in frontend or repository.
-   Database authorization is tested.
-   README documents setup, tests, deployment, and limitations.

------------------------------------------------------------------------

## 24. Repository Structure

Suggested layout:

``` text
namma-karnataka/
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       │   ├── planner/
│       │   ├── itinerary/
│       │   ├── destinations/
│       │   ├── map/
│       │   └── settings/
│       ├── hooks/
│       ├── lib/
│       ├── locales/
│       │   ├── en/
│       │   └── kn/
│       ├── pages/
│       ├── services/
│       └── types/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── llm/
│   │   │   ├── translation/
│   │   │   ├── destinations/
│   │   │   ├── routing/
│   │   │   ├── planning/
│   │   │   └── budgeting/
│   │   ├── validators/
│   │   └── main.py
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── pyproject.toml
│   └── requirements.txt
├── data/
│   ├── schemas/
│   ├── seed/
│   └── quality_reports/
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   ├── DATA_SOURCES_AND_VERIFICATION.md
│   ├── LOCALIZATION.md
│   ├── SECURITY_AND_PRIVACY.md
│   └── TEST_PLAN.md
├── scripts/
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

Simplify where useful during the first build. Do not create empty
abstractions for every future feature; keep boundaries that support
current requirements.

------------------------------------------------------------------------

## 25. Environment Configuration

Example `.env.example`:

``` dotenv
APP_ENV=development
LOG_LEVEL=INFO

# AI providers: backend only
GROQ_API_KEY=
GROQ_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=

# Translation: backend only
SARVAM_API_KEY=
SARVAM_TRANSLATE_MODEL=
INDICTRANS2_ENABLED=false

# Supabase
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Routing and geocoding
ROUTING_API_URL=
ROUTING_API_KEY=
GEOCODING_API_URL=

# Operational controls
LLM_TIMEOUT_SECONDS=25
LLM_MAX_RETRIES=1
LLM_MODE=parallel
ENABLE_DETERMINISTIC_FALLBACK=true
```

This is a template, not a claim that every variable is required or that
each provider uses these exact names. Align variables with the selected
SDKs and endpoints. Privileged Supabase keys must remain server-side.
Never commit real credentials.

------------------------------------------------------------------------

## 26. Phased Development Plan

### Phase 0 --- Scope and setup

-   Confirm MVP user flows.
-   Create repository skeleton.
-   Set up frontend and backend.
-   Add formatting, linting, and test commands.
-   Add `.gitignore`, `.env.example`, README, and architecture notes.

**Exit condition:** Both applications run locally and no secrets are
committed.

### Phase 1 --- Destination data foundation

-   Define destination and source schemas.
-   Create database migrations.
-   Seed a small manually reviewed catalogue.
-   Implement search/filter API.
-   Add provenance and verification status.
-   Add data-quality tests.

**Exit condition:** The destination explorer returns records with source
and status metadata.

### Phase 2 --- Planner without AI

-   Build trip form and validation.
-   Implement candidate selection and geographic grouping.
-   Add routing abstraction and budget calculator.
-   Implement deterministic itinerary generation.
-   Validate routes, durations, and totals.

**Exit condition:** A basic plan works from structured data alone.

### Phase 3 --- Groq and Gemini

-   Create separate provider adapters.
-   Add structured prompts and schemas.
-   Implement configurable parallel generation.
-   Compare and reconcile outputs.
-   Add timeouts, bounded retries, and error classification.
-   Implement deterministic fallback.

**Exit condition:** Single-provider, dual-provider, and
total-provider-failure paths pass tests.

### Phase 4 --- English/Kannada

-   Add i18next dictionaries.
-   Make language a first-class API field.
-   Add language instructions to both models.
-   Implement field-level language validation.
-   Integrate Sarvam for selective translation.
-   Evaluate IndicTrans2 only if justified.
-   Conduct native-speaker QA.

**Exit condition:** Language preference persists across generation,
correction, revision, and errors.

### Phase 5 --- Maps and UX polish

-   Add destination markers and route sequence.
-   Build destination detail pages.
-   Add budget visualization if useful.
-   Improve mobile layout and empty/loading states.
-   Add accessibility controls and map attribution.

**Exit condition:** Users can discover destinations, generate a plan,
inspect the map, and understand the budget.

### Phase 6 --- Hardening and deployment

-   Add unit, integration, and end-to-end tests.
-   Review RLS and API authorization.
-   Add rate limiting and sanitized logging.
-   Test provider quotas and outages.
-   Deploy frontend and backend.
-   Configure production secrets and run smoke tests.
-   Document known limitations.

**Exit condition:** Controlled deployment passes the acceptance
checklist.

### Phase 7 --- Post-MVP

Prioritize additions based on user feedback and observed failure
patterns: source freshness, weather, transit, saved trips,
accessibility, and more languages.

------------------------------------------------------------------------

## 27. Antigravity IDE Workflow and Master Prompt

Use Google Antigravity as the coding environment, but do not ask the
agent to generate the entire production system in one unreviewed pass.

Recommended workflow: 1. Inspect the repository before editing. 2.
Convert this document into a phased checklist. 3. Implement one phase at
a time. 4. Require changed-file summaries and documented assumptions. 5.
Run tests after meaningful changes. 6. Accept test claims only when
actual commands and results are provided. 7. Review migrations, RLS,
authorization, and secrets manually. 8. Keep provider calls behind
adapters. 9. Maintain a known-issues file. 10. Use small, reviewable
commits.

### Master implementation prompt

``` text
You are the lead full-stack engineer implementing Namma Karnataka, an AI-powered
Karnataka travel planner. Treat the project specification as the source of truth.

Before coding:
1. Inspect the repository and summarize its state.
2. Convert the specification into a phased checklist.
3. Identify ambiguities and make conservative, documented assumptions.
4. Do not overwrite working code without explaining why.

Core stack:
- Frontend: React, Vite, TypeScript, Tailwind CSS, accessible UI components,
  React Router, i18next, Leaflet.
- Backend: Python, FastAPI, Pydantic, httpx, pytest.
- Data: Supabase PostgreSQL.
- AI: Groq and Google Gemini through separate backend adapters.
- Translation: Sarvam AI as a configurable adapter; IndicTrans2 is optional.
- Maps: OpenStreetMap-compatible map and configurable routing provider.

Non-negotiable requirements:
- Never expose provider keys or privileged Supabase keys in the frontend.
- Validate all AI output against a structured schema.
- Use only known destination IDs for normal recommendations.
- Recalculate budget totals in deterministic backend code.
- Never invent exact prices, hours, route times, access conditions, or sources.
- Preserve unknown values as unknown, not zero.
- Support English and Kannada end to end, including generated content and errors.
- Send the same normalized request and schema to Groq and Gemini.
- Validate and reconcile both outputs; never blindly concatenate them.
- If one provider fails, use the valid result from the other.
- If both fail, attempt a deterministic database-based itinerary.
- Use bounded timeouts/retries and localized errors.
- Treat translation tools as translation services, not factual verification.
- Do not log secrets or unnecessary personal data.
- Respect source licenses, attribution, rate limits, and caching policies.
- Test success, invalid output, provider failure, translation failure, routing
  failure, budget calculations, and language persistence.

Work in small phases. After each phase:
- Run relevant tests and report actual results.
- List changed files.
- Identify incomplete requirements and risks.
- Do not claim a feature is complete unless it exists and has been tested.
- Keep README and environment examples current.

Start with repository inspection and Phase 0. Do not implement every phase at once.
```

------------------------------------------------------------------------

## 28. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  AI hallucination        False destinations,     Known IDs, structured
                          fees, hours, or routes  validation, grounded
                                                  candidate set

  Sparse offbeat data     Poor or unsafe          Curate gradually, label
                          recommendations         unknowns, show sources
                                                  and verification dates

  Stale data              Access, fees, and hours Review windows, source
                          change                  metadata, user reports,
                                                  periodic rechecks

  Provider rate limits    Generation failures     Timeouts, concurrency
                                                  limits, bounded
                                                  retries, fallback
                                                  planner

  Translation errors      Awkward or misleading   Human-reviewed tests,
                          Kannada                 field-level validation,
                                                  bounded correction

  Routing inaccuracies    Unrealistic schedules   Label estimates, choose
                                                  appropriate provider,
                                                  no unsupported
                                                  live-traffic claims

  Budget uncertainty      Unexpected trip cost    Itemized estimates,
                                                  price basis, explicit
                                                  unknowns

  API cost growth         Parallel calls plus     Configurable mode,
                          translation are         candidate limits,
                          expensive               selective translation,
                                                  caching

  Secret leakage          Cost and data exposure  Backend-only keys, Git
                                                  ignore, secret
                                                  scanning, key rotation

  License violations      Legal or service-policy Review source terms,
                          risk                    licensing, attribution,
                                                  caching policies

  Scope creep             Delayed usable product  Phase-based MVP and
                                                  explicit non-goals

  False safety assurance  Risk to travelers       Show known warnings,
                                                  avoid guarantees, refer
                                                  to official/local
                                                  guidance
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 29. Open Decisions

Resolve these during implementation and document material decisions: 1.
Authentication: anonymous planning first or accounts from the start? 2.
LLM policy: always parallel or parallel only for selected requests? 3.
Destination sources: manual seed data, permitted open datasets, approved
APIs, or a combination? 4. Routing provider: which option has acceptable
coverage, terms, quotas, and cost? 5. Translation policy: Sarvam for
correction only or also missing destination translations? 6.
IndicTrans2: defer self-hosting until quality and cost tests justify it?
7. Saved trips: MVP requirement or post-MVP? 8. Live weather: excluded
initially or included through a defined provider? 9. Budget estimation:
sourced prices, user-entered rates, or documented heuristics? 10.
Editorial verification: who reviews destination records and how often?
11. Brand: has the name/domain/trademark check been completed? 12.
Privacy: how long are itineraries and operational logs retained?

------------------------------------------------------------------------

## 30. Launch Checklist

### Product

-   [ ] Main user flow is clear and responsive.
-   [ ] MVP scope is realistic.
-   [ ] Estimates and unknowns are clearly labeled.

### Data

-   [ ] Every destination has a stable ID.
-   [ ] Sources and verification statuses are recorded.
-   [ ] Coordinates and duplicates are tested.
-   [ ] Unknown prices and hours are not fabricated.
-   [ ] Licensing and attribution are reviewed.

### AI

-   [ ] Groq and Gemini adapters are independent.
-   [ ] Model IDs are configurable and currently supported.
-   [ ] Structured output is validated.
-   [ ] Provider failure paths are tested.
-   [ ] Deterministic fallback works.
-   [ ] Budget arithmetic is not delegated to the model.

### Localization

-   [ ] English and Kannada UI dictionaries are complete for MVP
    screens.
-   [ ] Generated content respects selected language.
-   [ ] Translation has bounded retries and output checks.
-   [ ] Kannada text has been reviewed by a fluent speaker.
-   [ ] Language persists across edits and errors.

### Security

-   [ ] No real secrets are in Git.
-   [ ] Frontend bundle contains no privileged API keys.
-   [ ] Supabase RLS and ownership checks are tested.
-   [ ] Logs are sanitized.
-   [ ] Rate limits and abuse controls exist.

### Operations

-   [ ] Automated tests run in CI.
-   [ ] Deployment health checks work.
-   [ ] Provider quotas and costs are understood.
-   [ ] Errors are actionable and localized.
-   [ ] README and known limitations are current.

------------------------------------------------------------------------

## 31. Official Documentation to Check

Provider models, APIs, pricing, limits, and terms can change. Verify the
exact documentation before integration and deployment:

-   Groq documentation: https://console.groq.com/docs
-   Google Gemini API: https://ai.google.dev/gemini-api/docs
-   Sarvam AI documentation: https://docs.sarvam.ai/
-   Sarvam text translation API:
    https://docs.sarvam.ai/api-reference/text/translate-text
-   AI4Bharat IndicTrans2: https://github.com/AI4Bharat/IndicTrans2
-   Supabase documentation: https://supabase.com/docs
-   FastAPI documentation: https://fastapi.tiangolo.com/
-   React documentation: https://react.dev/
-   Vite documentation: https://vite.dev/
-   Leaflet documentation: https://leafletjs.com/reference.html
-   OpenStreetMap attribution: https://www.openstreetmap.org/copyright
-   OpenStreetMap tile usage policy:
    https://operations.osmfoundation.org/policies/tiles/
-   Render documentation: https://render.com/docs
-   Vercel documentation: https://vercel.com/docs

These are starting points for technical verification. Check the actual
service terms, licenses, rate limits, and pricing applicable to the
selected configuration.

------------------------------------------------------------------------

## 32. Final Summary

Namma Karnataka should be built as a dependable, data-grounded regional
travel planner with AI acting as an assistant---not as the source of
truth.

Recommended sequence: 1. Build a curated, source-aware Karnataka
destination catalogue. 2. Implement deterministic itinerary and budget
foundations. 3. Add Groq and Gemini as independently resilient planning
providers. 4. Validate all outputs against structured data, route
constraints, and deterministic calculations. 5. Make English/Kannada a
first-class end-to-end feature. 6. Use Sarvam for selective translation
and evaluate IndicTrans2 as an optional alternative. 7. Add maps, UX
polish, security, tests, and deployment. 8. Expand data and integrations
only after the core experience is dependable.

> **A more grounded way to discover Karnataka, build a practical
> journey, and explore it in the language you're comfortable with.**
