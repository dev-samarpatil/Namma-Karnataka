# NAMMA KARNATAKA
## Complete Backend Schema Specification

**Product:** Namma Karnataka — AI-Powered Karnataka Travel Planner  
**Document type:** Backend data, API, validation, and persistence schema  
**Version:** 1.0  
**Status:** Proposed implementation baseline  
**Primary backend:** Python + FastAPI + Pydantic  
**Database:** Supabase PostgreSQL  
**Languages:** English (`en`) and Kannada (`kn`)  
**Currency baseline:** INR  
**Companion documents:** PRD, TRD, Complete Documentation, App Flow

---

# 1. Purpose and Scope

This document defines the backend schemas and contracts required to implement Namma Karnataka. It covers:
- API request and response models.
- Core domain enums and shared types.
- Destination catalogue and provenance.
- Trip preferences and itinerary snapshots.
- AI provider orchestration metadata.
- Budget and route models.
- Translation status and source references.
- Authentication, saved trips, and ownership.
- PostgreSQL tables, relationships, indexes, constraints, and Row Level Security.
- Validation rules, error formats, pagination, versioning, and testing.
- Recommended Pydantic model layout and example payloads.

This is a proposed schema baseline, not a claim that the database or API has already been implemented. The actual OpenAPI specification, Pydantic models, and SQL migrations must remain synchronised.

## 1.1 Design Principles

1. **Stable IDs:** IDs must not depend on the display language or destination name.
2. **Explicit uncertainty:** Unknown values are represented as `null` plus a status where needed, never as fabricated values or a misleading zero.
3. **Provenance:** Public factual destination claims should be traceable to a source or explicitly marked unverified.
4. **Deterministic calculations:** Backend code owns authoritative budget totals and validation.
5. **Provider neutrality:** Groq, Gemini, and translation/routing providers use adapters that return common internal types.
6. **Versioned snapshots:** Saved itineraries retain the version generated at that time even if destination records later change.
7. **Least privilege:** Public catalogue data and private user trip data have separate access rules.
8. **Strict validation:** AI output and client requests are untrusted input.
9. **Language-safe data:** IDs, enums, coordinates, dates, and amounts are not translated.
10. **Backward compatibility:** Breaking API changes require a version change or documented compatibility strategy.

## 1.2 Normative Terms

- **MUST**: required.
- **SHOULD**: recommended unless a documented reason justifies deviation.
- **MAY**: optional or future scope.

---

# 2. Backend Architecture and Schema Layers

```text
HTTP Request
    |
    v
FastAPI Route
    |
    +--> Authentication / Authorization
    +--> Rate limiting / request ID
    |
    v
Pydantic Request Schema
    |
    v
Domain Service
    |
    +--> Destination Repository
    +--> AI Orchestrator (Groq / Gemini)
    +--> Itinerary Validator
    +--> Budget Calculator
    +--> Routing Adapter
    +--> Translation Adapter
    |
    v
Pydantic Response Schema
    |
    v
HTTP Response
```

## 2.1 Schema Layers

Use distinct layers rather than exposing database models directly:

1. **API schemas:** request/response contracts visible to clients.
2. **Domain models:** business concepts and validated internal state.
3. **Persistence models:** database rows and relationships.
4. **Provider schemas:** external AI, geocoding, routing, and translation responses.
5. **Snapshot schemas:** durable itinerary representation.
6. **Operational schemas:** errors, health, request IDs, and provider status.

A database row should not automatically become a public API response. Use explicit mapping functions and public response models.

---

# 3. Common Conventions

## 3.1 Identifier Strategy

Recommended:
- Database primary keys: UUID for user-owned records and source/cost rows.
- Destination IDs: stable text IDs or UUIDs. Text IDs such as `dst_<stable_slug_or_token>` are acceptable if generated once and never derived dynamically from translations.
- Trip IDs: UUID.
- Request IDs: UUID or safe opaque identifier generated per request.
- Never expose sequential integer IDs for private resources if they enable easy enumeration.

Do not change an established identifier strategy after data has been seeded without a migration plan.

## 3.2 Date and Time

- Date-only travel fields use ISO date: `YYYY-MM-DD`.
- Database timestamps use `timestamptz`.
- API timestamps use ISO 8601 with timezone/UTC offset; UTC `Z` is recommended for server-generated timestamps.
- Local stop times should be interpreted in the destination’s local timezone and must not be fabricated if unsupported.
- Do not use naive server timestamps for persisted events.

## 3.3 Money

Recommended representation:
- API: integer `amount_minor` or a validated decimal string.
- Database: `BIGINT` minor units or `NUMERIC(p,s)` with a clearly defined convention.
- For INR, paise are the minor unit if using integer minor units.
- Never mix rupees and paise in the same field.
- Every amount must have a currency code.
- Avoid binary floating-point for authoritative financial calculations.

For readability, some examples below use whole INR values. Production contracts must consistently use the chosen money convention.

## 3.4 Coordinates

```json
{
  "lat": 12.2958,
  "lon": 76.6394
}
```

Rules:
- Latitude: `-90 <= lat <= 90`.
- Longitude: `-180 <= lon <= 180`.
- Use WGS84 decimal degrees.
- Both coordinate values must be present or both be null.
- `0,0` is not an unknown-value sentinel.

## 3.5 Null vs Missing

- **Missing field:** client did not supply it or it is not part of this request.
- **`null`:** explicitly unknown/not available, where the schema permits null.
- **Empty list:** known to contain no entries.
- **Zero:** a real numeric zero, not a substitute for unknown.
- Use `PATCH` semantics carefully so omitted fields are not confused with explicit null.

## 3.6 Common Response Metadata

Where useful, responses may include:

```json
{
  "request_id": "req_opaque_id",
  "schema_version": "1.0"
}
```

Do not duplicate this metadata in every nested object if it is already provided at the envelope level.

---

# 4. Shared Enums and Literal Types

Keep enums centralised in one module, for example `app/schemas/enums.py`.

## 4.1 Language

```python
from enum import StrEnum

class LanguageCode(StrEnum):
    EN = "en"
    KN = "kn"
```

Internal codes remain `en` and `kn`. Provider-specific language codes must be mapped in adapters.

## 4.2 Destination Category

Suggested values:
- `nature`
- `waterfall`
- `hill_station`
- `viewpoint`
- `heritage`
- `architecture`
- `beach`
- `wildlife`
- `food_culture`
- `spiritual_cultural`
- `adventure`
- `museum`
- `town_city`
- `other`

Use a controlled enum or lookup table. Add categories through migrations/configuration rather than accepting arbitrary strings.

## 4.3 Access Status

```python
class AccessStatus(StrEnum):
    OPEN_REPORTED = "open_reported"
    RESTRICTED = "restricted"
    SEASONAL = "seasonal"
    CLOSED_REPORTED = "closed_reported"
    UNKNOWN = "unknown"
```

These values describe the quality/status of recorded access information; `open_reported` does not guarantee the location is open on the requested date.

## 4.4 Verification Status

- `human_reviewed`
- `source_checked`
- `needs_review`
- `stale`
- `unknown`

Use the status that matches the actual verification process. Do not label a record verified merely because an AI model generated it.

## 4.5 Cost Status

- `verified`
- `estimated`
- `user_provided`
- `unknown`

## 4.6 Translation Status

- `human_reviewed`
- `provider_generated`
- `needs_review`
- `not_available`

## 4.7 Transport Mode

- `car`
- `two_wheeler`
- `public_transport`
- `mixed`
- `walking`
- `not_decided`

Only allow modes the planner can support meaningfully. If a mode has no routing provider, clearly mark route details unavailable.

## 4.8 Travel Pace

- `relaxed`
- `balanced`
- `packed`

## 4.9 Budget Scope

- `whole_trip`
- `per_person`
- `per_day`
- `per_person_per_day`

Use only the scopes supported by the current UI and calculator.

## 4.10 Generation Mode

- `groq`
- `gemini`
- `ai_reconciled`
- `deterministic_fallback`
- `cached`
- `manual`

## 4.11 Route Status

- `available`
- `approximate`
- `unavailable`
- `not_requested`

## 4.12 Itinerary Status

- `draft`
- `generated`
- `edited`
- `saved`
- `archived`

Do not use UI-only states such as `loading` as durable database status values unless there is a real asynchronous job lifecycle.

---

# 5. Pydantic Base Configuration

Use Pydantic v2 consistently. The following is a pattern, not a drop-in complete module:

```python
from pydantic import BaseModel, ConfigDict

class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
    )
```

Recommendations:
- `extra="forbid"` for client request models and validated AI outputs.
- Separate public and internal models.
- Use `Field(min_length=..., max_length=...)` for strings.
- Use `Annotated` constraints or field validators for ranges.
- Use timezone-aware `datetime` validation.
- Do not use unbounded `dict[str, Any]` in public contracts.
- Where JSONB is required, validate it against a defined Pydantic model before storage.
- Keep `model_dump(mode="json")` output compatible with JSON serialization.

---

# 6. Shared Primitive Schemas

## 6.1 Coordinates

```python
from pydantic import BaseModel, Field, model_validator

class Coordinates(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
```

## 6.2 Localised Text

```python
class LocalisedText(BaseModel):
    en: str | None = None
    kn: str | None = None
```

For database-backed translations, a separate table is preferred over embedding all languages in every record. Use this helper only where an API contract benefits from bundled translations.

## 6.3 Money Range

```python
from typing import Literal
from pydantic import BaseModel, Field, model_validator

class MoneyRange(BaseModel):
    currency: Literal["INR"] = "INR"
    min_amount_minor: int | None = Field(default=None, ge=0)
    max_amount_minor: int | None = Field(default=None, ge=0)
    status: Literal["verified", "estimated", "user_provided", "unknown"]
    source_id: str | None = None
    checked_at: str | None = None

    @model_validator(mode="after")
    def check_range(self):
        if self.min_amount_minor is not None and self.max_amount_minor is not None:
            if self.min_amount_minor > self.max_amount_minor:
                raise ValueError("min_amount_minor cannot exceed max_amount_minor")
        if self.status == "unknown":
            if self.min_amount_minor is not None or self.max_amount_minor is not None:
                raise ValueError("Unknown cost must not contain numeric amounts")
        return self
```

If using a wider currency set later, replace `Literal["INR"]` with a centrally maintained currency enum and validate currency-specific minor-unit semantics.

## 6.4 Provenance Reference

```python
class ProvenanceRef(BaseModel):
    source_id: str
    source_name: str
    source_url: str | None = None
    claim_scope: str
    checked_at: str | None = None
    attribution_required: bool = False
```

Only return safe, approved source URLs. Validate URLs when ingesting data.

---

# 7. Destination Catalogue Schema

## 7.1 Destination Public Response

`GET /api/v1/destinations` and `GET /api/v1/destinations/{destination_id}` return public response models, not raw database rows.

```python
from pydantic import BaseModel, Field
from typing import Literal

class DistrictSummary(BaseModel):
    code: str
    name: str

class DestinationAccess(BaseModel):
    status: AccessStatus
    notes: str | None = None
    last_checked_at: str | None = None

class DestinationVerification(BaseModel):
    status: VerificationStatus
    last_checked_at: str | None = None

class DestinationCostSummary(BaseModel):
    status: CostStatus
    currency: str = "INR"
    min_amount_minor: int | None = Field(default=None, ge=0)
    max_amount_minor: int | None = Field(default=None, ge=0)
    last_checked_at: str | None = None

class DestinationResponse(BaseModel):
    id: str
    slug: str
    name: str
    language: LanguageCode
    district: DistrictSummary | None = None
    category: DestinationCategory
    coordinates: Coordinates | None = None
    summary: str | None = None
    tags: list[str] = []
    access: DestinationAccess
    cost: DestinationCostSummary
    verification: DestinationVerification
    translation_status: TranslationStatus
    sources: list[ProvenanceRef] = []
```

Implementation notes:
- Use `Field(default_factory=list)` rather than a mutable list default in production models.
- `coordinates=None` means coordinates are unavailable.
- Do not expose internal moderation notes, private ingestion data, or unpublished records.
- Ensure `name` is resolved for the requested language or mark a language fallback explicitly.

## 7.2 Destination Search Query

```python
class DestinationSearchQuery(BaseModel):
    q: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=80)
    category: DestinationCategory | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)
    language: LanguageCode = LanguageCode.EN
    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = Field(default=None, max_length=300)
```

FastAPI may define query parameters directly; this class documents the logical contract. The backend must validate allowed sort options and filter values.

## 7.3 Destination Search Response

```python
class DestinationSearchResponse(BaseModel):
    items: list[DestinationResponse]
    next_cursor: str | None = None
    request_id: str
```

Use cursor pagination for large result sets. Do not use unbounded page sizes.

## 7.4 Destination Detail Not Found

Return `404` with standard error envelope:
`DESTINATION_NOT_FOUND`.

Do not distinguish between unpublished and nonexistent records in a way that leaks private editorial records.

---

# 8. Trip Preference Request Schema

## 8.1 Origin

```python
class OriginInput(BaseModel):
    label: str = Field(min_length=1, max_length=160)
    coordinates: Coordinates | None = None
    place_id: str | None = Field(default=None, max_length=200)
```

Rules:
- Do not trust client coordinates without validation.
- If coordinates are absent, backend may resolve the label through configured geocoding.
- Ambiguous geocoding must return a selection-needed error or structured candidate response.
- Avoid storing exact origin coordinates after generation unless needed for a saved trip and disclosed.

## 8.2 Travel Dates

```python
from datetime import date
from pydantic import BaseModel, Field, model_validator

class TravelWindow(BaseModel):
    start_date: date | None = None
    duration_days: int = Field(ge=1, le=30)
    dates_flexible: bool = False

    @model_validator(mode="after")
    def check_date_mode(self):
        if self.start_date is None and not self.dates_flexible:
            raise ValueError("Provide start_date or set dates_flexible=true")
        return self
```

Adjust the maximum duration to the actual product decision. Do not accept impossible dates or inconsistent start/end values.

## 8.3 Group Composition

```python
class GroupComposition(BaseModel):
    adults: int = Field(ge=0, le=50)
    children: int = Field(default=0, ge=0, le=50)
    seniors: int = Field(default=0, ge=0, le=50)

    @model_validator(mode="after")
    def at_least_one_traveller(self):
        if self.adults + self.children + self.seniors < 1:
            raise ValueError("At least one traveller is required")
        return self
```

Avoid collecting individual names or exact ages unless a supported feature needs them.

## 8.4 Budget Preference

```python
class BudgetPreference(BaseModel):
    amount_minor: int | None = Field(default=None, ge=0)
    currency: str = "INR"
    scope: BudgetScope = BudgetScope.WHOLE_TRIP
    includes_accommodation: bool = True
    flexible: bool = False

    @model_validator(mode="after")
    def check_budget(self):
        if self.amount_minor is None and not self.flexible:
            raise ValueError("Provide a budget or mark it flexible")
        return self
```

The frontend may display whole rupees, but convert to minor units consistently at the API boundary. If using rupee decimal values in the API instead, document and apply that choice everywhere.

## 8.5 Optional Constraints

```python
class TripConstraints(BaseModel):
    accessibility_needs: list[str] = Field(default_factory=list, max_length=20)
    dietary_preferences: list[str] = Field(default_factory=list, max_length=20)
    avoid: list[str] = Field(default_factory=list, max_length=30)
    preferred_destinations: list[str] = Field(default_factory=list, max_length=30)
    accommodation_style: str | None = Field(default=None, max_length=80)
    preferred_day_start: str | None = None
    preferred_day_end: str | None = None
    notes: str | None = Field(default=None, max_length=1500)
```

Prefer controlled values for accessibility, dietary preferences, and transport constraints. Free-text notes must be bounded and treated as untrusted.

## 8.6 Complete Generate Request

```python
class GenerateItineraryRequest(BaseModel):
    origin: OriginInput
    travel: TravelWindow
    group: GroupComposition
    budget: BudgetPreference
    transport_mode: TransportMode = TransportMode.NOT_DECIDED
    pace: TravelPace = TravelPace.BALANCED
    interests: list[str] = Field(default_factory=list, max_length=20)
    language: LanguageCode = LanguageCode.EN
    constraints: TripConstraints = Field(default_factory=TripConstraints)
```

Additional validation:
- `interests` must be members of supported categories/tags or a bounded allowlisted taxonomy.
- Every preferred destination ID must exist and be eligible.
- Date and duration must comply with configured policy.
- Budget scope must be supported by the calculator.
- Validate all enum values server-side even if the frontend uses matching enums.
- Apply request body-size limits.

---

# 9. Itinerary Domain Schema

## 9.1 Travel Leg

```python
class TravelLeg(BaseModel):
    from_destination_id: str | None = None
    to_destination_id: str
    mode: TransportMode
    status: RouteStatus
    distance_meters: int | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    is_approximate: bool = False
    provider: str | None = None
    retrieved_at: str | None = None
    warning: str | None = None
```

Rules:
- `available` should normally have distance and/or duration from a valid provider.
- `unavailable` must not claim a precise route result.
- A straight-line estimate must not be labelled as a driving route.
- Route geometry may be stored separately or omitted from the public itinerary payload if too large.

## 9.2 Itinerary Stop

```python
class ItineraryStop(BaseModel):
    stop_number: int = Field(ge=1)
    destination_id: str
    start_time_local: str | None = None
    end_time_local: str | None = None
    duration_minutes: int | None = Field(default=None, ge=0, le=1440)
    notes: str | None = Field(default=None, max_length=2000)
    cost_estimate: MoneyRange
    warnings: list[str] = Field(default_factory=list)
```

The validator must check that `end_time_local` is after `start_time_local` when both are supplied. If the itinerary spans midnight, represent that explicitly and do not rely on lexical string comparison alone.

## 9.3 Itinerary Day

```python
class ItineraryDay(BaseModel):
    day_number: int = Field(ge=1, le=30)
    date: date | None = None
    title: str = Field(min_length=1, max_length=160)
    summary: str | None = Field(default=None, max_length=1500)
    stops: list[ItineraryStop] = Field(min_length=1, max_length=20)
    travel_legs: list[TravelLeg] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
```

A partial itinerary may have a day with fewer stops, but must not contain an empty day unless the product explicitly supports rest days.

## 9.4 Generation Metadata

Public-safe response model:

```python
class GenerationMetadata(BaseModel):
    mode: GenerationMode
    fallback_used: bool
    providers_used: list[str] = Field(default_factory=list)
    generated_at: str
    schema_version: str = "1.0"
```

Internal provider metadata should be stored separately and must not include secrets, full auth headers, or raw internal prompts.

## 9.5 Budget Breakdown

```python
class BudgetLineItem(BaseModel):
    category: str
    label: str
    min_amount_minor: int | None = Field(default=None, ge=0)
    max_amount_minor: int | None = Field(default=None, ge=0)
    currency: str = "INR"
    status: CostStatus
    source_id: str | None = None
    notes: str | None = None

class BudgetSummary(BaseModel):
    currency: str = "INR"
    scope: BudgetScope
    total_min_minor: int | None = Field(default=None, ge=0)
    total_max_minor: int | None = Field(default=None, ge=0)
    status: str
    items: list[BudgetLineItem] = Field(default_factory=list)
    unknown_categories: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
```

The budget service must derive totals from line items using exact arithmetic. The AI provider must not be the source of truth for totals.

## 9.6 Complete Itinerary Response

```python
class ItineraryResponse(BaseModel):
    trip_id: str
    schema_version: str = "1.0"
    language: LanguageCode
    generation: GenerationMetadata
    title: str
    summary: str | None = None
    origin: OriginInput
    travel: TravelWindow
    days: list[ItineraryDay]
    budget: BudgetSummary
    warnings: list[str] = Field(default_factory=list)
    sources: list[ProvenanceRef] = Field(default_factory=list)
    created_at: str
    updated_at: str | None = None
```

Before returning:
- Validate day count against requested duration.
- Validate sequential day numbers.
- Validate every destination ID against the current eligible catalogue.
- Validate budget ranges and recalculate totals.
- Validate route fields and uncertainty flags.
- Confirm the requested language or mark partial translation.
- Ensure user-visible warnings are localisable or included as language-specific text.

---

# 10. AI Provider Internal Schemas

## 10.1 Provider Result Envelope

```python
class ProviderStatus(StrEnum):
    SUCCESS = "success"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    AUTH_ERROR = "auth_error"
    INVALID_OUTPUT = "invalid_output"
    UNAVAILABLE = "unavailable"
    ERROR = "error"

class ProviderResult(BaseModel):
    provider: str
    status: ProviderStatus
    model_id: str | None = None
    latency_ms: int | None = Field(default=None, ge=0)
    candidate: dict | None = None
    error_code: str | None = None
    retryable: bool = False
```

In production, replace `candidate: dict` with a specific candidate model once the candidate contract is final. Do not allow arbitrary provider output to pass through to public responses.

## 10.2 AI Candidate Schema

An AI candidate should contain only proposed itinerary content:
- Title and summary.
- Ordered days.
- Destination IDs from the supplied catalogue.
- Stop notes.
- Proposed schedule fields if the system supports them.
- Warnings and assumptions.
- Optional rationale used internally for scoring.

It should not be authoritative for:
- Database IDs.
- Cost totals.
- Verified opening hours.
- Route distances/durations.
- Source URLs.
- Access verification.
- Authentication or permissions.

## 10.3 Candidate Validation Report

```python
class CandidateValidationReport(BaseModel):
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    score: float | None = None
    schema_version: str = "1.0"
```

Internal validation messages should be stable reason codes where possible. Do not expose detailed internal prompts or chain-of-thought.

## 10.4 Orchestration Result

```python
class OrchestrationResult(BaseModel):
    selected_candidate: dict | None = None
    generation_mode: GenerationMode
    providers_attempted: list[str] = Field(default_factory=list)
    providers_used: list[str] = Field(default_factory=list)
    fallback_used: bool
    validation_report: CandidateValidationReport | None = None
```

This is an internal service type, not necessarily a public endpoint response.

---

# 11. Routing and Geocoding Schemas

## 11.1 Geocoding Candidate

```python
class GeocodingCandidate(BaseModel):
    place_id: str | None = None
    label: str
    coordinates: Coordinates
    locality: str | None = None
    district: str | None = None
    state: str | None = None
    country_code: str | None = None
    provider: str
```

If multiple plausible results are returned, ask the user to choose. Do not silently pick a potentially incorrect city.

## 11.2 Route Request

```python
class RouteRequest(BaseModel):
    origin: Coordinates
    destination: Coordinates
    mode: TransportMode
```

## 11.3 Route Response

```python
class RouteResponse(BaseModel):
    status: RouteStatus
    origin: Coordinates
    destination: Coordinates
    mode: TransportMode
    distance_meters: int | None = Field(default=None, ge=0)
    duration_seconds: int | None = Field(default=None, ge=0)
    geometry: str | None = None
    provider: str | None = None
    is_approximate: bool = False
    retrieved_at: str | None = None
    warning: str | None = None
```

Route geometry may be encoded polyline or GeoJSON, but the format must be documented and bounded. Do not return unbounded provider payloads.

## 11.4 Route Failure

A failed route request should return `status="unavailable"` or a documented error response. It must not create fake zero-distance routes.

---

# 12. Translation Schemas

## 12.1 Translation Request

```python
class TranslationRepairRequest(BaseModel):
    target_language: LanguageCode
    fields: dict[str, str] = Field(max_length=50)
    content_type: str
```

This internal request must be further restricted by an allowlist of field names and maximum lengths. Do not expose arbitrary translation repair publicly without authentication and rate limits.

## 12.2 Translation Result

```python
class TranslatedField(BaseModel):
    source_language: LanguageCode | None = None
    target_language: LanguageCode
    text: str
    status: TranslationStatus
    provider: str | None = None

class TranslationRepairResponse(BaseModel):
    fields: dict[str, TranslatedField]
    partial: bool
    warnings: list[str] = Field(default_factory=list)
```

Translation is not fact verification. Preserve source references and caveats.

---

# 13. Error Response Schema

## 13.1 Standard Error Envelope

```python
class ErrorDetails(BaseModel):
    field: str | None = None
    reason: str | None = None

class ErrorBody(BaseModel):
    code: str
    message: str
    message_key: str
    request_id: str
    retryable: bool
    details: list[ErrorDetails] = Field(default_factory=list)

class ErrorResponse(BaseModel):
    error: ErrorBody
```

## 13.2 Error Codes

| Code | HTTP status | Retryable | Meaning |
|---|---:|---|---|
| `VALIDATION_ERROR` | 422 | No, until corrected | Request fields are invalid |
| `DESTINATION_NOT_FOUND` | 404 | No | No public destination matches the ID |
| `NO_ELIGIBLE_DESTINATIONS` | 422 or 200 partial by contract | No, until preferences change | No suitable curated destinations |
| `AI_PROVIDERS_UNAVAILABLE` | 503 | Usually | Providers and fallback could not produce a plan |
| `AI_OUTPUT_INVALID` | 502/503 | Sometimes | No valid candidate could be created |
| `ROUTING_UNAVAILABLE` | 503 or partial response | Yes | Route service unavailable |
| `GEOCODING_AMBIGUOUS` | 422 | No, until selected | Origin needs clarification |
| `TRANSLATION_UNAVAILABLE` | 503 or partial response | Yes | Translation service unavailable |
| `AUTH_REQUIRED` | 401 | After sign-in | Protected action requires authentication |
| `FORBIDDEN` | 403 | No | User lacks permission |
| `RATE_LIMITED` | 429 | Yes, after delay | Request quota exceeded |
| `DATABASE_UNAVAILABLE` | 503 | Yes | Required data service unavailable |
| `IDEMPOTENCY_CONFLICT` | 409 | No | Idempotency key reused with different payload |
| `INTERNAL_ERROR` | 500 | Maybe | Unexpected safe-to-report error |

The final status code for partial route/translation failures must be consistent with the chosen contract. If the core itinerary is usable, prefer a successful response with explicit warnings over failing the entire request.

---

# 14. API Endpoint Contracts

All routes use `/api/v1`. Exact endpoint availability must match the MVP scope.

## 14.1 Health

### `GET /api/v1/health`

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "request_id": "req_opaque_id"
}
```

Do not reveal secrets, hostnames, internal stack traces, or raw provider diagnostics.

## 14.2 Destination Search

### `GET /api/v1/destinations`

Query:
- `q`
- `district`
- `category`
- `tags`
- `language`
- `limit`
- `cursor`

Response:
```json
{
  "items": [],
  "next_cursor": null,
  "request_id": "req_opaque_id"
}
```

## 14.3 Destination Detail

### `GET /api/v1/destinations/{destination_id}`

Returns `DestinationResponse`.

## 14.4 Generate Itinerary

### `POST /api/v1/itineraries/generate`

- Request: `GenerateItineraryRequest`
- Response: `ItineraryResponse`
- Apply rate limits.
- Return only after schema, destination, budget, and warning validation.
- Do not persist a private trip automatically unless the product contract says so.

## 14.5 Get Itinerary

### `GET /api/v1/itineraries/{trip_id}`

- If trips are persisted, verify owner or explicit share permission.
- Return `ItineraryResponse`.
- Return 404 for inaccessible records if that is the selected anti-enumeration policy.

## 14.6 Save Trip

### `POST /api/v1/trips`

Request:
```json
{
  "title": "Weekend in Karnataka",
  "itinerary": {},
  "preferences": {}
}
```

Production implementation should use explicit nested Pydantic types rather than unconstrained objects. Backend derives `user_id` from verified authentication, never from the request body.

Response:
```json
{
  "trip_id": "uuid",
  "status": "saved",
  "created_at": "2026-10-22T10:00:00Z"
}
```

## 14.7 List Trips

### `GET /api/v1/trips`

- Authenticated.
- Paginated.
- Only returns the current user's trips.

## 14.8 Update Trip

### `PATCH /api/v1/trips/{trip_id}`

- Authenticated.
- Owner-only.
- Accept only editable fields.
- Use partial-update semantics with explicit null handling.
- Revalidate the itinerary and recompute derived totals after edits.

## 14.9 Delete Trip

### `DELETE /api/v1/trips/{trip_id}`

- Authenticated.
- Owner-only.
- Return a documented success status.
- Do not reveal whether another user owns a given ID.

## 14.10 Recalculate Budget

Optional endpoint if budget updates are independent:

### `POST /api/v1/itineraries/{trip_id}/budget/recalculate`

Request contains supported budget preferences and current itinerary snapshot reference. Backend calculates totals deterministically.

## 14.11 Route Lookup

Optional internal/public backend endpoint:

### `POST /api/v1/routes`

- Rate-limited.
- Uses configured routing provider.
- Does not expose provider credentials.
- Returns `RouteResponse`.

## 14.12 Translation Repair

Internal only unless a product need requires public access:

### `POST /api/v1/internal/translation/repair`

- Must be authenticated service-to-service.
- Allowlisted fields only.
- Strict body-size and rate limits.

---

# 15. PostgreSQL / Supabase Schema

The following is a logical schema. Exact SQL types and constraints should be implemented in ordered migrations and tested in staging.

## 15.1 `districts`

| Column | Type | Constraints |
|---|---|---|
| `code` | `TEXT` | Primary key |
| `name_en` | `TEXT` | Not null |
| `name_kn` | `TEXT` | Nullable until reviewed |
| `active` | `BOOLEAN` | Not null, default true |
| `created_at` | `TIMESTAMPTZ` | Not null |
| `updated_at` | `TIMESTAMPTZ` | Not null |

## 15.2 `destinations`

| Column | Type | Constraints |
|---|---|---|
| `id` | `TEXT` or `UUID` | Primary key, stable |
| `slug` | `TEXT` | Unique, not null |
| `district_code` | `TEXT` | FK to districts, nullable |
| `category` | `TEXT` | Not null, checked against controlled values |
| `latitude` | `NUMERIC(9,6)` | Nullable, range check |
| `longitude` | `NUMERIC(9,6)` | Nullable, range check |
| `access_status` | `TEXT` | Not null, enum/check |
| `verification_status` | `TEXT` | Not null, enum/check |
| `active` | `BOOLEAN` | Not null, default false until reviewed |
| `featured` | `BOOLEAN` | Not null, default false |
| `created_at` | `TIMESTAMPTZ` | Not null |
| `updated_at` | `TIMESTAMPTZ` | Not null |

Constraint: latitude and longitude are either both null or both non-null.

## 15.3 `destination_translations`

| Column | Type | Constraints |
|---|---|---|
| `destination_id` | FK | References destinations |
| `language_code` | `TEXT` | `en` or `kn` |
| `name` | `TEXT` | Not null for published translation |
| `short_description` | `TEXT` | Nullable |
| `long_description` | `TEXT` | Nullable |
| `how_to_reach` | `TEXT` | Nullable |
| `access_notes` | `TEXT` | Nullable |
| `translation_status` | `TEXT` | Not null |
| `updated_at` | `TIMESTAMPTZ` | Not null |

Primary key: `(destination_id, language_code)`.

## 15.4 `destination_tags`

| Column | Type | Constraints |
|---|---|---|
| `destination_id` | FK | References destinations |
| `tag` | `TEXT` | Not null |
| `created_at` | `TIMESTAMPTZ` | Not null |

Primary key: `(destination_id, tag)`.

Use a controlled tag taxonomy or add a separate `tags` lookup table if descriptions/localisation are needed.

## 15.5 `destination_sources`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `destination_id` | FK | References destinations |
| `source_name` | `TEXT` | Not null |
| `source_url` | `TEXT` | Nullable |
| `source_type` | `TEXT` | Controlled values |
| `claim_scope` | `TEXT` | Not null |
| `checked_at` | `TIMESTAMPTZ` | Nullable |
| `license_notes` | `TEXT` | Nullable |
| `attribution_required` | `BOOLEAN` | Not null, default false |
| `created_at` | `TIMESTAMPTZ` | Not null |

Do not store content from a source unless its licence/terms permit the intended use.

## 15.6 `destination_costs`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `destination_id` | FK | References destinations |
| `cost_type` | `TEXT` | Controlled enum |
| `min_amount_minor` | `BIGINT` | Nullable, >= 0 |
| `max_amount_minor` | `BIGINT` | Nullable, >= 0 |
| `currency` | `TEXT` | Not null, initially INR |
| `status` | `TEXT` | Not null |
| `source_id` | FK | Nullable |
| `valid_from` | `DATE` | Nullable |
| `valid_until` | `DATE` | Nullable |
| `checked_at` | `TIMESTAMPTZ` | Nullable |
| `created_at` | `TIMESTAMPTZ` | Not null |

Constraints:
- `min_amount_minor <= max_amount_minor` when both exist.
- Unknown status must not have numeric values.
- If both validity dates exist, `valid_until >= valid_from`.

## 15.7 `trips`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `auth.users`, nullable only if anonymous persistence is explicitly supported |
| `title` | `TEXT` | Nullable, bounded |
| `status` | `TEXT` | Not null |
| `origin_json` | `JSONB` | Not null |
| `preferences_json` | `JSONB` | Not null |
| `created_at` | `TIMESTAMPTZ` | Not null |
| `updated_at` | `TIMESTAMPTZ` | Not null |
| `deleted_at` | `TIMESTAMPTZ` | Nullable |

Do not accept `user_id` from the client as authoritative. Derive it from the verified auth context.

## 15.8 `itinerary_snapshots`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `trip_id` | UUID | FK to trips |
| `schema_version` | `TEXT` | Not null |
| `itinerary_json` | `JSONB` | Not null |
| `generation_mode` | `TEXT` | Not null |
| `provider_metadata_json` | `JSONB` | Not null, safe metadata only |
| `warnings_json` | `JSONB` | Not null |
| `created_at` | `TIMESTAMPTZ` | Not null |

Store validated schema JSON only. Do not persist arbitrary raw AI output as a trusted itinerary.

## 15.9 `user_preferences` (Optional)

| Column | Type | Constraints |
|---|---|---|
| `user_id` | UUID | Primary key/FK |
| `preferred_language` | `TEXT` | `en` or `kn` |
| `default_currency` | `TEXT` | Initially INR |
| `default_transport_mode` | `TEXT` | Controlled enum |
| `created_at` | `TIMESTAMPTZ` | Not null |
| `updated_at` | `TIMESTAMPTZ` | Not null |

Only add this table if persistent preferences are a product requirement.

## 15.10 `feedback` (Optional)

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Nullable |
| `category` | `TEXT` | Controlled enum |
| `message` | `TEXT` | Length-limited |
| `trip_id` | UUID | Nullable, ownership checked |
| `created_at` | `TIMESTAMPTZ` | Not null |
| `status` | `TEXT` | Controlled enum |

Do not include private itinerary contents automatically in feedback records.

---

# 16. Relationships

```text
districts
   1
   |
   +----< destinations
               |
               +----< destination_translations
               |
               +----< destination_tags
               |
               +----< destination_sources
               |
               +----< destination_costs

auth.users
   1
   |
   +----< trips
               |
               +----< itinerary_snapshots

auth.users
   1
   |
   +------ user_preferences
```

A trip snapshot may reference destination IDs in JSON. If queryable relational reporting becomes important, add a normalised `itinerary_stops` table in a later migration, while retaining snapshot versioning for reproducibility.

---

# 17. Indexes and Database Constraints

Recommended indexes:
- `destinations(active, category)`
- `destinations(district_code)`
- `destinations(verification_status, active)`
- `destination_translations(language_code, destination_id)`
- `destination_tags(tag, destination_id)`
- `destination_sources(destination_id)`
- `destination_costs(destination_id, cost_type)`
- `trips(user_id, updated_at DESC)`
- `itinerary_snapshots(trip_id, created_at DESC)`

Additional requirements:
- Unique constraint on destination slug.
- Foreign keys on all relational references.
- Check constraints for coordinates, non-negative amounts, and controlled status values.
- Add full-text or trigram indexes only after checking English and Kannada search behaviour.
- Use `EXPLAIN ANALYZE` on representative search queries before adding complex indexes.
- Do not store large route geometries in every itinerary snapshot if they can be referenced or fetched safely and efficiently.

---

# 18. Supabase Row Level Security (RLS)

If client-facing operations access user-specific tables through Supabase, enable RLS.

## 18.1 Policy Requirements

### Public destination data
- Anonymous users may read only active, published destination records and approved public translations/sources.
- Anonymous users cannot insert, update, or delete destination records.
- Editorial writes use a restricted backend/admin workflow.

### Trips
- Authenticated user may read only rows where `user_id = auth.uid()`.
- User may update/delete only their own trips.
- Insert policy must require `user_id = auth.uid()` if direct client inserts are allowed.
- Prefer backend writes for complex snapshot validation.

### Itinerary snapshots
- Access only if the related trip belongs to the authenticated user, unless an explicit share model exists.
- Do not expose snapshots merely because the UUID is known.

### User preferences
- User can access only their own preference row.

### Feedback
- Users can read/update only their own submissions if that feature is provided.
- Admin processing must use restricted privileges.

## 18.2 Service Role

- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Never expose it in `VITE_*` variables, frontend bundles, logs, or repository files.
- Use it only in controlled backend code.
- Validate authorization before using elevated privileges.
- Prefer the least-privileged access method available for each operation.

---

# 19. Authentication and Ownership Schemas

## 19.1 Auth Context

Do not accept a user ID in a request body as proof of identity. Build an authenticated context from a verified Supabase JWT or equivalent trusted authentication middleware.

Logical type:

```python
class AuthenticatedUser(BaseModel):
    user_id: str
    roles: list[str] = []
```

This is an internal context object, not a client-supplied request model.

## 19.2 Save Trip Request

```python
class SaveTripRequest(BaseModel):
    title: str | None = Field(default=None, max_length=160)
    itinerary: ItineraryResponse
    preferences: GenerateItineraryRequest
```

Production implementations may instead accept a server-issued `trip_id` and snapshot version to avoid trusting a full client-supplied itinerary. If the client submits itinerary data, revalidate it against current schemas and destination records before saving.

## 19.3 Trip List Item

```python
class SavedTripSummary(BaseModel):
    trip_id: str
    title: str | None = None
    origin_label: str
    start_date: str | None = None
    duration_days: int
    budget_min_minor: int | None = None
    budget_max_minor: int | None = None
    currency: str = "INR"
    status: ItineraryStatus
    created_at: str
    updated_at: str
```

Do not return full itinerary JSON in list responses unless the UI needs it.

---

# 20. Pagination, Filtering, and Sorting

## 20.1 Cursor Pagination

For public destination search and saved trips:
- Default page size: 20.
- Maximum page size: 100.
- Return `next_cursor`.
- Cursor must be opaque and validated.
- Cursor should encode a stable ordering key and, if necessary, filter context.
- Reject malformed or oversized cursors.

## 20.2 Sort Options

Allow only explicitly supported values, for example:
- `relevance`
- `name_asc`
- `name_desc`
- `recently_updated` for internal/editorial use only

Do not pass arbitrary client sort fields into SQL.

## 20.3 Filter Semantics

- Unknown cost should not be treated as free.
- Unknown access status should not be treated as open.
- Offbeat is an editorial classification, not a safety guarantee.
- Multi-tag filters must have documented `AND`/`OR` semantics.
- Filter values should be normalised and bounded.

---

# 21. API Security and Rate Limits

## 21.1 Request Limits

Suggested starting limits, configurable and subject to load testing:
- Destination search: 60 requests/minute/IP.
- Itinerary generation: 5 requests/minute/IP plus user-level quotas where authenticated.
- Save/update/delete: 30 requests/minute/user.
- Route/geocoding lookups: separate limits according to provider terms.
- Translation repair: strict internal service limits.

These are initial policy examples, not guaranteed capacity figures.

## 21.2 Validation and Abuse Protection

- Enforce request body size limits.
- Bound all string/list lengths.
- Validate IDs before database lookup or provider invocation.
- Use parameterised queries.
- Validate origin coordinates and URL formats.
- Add CORS allowlists for production frontend domains.
- Require HTTPS in production.
- Add request IDs and safe structured logging.
- Avoid automatic retries for non-idempotent writes.
- Treat user notes and retrieved destination text as untrusted prompt content.
- Do not execute model-generated code, SQL, shell commands, or URLs.

## 21.3 Idempotency

For create operations that may be retried:
- Accept an `Idempotency-Key` header.
- Scope keys to authenticated user or anonymous session and endpoint.
- Store request hash and response reference with bounded retention.
- If the same key is reused with a different request payload, return `409 IDEMPOTENCY_CONFLICT`.

---

# 22. Backend Module Structure

Suggested FastAPI layout:

```text
services/api/app/
├── main.py
├── core/
│   ├── config.py
│   ├── logging.py
│   ├── security.py
│   ├── rate_limit.py
│   └── errors.py
├── api/
│   ├── deps.py
│   └── routes/
│       ├── health.py
│       ├── destinations.py
│       ├── itineraries.py
│       ├── trips.py
│       ├── routes.py
│       └── internal_translation.py
├── schemas/
│   ├── common.py
│   ├── enums.py
│   ├── destination.py
│   ├── trip.py
│   ├── itinerary.py
│   ├── budget.py
│   ├── routing.py
│   ├── translation.py
│   └── errors.py
├── domain/
│   ├── destination.py
│   ├── trip.py
│   └── itinerary.py
├── repositories/
│   ├── destination_repository.py
│   ├── trip_repository.py
│   └── source_repository.py
├── services/
│   ├── destination_service.py
│   ├── itinerary_service.py
│   ├── budget_service.py
│   ├── validation_service.py
│   ├── deterministic_planner.py
│   ├── routing_service.py
│   ├── translation_service.py
│   └── ai/
│       ├── base.py
│       ├── groq_adapter.py
│       ├── gemini_adapter.py
│       ├── orchestrator.py
│       └── prompts.py
├── db/
│   ├── session.py
│   └── migrations/
└── tests/
```

Adapt to the actual repository. Do not duplicate modules that already exist under different names without a clear benefit.

---

# 23. Schema Versioning and Migrations

## 23.1 API Versioning

- Prefix API paths with `/api/v1`.
- Use `schema_version` on stored itinerary snapshots.
- Do not silently change required response fields.
- Add optional fields before removing or renaming existing fields.
- Document deprecations and compatibility windows.

## 23.2 Database Migrations

- Every schema change must be committed as a migration.
- Test migrations against a fresh database and staging data.
- Use forward-only migrations where rollback would risk data loss.
- Prefer expand-and-contract for production changes.
- Do not manually alter production tables without recording the change in migration history.
- Seed only licensed/approved destination data and clearly labelled test fixtures.

## 23.3 Snapshot Compatibility

When reading an old itinerary snapshot:
- Validate against its recorded schema version.
- Apply a documented migration/normalisation function if supported.
- If an old snapshot cannot be upgraded safely, return a clear compatibility error rather than silently dropping information.

---

# 24. Environment Variables and Configuration Schema

Example backend `.env.example`:

```dotenv
APP_ENV=local
APP_VERSION=0.1.0
LOG_LEVEL=INFO
API_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173
REQUEST_TIMEOUT_SECONDS=30

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

GROQ_API_KEY=
GROQ_MODEL=
GEMINI_API_KEY=
GEMINI_MODEL=

AI_GENERATION_MODE=parallel
AI_PROVIDER_TIMEOUT_SECONDS=20
AI_MAX_RETRIES=1
AI_MAX_CONCURRENCY=5
AI_ENABLE_DETERMINISTIC_FALLBACK=true

SARVAM_API_KEY=
TRANSLATION_PROVIDER=sarvam
TRANSLATION_REPAIR_ENABLED=true

ROUTING_PROVIDER=
ROUTING_API_KEY=
GEOCODING_PROVIDER=
GEOCODING_API_KEY=

RATE_LIMIT_ENABLED=true
CACHE_ENABLED=true
DESTINATION_CACHE_TTL_SECONDS=300
```

Requirements:
- Validate settings at startup.
- Fail fast when a required production secret is missing.
- Do not require optional provider credentials when that feature is disabled.
- Keep actual secrets out of source control and frontend builds.
- Verify model IDs and provider settings against current official provider documentation.
- Never print secret values in startup logs.

---

# 25. Test Schema and Contract Requirements

## 25.1 Pydantic Tests

Test:
- Extra fields rejected where expected.
- Coordinates out of range rejected.
- One missing coordinate rejected when the other is supplied.
- Invalid date/duration rejected.
- Zero travellers rejected.
- Negative budget rejected.
- Unknown cost cannot include numeric values.
- Minimum cost greater than maximum rejected.
- Unsupported language/enum rejected.
- Oversized strings/lists rejected.
- Invalid stop IDs rejected by domain validation.
- Inconsistent day numbers rejected.
- Malformed timestamps rejected.

## 25.2 API Contract Tests

Test:
- Correct response shape and status codes.
- Error envelope consistency.
- Pagination limits and invalid cursor behaviour.
- Destination filters and localisation.
- Unpublished destination access denied.
- Authentication required for saved trips.
- Ownership enforcement for get/update/delete.
- No user can read another user's itinerary snapshot.
- Rate limit returns `429`.
- Idempotency behaviour for repeated writes.

## 25.3 AI Contract Tests

Test:
- Both providers valid.
- Groq fails, Gemini valid.
- Gemini fails, Groq valid.
- Both fail.
- Malformed JSON.
- Unknown destination ID.
- Invalid day count.
- Duplicate stops.
- Unverifiable cost/access claims.
- Language mismatch.
- Route provider failure after valid generation.
- Translation repair failure.
- Fallback success and fallback failure.

All standard CI tests must use mocked provider responses and must not require real API keys.

---

# 26. Example End-to-End Payloads

All examples below are illustrative. Example destination IDs, coordinates, provider metadata, and costs must not be treated as verified real-world records.

## 26.1 Generate Request

```json
{
  "origin": {
    "label": "Mysuru",
    "coordinates": {
      "lat": 12.2958,
      "lon": 76.6394
    },
    "place_id": null
  },
  "travel": {
    "start_date": "2026-11-14",
    "duration_days": 3,
    "dates_flexible": false
  },
  "group": {
    "adults": 2,
    "children": 0,
    "seniors": 0
  },
  "budget": {
    "amount_minor": 1800000,
    "currency": "INR",
    "scope": "whole_trip",
    "includes_accommodation": true,
    "flexible": false
  },
  "transport_mode": "car",
  "pace": "balanced",
  "interests": [
    "nature",
    "heritage",
    "local_food"
  ],
  "language": "en",
  "constraints": {
    "accessibility_needs": [],
    "dietary_preferences": [],
    "avoid": [],
    "preferred_destinations": [],
    "accommodation_style": null,
    "preferred_day_start": null,
    "preferred_day_end": null,
    "notes": null
  }
}
```

## 26.2 Destination Response

```json
{
  "id": "dst_example_001",
  "slug": "example-destination",
  "name": "Example Destination",
  "language": "en",
  "district": {
    "code": "example-district",
    "name": "Example District"
  },
  "category": "nature",
  "coordinates": {
    "lat": 14.0,
    "lon": 75.0
  },
  "summary": "Illustrative summary; not a verified destination record.",
  "tags": ["nature", "viewpoint"],
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
  "verification": {
    "status": "needs_review",
    "last_checked_at": null
  },
  "translation_status": "needs_review",
  "sources": []
}
```

## 26.3 Itinerary Response (Abbreviated)

```json
{
  "trip_id": "opaque-trip-id",
  "schema_version": "1.0",
  "language": "en",
  "generation": {
    "mode": "ai_reconciled",
    "fallback_used": false,
    "providers_used": ["groq", "gemini"],
    "generated_at": "2026-10-22T10:00:00Z",
    "schema_version": "1.0"
  },
  "title": "Illustrative Karnataka Trip",
  "summary": "Example only.",
  "origin": {
    "label": "Mysuru",
    "coordinates": {
      "lat": 12.2958,
      "lon": 76.6394
    },
    "place_id": null
  },
  "travel": {
    "start_date": "2026-11-14",
    "duration_days": 3,
    "dates_flexible": false
  },
  "days": [],
  "budget": {
    "currency": "INR",
    "scope": "whole_trip",
    "total_min_minor": null,
    "total_max_minor": null,
    "status": "partial_estimate",
    "items": [],
    "unknown_categories": ["accommodation"],
    "assumptions": []
  },
  "warnings": ["Illustrative response only; no actual itinerary has been generated."],
  "sources": [],
  "created_at": "2026-10-22T10:00:00Z",
  "updated_at": null
}
```

An actual successful itinerary response must include valid days/stops or use a separately documented partial-result contract.

## 26.4 Error Response

```json
{
  "error": {
    "code": "AI_PROVIDERS_UNAVAILABLE",
    "message": "We couldn't generate a trip right now. Your preferences are still available; please retry or explore destinations.",
    "message_key": "errors.ai_providers_unavailable",
    "request_id": "req_opaque_id",
    "retryable": true,
    "details": []
  }
}
```

---

# 27. Data Lifecycle and Retention

## 27.1 Public Destination Data

- Maintain source and verification metadata.
- Unpublish inaccurate or restricted records quickly.
- Recheck time-sensitive facts according to a documented schedule.
- Preserve audit metadata for editorial changes where useful.
- Honour source licence and attribution requirements.

## 27.2 Generated Itineraries

- Anonymous generated itineraries may remain client/session-side unless the user saves them.
- Saved itineraries must have an owner and retention policy.
- Store validated itinerary snapshots, not untrusted raw provider output as canonical data.
- Retain only provider metadata needed for debugging/cost analysis.
- Provide deletion behaviour for saved trips.

## 27.3 Logs

- Do not log secrets or full authentication tokens.
- Avoid logging raw origin coordinates or full prompts unless specifically necessary and approved.
- Set log retention and access controls.
- Redact provider responses before logging.

---

# 28. Implementation Checklist

## Foundation
- [ ] Define central enums.
- [ ] Create strict Pydantic base classes.
- [ ] Set up request ID middleware.
- [ ] Implement standard error envelope.
- [ ] Configure environment validation.

## Destination catalogue
- [ ] Create migrations for districts and destinations.
- [ ] Create translation, tag, source, and cost tables.
- [ ] Add coordinate and cost constraints.
- [ ] Implement public response mapping.
- [ ] Implement filtering, search, and cursor pagination.
- [ ] Add provenance and verification tests.

## Itinerary generation
- [ ] Create trip preference schemas.
- [ ] Create itinerary candidate and final response schemas.
- [ ] Implement provider-neutral adapter interface.
- [ ] Implement Groq and Gemini adapters.
- [ ] Implement schema and destination-ID validation.
- [ ] Implement candidate scoring/reconciliation.
- [ ] Implement deterministic fallback.
- [ ] Implement budget recalculation.
- [ ] Implement route and translation adapters.
- [ ] Add all failure-combination tests.

## Persistence and security
- [ ] Create trips and itinerary snapshot tables.
- [ ] Verify auth token server-side.
- [ ] Apply RLS.
- [ ] Enforce owner-only access.
- [ ] Add idempotency for writes where required.
- [ ] Add rate limiting and secret scanning.
- [ ] Document retention and deletion.

## Release
- [ ] Generate OpenAPI and check schema compatibility.
- [ ] Run unit and integration tests.
- [ ] Test migrations on staging.
- [ ] Verify provider settings and quotas.
- [ ] Verify frontend contains no privileged secrets.
- [ ] Verify logging redaction.
- [ ] Verify rollback/runbook.

---

# 29. Final Backend Schema Rules

The backend must enforce these rules regardless of frontend behaviour:

1. Client input is untrusted.
2. AI output is untrusted until parsed and validated.
3. Destination IDs must resolve to eligible catalogue records.
4. Public destination claims must carry provenance or an explicit unknown/unverified status.
5. Budget totals are recalculated by deterministic code.
6. Unknown values are never represented as a verified zero.
7. A valid result from either Groq or Gemini can be used if the other fails.
8. If both AI providers fail, deterministic fallback is allowed only when curated data supports a feasible plan.
9. Routing and translation failures should produce partial success when the core itinerary remains useful.
10. Authentication and ownership are checked on the server.
11. RLS and backend authorization complement each other; neither should be assumed to replace all checks.
12. Privileged credentials never appear in browser code or logs.
13. Stored snapshots include schema version and preserve generated history.
14. API contracts, Pydantic models, SQL migrations, and tests remain aligned.
15. The implementation must not be declared complete until required tests have actually run.

The purpose of this schema is to make Namma Karnataka reliable and extensible: not merely able to produce a trip-shaped JSON object, but able to validate the plan, explain uncertainty, protect user data, and recover when external services fail.
