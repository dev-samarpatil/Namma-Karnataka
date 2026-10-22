# Namma Karnataka --- Product Requirements Document (PRD)

**Document ID:** NK-PRD-001\
**Version:** 1.0\
**Status:** Draft for product and engineering planning\
**Product:** Namma Karnataka\
**Working tagline:** *Discover the Karnataka You Haven't Seen*\
**Product type:** AI-assisted, Karnataka-focused travel-planning web
application\
**Initial market:** Travelers exploring Karnataka, India\
**Initial languages:** English (`en`) and Kannada (`kn`)\
**Primary development environment:** Google Antigravity IDE\
**Last updated:** 22 October 2026

------------------------------------------------------------------------

## 1. Document Purpose

This Product Requirements Document (PRD) defines the product vision,
user problems, goals, scope, user experience, functional requirements,
non-functional requirements, data requirements, AI behavior,
localization, security, acceptance criteria, success metrics, and
release plan for **Namma Karnataka**.

It is intended to align product, design, engineering, testing, and
future contributors around what the first usable release must do and how
success will be evaluated.

This PRD defines **what the product must deliver and why**. Detailed
implementation decisions may be recorded in a separate technical
architecture document. Requirements are labeled as MVP, post-MVP, or
future consideration to control scope.

------------------------------------------------------------------------

## 2. Product Overview

### 2.1 Product summary

Namma Karnataka helps users discover Karnataka destinations and create
personalized, practical travel itineraries. Users specify where they are
starting, how long they have, their group size, budget, interests,
transport preferences, pace, and language. The application recommends
suitable destinations, proposes a day-wise itinerary, estimates trip
expenses, and displays locations and route order on a map.

The product combines: - A curated destination catalogue with source and
verification metadata. - Preference-aware destination retrieval. - Route
and schedule feasibility checks. - Deterministic budget calculations. -
Groq and Google Gemini for itinerary candidate generation. - Sarvam AI
for selective English/Kannada translation. - Optional evaluation of
AI4Bharat IndicTrans2 as a self-hosted translation alternative. - A
deterministic fallback planner for AI-provider failure. - An
English/Kannada interface and content pipeline.

The product must not treat language-model output as verified truth.
Destination identity, source metadata, route estimates, price
calculations, and eligibility rules must be grounded in structured data
or clearly labeled estimates.

### 2.2 Product vision

> Make exploring Karnataka easier by turning a traveler's preferences
> into a practical, transparent, and personalized journey---while
> helping them discover places beyond the usual recommendations.

### 2.3 Mission

Help travelers spend less time piecing together fragmented travel
information and more time discovering Karnataka through useful,
understandable, and responsible travel plans.

### 2.4 Product positioning

Namma Karnataka is a regional travel discovery and planning assistant,
not a generic chatbot and not a booking platform in its first release.

### 2.5 Product principles

1.  **Karnataka-first:** Recommendations and discovery are designed
    around Karnataka.
2.  **Grounded recommendations:** The AI can select and explain
    destinations, but the application validates its claims.
3.  **Practicality over spectacle:** Feasible itineraries are more
    valuable than visually attractive but unrealistic plans.
4.  **Transparent uncertainty:** Estimates and unknown information must
    be labeled.
5.  **Language parity:** English and Kannada must work throughout the
    experience.
6.  **Responsible discovery:** Offbeat recommendations must not
    encourage trespassing or unsafe access.
7.  **Resilience:** A single external service failure should not bring
    down the whole experience.
8.  **Privacy by default:** Collect and retain only the data needed for
    the service.
9.  **Progressive scope:** Deliver a useful MVP before adding complex
    integrations.
10. **Honest product claims:** Do not claim live traffic, verified
    prices, accessibility, or real-time availability without supporting
    data.

------------------------------------------------------------------------

## 3. Problem Statement

Travelers planning Karnataka trips often need to combine information
from official tourism pages, blogs, maps, social media, transport
providers, and local knowledge. This process can be time-consuming and
makes it difficult to assess whether destinations can realistically fit
into one trip.

Generic AI itinerary generators can produce appealing suggestions but
may: - Recommend destinations that are geographically impractical to
combine. - Invent destination details, fees, opening hours, or travel
times. - Ignore a user's budget, pace, group size, or transport
preference. - Overlook access restrictions and seasonal limitations. -
Repeat only highly popular attractions. - Produce mixed-language or
incorrect Kannada output. - Fail without offering a useful alternative
when an AI API is unavailable.

### 3.1 User problem statement

> Travelers need a simple way to discover suitable Karnataka
> destinations and organize them into a realistic, budget-aware
> itinerary, with clear information quality and support for English and
> Kannada.

### 3.2 Product opportunity

Namma Karnataka can address this need by combining a regional
destination catalogue, practical itinerary constraints, structured AI
generation, route and budget validation, and bilingual localization.

------------------------------------------------------------------------

## 4. Goals and Non-Goals

### 4.1 Product goals

**G-01 --- Personalized planning**\
Allow users to generate itineraries based on origin, duration, budget,
group size, interests, transport mode, travel pace, and language.

**G-02 --- Karnataka destination discovery**\
Enable search, filtering, and recommendation of known destinations
across Karnataka, including selected curated offbeat locations.

**G-03 --- Feasible itineraries**\
Reduce unrealistic plans through geographic, time, duration, and route
checks.

**G-04 --- Transparent budgets**\
Provide an itemized cost estimate and distinguish sourced, estimated,
user-provided, and unknown costs.

**G-05 --- Bilingual experience**\
Support English and Kannada for static UI, generated itinerary text,
validation errors, warnings, and plan revisions.

**G-06 --- Resilient AI generation**\
Use Groq and Gemini in a configurable dual-provider workflow with
independent failure handling and deterministic fallback.

**G-07 --- Trustworthy destination information**\
Store source provenance and verification status and avoid presenting
unknown information as verified.

**G-08 --- Usable failure behavior**\
Provide a helpful localized error or a simpler fallback plan when an
external service fails.

### 4.2 Non-goals for the MVP

The first release does not need to: - Book flights, trains, buses,
hotels, or attraction tickets. - Guarantee exact or live prices. -
Guarantee current opening hours or access conditions where data is not
available. - Provide guaranteed real-time traffic or turn-by-turn
navigation. - Replace official travel advisories, emergency services, or
local authorities. - Include all destinations in Karnataka. - Provide a
public review/social networking platform. - Support every Indian
language. - Guarantee accessibility based on incomplete data. -
Automatically publish user-submitted destination changes without review.

### 4.3 Product boundaries

The product creates a proposed itinerary. The user remains responsible
for confirming current prices, opening hours, permits, transport
availability, weather, and local access conditions before travel.

------------------------------------------------------------------------

## 5. Target Users and Personas

Personas are representative planning profiles, not demographic
restrictions.

### Persona A --- Weekend Explorer

**Needs:** A short trip, minimal planning effort, interesting places,
and reasonable travel time.\
**Pain points:** Too many tabs and uncertainty about which destinations
can be combined.\
**Success:** A clear two-day plan with route order, travel estimates,
and a budget.

### Persona B --- Budget-Conscious Student

**Needs:** A trip within a fixed group budget.\
**Pain points:** Hidden costs, uncertain transport costs, and plans
designed for higher budgets.\
**Success:** An itemized estimate, affordable alternatives, and visible
unknown costs.

### Persona C --- Family Trip Organizer

**Needs:** Manageable travel legs, relaxed pacing, and
family-appropriate options.\
**Pain points:** Overpacked schedules and incomplete practical
information.\
**Success:** A realistic itinerary with breaks and caveats for
unverified facilities or accessibility.

### Persona D --- Offbeat Destination Seeker

**Needs:** Discover less familiar places rather than receiving the same
popular recommendations.\
**Pain points:** Information is scattered, stale, or difficult to
verify.\
**Success:** Relevant offbeat suggestions with location, source, access
status, and uncertainty shown.

### Persona E --- Kannada-First Traveler

**Needs:** Read and revise the trip in Kannada.\
**Pain points:** A translated menu with English AI-generated
descriptions and warnings.\
**Success:** Consistent Kannada content across the full planning flow,
with clear disclosure when a field cannot be reliably localized.

------------------------------------------------------------------------

## 6. User Needs and Jobs to Be Done

-   When I have a few days free, I want to discover destinations that
    fit the time I have.
-   When I enter a budget, I want the plan to respect it or explain why
    it may not.
-   When I choose offbeat places, I want useful discoveries without
    misleading claims about safety or access.
-   When I select Kannada, I want the whole experience to use Kannada.
-   When an AI provider fails, I want the application to recover or
    explain what happened.
-   When I revise a trip, I want the rest of the plan to remain
    consistent.
-   When a price or opening time is uncertain, I want to know that
    before relying on it.
-   When I inspect a destination, I want to know where the information
    came from and when it was checked.

------------------------------------------------------------------------

## 7. Scope and Prioritization

### 7.1 Priority definitions

-   **P0 --- Required for MVP:** The first usable release is incomplete
    without it.
-   **P1 --- Important:** Strongly desirable for the initial release,
    but can be phased if needed.
-   **P2 --- Post-MVP:** Add after core functionality is reliable.
-   **P3 --- Future exploration:** Requires research, user demand, or
    additional infrastructure.

### 7.2 MVP scope summary

  -----------------------------------------------------------------------
  Capability              Priority                Notes
  ----------------------- ----------------------- -----------------------
  English/Kannada         P0                      One authoritative
  language selector                               language state

  Trip preference form    P0                      Origin, duration,
                                                  group, budget,
                                                  interests, pace,
                                                  transport

  Curated destination     P0                      Source and verification
  catalogue                                       metadata

  Destination search and  P0                      Known records only
  filters                                         

  Itinerary generation    P0                      Structured output and
                                                  validation

  Groq adapter            P0                      Independent backend
                                                  integration

  Gemini adapter          P0                      Independent backend
                                                  integration

  Provider failure        P0                      Other provider and
  handling                                        deterministic fallback

  Budget calculator       P0                      Deterministic backend
                                                  calculation

  Map and destination     P0                      Route display may be
  markers                                         estimated

  English/Kannada static  P0                      No hard-coded visible
  UI                                              strings

  Dynamic content         P0                      Including tips,
  language validation                             warnings, and errors

  Sarvam translation      P1                      Use for selected fields
  adapter                                         that need translation

  IndicTrans2             P2                      Only after quality/cost
  self-hosting                                    evaluation

  Saved itineraries and   P1/P2                   Decide based on
  accounts                                        implementation capacity

  Live weather            P2                      Requires a suitable
                                                  provider

  Booking integration     P3                      Explicitly outside the
                                                  initial scope

  Social                  P3                      Moderation and trust
  reviews/community                               requirements needed
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 8. Core User Journeys

### Journey 1 --- Generate a trip

1.  User opens the home page.
2.  User selects English or Kannada.
3.  User chooses origin and trip duration.
4.  User enters group size and budget.
5.  User selects interests, transport mode, and pace.
6.  User submits the request.
7.  The system validates inputs and retrieves candidate destinations.
8.  The planning service requests candidate itineraries from Groq and
    Gemini.
9.  The system validates and reconciles outputs, or uses a valid
    single-provider result.
10. If both providers fail, the deterministic planner attempts a basic
    plan.
11. The user sees a day-wise itinerary, map, budget estimate, and
    relevant caveats.
12. The user can revise or regenerate the plan.

### Journey 2 --- Explore a destination

1.  User opens Explore Karnataka.
2.  User searches by name or applies region/category filters.
3.  The system returns matching destination records.
4.  User opens a destination.
5.  The detail view shows the name, description, location, category,
    practical notes, source, and verification state.
6.  Missing or stale facts are clearly identified.

### Journey 3 --- Use Kannada

1.  User selects Kannada.
2.  Static UI changes language.
3.  The frontend sends `language: "kn"` with the planning request.
4.  Both AI providers receive Kannada output instructions.
5.  The language validation service checks human-readable fields.
6.  Sarvam translation may correct fields that require it.
7.  The final itinerary, warnings, tips, and errors follow the selected
    language where supported.
8.  If a field cannot be reliably translated, the system does not
    silently claim complete Kannada support.

### Journey 4 --- Provider failure

1.  User submits a valid trip request.
2.  One provider times out or returns invalid output.
3.  The other provider's output is validated.
4.  If valid, it is returned with the normal validation pipeline.
5.  If both fail, the deterministic planner is attempted.
6.  If the fallback lacks sufficient data, the user receives a localized
    error with a clear next step.

### Journey 5 --- Revise an itinerary

1.  User requests a change, such as "make the trip cheaper" or "remove
    trekking."
2.  The backend validates the change and preserves the original hard
    constraints.
3.  Candidate destinations and costs are recalculated.
4.  The plan is revised and revalidated.
5.  The user sees the updated plan and budget, with the language
    preference preserved.

------------------------------------------------------------------------

## 9. Functional Requirements

Requirements below use stable IDs to support implementation and testing.

### 9.1 Language and localization

**FR-L10 --- Language selection (P0)**\
The application shall allow users to choose English or Kannada.

**FR-L11 --- Persistent preference (P0)**\
The selected language shall persist across navigation and subsequent
planning requests. Anonymous persistence may use local storage;
authenticated persistence may use a profile field.

**FR-L12 --- API language propagation (P0)**\
Every itinerary generation and revision request shall include the
selected language.

**FR-L13 --- Static UI localization (P0)**\
All visible UI strings for MVP screens, including loading, error,
validation, and empty states, shall be represented by translation keys
rather than hard-coded component text.

**FR-L14 --- Generated-content language (P0)**\
Both LLM providers shall receive instructions to generate all
human-readable fields in the selected language.

**FR-L15 --- Language validation (P0)**\
The backend shall validate that required text fields are present and
reasonably consistent with the requested language. Script detection
alone shall not be treated as proof of translation quality.

**FR-L16 --- Selective translation (P1)**\
The system should use Sarvam AI to translate only the fields that need
localization, subject to current API limits and availability.

**FR-L17 --- Machine-readable field preservation (P0)**\
Translation shall not alter IDs, coordinates, dates, numeric costs,
schema keys, or machine codes.

**FR-L18 --- Language-preserving revision (P0)**\
Revising or regenerating an itinerary shall preserve the selected
language unless the user changes it.

### 9.2 Trip planning input

**FR-TR20 --- Origin (P0)**\
The user shall provide a starting city or location.

**FR-TR21 --- Duration (P0)**\
The user shall specify trip dates or duration in days. The system shall
validate inconsistent or invalid date ranges.

**FR-TR22 --- Group size (P0)**\
The user shall specify a positive traveler count.

**FR-TR23 --- Budget (P0)**\
The user shall optionally provide a total budget and currency. The UI
shall clarify whether the budget is for the entire group or per person.

**FR-TR24 --- Interests (P0)**\
The user shall select one or more supported interests or continue with a
reasonable default.

**FR-TR25 --- Transport preference (P0)**\
The user shall select a transport mode or allow a flexible option.

**FR-TR26 --- Travel pace (P0)**\
The user shall choose relaxed, balanced, or packed pacing.

**FR-TR27 --- Must-visit and excluded destinations (P1)**\
The user should be able to include or exclude selected destinations.

**FR-TR28 --- Optional constraints (P1)**\
The system should support optional accessibility needs, stay
preferences, and other practical constraints when the corresponding data
exists.

**FR-TR29 --- Input validation (P0)**\
Invalid inputs shall produce clear localized messages and shall not
trigger expensive provider calls.

### 9.3 Destination catalogue and discovery

**FR-DE30 --- Stable destination identity (P0)**\
Every destination shall have a stable unique ID.

**FR-DE31 --- Search (P0)**\
Users shall be able to search destinations by name and supported
aliases.

**FR-DE32 --- Filtering (P0)**\
Users shall be able to filter by supported categories and regions.
District and offbeat filters may be added where data coverage supports
them.

**FR-DE33 --- Destination detail (P0)**\
Each destination detail page shall show available descriptive and
geographic information, category/tags, source metadata, and verification
state.

**FR-DE34 --- Provenance (P0)**\
The system shall record the source and checked date for important
factual fields.

**FR-DE35 --- Verification status (P0)**\
The system shall distinguish unreviewed, partially verified, verified,
stale, and restricted records.

**FR-DE36 --- Restricted destination exclusion (P0)**\
Restricted or unsuitable destinations shall not appear in normal
recommendations.

**FR-DE37 --- Offbeat recommendations (P1)**\
The system should support an editorial offbeat classification, with
clear access and data-quality caveats.

**FR-DE38 --- Unknown information (P0)**\
Unknown prices, opening hours, access conditions, and facilities shall
remain unknown rather than being generated as facts.

**FR-DE39 --- Data freshness (P1)**\
The system should support review windows or stale-record flags for
time-sensitive fields.

### 9.4 Itinerary generation

**FR-IT40 --- Structured itinerary (P0)**\
The system shall return a structured itinerary with title, summary,
days, stops, descriptions, durations, budget, tips, warnings, and data
notes.

**FR-IT41 --- Known destination IDs (P0)**\
The final itinerary shall reference valid destination IDs from the
catalogue. New suggestions outside the catalogue must be marked as
unverified proposals and excluded from normal verified recommendations.

**FR-IT42 --- Preference compliance (P0)**\
The system shall consider the user's interests, budget, pace, group
size, origin, duration, and transport preference.

**FR-IT43 --- Geographic feasibility (P0)**\
The system shall use coordinates and route estimates where available to
reduce geographically impractical combinations.

**FR-IT44 --- Schedule feasibility (P0)**\
The system shall check that day schedules and activity durations do not
obviously exceed the available trip time.

**FR-IT45 --- Duplicate control (P0)**\
The system shall avoid duplicate destination stops unless repetition is
intentional and justified.

**FR-IT46 --- Reasons for recommendations (P1)**\
The system should explain how recommended destinations match the user's
interests.

**FR-IT47 --- Revision (P1)**\
The user should be able to revise a plan without re-entering every
preference.

**FR-IT48 --- Fallback itinerary (P0)**\
When both LLM providers fail, the system shall attempt a deterministic
itinerary if enough eligible data exists.

**FR-IT49 --- Honest failure (P0)**\
If neither AI generation nor deterministic fallback can produce a valid
plan, the system shall return a localized error rather than inventing a
result.

### 9.5 Dual-provider AI orchestration

**FR-AI50 --- Independent adapters (P0)**\
Groq and Gemini shall be implemented behind independent backend
adapters.

**FR-AI51 --- Consistent request (P0)**\
Both providers shall receive the same normalized trip constraints,
candidate destination set, language, and expected schema.

**FR-AI52 --- Parallel execution (P1)**\
The system should support parallel calls when configured. The mode shall
be configurable to control latency and cost.

**FR-AI53 --- Provider-specific timeout (P0)**\
Each provider call shall have an independent timeout.

**FR-AI54 --- Bounded retries (P0)**\
Retries shall be limited and reserved for transient errors.
Authentication/configuration errors shall not be repeatedly retried.

**FR-AI55 --- Output validation (P0)**\
Provider outputs shall be parsed and validated before they are eligible
for use.

**FR-AI56 --- Reconciliation (P0)**\
If both outputs are valid, deterministic rules shall compare and
reconcile them. The system shall not blindly concatenate both plans.

**FR-AI57 --- Single-provider success (P0)**\
If one provider fails and the other returns a valid plan, the valid plan
shall proceed through normal validation.

**FR-AI58 --- Error classification (P0)**\
The system shall distinguish rate limiting, quota exhaustion, timeout,
authentication/configuration, provider outage, and invalid output where
possible.

**FR-AI59 --- Cost-aware operation (P1)**\
The system should support configurable single-provider and parallel
modes and track aggregate provider usage where available.

### 9.6 Budget and route calculations

**FR-BR60 --- Deterministic budget calculation (P0)**\
The backend shall calculate budget totals from structured line items
rather than trusting an LLM's arithmetic.

**FR-BR61 --- Cost categories (P0)**\
The budget shall support transport, local transport, accommodation,
food, activities/entry fees, miscellaneous, and contingency as
applicable.

**FR-BR62 --- Cost status (P0)**\
Costs shall be labeled as verified, estimated, user-provided, or
unknown.

**FR-BR63 --- Per-person estimate (P0)**\
When group size and total cost are available, the backend shall
calculate a per-person estimate.

**FR-BR64 --- Budget mismatch (P0)**\
If the proposed plan exceeds the user's budget, the system shall either
revise the plan or clearly explain the mismatch.

**FR-BR65 --- Route source (P0)**\
Route distance and duration values shall retain source metadata or be
labeled as approximate/unavailable.

**FR-BR66 --- No false live claims (P0)**\
The UI shall not describe estimates as live traffic or guaranteed
journey times without a provider that supports those claims.

**FR-BR67 --- Routing failure (P0)**\
If routing fails, the system shall not invent exact route distances or
durations.

### 9.7 Map and interface

**FR-UI70 --- Map display (P0)**\
The system shall display available destination coordinates on an
interactive map.

**FR-UI71 --- Route order (P0)**\
The map or itinerary shall communicate the proposed sequence of stops.

**FR-UI72 --- Destination interaction (P1)**\
Users should be able to select a map marker to view destination details.

**FR-UI73 --- Responsive layout (P0)**\
Core flows shall work on mobile and desktop viewport sizes.

**FR-UI74 --- Loading and empty states (P0)**\
The interface shall show appropriate loading, empty, and error states.

**FR-UI75 --- Accessibility basics (P0)**\
Interactive controls shall have accessible labels, keyboard support, and
readable contrast.

### 9.8 Persistence and accounts

**FR-US80 --- Anonymous planning (P0)**\
A user shall be able to generate a plan without mandatory account
creation unless authentication is required for a specific feature.

**FR-US81 --- Saved itineraries (P1)**\
If saved trips are included, authenticated users shall be able to save
and reopen their own itineraries.

**FR-US82 --- Ownership enforcement (P0 if persistence exists)**\
A user shall not be able to read, modify, or delete another user's saved
itinerary.

**FR-US83 --- Delete saved data (P1 if accounts exist)**\
Users should have a clear way to delete saved itineraries and
account-associated data, subject to documented retention requirements.

### 9.9 Error handling and observability

**FR-OP90 --- Localized errors (P0)**\
User-facing errors shall follow the selected language wherever
supported.

**FR-OP91 --- Safe logging (P0)**\
Operational logs shall not contain API keys, authorization headers, or
unnecessary personal data.

**FR-OP92 --- Request correlation (P1)**\
Requests should have a correlation ID to connect backend events without
exposing private information.

**FR-OP93 --- Operational metrics (P1)**\
The service should track latency, provider failure rate, validation
failures, fallback usage, and routing/translation failure rate.

**FR-OP94 --- Rate limiting (P1)**\
Public endpoints should have reasonable rate limits to reduce abuse and
unexpected provider costs.

------------------------------------------------------------------------

## 10. User Interface Requirements

### 10.1 Home page

Must include: - Product name and concise value proposition. - Language
selector. - Primary "Plan a Trip" action. - Destination discovery entry
point. - Clear estimate/verification disclaimer in an appropriate
location.

Should include: - A few featured destinations backed by the actual
catalogue. - Quick-start templates only if the resulting data and
itineraries are maintained.

### 10.2 Trip form

Must include: - Origin. - Dates or duration. - Group size. - Budget
amount and budget basis. - Interests. - Transport mode. - Travel pace. -
Language selection or visible access to the global language setting. -
Input validation and helpful defaults.

Should include: - Must-visit and excluded places. - Stay preferences and
accessibility constraints where supported.

### 10.3 Itinerary results

Must include: - Trip summary and day-wise structure. - Destination names
and descriptions. - Duration and route estimates where available. -
Itemized budget and total. - Data notes, unknown values, and relevant
warnings. - Controls to revise, regenerate, or return to the form.

### 10.4 Destination explorer and detail

Must include: - Search and filters. - Destination details. -
Source/provenance metadata. - Verification status. - Language-aware
fields.

### 10.5 Map

Must include: - Markers for valid coordinates. - A clear proposed stop
sequence. - Map attribution. - Graceful behavior if a destination lacks
coordinates or the map provider fails.

### 10.6 Error states

Errors must explain what happened at a useful level and provide a next
action. Do not expose raw stack traces, provider response bodies, or
credentials.

------------------------------------------------------------------------

## 11. AI Behavior and Trust Requirements

### 11.1 Grounding

The model prompt should include only a curated set of candidate
destination records and relevant metadata. The model should choose from
those IDs, not create untracked destination records.

### 11.2 Structured output

The itinerary response shall use a defined schema. Invalid JSON, missing
required fields, unknown IDs, or malformed cost objects must be rejected
or corrected through a bounded recovery process.

### 11.3 Reconciliation

When both providers succeed, the system should compare: - Destination
IDs and duplicates. - Duration and schedule feasibility. - Route order
and estimated distances. - Interest match. - Budget compliance. -
Required fields and language.

The reconciliation process must use deterministic checks. A third LLM
call should not be required by default, as it increases cost and
latency.

### 11.4 Fallback behavior

The deterministic planner should: - Select eligible destinations by
interest and geography. - Group nearby stops. - Use available
visit-duration and route estimates. - Produce a simple day-by-day
schedule. - Avoid fabricated cost and access claims. - Label the plan as
rule-based.

### 11.5 User trust

The product shall distinguish: - **Verified:** Checked against an
acceptable source under the product's verification policy. -
**Estimated:** Calculated or inferred using a documented rule. -
**Unknown:** No reliable value is available. - **Stale:** Previously
available data needs rechecking.

------------------------------------------------------------------------

## 12. Destination Data Requirements

### 12.1 Required destination fields

At minimum: - Stable ID and slug. - English name. - At least one
location identifier such as region/district. - Coordinates when verified
or available. - Categories/tags. - Verification status. - Source
provenance for core factual claims. - Created/updated timestamps.

Kannada name/description, access notes, opening hours, entry fee,
facilities, visit duration, best season, accessibility notes, and nearby
transport can be optional depending on evidence.

### 12.2 Candidate sources

Evaluate official Karnataka tourism pages, district administration
pages, relevant government open-data portals, OpenStreetMap, approved
place APIs, and manual research. Check licensing, terms, attribution,
and caching permissions for each source.

### 12.3 Offbeat classification

Offbeat status shall be an editorial label or a label supported by an
explicit method. It shall not imply that the destination is
undiscovered, safe, open, or free of restrictions.

### 12.4 Data quality

-   Unknown values must not be represented as zero.
-   Each important claim should have source metadata.
-   Coordinate and duplicate checks shall run during seed-data
    validation.
-   Time-sensitive fields should have review windows.
-   Restricted places must be excluded from ordinary recommendations.
-   User-submitted corrections require review before becoming trusted
    data.

------------------------------------------------------------------------

## 13. Non-Functional Requirements

### 13.1 Performance

Initial targets to validate through testing: - Static pages should load
quickly on a typical broadband/mobile connection. - API validation and
database lookup should remain lightweight. - Itinerary generation should
use bounded timeouts and return a clear progress/error state if external
services are slow. - Parallel provider calls should be independently
timed and cancelled or ignored after the request deadline. - Large
destination lists should be paginated.

Exact service-level objectives should be set after observing the
selected deployment tier and provider latency.

### 13.2 Reliability

-   A single AI provider failure shall not automatically fail a request
    if another valid path exists.
-   The deterministic fallback shall be testable without live AI
    services.
-   Routing and translation failures shall be isolated from the entire
    application.
-   All external requests shall have timeouts.
-   Retries shall be bounded.

### 13.3 Security

-   Provider secrets shall remain server-side.
-   Privileged Supabase credentials shall never be sent to the browser.
-   Authorization shall be checked for private itineraries.
-   Client input shall be validated.
-   Public endpoints shall use rate limits appropriate to cost and abuse
    risk.
-   Logs shall be sanitized.
-   Dependency updates and secret exposure should be reviewed before
    release.

### 13.4 Privacy

-   Anonymous planning should not require identity information.
-   Persist only information required for saved-trip functionality.
-   Clearly disclose third-party AI and translation processing.
-   Define retention and deletion rules.
-   Avoid logging precise locations and private notes unless necessary.
-   Provide deletion controls for saved user data if accounts are
    implemented.

### 13.5 Accessibility

-   Use semantic HTML and accessible labels.
-   Support keyboard navigation.
-   Maintain readable contrast and scalable text.
-   Do not convey verification state through color alone.
-   Ensure map interactions have a list/card alternative.
-   Avoid claiming accessibility for a destination without evidence.

### 13.6 Maintainability

-   Separate provider adapters, planning logic, data access,
    translation, and routing.
-   Keep schemas versioned.
-   Use automated tests for deterministic services.
-   Maintain `.env.example`, setup instructions, and known limitations.
-   Keep model IDs and external endpoints configurable.

### 13.7 Scalability and cost

-   Limit concurrent provider calls.
-   Cache destination lookups and route results where permitted.
-   Keep candidate lists concise.
-   Track provider usage and fallback rates.
-   Support a single-provider mode if parallel mode exceeds budget.
-   Avoid unnecessary translation requests.

### 13.8 Compatibility

-   Support current major desktop and mobile browsers.
-   Provide a responsive layout for common screen sizes.
-   Test Kannada font rendering on supported platforms.
-   Handle network interruptions and expired sessions gracefully if
    authentication is enabled.

------------------------------------------------------------------------

## 14. Data, API, and Integration Requirements

### 14.1 Backend API

Suggested endpoints: - `GET /api/health` - `GET /api/destinations` -
`GET /api/destinations/{destination_id}` -
`POST /api/itineraries/generate` -
`POST /api/itineraries/{itinerary_id}/revise` -
`GET /api/itineraries/{itinerary_id}` if saved trips exist -
`POST /api/feedback` if feedback is enabled

Final contracts should be implemented with Pydantic and documented
through FastAPI OpenAPI output.

### 14.2 Generate request

Example:

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

This request is illustrative. The final schema must validate dates,
positive group size, budget basis, supported languages, allowed
transport modes, and maximum input sizes.

### 14.3 External integrations

-   Groq and Gemini for candidate itinerary generation.
-   Sarvam AI for selective translation.
-   Optional IndicTrans2 deployment for evaluation.
-   Supabase PostgreSQL and optional Auth/Storage.
-   OpenStreetMap-compatible map display.
-   A configurable routing/geocoding service.
-   Optional future weather provider.

All third-party integrations must have explicit timeouts, error
classification, quota/cost controls, and policy review.

------------------------------------------------------------------------

## 15. Analytics and Success Metrics

Metrics should evaluate usefulness and trust, not just AI activity.

### 15.1 Activation

-   Percentage of visitors who start the trip form.
-   Percentage of started forms that are submitted successfully.
-   Percentage of valid requests that produce a usable itinerary.

### 15.2 Planning quality

-   Percentage of itineraries passing schema validation.
-   Percentage using only valid destination IDs.
-   Budget reconciliation pass rate.
-   Route/schedule feasibility pass rate.
-   Rate of user revisions after generation.
-   User feedback on relevance and feasibility.

### 15.3 Reliability

-   Groq success/failure rate.
-   Gemini success/failure rate.
-   Dual-provider success rate.
-   Deterministic fallback usage rate.
-   Translation failure/correction rate.
-   Routing failure rate.
-   Median and tail latency for generation.

### 15.4 Localization

-   Percentage of generated text fields passing language checks.
-   User-reported language issues.
-   Kannada QA defect rate.
-   Language selection and persistence success.

### 15.5 Data quality

-   Number of destinations with source provenance.
-   Percentage of records with verified coordinates.
-   Percentage of records flagged stale.
-   Number of unresolved duplicate records.
-   Number of user-reported factual corrections.

### 15.6 Cost

-   Average provider calls per successful itinerary.
-   Translation calls per itinerary.
-   Estimated provider cost per successful itinerary where data is
    available.
-   Cost of fallback/retry behavior.
-   Cache hit rate where caching is implemented.

### 15.7 Suggested initial targets

Use these as hypotheses to validate, not promises: - At least 95% of
successful responses pass schema validation after bounded recovery. -
100% of returned destination IDs exist in the catalogue. - 100% of
returned budget totals reconcile with their displayed line items. - 100%
of provider secrets remain outside the frontend bundle. - 100% of tested
provider-failure scenarios produce either a valid fallback or a
localized error. - All P0 static UI strings are covered in English and
Kannada. - No known restricted destination appears in ordinary
recommendations.

The product team should establish baselines and adjust thresholds based
on actual test results and user feedback.

------------------------------------------------------------------------

## 16. Experiment and Evaluation Plan

### Experiment A --- Dual-provider value

Compare parallel Groq + Gemini against single-provider generation on the
same evaluation set. Measure validity, feasibility, interest match,
latency, and cost. Keep parallel mode only if its quality or reliability
benefits justify the additional expense.

### Experiment B --- Kannada generation and translation

Compare direct Kannada generation against direct generation plus
selective Sarvam correction. Use human-reviewed examples. Measure
meaning preservation, terminology, fluency, field completeness, latency,
and cost.

### Experiment C --- Offbeat relevance

Ask reviewers to assess whether selected offbeat destinations are
relevant, sufficiently sourced, and responsible to recommend. Track
false "offbeat" classifications and missing access data.

### Experiment D --- Budget quality

Use a small set of manually calculated test trips. Verify that totals
reconcile, cost bases are consistent, and unknown costs are disclosed.

### Experiment E --- Deterministic fallback

Simulate both providers failing and evaluate whether the fallback plan
is valid, understandable, and honest about missing data.

------------------------------------------------------------------------

## 17. Acceptance Criteria by Feature

### Trip input

-   Invalid duration, date range, group size, or budget input is
    rejected with a localized message.
-   A valid request includes language and all normalized constraints.
-   Provider calls do not occur for requests rejected by validation.

### Destination discovery

-   Search returns only matching records.
-   Each displayed destination has a stable ID.
-   Verification state and source metadata are visible in the detail
    view.
-   Restricted destinations are excluded from standard recommendations.

### Itinerary generation

-   Output matches the required schema.
-   All normal destination references exist in the catalogue.
-   Duplicate stops and obviously impossible schedules are rejected or
    corrected.
-   User constraints are checked.
-   The final itinerary has an explicit generation mode and appropriate
    data notes.

### Dual-provider orchestration

-   Provider calls are independently timed.
-   One provider failure does not prevent use of a valid other-provider
    result.
-   Two valid outputs are reconciled through deterministic checks.
-   Two failures trigger deterministic fallback.
-   Invalid output cannot bypass final validation.

### Budget

-   Total and per-person calculations are deterministic.
-   Unknown values are not silently treated as zero.
-   Budget overruns are explained or a revised plan is attempted.
-   Displayed totals match line items.

### Localization

-   Static UI strings are translated in both languages.
-   Dynamic content follows the requested language or clearly signals a
    fallback.
-   IDs, coordinates, and numeric fields remain unchanged.
-   Revision preserves language.
-   Translation errors are bounded and tested.

### Maps and routes

-   Valid coordinates appear on the map.
-   Missing coordinates do not crash the view.
-   Route estimates identify their source or approximate status.
-   Routing failure does not create fabricated exact numbers.

### Security and privacy

-   No API key is included in frontend assets.
-   Unauthorized users cannot access another user's saved itinerary.
-   Logs contain no secrets.
-   Rate limits and input validation are tested.

------------------------------------------------------------------------

## 18. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                    Impact                  Mitigation
  ----------------------- ----------------------- -----------------------
  AI hallucination        Misleading places,      Known destination IDs,
                          prices, hours, and      structured schemas,
                          routes                  deterministic
                                                  validation

  Poor offbeat data       Unsafe or irrelevant    Curated records, source
                          recommendations         metadata, access
                                                  status, review process

  Stale information       Incorrect hours, fees,  Review windows and
                          or access claims        stale flags

  API quotas/rate limits  Generation failures     Timeouts, concurrency
                                                  controls, bounded
                                                  retries, fallback

  Translation errors      Misleading Kannada text Human-reviewed
                                                  evaluation and
                                                  selective correction

  Route estimates are     Overpacked or           Label estimates and
  imperfect               unrealistic trip        validate schedule
                                                  feasibility

  Provider cost is high   Unpredictable operating Configurable parallel
                          expense                 mode, limits, caching,
                                                  usage metrics

  Data source             Licensing or policy     Review terms,
  restrictions            risk                    attribution, caching
                                                  rules, and allowed use

  Scope creep             Delayed MVP             P0/P1/P2 prioritization
                                                  and release gates

  Secret exposure         Unauthorized use and    Backend-only secrets,
                          cost                    repository checks,
                                                  rotation

  Accessibility           User harm or            Show only sourced
  misinformation          frustration             claims; unknown remains
                                                  unknown

  User over-trust         Treating estimates as   Clear disclaimers,
                          guarantees              provenance, and
                                                  current-source checks
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 19. Release Plan

### Release 0 --- Internal prototype

-   Small manually curated catalogue.
-   Basic planner form.
-   Deterministic planner and budget calculation.
-   One-language path can be used temporarily during skeleton work, but
    the architecture must support both languages from the beginning.

**Gate:** Core planning logic works without AI.

### Release 1 --- Bilingual MVP

-   English/Kannada static UI.
-   Groq and Gemini adapters.
-   Structured generation and reconciliation.
-   Selective translation integration.
-   Map and destination explorer.
-   Provider failure handling and deterministic fallback.

**Gate:** P0 requirements pass automated tests and a manual acceptance
review.

### Release 1.1 --- Reliability and data quality

-   Better source coverage and stale-data reporting.
-   Kannada quality review.
-   Usage and latency metrics.
-   Improved budget and route edge cases.

**Gate:** No unresolved critical defects in core planning, privacy, or
language handling.

### Release 2 --- Expanded travel intelligence

Possible additions: - Weather-aware suggestions. - Saved trips and
collaborative planning. - Public transport integration. - More detailed
accessibility information. - Additional Indian languages. - Moderated
user corrections. - Booking integrations, only after explicit scope and
partner review.

------------------------------------------------------------------------

## 20. Dependencies and Open Questions

### Dependencies

-   API access and current supported models for Groq and Gemini.
-   Sarvam account/API access if hosted translation is selected.
-   Feasible deployment plan if IndicTrans2 is self-hosted.
-   Supabase database and security configuration.
-   Permitted map tiles and routing/geocoding provider.
-   Reliable seed data and a process to maintain it.
-   Kannada language review capability.

### Open decisions

1.  Should users plan anonymously in the MVP?
2.  Should dual-provider parallel generation be the default or
    configurable by request type?
3.  Which routing service best fits the initial budget and coverage?
4.  Will the seed catalogue be maintained manually, imported from
    permitted sources, or both?
5.  Should Sarvam translate only AI errors or also missing destination
    descriptions?
6.  Is saved-trip persistence a P0 or P1 feature?
7.  Should weather be excluded from the MVP?
8.  What data review interval will apply to prices, hours, and access
    conditions?
9.  What is the retention policy for saved trips and operational logs?
10. Who approves a destination as verified or restricted?

Document consequential decisions in Architecture Decision Records
(ADRs).

------------------------------------------------------------------------

## 21. Definition of Ready and Definition of Done

### Definition of Ready

A feature is ready to implement when: - The user problem is clear. -
Acceptance criteria are written. - Inputs and outputs are defined. -
Dependencies and failure states are identified. - Language and
accessibility impact are considered. - Data sources and permissions are
understood where relevant.

### Definition of Done

A feature is done when: - Implementation matches the agreed acceptance
criteria. - Relevant automated tests pass and actual results are
recorded. - Loading, empty, and error states are handled. - English and
Kannada behavior is tested where applicable. - Security and privacy
implications are reviewed. - Documentation is updated. - Known
limitations are documented. - The feature is not described as verified
unless verification actually occurred.

------------------------------------------------------------------------

## 22. Antigravity Implementation Prompt

Use this prompt as the starting instruction for the coding agent. Work
phase by phase rather than requesting the whole application in one pass.

``` text
Implement Namma Karnataka according to the attached PRD.

First inspect the repository. Do not overwrite existing working code without
explaining why. Convert this PRD into a phased checklist and identify any
conflicting or ambiguous requirements before implementation.

The product is a Karnataka-focused travel planner with:
- React + Vite + TypeScript frontend.
- FastAPI + Pydantic backend.
- Supabase PostgreSQL.
- Groq and Gemini behind independent adapters.
- English and Kannada end-to-end localization.
- Sarvam AI as a configurable translation adapter.
- Optional future evaluation of IndicTrans2.
- Leaflet/OpenStreetMap-compatible mapping and a configurable routing service.
- A curated destination catalogue with provenance and verification status.
- Deterministic budget calculations and a deterministic fallback planner.

Non-negotiable:
1. Never expose AI provider keys or privileged Supabase keys in the frontend.
2. Validate every request and every AI response against explicit schemas.
3. The final plan must use valid destination IDs from the catalogue.
4. Recalculate budget totals in backend code.
5. Unknown facts must remain unknown; never invent prices, hours, sources, access
   status, exact route times, or accessibility.
6. The selected language must be included in every generation/revision request.
7. Groq and Gemini outputs must be validated and reconciled, not concatenated.
8. If one provider fails, try the valid other-provider result.
9. If both fail, attempt deterministic planning and otherwise return a localized
   actionable error.
10. Translation may alter only designated text fields, not IDs or numeric data.
11. Add tests for success, invalid output, provider failure, routing failure,
    translation failure, budget arithmetic, language persistence, and security.
12. Respect source licenses, map attribution, service terms, rate limits, and
    caching policies.

Implement one phase at a time. After each phase, run the relevant tests and report
actual commands and results, changed files, remaining requirements, and risks.
Do not claim a feature is complete if it has not been implemented and tested.

Begin with repository inspection, a requirements checklist, and Phase 0 only.
```

------------------------------------------------------------------------

## 23. Official Documentation for Engineering Verification

The engineering team should verify current API models, endpoints,
pricing, limits, licenses, and usage terms before integration:

-   Groq: https://console.groq.com/docs
-   Google Gemini API: https://ai.google.dev/gemini-api/docs
-   Sarvam AI: https://docs.sarvam.ai/
-   Sarvam text translation:
    https://docs.sarvam.ai/api-reference/text/translate-text
-   AI4Bharat IndicTrans2: https://github.com/AI4Bharat/IndicTrans2
-   Supabase: https://supabase.com/docs
-   FastAPI: https://fastapi.tiangolo.com/
-   React: https://react.dev/
-   Vite: https://vite.dev/
-   Leaflet: https://leafletjs.com/reference.html
-   OpenStreetMap copyright/attribution:
    https://www.openstreetmap.org/copyright
-   OpenStreetMap tile usage policy:
    https://operations.osmfoundation.org/policies/tiles/
-   Render: https://render.com/docs
-   Vercel: https://vercel.com/docs

These links are starting points. Confirm the precise terms and
capabilities for the selected service configuration.

------------------------------------------------------------------------

## 24. Final PRD Summary

Namma Karnataka's MVP is successful when a traveler can enter practical
trip preferences, discover source-aware Karnataka destinations, receive
a geographically and budget-aware itinerary, view the suggested route,
and use the complete experience in English or Kannada---even when an AI
provider fails.

The essential product contract is:

> **A practical, transparent, bilingual way to discover Karnataka---with
> AI-assisted planning grounded in structured destination data and
> deterministic validation.**
