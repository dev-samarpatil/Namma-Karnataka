# NAMMA KARNATAKA
## Technical Requirements Document (TRD)

**Product:** Namma Karnataka — AI-Powered Karnataka Travel Planner  
**Document type:** Technical Requirements Document  
**Version:** 1.0  
**Status:** Proposed implementation baseline  
**Audience:** Product owner, frontend/backend developers, AI/ML engineers, QA, DevOps, data curators, and technical reviewers  
**Primary implementation environment:** Google Antigravity IDE  
**Initial languages:** English (`en`) and Kannada (`kn`)  
**Initial geography:** Karnataka, India  

---

# 1. Document Purpose

This TRD translates the Namma Karnataka product requirements into a buildable technical specification. It defines the proposed architecture, components, interfaces, data structures, provider integrations, security controls, failure handling, testing expectations, deployment approach, and implementation sequence.

It is an engineering baseline, not evidence that any component has already been implemented. The team must verify provider capabilities, quotas, licensing, and pricing before production launch.

## 1.1 Product Summary

Namma Karnataka helps users discover Karnataka destinations—including well-known places and carefully curated lesser-known locations—and create practical itineraries based on travel duration, starting point, interests, group composition, budget, transportation, and pace.

The product combines:
- A curated, source-aware destination catalogue.
- AI-assisted itinerary generation using Groq and Google Gemini.
- Structured validation and deterministic post-processing.
- Budget estimates with explicit confidence/status labels.
- Map visualisation and route estimates from configured map/routing services.
- English and Kannada user experiences.
- Optional account-based trip saving through Supabase.

## 1.2 Normative Language

The terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** express requirement strength:
- **MUST**: required for MVP acceptance.
- **SHOULD**: recommended unless a documented reason justifies deviation.
- **MAY**: optional or future capability.

## 1.3 Scope Boundaries

This document covers the MVP and a controlled path to production. It does not require live booking, real-time traffic, real-time public transport, live weather, or guaranteed opening-hour availability. Those require separate providers, terms review, and explicit implementation.

---

# 2. Technical Goals and Constraints

## 2.1 Goals

1. Generate useful, geographically coherent itineraries for Karnataka.
2. Remain usable if either Groq or Gemini is unavailable.
3. Produce a deterministic structured-data itinerary if both AI providers fail and enough curated data exists.
4. Never fabricate destination facts, prices, opening hours, route distances, or safety/access conditions as verified facts.
5. Keep English and Kannada output usable across forms, errors, destination content, and generated plans.
6. Keep privileged API keys on the backend.
7. Make the codebase testable, observable, modular, and suitable for phased implementation in Antigravity.
8. Make trip costs internally consistent through deterministic calculations.
9. Preserve provenance and review dates for factual destination information.
10. Allow providers to be replaced through configuration/adapters rather than rewriting core business logic.

## 2.2 Non-Goals for MVP

- Booking flights, hotels, tickets, or activities.
- Payment processing.
- Guaranteeing availability or current opening status.
- Real-time traffic prediction unless the selected routing provider explicitly supports it.
- Comprehensive coverage of every Karnataka location on day one.
- User-generated public reviews or social feeds.
- Autonomous travel changes without user confirmation.
- Medical, legal, emergency, or safety guarantees.
- Training a proprietary foundation model.

## 2.3 Key Constraints

- Third-party AI, geocoding, routing, translation, and map services can have quotas, costs, outages, and terms restrictions.
- OSM map data and tile services have attribution and usage requirements; production tile infrastructure must comply with the selected provider’s policy.
- AI outputs are probabilistic and must be validated.
- Travel facts can change; source and last-checked metadata are required.
- Unknown data must remain unknown rather than be silently inferred.
- User location and saved trip data must be handled with data minimisation.

---

# 3. Proposed Technology Stack

The following stack is the baseline. Any substitution should be recorded in an architecture decision record (ADR).

| Layer | Baseline technology | Purpose | Notes |
|---|---|---|---|
| Frontend | React + Vite + TypeScript | SPA and typed UI | Keep provider secrets out of the client |
| Styling | Tailwind CSS + shadcn/ui | Responsive interface and accessible components | Follow keyboard and contrast requirements |
| Routing | React Router | Client-side routes | Protect private pages if authentication is enabled |
| Localization | i18next + react-i18next | English/Kannada UI strings | Content translation is separate from UI localization |
| Server state | TanStack Query (recommended) | API caching and request state | Avoid duplicate ad hoc caching logic |
| Maps | Leaflet | Map, markers, route overlays | Configure a compliant tile provider |
| Charts | Recharts (optional) | Budget/category visualisation | Do not make charts the only way to read totals |
| Backend | Python + FastAPI | REST API and orchestration | Async I/O for network providers |
| Validation | Pydantic | Request/response schemas | Reject invalid inputs and malformed model output |
| Database | Supabase PostgreSQL | Destinations, trips, provenance, metadata | Use migrations |
| Authentication | Supabase Auth (optional MVP) | User identity | Anonymous planning can be supported |
| File storage | Supabase Storage (optional) | User exports or approved media | Do not store unnecessary sensitive data |
| AI provider A | Groq API | Itinerary candidate generation | Provider adapter, timeout and quota handling |
| AI provider B | Google Gemini API | Itinerary candidate generation | Provider adapter, timeout and quota handling |
| Translation | Sarvam AI, selectively | Repair/translate supported text fields | Only call when required and supported |
| Translation alternative | IndicTrans2, optional | Self-hosted translation alternative | Not required for initial MVP |
| Geocoding/routing | Configurable provider | Coordinates, route distances and durations | Do not treat straight-line distance as road distance |
| Testing | pytest, HTTPX, Vitest, React Testing Library, Playwright | Backend/frontend/e2e tests | Mock external providers in CI |
| CI | GitHub Actions (recommended) | Lint, tests, build | No real production secrets in CI |
| Hosting | Vercel + Render (candidate) | Frontend/backend deployment | Select plans based on usage and service limits |
| Error monitoring | Sentry or equivalent (optional) | Exceptions and release health | Scrub user data and secrets |
| Logging | Structured Python logging | Debugging and operations | No prompts containing unnecessary personal data |

### 3.1 Architecture Decision Records

Maintain `docs/adr/` with one Markdown file per consequential decision. At minimum:
- ADR-001: frontend/backend framework.
- ADR-002: database and authentication strategy.
- ADR-003: AI provider orchestration and fallback.
- ADR-004: map, geocoding, and routing provider.
- ADR-005: translation strategy.
- ADR-006: destination data sourcing/licensing.
- ADR-007: caching and rate limiting.

---

# 4. System Architecture

## 4.1 Logical Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                    User / Browser / Mobile Web             │
└──────────────────────────────┬─────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼─────────────────────────────┐
│ React + Vite + TypeScript                                   │
│ Pages, forms, i18n, itinerary view, map, budget UI          │
└──────────────────────────────┬─────────────────────────────┘
                               │ HTTPS JSON REST
┌──────────────────────────────▼─────────────────────────────┐
│ FastAPI Backend                                             │
│ Auth/validation, rate limits, orchestration, domain logic   │
├────────────────────────────────────────────────────────────┤
│ Destination Service │ Itinerary Service │ Budget Service   │
│ Route Adapter       │ Translation Service│ Trip Service     │
├────────────────────────────────────────────────────────────┤
│ AI Orchestrator: Groq + Gemini + validator + fallback       │
└──────────────┬──────────────┬───────────────┬──────────────┘
               │              │               │
         Groq API        Gemini API     Translation API
               │              │               │
               └──────────────┬───────────────┘
                              │
┌─────────────────────────────▼──────────────────────────────┐
│ Supabase PostgreSQL                                         │
│ Destination catalogue, sources, trips, itinerary snapshots │
└─────────────────────────────┬──────────────────────────────┘
                              │
                    Geocoding / Routing API
                              │
                    Map tiles in browser
```

## 4.2 Trust Boundaries

1. **Browser boundary:** all browser code and requests are user-controlled. Never place privileged keys here.
2. **API boundary:** validate every request, authenticate protected actions, apply rate limits, and enforce ownership.
3. **Provider boundary:** treat all external responses as untrusted, time-limited inputs.
4. **Database boundary:** use least-privilege access, migrations, and Row Level Security (RLS) where user-specific records are exposed.
5. **Content boundary:** destination records and AI output must be treated as data, not executable instructions.

## 4.3 Core Request Flow

1. User selects origin, dates/duration, group size, budget, travel mode, interests, pace, and language.
2. Frontend performs immediate UX validation.
3. Backend validates and normalises the request.
4. Destination service retrieves eligible destinations from the curated catalogue.
5. AI orchestrator requests candidate itineraries from Groq and Gemini according to configured policy.
6. Provider outputs are parsed into the same schema and validated against allowed destination IDs and user constraints.
7. Reconciliation chooses or combines only valid itinerary components; it does not blindly merge conflicting schedules.
8. Deterministic services compute budget totals and, where configured, retrieve route distances/durations.
9. Language service checks requested-language completeness and repairs selected human-facing fields if necessary.
10. The API returns an itinerary with provenance, estimate labels, warnings, and generation mode.
11. Frontend renders days, map, budget, caveats, and source details.
12. If AI providers fail, deterministic planning uses curated destination and rule data. If insufficient data exists, return a clear recoverable error instead of inventing an itinerary.

---

# 5. Repository and Code Organisation

Recommended monorepo:

```text
namma-karnataka/
├── apps/
│   └── web/
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── features/
│       │   │   ├── trip-planner/
│       │   │   ├── itinerary/
│       │   │   ├── destinations/
│       │   │   ├── map/
│       │   │   ├── budget/
│       │   │   └── saved-trips/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── locales/
│       │   │   ├── en/
│       │   │   └── kn/
│       │   ├── services/
│       │   ├── types/
│       │   └── tests/
│       ├── package.json
│       └── vite.config.ts
├── services/
│   └── api/
│       ├── app/
│       │   ├── api/
│       │   │   └── routes/
│       │   ├── core/
│       │   ├── schemas/
│       │   ├── models/
│       │   ├── repositories/
│       │   ├── services/
│       │   │   ├── ai/
│       │   │   ├── destinations/
│       │   │   ├── itinerary/
│       │   │   ├── budget/
│       │   │   ├── routing/
│       │   │   └── translation/
│       │   ├── db/
│       │   ├── middleware/
│       │   └── main.py
│       ├── tests/
│       ├── pyproject.toml
│       └── Dockerfile
├── supabase/
│   ├── migrations/
│   └── seed/
├── data/
│   ├── import/
│   └── validation/
├── docs/
│   ├── adr/
│   ├── api/
│   ├── data/
│   └── runbooks/
├── scripts/
├── .github/workflows/
├── .env.example
├── .gitignore
└── README.md
```

This layout is a recommendation, not a mandate to reorganise an existing repository blindly. Antigravity must inspect the repository first and preserve working code unless migration is intentional.

## 5.1 Naming and Code Standards

- Python: type hints, Pydantic schemas, clear service/repository boundaries, `ruff` (or equivalent), pytest.
- TypeScript: strict mode, avoid `any`, typed API contracts, ESLint and Prettier.
- API field names: `snake_case`; TypeScript properties may remain `snake_case` to match API or use one documented mapping strategy.
- IDs: stable opaque IDs; do not use translated destination names as identifiers.
- Dates: ISO 8601; timestamps in UTC where timestamps are stored. Local travel dates must retain the relevant local date and timezone semantics.
- Money: use decimal-safe arithmetic (`Decimal` or integer minor units), not floating-point totals.
- Coordinates: WGS84 decimal latitude/longitude; validate latitude `[-90, 90]` and longitude `[-180, 180]`.
- All user-facing text must be localizable.
- No credentials or real user data in committed fixtures.

---

# 6. Frontend Technical Requirements

## 6.1 Pages and Routes

| Route | Page | Access |
|---|---|---|
| `/` | Home / value proposition | Public |
| `/plan` | Trip preferences form | Public |
| `/itinerary/:tripId` | Itinerary results | Public or owner-restricted depending on persistence design |
| `/destinations` | Destination explorer | Public |
| `/destinations/:destinationId` | Destination detail | Public |
| `/saved-trips` | Saved trips | Authenticated if enabled |
| `/settings` | Language and preferences | Public; account settings authenticated |
| `*` | Not-found page | Public |

Avoid putting personal information or secret tokens in route parameters.

## 6.2 Shared UI Components

- `AppHeader`, `AppFooter`, `LanguageSwitcher`
- `TripPreferenceForm`, `DateRangePicker`, `BudgetInput`
- `DestinationCard`, `DestinationFilters`, `DestinationDetailPanel`
- `ItineraryDayCard`, `ItineraryStop`, `TravelLeg`
- `ItineraryMap`, `DestinationMarker`, `RoutePolyline`
- `BudgetSummary`, `BudgetBreakdown`, `EstimateStatusBadge`
- `SourceDisclosure`, `VerificationBadge`, `WarningBanner`
- `LoadingState`, `EmptyState`, `ErrorState`, `RetryButton`
- `SaveTripButton`, `ExportTripButton` (export can be post-MVP)

## 6.3 UI State Requirements

Every network-dependent view MUST implement:
- Initial/loading state.
- Success state.
- Empty state.
- Recoverable error state with retry where safe.
- Partial-data state when some optional provider data is missing.
- Offline/unavailable indication when relevant.
- Clear indication when an itinerary uses deterministic fallback rather than AI.
- Clear distinction between verified facts, estimates, and unknowns.

## 6.4 Accessibility and Responsive Design

- Semantic HTML and accessible form labels.
- Full keyboard navigation and visible focus indicators.
- Appropriate contrast and non-colour-only status indicators.
- Map content must have a parallel textual itinerary/list.
- Responsive layouts for small mobile screens, tablets, and desktop.
- Respect reduced-motion preferences.
- Kannada fonts and line wrapping must be tested; avoid fixed-height text containers that clip glyphs.
- Error messages should identify the field and explain how to correct it.
- Aim for WCAG 2.2 AA where feasible.

## 6.5 Frontend Validation

Validate at minimum:
- Origin is supplied or explicitly marked “choose later” if that mode is supported.
- Duration is within configured product limits.
- Start/end dates are valid and ordered.
- Group size is a positive integer within configured limits.
- Budget is non-negative and currency is supported.
- Travel mode and pace use enumerated values.
- Interests are from known options or safely bounded free text.
- User constraints are length-limited and treated as untrusted input.

Frontend validation improves usability; backend validation is authoritative.

## 6.6 Frontend API Layer

- Use one typed API client with base URL from `VITE_API_BASE_URL`.
- Do not call AI providers directly from the browser.
- Set request timeouts and show progress for long-running generation.
- Support cancellation when the user leaves or restarts generation.
- Avoid retrying non-idempotent writes automatically unless protected by an idempotency key.
- Use server-generated IDs for saved trips.
- Keep client cache entries scoped to user identity where authentication is enabled.

---

# 7. Backend Technical Requirements

## 7.1 Service Responsibilities

### API layer
- Parse requests and responses.
- Apply authentication, request IDs, rate limiting, and error mapping.
- Avoid embedding business logic in route handlers.

### Destination service
- Search/filter destinations.
- Enforce published/active status and visibility.
- Return coordinates, descriptions, tags, source and verification metadata.
- Never expose private moderation notes.

### Itinerary service
- Normalise preferences.
- Retrieve candidates.
- Invoke AI orchestration or deterministic fallback.
- Validate schedule constraints.
- Attach warnings and provenance.
- Produce a versioned itinerary snapshot.

### AI orchestration service
- Call provider adapters.
- Apply timeout/retry/circuit-breaker policies.
- Validate JSON output.
- Compare candidate quality using explicit rules.
- Return a consistent response irrespective of provider.

### Budget service
- Calculate totals deterministically.
- Track known, estimated, user-provided, and unknown cost values.
- Prevent double counting.
- Recalculate totals after itinerary edits.

### Routing service
- Request routes only through the configured provider.
- Cache permitted route responses.
- Identify whether a value is road-route, transit-route, or straight-line estimate.
- Never present straight-line distance as driving distance.

### Translation service
- Check field-level language completeness.
- Translate only eligible human-facing fields.
- Preserve IDs, numbers, dates, coordinates, schema keys, and user-entered names as appropriate.
- Record whether content was generated directly in the language or translated.

### Trip service
- Save/load/delete trips with ownership checks.
- Store an itinerary snapshot and version.
- Keep public catalogue data separate from private user trips.

## 7.2 API Versioning

- Prefix routes with `/api/v1`.
- Do not make breaking schema changes without versioning or a compatibility window.
- Document request/response models in OpenAPI.
- Use a stable error envelope.
- Generate frontend types from OpenAPI if practical.

## 7.3 Standard Error Envelope

```json
{
  "error": {
    "code": "AI_PROVIDERS_UNAVAILABLE",
    "message": "Itinerary generation is temporarily unavailable.",
    "message_key": "errors.ai_providers_unavailable",
    "request_id": "req_example",
    "retryable": true,
    "details": {}
  }
}
```

Requirements:
- `code` is a stable machine-readable identifier.
- `message` is safe for user display and must not reveal secrets.
- `message_key` allows localized client copy.
- `request_id` allows support/debug correlation.
- `retryable` is a boolean.
- `details` contains only safe, non-sensitive field errors.

---

# 8. API Specification

The following contracts are proposed. Implementations must keep the OpenAPI specification and tests aligned with actual behaviour.

## 8.1 Health

### `GET /api/v1/health`

Example response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "dependencies": {
    "database": "ok"
  }
}
```

Public health output MUST NOT reveal hostnames, credentials, full provider error messages, or infrastructure secrets. A separate authenticated/internal readiness endpoint may report more detail.

## 8.2 Destination Search

### `GET /api/v1/destinations`

Query parameters:
- `q`: optional search text.
- `district`: optional district slug.
- `category`: optional category.
- `tags`: optional comma-separated tags.
- `max_price_level`: optional supported enum.
- `access_status`: optional supported enum.
- `language`: `en` or `kn`.
- `limit`: bounded page size.
- `cursor`: optional pagination cursor.

Example response:

```json
{
  "items": [
    {
      "id": "dst_example_001",
      "name": "Example Destination",
      "district": "Example District",
      "category": "nature",
      "coordinates": {"lat": 14.0, "lon": 75.0},
      "summary": "Curated summary text.",
      "tags": ["nature", "viewpoint"],
      "access_status": "unknown",
      "price_status": "unknown",
      "verification": {
        "status": "needs_review",
        "last_checked_at": null
      }
    }
  ],
  "next_cursor": null
}
```

Example values are illustrative and must not be interpreted as real destination records.

## 8.3 Destination Detail

### `GET /api/v1/destinations/{destination_id}`

- Return `404 DESTINATION_NOT_FOUND` for unknown or unpublished IDs.
- Return only fields allowed by the public schema.
- Include source/provenance references and last-check date where available.
- Return unknown fields as `null` or a status enum, not fabricated values.

## 8.4 Generate Itinerary

### `POST /api/v1/itineraries/generate`

Request example:

```json
{
  "origin": {
    "label": "Mysuru",
    "coordinates": {"lat": 12.2958, "lon": 76.6394}
  },
  "start_date": "2026-11-14",
  "duration_days": 3,
  "group": {
    "adults": 2,
    "children": 0,
    "seniors": 0
  },
  "budget": {
    "amount": 18000,
    "currency": "INR",
    "scope": "whole_trip",
    "includes_accommodation": true
  },
  "transport_mode": "car",
  "pace": "balanced",
  "interests": ["nature", "heritage", "local_food"],
  "language": "en",
  "constraints": {
    "accessibility_needs": [],
    "dietary_preferences": [],
    "avoid": []
  }
}
```

Response example:

```json
{
  "trip_id": "trip_example_123",
  "schema_version": "1.0",
  "generation": {
    "mode": "ai_reconciled",
    "providers_used": ["groq", "gemini"],
    "fallback_used": false,
    "generated_at": "2026-10-22T10:00:00Z"
  },
  "summary": "Illustrative itinerary summary.",
  "days": [],
  "budget": {
    "currency": "INR",
    "total_min": 12000,
    "total_max": 18000,
    "status": "estimated",
    "items": []
  },
  "warnings": [],
  "sources": []
}
```

`days: []` is an illustrative placeholder. A successful production response must contain a valid schedule or return a documented partial-data response.

Validation rules:
- `duration_days` must be within configured limits.
- Dates must be valid and consistent with duration.
- Coordinates must be within valid ranges.
- Group counts must be non-negative and at least one traveller must be present.
- Currency must be supported.
- All selected destination IDs must exist and be eligible.
- The backend must cap request size and user free-text length.
- Do not allow user input to override system instructions or provider policy.

## 8.5 Retrieve Itinerary

### `GET /api/v1/itineraries/{trip_id}`

- If trip persistence is enabled, enforce owner access.
- If public share links are added later, use unguessable tokens and explicit revocation.
- Return schema version and generation mode.
- Return current known warnings and the snapshot’s creation time.

## 8.6 Save / Update / Delete Trip

- `POST /api/v1/trips` — save a trip snapshot.
- `PATCH /api/v1/trips/{trip_id}` — update permitted user-editable fields.
- `DELETE /api/v1/trips/{trip_id}` — delete an owned trip.
- `GET /api/v1/trips` — list the authenticated user’s trips.

All operations require authentication if saved trips are private. Every endpoint MUST verify ownership server-side; hiding a button in the UI is not access control.

## 8.7 Translation Repair (Internal)

### `POST /api/v1/internal/translation/repair`

- Internal service-to-service operation; not public by default.
- Accepts allowlisted human-facing fields and target language.
- Must not accept arbitrary schema keys or unbounded payloads.
- Must not translate stable IDs, currency codes, dates, coordinates, or machine enums.
- Record provider/translation status without storing unnecessary raw content.

## 8.8 API Rate Limits

Initial values should be configurable and tuned after load testing, not treated as final capacity guarantees:
- Public destination search: e.g. 60 requests/minute/IP.
- Itinerary generation: e.g. 5 requests/minute/IP and a separate per-user quota if authenticated.
- Save/update endpoints: e.g. 30 requests/minute/user.
- Internal provider calls: concurrency and daily/monthly budgets configured separately.

Return `429 RATE_LIMITED` with a retry hint where appropriate. Do not use IP address as the sole long-term identity mechanism for authenticated quota policy.

---

# 9. Data Model and Database Requirements

## 9.1 Design Principles

- Stable IDs independent of display language.
- Normalise canonical destination facts; snapshot itinerary output so later catalogue changes do not silently rewrite old trips.
- Store provenance for factual claims.
- Use explicit enums/statuses for unknown or unverified fields.
- Use migrations and constraints.
- Index search/filter and ownership fields.
- Store money as integer minor units or exact decimal types; specify INR semantics consistently.
- Keep user profile fields minimal.
- Set retention/deletion rules for user data.

## 9.2 Core Tables

### `destinations`

| Column | Type (suggested) | Requirements |
|---|---|---|
| `id` | text/UUID | Primary key; stable |
| `slug` | text | Unique, language-neutral |
| `district_code` | text nullable | Foreign key to district where applicable |
| `category` | text | Constrained enum or lookup |
| `latitude` | numeric nullable | Valid coordinate if present |
| `longitude` | numeric nullable | Valid coordinate if present |
| `access_status` | text | `open_reported`, `restricted`, `seasonal`, `unknown`, `closed_reported` |
| `price_status` | text | `verified`, `estimated`, `user_reported`, `unknown` |
| `active` | boolean | Only active/published records appear publicly |
| `created_at` | timestamptz | Required |
| `updated_at` | timestamptz | Required |

### `destination_translations`

| Column | Type | Requirements |
|---|---|---|
| `destination_id` | FK | Destination |
| `language_code` | text | `en`, `kn` initially |
| `name` | text | Required for published language |
| `short_description` | text nullable | Localized |
| `long_description` | text nullable | Localized |
| `how_to_reach` | text nullable | Must be source-aware |
| `access_notes` | text nullable | Avoid unverified safety claims |
| `translation_status` | text | `human_reviewed`, `provider_generated`, `needs_review` |
| `updated_at` | timestamptz | Required |

Composite primary key: `(destination_id, language_code)`.

### `destination_sources`

| Column | Type | Requirements |
|---|---|---|
| `id` | UUID/text | Primary key |
| `destination_id` | FK | Destination |
| `source_name` | text | Human-readable source |
| `source_url` | text nullable | Validated URL |
| `source_type` | text | `official`, `government`, `open_data`, `field_verified`, `other` |
| `claim_scope` | text | What this source supports |
| `checked_at` | timestamptz nullable | Last checked |
| `license_notes` | text nullable | Record attribution/usage restrictions |
| `confidence` | numeric nullable | Optional internal assessment |

### `destination_costs`

- `id`
- `destination_id`
- `cost_type` (`entry`, `activity`, `parking`, `guide`, etc.)
- `min_amount_minor`
- `max_amount_minor`
- `currency` (initially `INR`)
- `status` (`verified`, `estimated`, `user_reported`, `unknown`)
- `valid_from`, `valid_until`
- `source_id`
- `checked_at`

Do not store an invented zero price to represent unknown price. Use null/status.

### `districts`

- `code` primary key
- `name_en`
- `name_kn`
- `active`
- optional centroid coordinates

### `trips`

- `id` UUID
- `user_id` nullable if anonymous trips are supported
- `title` nullable
- `origin_json` JSONB
- `preferences_json` JSONB
- `status`
- `created_at`, `updated_at`
- `deleted_at` nullable if soft deletion is selected

### `itinerary_snapshots`

- `id` UUID
- `trip_id` FK
- `schema_version`
- `itinerary_json` JSONB
- `generation_mode` (`groq`, `gemini`, `ai_reconciled`, `deterministic_fallback`, `cached`)
- `provider_metadata_json` JSONB with safe metadata only
- `created_at`
- `warnings_json` JSONB

### `user_preferences` (optional)

- `user_id` primary key/FK
- `preferred_language`
- `default_currency`
- `default_transport_mode`
- `created_at`, `updated_at`

Avoid collecting exact birth date, phone, home address, or other sensitive data unless a clearly justified feature requires it.

## 9.3 PostgreSQL Indexes

At minimum:
- `destinations(active, category)`
- `destinations(district_code)`
- `destination_translations(language_code, destination_id)`
- `destination_sources(destination_id)`
- `destination_costs(destination_id, cost_type)`
- `trips(user_id, updated_at DESC)`
- `itinerary_snapshots(trip_id, created_at DESC)`

For text search, start with PostgreSQL full-text search/trigram support if appropriate. Evaluate Kannada search tokenisation before promising equivalent search quality in both languages.

## 9.4 Row Level Security

If Supabase client access reaches user-specific tables:
- Enable RLS.
- Users can select/update/delete only rows where `user_id = auth.uid()`.
- Itinerary snapshots must be accessible only through an owned trip unless explicitly shared.
- Public destination catalogue may be readable through a restricted public view/policy.
- Service-role credentials are backend-only and must bypass RLS only for tightly controlled server operations.
- Test cross-user access attempts.

---

# 10. Destination Data Pipeline

## 10.1 Ingestion Stages

1. Collect source records under permitted terms.
2. Preserve original source URL, attribution, collection date, and license notes.
3. Normalise district, category, coordinates, tags, and names.
4. Deduplicate using stable identifiers and review-based matching.
5. Validate coordinates and required fields.
6. Add English/Kannada descriptions or mark translation status.
7. Validate source support for access, opening times, prices, and contact details.
8. Run automated quality checks.
9. Review high-impact or safety-related claims manually.
10. Publish only records meeting publication criteria.
11. Schedule re-verification for time-sensitive fields.
12. Track changes and allow a record to be unpublished quickly.

## 10.2 Minimum Publishable Destination

Required:
- Stable ID and canonical slug.
- At least one display name.
- Category and Karnataka location/district where known.
- Coordinates or an explicit no-coordinate status.
- A short description with provenance.
- Active/publication status.
- Verification status and source record.
- Licence/attribution review where applicable.

For a destination to be included in an automatically routed itinerary, it SHOULD have valid coordinates and a usable location record. If route-critical data is missing, exclude it or label the limitation.

## 10.3 Data Quality Rules

- Latitude/longitude ranges must be valid.
- Duplicate candidate records must be flagged.
- Opening hours and entry prices must include source and checked date if presented as current.
- Do not assume a place is open because a webpage exists.
- Do not label a location “safe” solely from popularity or an AI answer.
- Do not expose private land access as public access without reliable evidence.
- Seasonal/restricted access must be represented explicitly.
- Preserve source attribution required by the licence.
- Data refresh jobs must be idempotent and logged.

---

# 11. AI Orchestration Requirements

## 11.1 Provider Adapter Interface

Define a provider-neutral interface such as:

```python
class ItineraryProvider:
    async def generate_candidate(self, request, destination_candidates) -> "CandidateResult":
        ...
```

Each adapter must return a common result envelope:

```json
{
  "provider": "groq",
  "status": "success",
  "candidate": {},
  "latency_ms": 1200,
  "model": "configured-model-id",
  "error_code": null
}
```

Never assume model names, SDK parameters, context limits, or structured-output guarantees are permanent. Keep model IDs and supported options in environment/configuration and verify against current provider documentation.

## 11.2 Generation Policy

The orchestrator must support configurable modes:
- `parallel`: call both providers concurrently.
- `primary_then_fallback`: call one provider first and invoke the other on failure/invalid output.
- `single_provider`: lower-cost mode for development or constrained quotas.
- `deterministic_only`: no external LLM call.

Default policy may be parallel candidate generation, subject to latency and cost testing. It must not be hard-coded so tightly that switching policy requires rewriting the service.

## 11.3 Validation Before Reconciliation

Every candidate must be:
1. Parsed as JSON/schema, not free-form prose.
2. Checked for required fields and correct types.
3. Checked against actual destination IDs from the catalogue.
4. Checked for trip duration/day count.
5. Checked for impossible or contradictory time ordering.
6. Checked for duplicate stops and excessive travel.
7. Checked against budget and group constraints where calculable.
8. Checked for unsupported factual assertions or ungrounded price/access claims.
9. Checked for requested language and field completeness.
10. Rejected or repaired with a bounded retry if invalid.

Use structured output support when available, but still validate server-side.

## 11.4 Candidate Selection

Do not assume the first provider is best. Score only after schema validation. Example configurable scoring dimensions:
- Constraint satisfaction.
- Destination eligibility.
- Geographical coherence.
- Travel-time feasibility.
- Diversity of interests.
- Day-level schedule completeness.
- Budget plausibility.
- Evidence/provenance coverage.
- Language completeness.
- Warning quality.

The score weights must be documented and tested. If both candidates are valid but conflict, select the higher-scoring complete candidate or merge at a semantic level with a deterministic validator; never concatenate two itineraries blindly.

## 11.5 Provider Failure Handling

Required behaviour:
- If Groq fails and Gemini returns a valid candidate, return Gemini’s candidate.
- If Gemini fails and Groq returns a valid candidate, return Groq’s candidate.
- If one candidate is invalid and the other is valid, use the valid one and record a safe internal diagnostic.
- If both fail or return invalid results, attempt deterministic planning from curated data.
- If deterministic planning lacks sufficient data, return a clear recoverable error.
- If translation repair fails, retain validated source-language fields where possible and mark untranslated fields; do not corrupt the itinerary.
- If routing fails, retain destinations and show route distance/time as unavailable or approximate according to configured fallback policy.
- Do not expose stack traces or provider credentials to the client.

## 11.6 Retry, Timeout, and Circuit Breaker

Configurable starting defaults (tune by testing):
- Provider request timeout: 15–25 seconds, depending on selected model/provider and expected output size.
- Maximum retry: 1 bounded retry for transient failures only.
- Do not retry invalid input, authentication errors, or quota exhaustion immediately.
- Exponential backoff with jitter for retryable `429`/`5xx` responses where provider guidance permits.
- Circuit breaker opens after a configurable failure threshold and cool-down.
- Use a global request deadline so two parallel calls cannot exceed the API’s total time budget.
- Limit provider concurrency to protect quotas and server resources.

## 11.7 Prompt Security and Grounding

- Keep system instructions server-side.
- Treat user free text and destination descriptions as untrusted content.
- Clearly delimit user input and retrieved catalogue data.
- Instruct the model to use only supplied destination IDs and source facts.
- Require an uncertainty/warnings field.
- Do not allow model-generated SQL, shell commands, or arbitrary URLs to execute.
- Validate URLs and source references against approved source IDs/domains where feasible.
- Do not treat model confidence language as calibrated probability.
- Never tell users that an itinerary is guaranteed accurate or safe.

## 11.8 Caching

Cache only where allowed by provider terms and privacy policy:
- Destination search results: short configurable TTL.
- Public destination details: longer TTL with invalidation on updates.
- Route results: TTL based on provider terms and volatility.
- AI itinerary results: cache only when inputs are normalised and user-specific data is excluded or safely keyed; do not share private itineraries across users.
- Translation output: cache by source text hash, target language, provider/model version, and policy version.

Include cache versioning and clear invalidation paths.

## 11.9 AI Observability

Record:
- Provider name and configured model ID.
- Request ID and correlation ID.
- Duration, status, retry count.
- Validation outcome and reason codes.
- Generation mode and fallback usage.
- Token/cost metadata if returned by provider and safe to retain.

Do not log API keys, raw authentication tokens, or unnecessary raw user text. Retain only the minimum prompt/response data required for debugging, with access controls and retention policy.

---

# 12. Deterministic Itinerary Fallback

## 12.1 Purpose

The deterministic planner is a reliability feature, not an AI imitation. It should create a conservative plan from known data or explicitly state that the available data is insufficient.

## 12.2 Candidate Selection

1. Filter destinations by selected interests, access status, trip duration, and constraints.
2. Require coordinates for route-optimised selection.
3. Rank by relevance, verification status, proximity, and diversity.
4. Cluster nearby destinations by configurable distance/time threshold.
5. Limit stops per day based on pace.
6. Avoid repeating a destination within one itinerary.
7. Avoid destinations marked restricted/closed.
8. Exclude or flag destinations with unresolved access-critical data.
9. Apply configured day start/end assumptions only when explicitly labelled.
10. Return warnings for missing transport, price, opening-hour, or route data.

## 12.3 Feasibility

- Prefer fewer feasible stops over an overloaded itinerary.
- Do not assign travel times without a route source or explicit approximation method.
- Do not assume attractions are open on the requested date.
- If operating hours are unknown, label them unknown and ask the user to verify before travel.
- Keep budget totals based on known/estimated inputs only and mark missing categories.

## 12.4 Output Contract

Fallback output must use the same itinerary schema as AI output and set:
- `generation.mode = "deterministic_fallback"`
- `generation.fallback_used = true`
- A user-visible notice explaining that the plan was generated from available curated data.
- Warnings for unverified or missing details.

---

# 13. Translation and Localization

## 13.1 Language Codes and Field Policy

Internal supported language codes:
- `en`: English
- `kn`: Kannada

Provider-specific language identifiers must be mapped in one adapter/configuration layer.

## 13.2 Translation Strategy

1. UI labels, validation messages, errors, and static content use reviewed translation files.
2. Destination records store language-specific fields where available.
3. Prompt the selected LLM to produce itinerary content in the requested language.
4. Validate required user-facing text fields.
5. Use Sarvam AI for selective repair where appropriate and configured.
6. If Sarvam is unavailable, preserve valid content and mark missing translations; optionally use an approved fallback.
7. Human-review high-visibility destination content before treating it as reviewed.
8. Do not use translation to invent missing destination facts.

## 13.3 Translation Invariants

Never translate:
- Destination/trip IDs.
- API field names or enum values.
- Coordinates.
- ISO dates and timestamps.
- Currency codes or numeric amounts.
- URLs and machine-readable references.
- Database keys.

Preserve the meaning of budget caveats, access restrictions, warnings, and source attribution. Translation quality must be tested with native or qualified Kannada reviewers where possible.

## 13.4 Language Acceptance Tests

- Language switch updates UI labels and persists according to selected preference.
- Form validation and API errors are understandable in both languages.
- Generated itinerary text is predominantly in the requested language.
- Proper nouns remain identifiable.
- Numbers, dates, prices, coordinates, and destination IDs remain unchanged.
- Partial translation failures do not break the page.

---

# 14. Budget and Cost Estimation

## 14.1 Cost Categories

- Intercity transport.
- Local transport.
- Accommodation.
- Food.
- Entry fees and activities.
- Guide/parking where applicable.
- Miscellaneous.
- Contingency.

## 14.2 Cost Model

Each estimate should carry:
- `min_amount_minor`
- `max_amount_minor`
- `currency`
- `status`: `verified`, `estimated`, `user_provided`, `unknown`
- `source_id` and `checked_at` where applicable
- Optional calculation notes

Totals must be calculated on the backend from line items. Do not ask an LLM to perform authoritative arithmetic.

For an estimated range:
- `total_min = sum(known line item minima)`
- `total_max = sum(known line item maxima)`
- Unknown categories must be represented separately; do not silently count them as zero.
- Contingency must be explicit and applied once.
- Per-person and whole-trip totals must be clearly distinguished.
- Include or exclude accommodation according to the user’s chosen scope.

## 14.3 Budget Warnings

Warn when:
- The known estimate exceeds the user’s budget.
- Several cost categories are unknown.
- Accommodation/transport assumptions are missing.
- Values are old or not verified for the travel date.
- The budget excludes major expenses.

Never promise that a trip can be completed within budget when significant categories are unknown.

---

# 15. Maps, Geocoding, and Routing

## 15.1 Map Requirements

- Display destination markers using validated coordinates.
- Marker click opens destination summary and itinerary day/stop.
- Provide a list alternative to map-only navigation.
- Route polylines must be based on route geometry from a permitted routing source.
- Distinguish route legs from straight-line connector lines.
- Include required map-data attribution.
- Support mobile map interactions and keyboard-accessible destination list.

## 15.2 Routing Provider Adapter

Define a provider-neutral method:

```python
async def get_route(origin, destination, transport_mode) -> RouteResult:
    ...
```

`RouteResult` should include:
- `status`
- `distance_meters`
- `duration_seconds`
- `geometry` (optional)
- `mode`
- `provider`
- `retrieved_at`
- `is_approximate`
- `warning`

If no road route is available, do not label a geodesic distance as driving distance. Use `status = "unavailable"` or `is_approximate = true` with a clear label.

## 15.3 Geocoding

- Prefer known coordinates in the curated catalogue.
- Geocode user-supplied origins only through a configured provider.
- Respect rate limits and usage terms.
- Cache geocoding responses only where permitted.
- If a location name is ambiguous, ask the user to select a result rather than silently choosing a potentially wrong city.
- Do not store exact user origin longer than needed unless the user saves the trip and consents to that persistence.

## 15.4 Map Provider Compliance

Do not assume the public OpenStreetMap tile endpoint is an unlimited production tile service. Review its current tile policy and use a provider or self-hosted infrastructure appropriate to the expected usage. Display required attribution.

---

# 16. Authentication, Privacy, and Security

## 16.1 Authentication Modes

MVP may allow itinerary generation without an account. Saved trips require authentication if persistence is offered. The chosen mode must be explicit in configuration and product UI.

If Supabase Auth is used:
- Verify JWTs server-side for protected endpoints.
- Use the authenticated user ID from the verified token, not a client-supplied `user_id`.
- Apply RLS and ownership checks.
- Support logout and account deletion according to product policy.

## 16.2 Secrets Management

Server-side secrets may include:
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `SARVAM_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (public client key may be used in browser under correct RLS; still configure carefully)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to frontend)
- `DATABASE_URL` if direct database connections are used
- routing/geocoding provider credentials, if applicable

Rules:
- Commit only placeholders in `.env.example`.
- Ignore `.env`, private keys, credential exports, and local logs.
- Rotate any credential that has been exposed.
- Do not place secrets in `VITE_*` variables.
- Restrict production credentials to production environments.
- Redact secrets from exceptions and logs.

## 16.3 Input Security

- Enforce request body size limits.
- Validate types, ranges, enums, string length, and URL formats.
- Use parameterised SQL/ORM queries.
- Escape/render user text safely.
- Rate-limit expensive endpoints.
- Protect against prompt injection by treating user text and retrieved content as untrusted.
- Do not execute model-generated code, SQL, or commands.
- Add CORS allowlist for deployed frontend domains.
- Use HTTPS in production.
- Set secure response headers where compatible.

## 16.4 Privacy

- Collect only trip preferences needed to generate the itinerary.
- Avoid collecting precise home addresses or personal identity data.
- Clearly disclose if user input is sent to external AI providers.
- Avoid sending account IDs, email addresses, or other identifiers to LLMs unless necessary.
- Define retention and deletion policies for saved trips and operational logs.
- Do not use private saved trips for training without explicit informed consent and appropriate policy.
- Do not log full prompts by default.
- Provide a privacy notice before production release.

## 16.5 Security Testing

- Secret scanning in CI.
- Dependency vulnerability scanning.
- RLS tests for cross-user reads/writes.
- Auth tests for missing, expired, and malformed tokens.
- Request validation and rate-limit tests.
- CORS checks.
- Prompt-injection and malicious-content test cases.
- Ensure errors do not expose stack traces or credentials.

---

# 17. Non-Functional Requirements

These are initial targets to verify with load testing and actual provider plans, not guarantees.

| ID | Requirement | Initial target / acceptance |
|---|---|---|
| NFR-01 | API responsiveness | Destination search p95 under 800 ms excluding external provider latency, on representative staging data |
| NFR-02 | Itinerary generation | Return a useful response within configured global deadline; target 30 seconds for MVP, subject to model output size and provider performance |
| NFR-03 | Availability | Graceful degradation when an external AI/translation/routing provider fails |
| NFR-04 | Data integrity | No itinerary references an unknown/unpublished destination ID |
| NFR-05 | Budget integrity | Backend totals reconcile exactly to line items under defined rules |
| NFR-06 | Localization | Core UI, errors, and key itinerary fields supported in English and Kannada |
| NFR-07 | Security | No privileged API keys in frontend bundles or public repository |
| NFR-08 | Accessibility | Keyboard-usable core flows; aim for WCAG 2.2 AA |
| NFR-09 | Responsive UX | Core flows usable on mobile, tablet, and desktop |
| NFR-10 | Observability | Request IDs and structured logs for errors/fallbacks |
| NFR-11 | Testability | CI tests run without real AI provider credentials |
| NFR-12 | Maintainability | Provider adapters and domain services are independently testable |
| NFR-13 | Recovery | Failed optional map/translation calls do not destroy an otherwise valid itinerary |
| NFR-14 | Data provenance | Published factual destination claims carry source metadata or explicit unknown status |
| NFR-15 | Privacy | Saved trips are accessible only to their owner unless explicitly shared |

---

# 18. Error Taxonomy and Resilience

## 18.1 Stable Error Codes

Suggested codes:
- `VALIDATION_ERROR`
- `DESTINATION_NOT_FOUND`
- `NO_ELIGIBLE_DESTINATIONS`
- `AI_PROVIDERS_UNAVAILABLE`
- `AI_OUTPUT_INVALID`
- `ROUTING_UNAVAILABLE`
- `GEOCODING_AMBIGUOUS`
- `TRANSLATION_UNAVAILABLE`
- `AUTH_REQUIRED`
- `FORBIDDEN`
- `RATE_LIMITED`
- `DATABASE_UNAVAILABLE`
- `INTERNAL_ERROR`

## 18.2 Resilience Matrix

| Failure | Required behaviour |
|---|---|
| Groq fails | Use valid Gemini result; otherwise deterministic fallback |
| Gemini fails | Use valid Groq result; otherwise deterministic fallback |
| Both AI providers fail | Deterministic itinerary from curated data if feasible |
| AI output malformed | Validate, bounded repair/retry, use other valid result or fallback |
| Translation provider fails | Keep valid fields, mark missing translation, do not alter IDs/numbers |
| Routing provider fails | Show route unavailable/approximate, preserve itinerary |
| Database unavailable | Return safe service-unavailable error; use cached public data only if cache policy allows |
| No matching destinations | Ask to broaden preferences or change duration; do not invent locations |
| Supabase auth fails | Do not permit protected operation |
| Rate limit reached | Return `429` and retry guidance |
| Partial destination data | Show missing-data warnings and verification status |

## 18.3 Idempotency

- Read endpoints should be safe to retry.
- For trip-save or other create operations, accept an `Idempotency-Key` if duplicate submissions would create unwanted records.
- Store idempotency records with bounded retention and user/request scope.
- Do not blindly retry a write after a network timeout without determining whether it succeeded.

---

# 19. Observability and Operations

## 19.1 Structured Logging

Recommended fields:
- `timestamp`
- `level`
- `service`
- `environment`
- `request_id`
- `route`
- `status_code`
- `duration_ms`
- `generation_mode`
- `provider_statuses`
- `fallback_used`
- `error_code`

Avoid recording:
- API keys/tokens.
- Full user authentication headers.
- Full raw prompts unless explicitly enabled for a short, access-controlled diagnostic window.
- Sensitive user text or precise origins not needed for debugging.

## 19.2 Metrics

Track:
- API request rate, latency, and error rate.
- Itinerary generation success rate.
- Groq/Gemini availability, latency, and schema-validity rate.
- Deterministic fallback frequency.
- Translation repair frequency/failure.
- Routing success rate.
- Rate-limit hits.
- Database query latency.
- Cost per successful itinerary where provider usage metadata is available.
- Destination coverage and verification freshness.
- English/Kannada completion and user-reported issues.

## 19.3 Alerts

Set alerts for:
- Sustained 5xx spikes.
- Both AI providers unavailable.
- Fallback rate above a configured threshold.
- Provider quota/rate-limit exhaustion.
- Database connection failures.
- High p95 latency.
- Secret scanning/dependency security failures.
- Unexpected increases in cost or request volume.

## 19.4 Runbooks

Maintain runbooks for:
- AI provider outage.
- API quota exhaustion.
- Database outage and migration rollback.
- Bad destination data rollback.
- Leaked credential rotation.
- Routing/geocoding provider outage.
- Failed deployment/rollback.
- High-cost or abuse event.

---

# 20. Testing Strategy

## 20.1 Backend Unit Tests

Cover:
- Pydantic request validation.
- Destination filtering and ranking.
- Stable destination ID validation.
- Itinerary schedule validation.
- Candidate scoring and reconciliation.
- Deterministic fallback.
- Budget calculations and unknown-cost handling.
- Translation field allowlist.
- Provider timeout/retry/circuit breaker.
- Error mapping and request IDs.

## 20.2 Integration Tests

- FastAPI endpoints with test database or isolated fixtures.
- Supabase RLS/auth policies in a safe test project or policy test environment.
- Mocked Groq/Gemini response combinations.
- Mocked routing/geocoding/translation providers.
- Migration up/down or forward-only migration checks.
- Cache invalidation behaviour.

## 20.3 AI Orchestration Test Matrix

At minimum:
1. Groq valid + Gemini valid.
2. Groq valid + Gemini timeout.
3. Gemini valid + Groq timeout.
4. Both time out.
5. One returns invalid JSON, other valid.
6. Both return invalid JSON.
7. Candidate references an unknown destination.
8. Candidate exceeds duration.
9. Candidate has duplicate stops.
10. Candidate violates group/budget constraints.
11. Translation repair fails.
12. Routing fails after itinerary validation.
13. Provider returns quota error.
14. Provider returns unsafe/untrusted text.
15. No curated destination matches the request.

Tests must use deterministic fixtures; CI must not depend on live provider availability.

## 20.4 Frontend Tests

- Form validation and submission.
- Language switching.
- Loading/error/empty states.
- Itinerary day rendering.
- Budget breakdown rendering.
- Map/list parity.
- Fallback mode banner.
- Mobile responsive layouts.
- Keyboard navigation and accessible names.
- Saved trip access behaviour if enabled.

## 20.5 End-to-End Tests

Use Playwright or equivalent for:
1. Home → plan form → generated itinerary.
2. AI failure → deterministic fallback.
3. English → Kannada UI switch.
4. Budget warning display.
5. Destination detail → back to itinerary.
6. Save/retrieve/delete trip if auth is enabled.
7. Unauthorized user cannot access another user’s trip.
8. Map provider failure leaves itinerary readable.

## 20.6 Quality Gates

A release candidate cannot be declared complete unless:
- Type checking and lint pass.
- Unit/integration tests pass.
- Frontend production build succeeds.
- Backend startup and health checks pass.
- API schema matches tested implementation.
- Secret scanning passes.
- Critical security and ownership tests pass.
- Fallback behaviour is tested.
- No blocking accessibility or data integrity defect remains.
- Known limitations are documented.

---

# 21. CI/CD and Deployment

## 21.1 Environments

- `local`: developer machines, mocked external services by default.
- `test`: automated CI and isolated database fixtures.
- `staging`: production-like providers and synthetic/test data.
- `production`: restricted credentials, monitoring, controlled migrations.

Never point automated destructive tests at production.

## 21.2 CI Pipeline

Recommended GitHub Actions sequence:
1. Checkout repository.
2. Install pinned frontend/backend dependencies.
3. Lint and format checks.
4. Type check frontend.
5. Run backend unit tests.
6. Run frontend unit tests.
7. Run API contract/integration tests with mocks.
8. Build frontend.
9. Build backend container.
10. Scan dependencies/secrets.
11. Publish test/build artifacts.
12. Deploy staging only after successful checks.
13. Run smoke tests.
14. Promote production through an explicit controlled step.

## 21.3 Frontend Deployment

Vercel is a candidate:
- Configure build command and output directory.
- Set only public configuration variables in frontend environment.
- Configure SPA route fallback.
- Configure production API base URL.
- Add allowed origin to backend CORS.
- Confirm no server-only secret is bundled into generated assets.

## 21.4 Backend Deployment

Render is a candidate:
- Install dependencies from a pinned lockfile.
- Start the ASGI server with a production command such as `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- Configure health check path.
- Add secrets via platform environment settings.
- Configure request/worker timeouts based on the deployment plan.
- Ensure migrations run in a controlled, repeatable way.
- Check provider quotas and free-tier sleep/latency limitations before setting UX promises.

## 21.5 Database Migrations

- Commit all schema changes as migrations.
- Test migrations against a fresh database and a staging copy.
- Prefer additive/expand-and-contract changes for production.
- Back up or export data according to the service plan before risky migrations.
- Never edit production schema manually without capturing the change in migration history.
- Seed only curated/licensed public data and non-sensitive test fixtures.

## 21.6 Rollback

- Keep the last known-good frontend/backend release available.
- Roll back application deployment independently from schema changes where possible.
- Avoid destructive database migrations that cannot be rolled back safely.
- Document emergency steps for disabling a broken provider or switching to deterministic-only mode.

---

# 22. Environment Configuration

Example `.env.example`:

```dotenv
# Application
APP_ENV=local
APP_VERSION=0.1.0
LOG_LEVEL=INFO
API_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173
REQUEST_TIMEOUT_SECONDS=30

# Database / Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# AI providers — server only
GROQ_API_KEY=
GROQ_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=

# AI orchestration
AI_GENERATION_MODE=parallel
AI_PROVIDER_TIMEOUT_SECONDS=20
AI_MAX_RETRIES=1
AI_MAX_CONCURRENCY=5
AI_ENABLE_DETERMINISTIC_FALLBACK=true

# Translation
SARVAM_API_KEY=
TRANSLATION_PROVIDER=sarvam
TRANSLATION_REPAIR_ENABLED=true

# Routing / geocoding
ROUTING_PROVIDER=
ROUTING_API_KEY=
GEOCODING_PROVIDER=
GEOCODING_API_KEY=
MAP_TILE_URL=
MAP_ATTRIBUTION=

# Caching / limits
CACHE_ENABLED=true
DESTINATION_CACHE_TTL_SECONDS=300
RATE_LIMIT_ENABLED=true

# Frontend public configuration (in apps/web/.env.example only)
VITE_API_BASE_URL=http://localhost:8000
VITE_DEFAULT_LANGUAGE=en
```

Rules:
- Empty values are placeholders, not working credentials.
- Actual provider model IDs must be verified and configured, not assumed.
- `SUPABASE_SERVICE_ROLE_KEY` must never use a `VITE_` prefix or appear in frontend files.
- Do not commit a real `.env`.
- Add startup validation that fails safely when a required production configuration is missing.
- Optional integrations must be disabled explicitly and handled gracefully.

---

# 23. Configuration and Feature Flags

Use typed settings and feature flags for:
- `AI_GENERATION_MODE`
- `ENABLE_GROQ`
- `ENABLE_GEMINI`
- `ENABLE_TRANSLATION_REPAIR`
- `ENABLE_ROUTING`
- `ENABLE_AUTH`
- `ENABLE_SAVED_TRIPS`
- `ENABLE_EXPORT`
- `ENABLE_DETERMINISTIC_FALLBACK`

Feature flags must have documented defaults. If a provider is disabled, orchestration must not attempt to call it. Flags must not be a substitute for authentication or access control.

---

# 24. Data and API Contracts

## 24.1 Destination Contract

```json
{
  "id": "dst_opaque_id",
  "slug": "example-destination",
  "name": "Example",
  "language": "en",
  "district": {"code": "example", "name": "Example District"},
  "category": "nature",
  "coordinates": {"lat": null, "lon": null},
  "tags": [],
  "access": {
    "status": "unknown",
    "notes": null,
    "last_checked_at": null
  },
  "cost": {
    "status": "unknown",
    "currency": "INR",
    "min_amount_minor": null,
    "max_amount_minor": null,
    "last_checked_at": null
  },
  "provenance": [],
  "translation_status": "needs_review"
}
```

All values are illustrative. A null coordinate means location is not known, not zero.

## 24.2 Itinerary Contract

```json
{
  "schema_version": "1.0",
  "trip_id": "trip_opaque_id",
  "language": "en",
  "generation": {
    "mode": "ai_reconciled",
    "fallback_used": false,
    "providers_used": ["groq", "gemini"],
    "created_at": "2026-10-22T10:00:00Z"
  },
  "days": [
    {
      "day_number": 1,
      "date": "2026-11-14",
      "title": "Day title",
      "stops": [
        {
          "stop_number": 1,
          "destination_id": "dst_opaque_id",
          "start_time_local": null,
          "end_time_local": null,
          "duration_minutes": null,
          "notes": "Illustrative text",
          "cost_estimate": {
            "min_amount_minor": null,
            "max_amount_minor": null,
            "currency": "INR",
            "status": "unknown"
          },
          "warnings": []
        }
      ],
      "travel_legs": []
    }
  ],
  "budget": {
    "currency": "INR",
    "scope": "whole_trip",
    "min_amount_minor": null,
    "max_amount_minor": null,
    "status": "partial_estimate",
    "items": [],
    "unknown_categories": ["accommodation"]
  },
  "warnings": [],
  "sources": []
}
```

Contract rules:
- `day_number` starts at 1 and is sequential.
- Destination references must resolve to eligible catalogue records.
- Time fields may be null when the system does not have reliable timing data.
- Every cost range must satisfy `min <= max`.
- Currency and status fields must use enumerated values.
- The API must reject or repair malformed output before returning it.

## 24.3 Route Contract

```json
{
  "status": "available",
  "origin": {"lat": 12.0, "lon": 76.0},
  "destination": {"lat": 13.0, "lon": 77.0},
  "mode": "car",
  "distance_meters": 12345,
  "duration_seconds": 1800,
  "geometry": null,
  "provider": "configured_provider",
  "is_approximate": false,
  "retrieved_at": "2026-10-22T10:00:00Z",
  "warning": null
}
```

Illustrative only; actual values must come from a route provider.

---

# 25. Performance and Capacity Planning

## 25.1 Expected Workload

Before public launch, estimate:
- Daily active users.
- Itinerary generation requests per user.
- Concurrent generations.
- Average provider response size and latency.
- Catalogue size and update frequency.
- Map tile/routing request volume.
- Saved trip storage growth.

Do not declare production capacity based only on a successful local demo.

## 25.2 Performance Controls

- Use async network calls in FastAPI.
- Bound provider concurrency.
- Use pagination for destination search.
- Add database indexes from observed query plans.
- Cache public catalogue reads where permitted.
- Avoid calling the routing provider for every marker render; batch/cache where provider supports it.
- Limit output token count and itinerary size.
- Use frontend code splitting for map-heavy views.
- Lazy-load map components if appropriate.
- Set payload-size and timeout limits.
- Run load tests with mocked provider latency and a separate provider-cost budget.

---

# 26. Release and Implementation Phases

Implement one phase at a time. Do not move on until the phase's exit criteria pass.

## Phase 0 — Repository Audit and Decisions

**Tasks**
- Inspect existing repository and current application state.
- Identify reusable code and existing conventions.
- Confirm supported runtime versions.
- Create architecture decision records.
- Document env requirements and data licensing approach.

**Exit criteria**
- Repository map and implementation plan exist.
- No destructive refactor is performed without justification.
- Key unresolved decisions are listed explicitly.

## Phase 1 — Project Skeleton and Design System

**Tasks**
- Set up React/Vite/TypeScript and FastAPI.
- Configure linting, formatting, type checking, tests.
- Implement app shell, routing, responsive layout, language switcher.
- Establish typed API client and standard error envelope.

**Exit criteria**
- Frontend and backend start locally.
- Health endpoint works.
- CI lint/type/test/build checks pass.

## Phase 2 — Destination Catalogue

**Tasks**
- Create database migrations and schemas.
- Implement destination/district/source/cost tables.
- Add seed/import validation scripts.
- Implement search/detail endpoints.
- Add source and verification UI.

**Exit criteria**
- Seed records pass validation.
- Pagination/filtering works.
- Unknown values remain unknown.
- Attribution and source metadata are retained.

## Phase 3 — Trip Form and Itinerary Contract

**Tasks**
- Implement trip preference form.
- Add Pydantic schemas and input validation.
- Define itinerary schema/version.
- Build itinerary results UI with loading/error/empty states using fixture data.

**Exit criteria**
- Valid and invalid form cases are covered.
- UI renders a fixture itinerary without external provider calls.

## Phase 4 — AI Providers and Orchestrator

**Tasks**
- Implement Groq and Gemini adapters.
- Add prompt templates and structured output parsing.
- Implement validation, candidate scoring, timeout, retry, and circuit breaker.
- Implement deterministic fallback.
- Add provider-failure matrix tests.

**Exit criteria**
- Either provider can fail without blocking the other.
- Both-provider failure invokes deterministic fallback when feasible.
- Invalid output cannot bypass validation.
- No provider secrets are sent to the browser.

## Phase 5 — Budget, Routing, and Maps

**Tasks**
- Implement deterministic budget service.
- Integrate chosen routing/geocoding provider.
- Implement map markers and route rendering.
- Add unavailable/approximate states and map attribution.

**Exit criteria**
- Budget arithmetic reconciles.
- Routing failure does not break itinerary display.
- Road distance is not confused with straight-line distance.

## Phase 6 — English/Kannada Quality

**Tasks**
- Add reviewed UI translation dictionaries.
- Add destination translation fields and statuses.
- Prompt models in selected language.
- Integrate optional translation repair.
- Add Kannada rendering and language tests.

**Exit criteria**
- Core flows are usable in English and Kannada.
- IDs, amounts, dates, and schema fields are preserved.
- Translation failure is graceful and visible.

## Phase 7 — Persistence and Security

**Tasks**
- Decide whether MVP requires login.
- Implement Supabase Auth if enabled.
- Add save/load/delete trip endpoints.
- Apply RLS and ownership checks.
- Add security, privacy, and rate-limit tests.

**Exit criteria**
- Cross-user access is denied.
- Secrets are not in the frontend bundle.
- User data deletion/retention policy is documented.

## Phase 8 — QA, Deployment, and Observability

**Tasks**
- Run unit/integration/e2e suites.
- Add CI/CD and environment configuration.
- Deploy staging.
- Verify provider quotas, CORS, migrations, health checks, logging, and fallback.
- Run accessibility and performance checks.
- Document runbooks.

**Exit criteria**
- Release gates pass.
- Known limitations are visible in docs and UI where relevant.
- Rollback and provider-disable procedures are tested.

## Phase 9 — Controlled Pilot

**Tasks**
- Pilot with a small user group.
- Collect feedback and anonymised product metrics.
- Review destination data quality.
- Review provider costs, failure rates, latency, and Kannada quality.
- Fix critical defects before broader launch.

**Exit criteria**
- Product owner approves the pilot report and release decision.
- No unresolved critical privacy/security defect.
- AI and fallback performance meet agreed targets.

---

# 27. Acceptance Criteria for MVP

MVP is technically acceptable when all of the following are true:

1. A user can enter trip preferences and request a Karnataka itinerary.
2. Invalid input is rejected with actionable messages.
3. The backend only uses destination IDs present in the eligible catalogue.
4. Groq and Gemini are called through server-side adapters.
5. A valid response from one provider can be used if the other fails.
6. If both fail, deterministic fallback is attempted when sufficient curated data exists.
7. If no safe plan can be produced, the system returns a clear error instead of inventing one.
8. Itinerary schema validation catches missing fields, invalid IDs, duplicate stops, and duration inconsistencies.
9. Budget totals are calculated server-side and reconcile to line items.
10. Unknown prices/opening hours/access data are not represented as verified facts.
11. Map failure does not prevent users from reading the itinerary.
12. English and Kannada core UI flows work.
13. Translation failures do not alter IDs, numbers, dates, or schema keys.
14. Source/verification status is displayed for factual destination information.
15. API keys are absent from frontend bundles and repository history.
16. If trips are persisted, users cannot read or modify another user’s trips.
17. Automated tests cover provider failure combinations and deterministic fallback.
18. CI runs without live AI credentials.
19. Deployment health checks and error monitoring work.
20. README, environment setup, architecture, data sourcing, limitations, and rollback instructions are current.

---

# 28. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hallucinated destination/access facts | High | Curated catalogue, allowed IDs, source provenance, warnings |
| One AI provider unavailable | Medium | Dual-provider orchestration and fallback |
| Both AI providers unavailable | Medium | Deterministic planner, cached/public data where permitted, clear failure |
| Kannada output quality is inconsistent | Medium | Reviewed static strings, field-level checks, selective translation repair, native review |
| Incorrect budget | High | Deterministic calculations, cost status, unknown-category warnings |
| Inaccurate route durations | High | Configured routing source, explicit approximate/unavailable states |
| Stale access/price data | High | `checked_at`, re-verification process, visible caveats |
| API cost spikes | Medium | Rate limits, concurrency limits, token limits, cost metrics, kill switch |
| Provider terms change | Medium | Adapter architecture, periodic terms review, configurable providers |
| Map tile usage violation | Medium | Review provider policy and select compliant production service |
| Leaked credentials | High | Secret scanning, server-side keys, rotation runbook |
| Private trip exposure | High | RLS, ownership tests, least privilege |
| Synthetic/demo data mistaken for real facts | High | Clearly label demo records and never publish them as verified |
| Overloaded itinerary | Medium | Route feasibility checks and pace-based limits |
| Scope creep | Medium | P0/P1/P2/P3 priorities and phase exit gates |

---

# 29. Dependencies and External Documentation

Review the current official documentation before implementation; provider APIs, model identifiers, SDKs, pricing, and quotas change.

- Groq API: https://console.groq.com/docs
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- Sarvam AI: https://docs.sarvam.ai/
- Sarvam text translation: https://docs.sarvam.ai/api-reference/text/translate-text
- IndicTrans2: https://github.com/AI4Bharat/IndicTrans2
- Supabase: https://supabase.com/docs
- FastAPI: https://fastapi.tiangolo.com/
- Pydantic: https://docs.pydantic.dev/
- React: https://react.dev/
- Vite: https://vite.dev/
- React Router: https://reactrouter.com/
- Tailwind CSS: https://tailwindcss.com/docs
- Leaflet: https://leafletjs.com/reference.html
- OpenStreetMap copyright/attribution: https://www.openstreetmap.org/copyright
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

---

# 30. Antigravity Implementation Prompt

Use this prompt as the starting instruction for Google Antigravity. Implement phases incrementally rather than asking the IDE to build the entire system in one uncontrolled change.

> You are the senior full-stack engineer implementing **Namma Karnataka**, a Karnataka-focused AI travel planner. Read `Namma_Karnataka_TRD.md` and the project PRD before changing code.
>
> **First inspect the repository.** Report the existing structure, runtime versions, implemented features, tests, and risks. Do not delete or rewrite working code merely to match a preferred folder structure. Propose a small implementation plan and identify decisions that genuinely require clarification.
>
> Follow the TRD's stack and contracts unless the existing repository or a documented decision requires a change: React + Vite + TypeScript, Tailwind/shadcn, FastAPI + Pydantic, Supabase/PostgreSQL, server-side Groq and Gemini adapters, optional Sarvam translation repair, and a compliant configurable map/routing provider.
>
> **Non-negotiable requirements:**
> 1. Keep all privileged provider secrets on the backend.
> 2. Validate all requests and all AI output against explicit schemas.
> 3. Allow a valid Groq response to be used if Gemini fails and vice versa.
> 4. If both providers fail or produce invalid output, attempt a deterministic itinerary using curated data. If the data is insufficient, return a clear error rather than inventing places or facts.
> 5. Recalculate budget totals in deterministic backend code.
> 6. Never present unknown prices, hours, route durations, or access conditions as verified facts.
> 7. Support English (`en`) and Kannada (`kn`) and preserve IDs, dates, coordinates, numeric amounts, currency codes, and schema keys during translation.
> 8. Treat all user and retrieved text as untrusted input.
> 9. Add tests for normal paths, provider failure combinations, malformed output, data validation, security/ownership, and fallback.
> 10. Do not claim tests or integrations passed unless you actually ran them and captured the result.
>
> Implement only the requested phase. Before editing, state the files to change and why. After editing, run relevant lint/type/test/build checks, report actual results, list changed files, list remaining limitations, and update the implementation checklist. Do not fabricate API credentials, source records, test output, or production status.
>
> Start with **Phase 0: repository audit and architecture decisions**. Do not implement later phases until the audit is complete.

---

# 31. Definition of Ready and Definition of Done

## 31.1 Definition of Ready

A task is ready when:
- Its acceptance criteria are clear.
- API/data changes are documented.
- Required providers/credentials are identified.
- Source/licensing implications are reviewed.
- UI states and language requirements are defined.
- Tests can be written without relying on live external services.

## 31.2 Definition of Done

A task is done only when:
- Implementation matches the contract.
- Tests are added and actually run.
- Lint/type/build checks pass where applicable.
- Failure and empty states are implemented.
- English/Kannada implications are handled.
- Security/privacy impacts are reviewed.
- Documentation and examples are updated.
- No secret or private test data is committed.
- Known limitations are recorded.
- The work is not described as complete if any required acceptance criterion remains unmet.

---

# 32. Open Decisions to Confirm Before Production

The MVP can begin with configurable defaults, but the product owner should resolve these before launch:

1. Is login required for the first release, or can users plan anonymously and sign in only to save trips?
2. Which routing/geocoding provider will be used, and what are its cost/terms limits?
3. Which map tile provider will be used in production?
4. What are the approved sources and licence rules for destination records and images?
5. What are the maximum supported trip duration, group size, and generation request frequency?
6. Should AI providers run in parallel by default or use primary-then-fallback to reduce cost?
7. What are the retention periods for saved trips and operational logs?
8. Is itinerary export PDF/print required for MVP?
9. Which destination categories and districts must be covered in the first curated dataset?
10. Who reviews Kannada destination content and time-sensitive factual claims?

Do not block the initial repository audit on decisions that can safely remain configurable. Do block production release on unresolved security, licensing, privacy, and provider-terms issues.

---

# 33. Final Technical Summary

Namma Karnataka should be built as a modular, source-aware travel planning system rather than a thin prompt wrapper. The core design is:

- **React frontend** for trip input, destination discovery, itinerary display, maps, budget, and bilingual UX.
- **FastAPI backend** for validation, orchestration, deterministic calculations, data access, and access control.
- **Supabase/PostgreSQL** for curated destinations, provenance, trip preferences, and versioned itinerary snapshots.
- **Groq + Gemini adapters** for AI itinerary candidates, with schema validation and a configurable selection policy.
- **Deterministic fallback** when both AI providers are unavailable, limited to feasible plans supported by curated data.
- **Sarvam translation repair** as an optional targeted service, not a source of missing facts.
- **Configurable route/geocoding service** and a compliant map tile provider.
- **Security, tests, monitoring, CI/CD, and data provenance** as required parts of the product rather than post-launch extras.

The success criterion is not simply that the app can generate an attractive itinerary. It must produce a coherent, explainable, editable plan; distinguish verified facts from estimates; fail gracefully; and never manufacture certainty where the underlying data is unknown.
