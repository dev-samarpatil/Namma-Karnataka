# NAMMA KARNATAKA
## Complete Application Flow Document

**Product:** Namma Karnataka — AI-Powered Karnataka Travel Planner  
**Document type:** End-to-end application flow specification  
**Version:** 1.0  
**Status:** Proposed product and UX baseline  
**Audience:** Product owner, UX/UI designers, frontend/backend developers, AI engineers, QA, and implementation agents  
**Primary language support:** English (`en`) and Kannada (`kn`)  
**Geographic scope:** Karnataka, India  
**Companion documents:** Product Requirements Document (PRD), Technical Requirements Document (TRD), Complete Product Documentation

---

# 1. Purpose of This Document

This document defines the end-to-end flow of the Namma Karnataka application: what users see, what they can do, how the application responds, how screens connect, and what happens when data or services are unavailable.

It is intended to be used as a blueprint for:
- UX flows and wireframes.
- Frontend page and component implementation.
- Backend API sequencing.
- AI itinerary-generation logic.
- Validation and error states.
- Testing and acceptance criteria.
- Phase-wise implementation in Google Antigravity IDE.

This document describes the intended product flow. It does not claim that the screens or integrations have already been implemented.

## 1.1 Core Product Idea

Namma Karnataka helps travellers discover Karnataka through a practical, personalised travel-planning experience. Users can explore popular destinations and carefully curated lesser-known places, enter their preferences, generate a multi-day itinerary, view it on a map, understand the estimated budget, and optionally save the trip.

**Product principle:** Make planning Karnataka travel easier without pretending uncertain information is verified.

## 1.2 Experience Principles

1. **Plan first, sign in later:** Users should be able to explore and generate an itinerary without being forced to create an account, unless a product decision changes this.
2. **Show useful choices, not a long questionnaire:** Collect essential preferences first and place optional constraints in an expandable section.
3. **Map and itinerary work together:** Every map stop must correspond to a readable itinerary entry.
4. **Make uncertainty visible:** Distinguish verified information, estimates, unknowns, and AI-generated suggestions.
5. **Fail gracefully:** A map, translation, or AI-provider failure must not unnecessarily destroy the entire planning experience.
6. **Language is a first-class feature:** Users can switch between English and Kannada at any stage.
7. **No invented travel facts:** If prices, hours, access conditions, or route durations are unknown, say so.
8. **Mobile-first:** The core flow must work on a phone as well as a desktop.
9. **User remains in control:** Users can review, remove, replace, or regenerate suggestions rather than treating the AI plan as final authority.
10. **Privacy by default:** Ask only for information needed to plan the trip.

---

# 2. High-Level App Flow

```text
APP OPEN
   |
   v
Load app configuration, language preference and public destination data
   |
   v
HOME / DISCOVER
   |
   +--> Explore destinations --------------------+
   |                                             |
   +--> Start planning                           |
   |        |                                    |
   |        v                                    |
   |   TRIP PREFERENCES                           |
   |        |                                    |
   |        v                                    |
   |   VALIDATE INPUT                             |
   |        |                                    |
   |        v                                    |
   |   FIND ELIGIBLE DESTINATIONS                 |
   |        |                                    |
   |        v                                    |
   |   GENERATE ITINERARY                         |
   |        |                                    |
   |        +--> Groq candidate                   |
   |        +--> Gemini candidate                 |
   |        +--> Validate and select/reconcile    |
   |        +--> Deterministic fallback if needed |
   |        |                                    |
   |        v                                    |
   |   BUILD BUDGET + ROUTE INFORMATION            |
   |        |                                    |
   |        v                                    |
   |   ITINERARY RESULTS                           |
   |        |                                    |
   |        +--> Overview                         |
   |        +--> Day-by-day plan                  |
   |        +--> Map                              |
   |        +--> Budget                           |
   |        +--> Destination details              |
   |        +--> Edit / regenerate                |
   |        +--> Save trip (optional sign-in)     |
   |        +--> Share / export (if implemented)  |
   |                                             |
   +--> Destination details <---------------------+
   |
   +--> Language / settings
   |
   v
END / RETURN LATER
```

## 2.1 Main Navigation

Recommended primary navigation:
- **Home**
- **Explore**
- **Plan a Trip**
- **Saved Trips** (only when persistence/auth is enabled)
- **Language selector**

On mobile, place secondary navigation in a compact menu. Keep “Plan a Trip” prominent.

## 2.2 Main User Journeys

1. First-time visitor plans a trip without signing in.
2. Returning visitor starts a new trip using the same preferences.
3. Traveller explores a destination before adding it to a plan.
4. Traveller reviews and edits a generated itinerary.
5. Traveller switches the interface or itinerary language to Kannada/English.
6. Traveller encounters an AI provider failure and receives a valid alternative or fallback plan.
7. Traveller saves a trip after being prompted to sign in.
8. Traveller returns to saved trips and reopens a prior itinerary.
9. Traveller cannot get a suitable itinerary because the catalogue has insufficient matching data.
10. Traveller uses the app with map/routing or translation services temporarily unavailable.

---

# 3. App Entry and Initialisation Flow

## 3.1 Entry Sequence

When the user opens the application:

1. Load the application shell.
2. Read the saved UI language preference from local storage, if available.
3. If no preference exists, use the configured default language.
4. Load static translation dictionaries for English and Kannada.
5. Fetch public app configuration and/or destination summaries if required.
6. Render the home screen without waiting for optional map or AI services.
7. If the destination API is unavailable, show a lightweight retry state while keeping navigation usable.
8. Do not request location permission automatically.

## 3.2 First Visit

If no local preference exists:
- Use English as the default only if that is the agreed product decision.
- Show a visible language switcher.
- Optionally show a compact welcome message, but do not force a full-screen onboarding tutorial.
- Let the user start planning immediately.

## 3.3 Returning Visit

If local language preference exists:
- Restore it.
- Restore non-sensitive draft preferences only if the user has opted into this behaviour or the persistence is clearly disclosed.
- Do not silently restore a precise origin or personal trip data without an appropriate design decision.
- If authentication is active, fetch saved trips after the user session is verified.

## 3.4 Initialisation Failure

| Failure | User experience |
|---|---|
| Translation file fails | Use the available default strings and log a safe diagnostic |
| Destination API fails | Show home page and a destination-loading error with retry |
| Authentication service fails | Allow public exploration/planning if supported; disable save action with explanation |
| Map tiles fail | Keep the rest of the app usable; show a map-unavailable message |
| Optional analytics fails | No visible interruption |
| App configuration fails | Use safe compiled defaults where possible |

---

# 4. Home Screen Flow

## 4.1 Home Screen Purpose

The home screen should answer:
- What is Namma Karnataka?
- What can I do here?
- Where should I start?
- Can I explore lesser-known places as well as popular destinations?

## 4.2 Suggested Layout

1. Header with logo/name, navigation, and language selector.
2. Hero section with headline and supporting text.
3. Primary CTA: **Plan My Trip**.
4. Secondary CTA: **Explore Karnataka**.
5. Quick-start cards, for example:
   - Nature & waterfalls.
   - Heritage & architecture.
   - Hill stations.
   - Coast & beaches.
   - Food & culture.
   - Offbeat discoveries.
6. Curated destination highlights with verification indicators.
7. A short “How it works” section.
8. Footer with data-source note, contact/help route, privacy, and terms.

Copy is a design decision. Avoid promising that all destinations are undiscovered, safe, open, or inexpensive.

## 4.3 Home Interactions

### User selects “Plan My Trip”
Navigate to `/plan`. Start with a blank form or a clearly disclosed draft.

### User selects “Explore Karnataka”
Navigate to `/destinations`.

### User selects a category card
Open the destination explorer with the category filter preselected.

### User selects a destination card
Open `/destinations/:destinationId`.

### User changes language
- Update static UI strings immediately.
- Persist the preference locally.
- Keep the user on the same page.
- If the user is viewing a generated itinerary, offer to translate/regenerate human-facing content if the itinerary itself does not have the selected language. Do not silently mutate stable IDs or numeric values.

---

# 5. Language Selection Flow

## 5.1 Entry Points

Language can be changed:
- From the global header.
- From settings/preferences.
- During trip setup.
- From the itinerary screen.

## 5.2 Language Switch Behaviour

When switching from English to Kannada or vice versa:

1. Update UI language.
2. Preserve current form values.
3. Preserve current route/page.
4. Preserve destination IDs, dates, numeric amounts, and coordinates.
5. Load matching destination translation fields where available.
6. For generated itinerary text, use existing translated fields if validated.
7. If content is missing, call the approved translation-repair service only for eligible fields, or offer to regenerate the itinerary in the selected language.
8. Show a small notice if some content remains in the previous language.
9. Never imply that translated content has been independently fact-checked merely because it was translated.

## 5.3 Language Failure

If translation fails:
- Keep the itinerary usable.
- Mark untranslated fields.
- Preserve factual caveats and source links.
- Offer retry or regeneration.
- Do not translate enum values or machine keys.

---

# 6. Destination Explorer Flow

## 6.1 Entry

Users enter Explore from the home screen, main navigation, or a destination link in an itinerary.

## 6.2 Explorer Screen

Recommended elements:
- Search field.
- Category filter.
- District/region filter.
- Interest/tag filter.
- “Popular” and “Offbeat” editorial filters.
- Optional cost/access filters when data is available.
- Grid/list of destination cards.
- Sort options such as relevance or name.
- Pagination or incremental loading.
- Optional map/list toggle.

## 6.3 Destination Card

Each card may show:
- Localised name.
- District/region, if known.
- Short description.
- Category and tags.
- Image only when rights/attribution are handled.
- Verification status.
- Cost/access status if known.
- “View details” action.
- “Add to trip” action only if the active trip context supports it.

Do not show empty fields as fabricated defaults. If cost is unknown, show “Price not verified” or omit the amount while preserving the uncertainty status.

## 6.4 Search Flow

1. User enters a destination or interest.
2. Frontend debounces text input.
3. Backend searches only published catalogue records.
4. Results appear with active filters.
5. If no results exist, show a clear empty state:
   - Remove one or more filters.
   - Try a broader term.
   - Explore another category.
6. If the API fails, retain the search input and filters and offer retry.

## 6.5 Destination Detail Flow

When a destination card is opened, show:
- Name and location.
- Description in selected language.
- Category/tags.
- Coordinates/map preview if available.
- How to reach, only if supported by source data.
- Access status and caveats.
- Cost/entry-fee status.
- Opening hours only when sourced and dated.
- Source/provenance details.
- Last checked date where available.
- “Use in a trip” or “Plan around this place” action.
- Similar destinations based on curated tags, if implemented.

### User selects “Plan around this place”
- Carry the destination ID into the trip form.
- Show it as a preferred destination, not as an unconditional guarantee that it will fit the itinerary.
- Let the user remove it.
- Validate access and route feasibility during generation.

---

# 7. Trip Planning Entry Flow

## 7.1 Ways to Start

A user can start a trip from:
- Home CTA.
- Main navigation.
- A destination detail page.
- A category/region exploration result.
- A saved trip’s “Create similar trip” action, if available.

## 7.2 Form Structure

Use a short multi-section form rather than one intimidating page.

**Recommended steps:**
1. Where and when?
2. Who is travelling?
3. Budget and transport.
4. Interests and travel pace.
5. Optional preferences.
6. Review and generate.

For a simpler MVP, these sections can be one scrollable page with a progress indicator and grouped cards. Do not add unnecessary wizard navigation if it slows the user down.

## 7.3 Draft State

Maintain form state while the user navigates between steps. If they leave the page:
- Ask before discarding unsaved changes if there is a meaningful draft.
- Restore draft only according to the chosen privacy behaviour.
- Do not put sensitive data in a public URL.
- Clear stale drafts after a defined period if local persistence is used.

---

# 8. Trip Preference Form — Detailed Flow

## 8.1 Step 1: Where and When?

### Fields
- Starting city/place.
- Optional map-based origin selection if supported.
- Start date or flexible travel period.
- Trip duration in days.
- Optional return date derived from start date + duration.

### Interactions
- User types an origin.
- If geocoding is used, show candidate places and require selection when ambiguous.
- If user declines location permission, continue with manual origin entry.
- Validate date and duration.
- Explain that the app does not need precise device location to plan a trip.

### Validation
- Origin must be resolved sufficiently for routing or explicitly marked unresolved.
- Duration must be within configured limits.
- Date cannot be invalid.
- Start/end dates must be consistent.
- If dates are flexible, mark them as flexible rather than fabricating an exact date.

### Error states
- Ambiguous origin → show a selection list.
- Geocoding unavailable → let the user enter/select a known city manually.
- Invalid date range → explain how to correct it.
- Missing origin → ask for the starting city or choose a supported “decide later” option.

## 8.2 Step 2: Who Is Travelling?

### Fields
- Adults.
- Children.
- Seniors, if relevant to planning.
- Optional accessibility needs.

Do not request names or ages unless needed for a specific feature. If the app cannot use these fields meaningfully, omit them rather than collecting them for appearance.

### Validation
- Counts must be non-negative integers.
- Total travellers must be at least one.
- Apply configured maximum group size.
- Accessibility needs should use a controlled list plus an optional short text field with a length limit.

## 8.3 Step 3: Budget and Transport

### Fields
- Budget amount.
- Budget scope: whole trip or per person.
- Currency (INR initially).
- Whether accommodation is included.
- Transport mode: car, public transport, two-wheeler, mixed, or not decided—only include modes the system can reasonably support.
- Accommodation preference may be optional.

### Budget helper text
Explain which categories the estimate may include and which may be unavailable.

### Validation
- Budget cannot be negative.
- Amount must fit supported numeric limits.
- Scope must be explicit.
- Do not assume a zero budget means “free trip.”
- If budget is blank, allow generation only if product rules support “budget flexible”; do not silently set an arbitrary budget.

## 8.4 Step 4: Interests and Pace

### Interest options
- Nature and wildlife.
- Waterfalls.
- Hills and viewpoints.
- Heritage and architecture.
- Beaches and coastline.
- Food and local culture.
- Spiritual/cultural places.
- Adventure activities, where data and access are verified.
- Family-friendly options, where suitable evidence exists.
- Offbeat discoveries.

### Pace
- Relaxed.
- Balanced.
- Packed.

### Behaviour
- User may select multiple interests.
- If no interest is selected, allow a default “mixed interests” option with clear visibility.
- “Offbeat” is an editorial tag, not a safety or access guarantee.
- Do not include restricted places simply because “adventure” is selected.

## 8.5 Step 5: Optional Preferences

Optional fields may include:
- Places to include.
- Places or experiences to avoid.
- Dietary preferences for food suggestions.
- Accessibility requirements.
- Accommodation style.
- Preferred daily start/end time.
- Preference for fewer transfers or shorter drives.

These must be optional. Keep free-text length bounded and treat it as untrusted input.

## 8.6 Step 6: Review

Before generation, show a compact summary:
- Origin.
- Dates/duration.
- Group size.
- Budget and scope.
- Transport.
- Interests and pace.
- Included/excluded preferences.
- Selected preferred destinations.
- Language.

Actions:
- **Edit** each section.
- **Generate My Itinerary**.
- **Cancel**.

The user must be able to return to previous sections without losing entries.

---

# 9. Generation Submission and Loading Flow

## 9.1 Submission

When the user selects Generate:

1. Disable duplicate submissions while a request is in progress.
2. Run frontend validation.
3. Send a typed request to the backend.
4. Attach a request/correlation ID where supported.
5. Show a progress state.
6. Do not expose provider names or internal technical details unless useful to the user.
7. Allow cancel/navigation where safe; cancellation should not create duplicate saved trips.

## 9.2 Loading Screen

Suggested status messages:
- “Understanding your travel preferences…”
- “Finding suitable destinations…”
- “Building your day-by-day plan…”
- “Checking route and budget information…”

Only show stages that correspond to real backend progress or are clearly presented as general progress hints. Do not fake a precise progress percentage when the backend cannot report one.

## 9.3 Duplicate Submission Prevention

- Disable the Generate button during an active request.
- Use request cancellation when the user abandons the flow.
- Use idempotency for writes where needed.
- Backend rate limiting remains authoritative.

## 9.4 Generation Result States

Possible results:
1. Valid AI-reconciled itinerary.
2. Valid single-provider itinerary.
3. Valid deterministic fallback itinerary.
4. Partial itinerary with explicit warnings.
5. No eligible destinations.
6. Recoverable provider/service error.
7. Validation error requiring the user to change preferences.

Each result must have a specific UI state.

---

# 10. AI Generation Flow

## 10.1 Backend Processing Sequence

```text
Receive request
    |
    v
Validate and normalise preferences
    |
    v
Retrieve eligible curated destinations and factual context
    |
    v
Build bounded prompt from trusted system instructions + user preferences + catalogue data
    |
    v
Invoke configured provider strategy
    |
    +--> Groq candidate
    |
    +--> Gemini candidate
    |
    v
Parse structured output
    |
    v
Validate schema, IDs, duration, duplicate stops, feasibility, constraints
    |
    v
Select best valid candidate or safely reconcile candidates
    |
    +--> If no valid AI candidate: deterministic fallback
    |
    v
Compute budget and route metadata
    |
    v
Validate language and repair eligible text if needed
    |
    v
Return itinerary + warnings + provenance + generation mode
```

## 10.2 Provider Outcomes

| Groq | Gemini | Outcome |
|---|---|---|
| Valid | Valid | Score and select/reconcile valid candidates |
| Valid | Failed | Use valid Groq candidate |
| Failed | Valid | Use valid Gemini candidate |
| Invalid | Valid | Use valid Gemini candidate |
| Valid | Invalid | Use valid Groq candidate |
| Failed | Failed | Attempt deterministic fallback |
| Invalid | Invalid | Attempt bounded repair if configured, then fallback |
| Both valid but conflict | — | Choose best valid candidate or deterministic safe reconciliation |

## 10.3 Validation Rules

The backend must check:
- Requested duration and day count.
- Every destination ID exists and is eligible.
- No duplicate stop unless explicitly allowed.
- Stop order and time values are coherent.
- Route distances and durations are sourced or labelled approximate.
- Cost values are valid ranges and statuses.
- Access-critical facts have source support or are marked unknown.
- User constraints are respected where the system has sufficient data to evaluate them.
- Output is in the requested language or marked partially untranslated.
- No provider output contains executable instructions or untrusted URLs that the app automatically follows.

## 10.4 Generation Metadata

Attach internal metadata such as:
- Generation mode.
- Providers attempted and status.
- Latency.
- Validation outcome.
- Fallback usage.
- Schema version.

Only expose user-safe metadata in the UI. Avoid displaying internal error text or raw prompts.

---

# 11. Deterministic Fallback Flow

If neither provider supplies a valid itinerary:

1. Tell the user that the app is using available curated data to build a simpler plan, if fallback succeeds.
2. Filter destinations based on the user’s interests and constraints.
3. Exclude records marked closed/restricted from normal recommendations.
4. Prefer records with usable coordinates for route planning.
5. Group geographically close destinations.
6. Limit daily stops according to the selected pace.
7. Use only supported route and cost data.
8. Add warnings for unknown hours, prices, route details, or access.
9. Validate the resulting itinerary against the same schema.
10. Return the itinerary with `generation.mode = "deterministic_fallback"`.

If no feasible plan can be created:
- Show a clear message that there is not enough verified destination data for the current preferences.
- Offer actions such as broadening interests, changing the origin/duration, or exploring destinations manually.
- Do not create fake destinations or invented schedules merely to fill the screen.

---

# 12. Itinerary Results Screen

## 12.1 Purpose

The results screen is the main value-delivery point. It must make the plan understandable, editable, and transparent.

## 12.2 Recommended Layout

Desktop:
- Header with trip title, summary, language, and actions.
- Tabs or segmented navigation: **Overview**, **Day-by-day**, **Map**, **Budget**.
- Main content panel.
- Optional side panel for warnings, route summary, or save action.

Mobile:
- Compact trip header.
- Horizontally scrollable or wrapped tabs.
- Day cards stacked vertically.
- Map opened as a dedicated view or expandable section.
- Budget summary available without excessive scrolling.

## 12.3 Overview Tab

Display:
- Trip duration and date range.
- Origin and broad route summary.
- Number of planned stops.
- Interest summary.
- Budget range and status.
- Generation mode notice when fallback is used.
- Important warnings.
- Data verification note.
- Primary actions: Edit, Regenerate, Save, Print/Export if supported.

## 12.4 Day-by-Day Tab

Each day card should show:
- Day number and date.
- Day title or theme.
- Ordered stops.
- Estimated visit duration only when supported or clearly labelled.
- Travel leg between stops.
- Meal/rest suggestions only when relevant and not presented as verified venue availability.
- Approximate cost per stop where data exists.
- Access/price/opening-hour caveats.
- Map focus action.
- Edit/remove/replace controls.

Do not show invented exact arrival times. If the system uses suggested time blocks, label them as a proposed schedule and allow editing.

## 12.5 Map Tab

Show:
- Origin marker if available.
- Destination markers numbered in itinerary order.
- Day filters.
- Route lines only when valid route geometry is available.
- Legend distinguishing actual route geometry from approximate connector lines.
- Destination popup with name, day/stop number, and detail link.
- Attribution for the map provider and underlying data.

If the map fails:
- Show a map-unavailable message.
- Keep the destination list and travel sequence available.
- Do not block itinerary editing.

## 12.6 Budget Tab

Show:
- Whole-trip total range.
- Per-person estimate if applicable.
- Category breakdown.
- Included/excluded categories.
- Unknown or unverified costs.
- Budget-overrun warning when appropriate.
- Status badge: verified/estimated/user-provided/partial/unknown.
- Assumptions used by the calculator.

Budget totals must be recalculated by backend logic and should reconcile with the visible line items.

## 12.7 Sources and Verification

Include a disclosure area for:
- Destination source records.
- Last checked dates where available.
- Cost verification status.
- Access and opening-hour uncertainty.
- Routing provider and approximate status where relevant.

The UI need not overwhelm users with technical source details on every card; use concise labels and expandable source information.

---

# 13. Itinerary Editing Flow

## 13.1 User Actions

Depending on MVP scope, allow:
- Remove a stop.
- Reorder stops.
- Replace a stop.
- Add a destination from the catalogue.
- Change the pace.
- Change trip dates/duration.
- Adjust budget.
- Regenerate all or part of the plan.

## 13.2 Editing Rules

- Distinguish user edits from AI-generated content.
- Recalculate budget after every relevant edit.
- Recalculate route legs after stop order or destination changes.
- Mark route details unavailable if recalculation fails.
- Revalidate daily stop count and travel feasibility.
- Preserve user edits during unrelated UI changes.
- Warn before an operation that discards changes.
- Do not silently reintroduce a removed stop on regeneration unless the user explicitly asks for a full reset.

## 13.3 Regeneration Options

Recommended options:
- **Regenerate entire trip**
- **Regenerate this day**
- **Find alternatives for this stop**
- **Make the trip more relaxed**
- **Reduce estimated cost**
- **Add more nature/heritage/offbeat places**

Each action should send explicit structured parameters. Do not rely on vague hidden conversation state alone.

## 13.4 Unsaved Changes

If the user edits an itinerary:
- Track dirty state.
- Offer Save/Discard where persistence exists.
- If anonymous, retain edits in session/local state as appropriate and disclose limitations.
- Warn if refreshing or leaving will lose unsaved edits.

---

# 14. Budget Interaction Flow

1. The backend returns a range and line items.
2. The UI shows the total range and status.
3. User opens Budget tab.
4. User reviews included categories and assumptions.
5. User changes budget scope or accommodation inclusion.
6. Frontend sends the updated preference.
7. Backend recalculates totals.
8. UI shows the updated range and whether the requested budget appears feasible.
9. If major costs are unknown, display a visible incomplete-estimate warning.
10. If the estimate exceeds the budget, offer actions such as changing transport, duration, or accommodation preferences.

Never present the output as a guaranteed quote. Actual prices may change.

---

# 15. Save Trip and Authentication Flow

## 15.1 Anonymous Planning

Default recommended behaviour:
- User can explore destinations and generate a trip without creating an account.
- Save action explains why an account is required, if authentication is enabled.
- The app should not discard the current itinerary before the user chooses whether to sign in.

## 15.2 Save Action

When the user selects Save:
1. If authenticated, call the save endpoint.
2. If unauthenticated, open a sign-in/create-account modal or page.
3. Explain the benefit: reopen and manage saved itineraries.
4. Preserve the in-progress itinerary through the authentication redirect.
5. After successful sign-in, ask for confirmation if necessary and save the intended trip.
6. Show success state and link to Saved Trips.
7. If save fails, keep the itinerary in view and offer retry.

## 15.3 Saved Trips Screen

Display:
- Trip title.
- Origin and dates.
- Creation/last-updated date.
- Duration.
- Optional budget range.
- Open trip action.
- Rename, duplicate, or delete actions if supported.

Empty state:
- Explain that saved trips will appear here.
- Provide a “Plan a Trip” CTA.

## 15.4 Delete Trip

1. User selects Delete.
2. Show confirmation.
3. Explain that deletion removes the saved trip from the account.
4. Call the backend delete endpoint.
5. Enforce ownership server-side.
6. Update the list only after success or a clearly handled optimistic update.
7. If the request fails, retain the trip and show retry.

## 15.5 Session Expiry

If a session expires:
- Preserve safe local UI state.
- Ask the user to sign in again for protected actions.
- Do not expose private saved-trip data.
- Return to the intended page after authentication if supported.

---

# 16. Share, Export, and Print Flow

These features are optional unless selected for MVP.

## 16.1 Print-Friendly View

A basic print view can be implemented without a PDF provider:
- Hide navigation and controls.
- Show trip summary, days, stops, warnings, and budget.
- Preserve source/verification notes.
- Ensure readable page breaks.

## 16.2 PDF Export

If implemented:
1. User selects Export PDF.
2. Backend or a trusted client renderer generates a snapshot.
3. Include generation date and estimate disclaimer.
4. Include map attribution and required source attributions.
5. Do not include private account details unless necessary.
6. Return a download only after generation succeeds.
7. If export fails, keep the itinerary and offer print/retry.

## 16.3 Sharing

If sharing is implemented:
- Sharing must be an explicit user action.
- Use a revocable, unguessable share token.
- Show exactly what data is visible to recipients.
- Allow the owner to revoke access.
- Do not expose a trip merely because its ID is known.
- Private-by-default is the baseline.

---

# 17. Error and Empty-State Flows

## 17.1 No Destination Matches

Message intent: “We couldn’t find enough destinations matching these preferences.”

Actions:
- Broaden interests.
- Increase trip duration.
- Change origin.
- Explore the catalogue.
- Remove optional constraints.

## 17.2 AI Providers Unavailable

If fallback succeeds:
- Show the itinerary.
- Explain that it was built from available curated data.
- Highlight unverified or missing details.

If fallback fails:
- Explain that a plan could not be generated right now.
- Keep the user’s form values.
- Offer retry or manual exploration.
- Avoid technical provider error text.

## 17.3 Invalid AI Output

- Do not render malformed output.
- Attempt configured bounded repair or use another valid provider result.
- Fall back if feasible.
- Otherwise show a recoverable error.

## 17.4 Routing Unavailable

- Keep itinerary content visible.
- Mark route distances/durations unavailable or approximate.
- Keep stop order visible.
- Provide a retry option if appropriate.

## 17.5 Translation Unavailable

- Keep content visible in its available language.
- Mark incomplete translations.
- Offer retry or regeneration.
- Preserve factual caveats and source references.

## 17.6 Database Unavailable

- Show a general service error.
- Do not expose database internals.
- Use cached public content only if the cache is safe and permitted.
- Do not allow protected writes to proceed without confirmation of success.

## 17.7 Authentication Error

- Keep public browsing available if possible.
- Explain when sign-in is required.
- Provide retry and sign-in actions.
- Never treat a failed auth check as permission to continue.

## 17.8 General Error Component

Every recoverable error should include:
- A short human-readable explanation.
- A retry action when retry is meaningful.
- A safe way to return or change input.
- A request/reference ID only when helpful for support.
- No stack trace, API key, raw provider response, or internal prompt.

---

# 18. Notifications and Feedback

## 18.1 Toasts

Use concise notifications for:
- Language changed.
- Trip saved.
- Trip deleted.
- Preferences updated.
- Destination added/removed.
- Changes saved.
- Export ready or failed.

Do not use a transient toast as the only way to communicate a critical error or safety/access warning.

## 18.2 Feedback Flow

Optional feedback action:
1. User selects “Send feedback.”
2. User chooses category (data issue, itinerary quality, translation, technical problem, other).
3. User enters a short message.
4. App warns not to include sensitive information.
5. Backend validates and stores/submits feedback under the retention policy.
6. Show confirmation.

Feedback must not automatically publish user text or include private itineraries without consent.

---

# 19. User Data and Privacy Flow

## 19.1 Data Minimisation

Collect only:
- Trip origin at the granularity required.
- Date/duration.
- Group counts if used.
- Budget and scope.
- Transport mode.
- Interests and constraints.
- Language preference.
- Saved trip data when the user requests persistence.

## 19.2 Location Permission

- Do not request browser location permission at app startup.
- If “Use my current location” is offered, explain why.
- Provide manual origin entry as an alternative.
- Request permission only after the user selects the location action.
- If denied, continue with manual entry.
- Do not store exact location by default.

## 19.3 External AI Processing Notice

Before production release, explain in the privacy notice that relevant trip preferences may be processed by configured external AI providers to generate the itinerary. Do not send account email, user identity, or unnecessary personal information in the prompt.

## 19.4 Delete Account/Data

If account functionality is provided:
- Offer an account deletion request path.
- Explain what saved trips and profile information will be deleted.
- Delete or anonymise user-owned data according to the defined policy.
- Retain legally/operationally required records only when justified and disclosed.
- Do not claim deletion is complete until the backend confirms it.

---

# 20. Suggested Navigation and Route Map

| Path | Screen | Primary action | Authentication |
|---|---|---|---|
| `/` | Home | Plan or Explore | No |
| `/destinations` | Explorer | Search/filter | No |
| `/destinations/:destinationId` | Destination details | Plan around destination | No |
| `/plan` | Trip preferences | Generate itinerary | No |
| `/itinerary/:tripId` | Itinerary result | Edit, save, map, budget | Depends on whether it is private/persisted |
| `/saved-trips` | Saved trips | Open/manage trips | Yes |
| `/login` | Sign in | Authenticate | No |
| `/signup` | Create account | Register | No |
| `/settings` | Preferences | Language and defaults | No; account settings may require auth |
| `/privacy` | Privacy notice | Review data policy | No |
| `/terms` | Terms | Review use terms | No |
| `*` | Not found | Return home | No |

Routes are illustrative and can be adjusted to match the existing implementation.

---

# 21. Key State Model

## 21.1 Trip Draft State

A draft can use the following logical states:

- `empty`
- `editing`
- `ready_to_generate`
- `generating`
- `generation_failed`
- `generated`
- `editing_itinerary`
- `saving`
- `saved`
- `dirty`
- `deleted`

Not every state must be stored in the database. UI-only states should remain client-side unless they represent a durable workflow.

## 21.2 Itinerary Generation State

- `idle`
- `validating`
- `retrieving_destinations`
- `generating_candidates`
- `validating_candidates`
- `building_routes_and_budget`
- `checking_language`
- `success_ai_reconciled`
- `success_single_provider`
- `success_fallback`
- `success_partial`
- `failed_recoverable`
- `cancelled`

The UI should not assume all internal stages are available from the backend. Use actual status events if implemented; otherwise show a generic loading state.

## 21.3 Save State

- `not_saved`
- `sign_in_required`
- `saving`
- `saved`
- `save_failed`
- `deleting`
- `delete_failed`

State transitions must be tested, particularly around network failures and repeated clicks.

---

# 22. End-to-End Sequence Diagrams

## 22.1 Standard Itinerary Generation

```text
User       Frontend       FastAPI       Destination DB       AI Providers
 |             |              |                |                  |
 |--Generate-->|              |                |                  |
 |             |--POST------->|                |                  |
 |             |              |--query-------->|                  |
 |             |              |<--candidates---|                  |
 |             |              |--generate------------------------>|
 |             |              |<--candidate responses-------------|
 |             |              |--validate/reconcile               |
 |             |              |--budget/route/translation services |
 |             |<--itinerary--|                                   |
 |<--render----|              |                                   |
```

## 22.2 One AI Provider Fails

```text
FastAPI -> Groq: request candidate
FastAPI -> Gemini: request candidate
Groq -> FastAPI: timeout/error
Gemini -> FastAPI: valid candidate
FastAPI: validate candidate, compute budget, attach warnings
FastAPI -> Frontend: itinerary with single-provider mode
Frontend: render itinerary and continue normally
```

## 22.3 Both AI Providers Fail

```text
FastAPI -> Groq: request candidate -> failure
FastAPI -> Gemini: request candidate -> failure
FastAPI -> Destination Service: retrieve eligible curated records
FastAPI: run deterministic selection and feasibility rules
   |
   +--> Feasible plan -> validate -> return fallback itinerary + notice
   |
   +--> No feasible plan -> return recoverable error + preserve user form
```

## 22.4 Save Trip

```text
User -> Frontend: Save
Frontend -> Auth: check session
   |
   +--> No session -> sign-in flow, preserve itinerary draft
   |
   +--> Session exists -> POST save request
Backend -> Database: verify identity/ownership and persist snapshot
Database -> Backend: success
Backend -> Frontend: saved trip ID
Frontend -> User: confirmation and link to Saved Trips
```

---

# 23. UX Content and Status Labels

Use clear, consistent language across the app.

## 23.1 Recommended Labels

- **Verified**: checked against an identified source under the product’s verification process.
- **Estimated**: calculated or approximated, not a guaranteed quote.
- **Not verified**: source or recency is insufficient to claim current accuracy.
- **Unknown**: no reliable value is available.
- **Seasonal access**: access may depend on season or current conditions; verify before travel.
- **Route unavailable**: no reliable route estimate is currently available.
- **AI-generated suggestion**: itinerary content is a recommendation and may require confirmation.
- **Built from curated data**: deterministic fallback mode was used.

Do not use “verified” unless the source and review process justify it.

## 23.2 Warnings

Warnings should be:
- Specific.
- Actionable.
- Near the affected field or stop.
- Available in English and Kannada.
- Persistent enough that users can read them.
- Non-alarmist and not falsely reassuring.

Examples of warning categories:
- Price may have changed.
- Opening hours not verified.
- Access status unknown.
- Route estimate unavailable.
- Some trip costs are missing.
- Translation needs review.
- Itinerary may be too packed for the selected pace.

---

# 24. Analytics and Product Events

Analytics are optional and must follow the privacy policy and applicable consent requirements. Do not send precise origins, raw prompts, or saved itinerary text to analytics by default.

Possible events:
- `home_viewed`
- `language_changed`
- `destination_search_submitted`
- `destination_detail_opened`
- `trip_form_started`
- `trip_form_completed`
- `itinerary_generation_started`
- `itinerary_generation_succeeded`
- `itinerary_generation_fallback_used`
- `itinerary_generation_failed`
- `itinerary_edited`
- `budget_tab_opened`
- `map_tab_opened`
- `trip_save_started`
- `trip_saved`
- `trip_deleted`
- `feedback_submitted`

Use aggregated or pseudonymous event data. Establish retention, access, and opt-out policy before enabling analytics in production.

---

# 25. Accessibility and Mobile Flow

## 25.1 Mobile Requirements

- Keep primary CTA visible without forcing long scrolling where possible.
- Use touch targets with sufficient size and spacing.
- Make filters usable in a drawer or expandable panel.
- Keep map and list views switchable.
- Avoid horizontal overflow in Kannada.
- Keep budget labels and currency visible.
- Provide a readable itinerary without requiring map interaction.
- Preserve form state when opening a filter or destination detail overlay.

## 25.2 Accessibility Requirements

- Every input has an accessible label.
- Validation errors are associated with fields.
- Focus moves predictably after navigation and modal open/close.
- Status updates are announced appropriately to assistive technology.
- Do not communicate status only through colour or map-marker shape.
- Respect reduced motion.
- Modal dialogs trap focus appropriately and return focus when closed.
- Ensure the application is usable at browser zoom.
- Test both English and Kannada layouts with keyboard and screen reader support where feasible.

---

# 26. Recommended Screen Inventory

| ID | Screen | MVP | Main states |
|---|---|---|---|
| S-01 | Home | Yes | Default, destination loading error |
| S-02 | Destination explorer | Yes | Loading, results, empty, error |
| S-03 | Destination details | Yes | Full, partial data, not found |
| S-04 | Trip planner form | Yes | Editing, validation error, review |
| S-05 | Generation loading | Yes | In progress, cancelled |
| S-06 | Itinerary overview | Yes | AI, single provider, fallback, partial |
| S-07 | Day-by-day itinerary | Yes | Normal, warning, edit state |
| S-08 | Itinerary map | Yes if maps selected for MVP | Loaded, unavailable, no coordinates |
| S-09 | Budget breakdown | Yes | Estimated, partial, over budget |
| S-10 | Save/sign-in prompt | If saving requires auth | Sign-in required, success, failure |
| S-11 | Saved trips | If persistence enabled | List, empty, loading, error |
| S-12 | Settings/language | Yes | Current language, changed language |
| S-13 | Privacy notice | Before production | Static content |
| S-14 | Not-found | Yes | Unknown route |
| S-15 | General error state | Yes | Recoverable, non-recoverable |
| S-16 | Print/export view | Optional | Ready, generating, failed |
| S-17 | Feedback form | Optional | Editing, submitted, failed |

---

# 27. Flow-to-API Mapping

| User action | Frontend operation | Backend/API |
|---|---|---|
| Open home | Load public summaries/config if needed | `GET /api/v1/health` and/or public summary endpoint |
| Search destinations | Debounced query | `GET /api/v1/destinations` |
| Open destination | Fetch detail | `GET /api/v1/destinations/{id}` |
| Start plan | Initialise draft locally | No API call required |
| Resolve origin | Provider-backed lookup | Configured geocoding endpoint/service |
| Generate itinerary | Submit validated preferences | `POST /api/v1/itineraries/generate` |
| Open generated trip | Fetch snapshot if persisted | `GET /api/v1/itineraries/{trip_id}` |
| Recalculate budget | Submit changed budget/preferences | Budget endpoint or itinerary update operation |
| Re-route after edit | Request route update | Configured routing service via backend |
| Save trip | Save snapshot | `POST /api/v1/trips` |
| List saved trips | Fetch owner’s trips | `GET /api/v1/trips` |
| Update saved trip | Save edits | `PATCH /api/v1/trips/{trip_id}` |
| Delete saved trip | Delete with confirmation | `DELETE /api/v1/trips/{trip_id}` |
| Change language | Update local preference; optionally request translation repair | Internal/backend translation operation where required |
| Export trip | Generate print/PDF output | Export endpoint if implemented |
| Submit feedback | Validate and submit | Feedback endpoint if implemented |

The API surface must be aligned with the actual TRD and OpenAPI schema. Do not create endpoints merely because they appear in this table if the associated feature is out of scope.

---

# 28. Testing the Complete App Flow

## 28.1 Critical User Journeys

### Journey A — Standard plan
1. Open home.
2. Start planning.
3. Enter valid preferences.
4. Review and generate.
5. Receive valid itinerary.
6. Inspect day-by-day plan.
7. Open map.
8. Review budget.
9. Edit a stop.
10. Confirm budget/route information updates.

### Journey B — Kannada flow
1. Open home.
2. Switch to Kannada.
3. Explore destinations.
4. Start planning.
5. Generate itinerary in Kannada.
6. Check validation/error messages.
7. Confirm IDs, dates, amounts, and coordinates remain intact.

### Journey C — Provider fallback
1. Submit valid preferences.
2. Simulate Groq failure.
3. Verify valid Gemini result is used.
4. Simulate both provider failures.
5. Verify deterministic fallback is returned if feasible.
6. Verify fallback banner and warnings appear.
7. Verify no invented destination IDs appear.

### Journey D — No feasible plan
1. Submit restrictive preferences.
2. Return no eligible curated destinations.
3. Verify the app preserves the form.
4. Verify suggestions to broaden preferences are displayed.
5. Verify no fabricated itinerary is rendered.

### Journey E — Save trip
1. Generate an itinerary anonymously.
2. Select Save.
3. Sign in.
4. Return to the intended itinerary.
5. Save successfully.
6. Reopen from Saved Trips.
7. Attempt cross-user access in security tests and verify denial.

### Journey F — Routing failure
1. Generate a valid itinerary.
2. Simulate routing provider failure.
3. Verify day-by-day plan remains available.
4. Verify route fields are marked unavailable/approximate.
5. Verify the UI does not label straight-line distance as driving distance.

### Journey G — Partial destination data
1. Open a destination with unknown costs or hours.
2. Verify the app shows unknown/not-verified status.
3. Verify it does not display fabricated values.
4. Verify source information remains available.

## 28.2 Test Environments

- Unit tests use local fixtures.
- Integration tests use a test database and mocked provider responses.
- E2E tests use deterministic fixtures or a dedicated test mode.
- Live provider smoke tests, if used, must be isolated from normal CI and cost-limited.
- Never run destructive tests against production.

---

# 29. MVP Versus Later Releases

## 29.1 MVP — Required Core

- Home screen.
- Destination explorer and detail page.
- English/Kannada interface.
- Trip preference form.
- AI itinerary generation through backend.
- Groq/Gemini failure handling.
- Schema validation and deterministic fallback.
- Itinerary overview and day-by-day display.
- Budget estimates with status and caveats.
- Map and route display if routing is selected as an MVP requirement.
- Source and verification indicators.
- Responsive design and accessible errors.
- Core automated tests and deployment.

## 29.2 Strongly Recommended

- Anonymous planning.
- Save trips after sign-in.
- Editable stops.
- Destination filtering by district/category/interests.
- Clear fallback mode indicator.
- Provider cost and failure monitoring.

## 29.3 Post-MVP

- PDF export.
- Shareable itineraries.
- Weather and event information.
- Live transport integration.
- Booking integrations.
- More Indian languages.
- Offline saved itinerary.
- User reviews and community contributions.
- Collaborative trip planning.
- Personalised recommendations based on explicit user feedback.

Each later feature needs its own data-source, privacy, reliability, and acceptance review.

---

# 30. Implementation Order for Google Antigravity

Use this order to reduce rework:

1. **Audit the existing repository.** Map current pages, components, routes, APIs, tests, environment variables, and unfinished work.
2. **Create the route and screen skeleton.** Add the app shell, navigation, language switcher, and page states.
3. **Build the destination data model and explorer.** Use clearly labelled fixture data until the curated catalogue is ready.
4. **Build the trip form.** Add client and server schemas; preserve draft state.
5. **Build the itinerary results UI with fixture data.** Ensure overview, days, map placeholder, budget, warnings, and source disclosure are represented.
6. **Implement the backend generation contract.** Use mocked provider adapters first.
7. **Implement Groq and Gemini adapters.** Verify current model IDs and SDK configuration from official docs.
8. **Implement validation, candidate selection, and deterministic fallback.**
9. **Implement budget calculations.** Add arithmetic and unknown-cost tests.
10. **Integrate route/geocoding and map services.** Confirm terms and attribution.
11. **Add Kannada quality and optional translation repair.**
12. **Add authentication and saved trips only according to the selected MVP scope.**
13. **Add security, accessibility, and E2E tests.**
14. **Deploy staging and test real integrations.**
15. **Run the release checklist and document known limitations.**

Do not implement all phases in one giant code-generation operation. Each phase should end with actual test output and a list of known limitations.

---

# 31. Antigravity Prompt for Building the App Flow

> You are the senior product-minded full-stack engineer implementing **Namma Karnataka**, an AI-powered Karnataka travel planner. Read the PRD, TRD, and `Namma_Karnataka_App_Flow.md` before making changes.
>
> Begin by auditing the existing repository. Identify implemented routes, pages, components, API endpoints, database models, tests, and environment variables. Reuse working code and do not perform destructive rewrites without justification.
>
> Implement the app flow incrementally:
> 1. App shell and navigation.
> 2. English/Kannada language switching.
> 3. Destination explorer and destination details.
> 4. Trip preferences form with validation and review.
> 5. Generation loading and error states.
> 6. Itinerary overview, day-by-day plan, map, budget, and source disclosures.
> 7. Groq/Gemini orchestration through the backend, schema validation, and deterministic fallback.
> 8. Editing and recalculation flows.
> 9. Optional save/auth flow only if included in the chosen MVP scope.
>
> **Non-negotiable rules:**
> - Keep provider secrets on the server.
> - Do not fabricate destination facts, prices, hours, route durations, or access conditions.
> - Validate every AI-generated itinerary and every destination ID.
> - Use deterministic backend logic for budget totals.
> - If one AI provider fails, use the other valid response; if both fail, attempt a conservative deterministic fallback.
> - If the catalogue cannot support a feasible plan, show a clear recoverable error and preserve the user's form values.
> - Map or translation failures must not unnecessarily block the itinerary.
> - Preserve IDs, dates, coordinates, amounts, currency codes, and schema keys when translating.
> - Make every key screen responsive and keyboard usable.
> - Include loading, empty, error, partial-data, and fallback states.
> - Do not claim a feature, integration, or test is complete unless it has actually been implemented and verified.
>
> For each phase: list files to change before editing; implement only that phase; run relevant lint, type, test, and build commands; report actual results; list changed files and remaining gaps; update the checklist. Start with the repository audit and do not skip ahead.

---

# 32. Final End-to-End Flow Summary

The intended Namma Karnataka experience is:

1. The user opens the home page and chooses English or Kannada.
2. They explore destinations or start planning immediately.
3. They enter origin, timing, group size, budget, transport, interests, pace, and optional constraints.
4. They review their preferences and submit the request.
5. The backend retrieves curated destination records and generates candidate itineraries through the configured AI providers.
6. It validates candidates and selects a feasible result; if both providers fail, it attempts deterministic fallback.
7. The backend calculates budget totals and attaches route, source, verification, and uncertainty metadata.
8. The user receives an itinerary with overview, day-by-day plan, map, and budget.
9. The user reviews caveats, edits stops, replaces destinations, or regenerates all/part of the plan.
10. The user can save the itinerary if account persistence is enabled.
11. If any optional service fails, the app preserves the useful parts of the trip and clearly explains what is unavailable.
12. The user leaves with a practical, editable plan—not an unqualified promise that every detail is current or guaranteed.

The app is successful when users can move confidently from **“Where should I go in Karnataka?”** to **“Here is a practical plan I understand, can adjust, and know how to verify.”**
