# Location-Aware Festival & Event Intelligence Architecture Design

**System:** Namma Karnataka (ನಮ್ಮ ಕರ್ನಾಟಕ)  
**Document:** Festival & Event Intelligence Design  
**Date:** 2026-10-28  

---

## 1. Overview and Core Philosophy

Travellers visiting Karnataka during major cultural festivals (such as Mysuru Dasara, Hampi Utsav, Kambala Buffalo Races, or Vairamudi Brahmotsava) benefit enormously from knowing that culturally significant events coincide with their travel dates and route.

However, travel software often fails in one of two ways:
1. **Generic, Unfiltered Lists:** Dumping an arbitrary calendar of statewide holidays regardless of the traveller's location.
2. **Destructive Over-Optimization:** Forcing a festival as a mandatory itinerary stop, artificially distorting daily sight schedules, increasing transit by hours, or overwriting user-locked attractions.

**Namma Karnataka’s Approach:**
Festival intelligence provides **source-grounded, location-aware, and date-matched recommendations** displayed cleanly as an optional discovery section (`Festivals & Cultural Events Near Your Route` in itineraries and `[Festivals & Events]` in destination detail modals) without distorting the underlying itinerary feasibility.

---

## 2. Structured Data Model

The schema is implemented in `backend/app/schemas/events.py` and mirrored in `frontend/src/types/index.ts`:

```python
class EventStatus(str, Enum):
    CONFIRMED = "confirmed"
    TENTATIVE = "tentative"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class OccurrenceType(str, Enum):
    ANNUAL_SOLAR = "annual_solar"
    ANNUAL_LUNAR = "annual_lunar"
    ONE_TIME = "one_time"
    SEASONAL = "seasonal"

class EventRead(StrictSchema):
    event_id: str
    title_en: str
    title_kn: str | None
    event_type: str  # e.g., "heritage_festival", "folk_sports", "temple_festival"
    description_en: str
    description_kn: str | None
    district_code: str | None
    venue_name: str | None
    latitude: float | None
    longitude: float | None
    start_date: date
    end_date: date
    start_time: str | None
    end_time: str | None
    occurrence_type: OccurrenceType
    admission_cost_min_inr: float | None
    admission_cost_max_inr: float | None
    cost_status: CostStatus  # "verified", "estimated", "unknown"
    official_source_url: str | None
    source_name: str | None
    verified_at: datetime | None
    status: EventStatus
    travel_advisory_en: str | None
    travel_advisory_kn: str | None
```

### Truthful Admission Fees & Costs
- Missing admission fees are explicitly set to `cost_status: "unknown"` with `None` amounts.
- Missing ticket prices are **never** fabricated as "Free Admission".

---

## 3. Provider Abstraction & Data Pipeline

The service is orchestrated by `EventsService` (`backend/app/services/events.py`):

```text
[Official Karnataka Tourism / District Announcements]
                       |
                       v
         [Curated Seed: data/seed/events.json]
                       |
                       v
                 [EventsService]
      +----------------+----------------+
      |                                 |
      v                                 v
[Date Range Filtering]        [Proximity / Route Filtering]
(Asia/Kolkata timezone)        (Haversine Distance <= 75km)
      |                                 |
      +----------------+----------------+
                       |
                       v
        [Ranked Festival Recommendations]
                       |
        +--------------+--------------+
        |                             |
        v                             v
[DayPlan.recommended_events]   [DestinationModal Tab]
```

### Curated Seed Events
- **Mysuru Dasara (`mysuru-dasara`):** District `KA-MYS`, Mysuru Palace grounds, state festival with torchlight parade and grand procession.
- **Hampi Utsav (`hampi-utsav`):** District `KA-VJN`, Vijayanagara ruins, cultural performances and light illumination.
- **Kambala Buffalo Races (`kambala-coastal`):** District `KA-DK`, Dakshina Kannada coastal traditional paddy race.
- **Vairamudi Brahmotsava (`vairamudi-melukote`):** District `KA-MAN`, Mandya Cheluvanarayana Swamy temple night procession.
- **Pattadakal Dance Festival (`pattadakal-dance`):** District `KA-BGK`, Chalukya UNESCO monument background classical dance.

---

## 4. Date and Timezone Handling

- **Timezone Anchor:** All date and time evaluations use `Asia/Kolkata` (UTC+05:30).
- **Date Matching Rule:** An event is eligible if and only if:
  $$\text{event.start\_date} \le \text{trip\_date} \le \text{event.end\_date}$$
- Events occurring before or after the trip dates are strictly excluded from the recommendation set.

---

## 5. Proximity Matching & Route Awareness

Events are ranked and filtered based on the traveller’s actual route stops for each day:
1. **District Match:** If the day's destinations or overnight stay reside in the event's `district_code`.
2. **Geographical Distance:** Haversine distance from the day's stops to the event's `(latitude, longitude)`.
   - Stops within $\le 50\text{ km}$ receive high relevance.
   - Stops within $50\text{--}75\text{ km}$ receive moderate relevance with an estimated detour note.
   - Events $> 75\text{ km}$ away from that day's itinerary are excluded from that specific day's recommendations to prevent infeasible detours.

---

## 6. Non-Destructive Itinerary Integration

Prior to this fix, the scheduler previously injected an `ItineraryStop` of type `StopType.EVENT` into `day_stops`, which artificially forced 90 minutes of stop duration plus extra transit time into the day's sightseeing schedule.

**Corrected Architecture:**
1. Sightseeing destinations, meals, transit buffers, and overnight stays are computed deterministically.
2. The scheduler queries `EventsService` for matching events on that day's date and route.
3. Coinciding events are placed into `day_plan.recommended_events: list[EventRead]`.
4. Across the entire trip, all unique matching events are gathered into `planning_response.recommended_festivals: list[EventRead]`.
5. In the UI, `<FestivalRecommendations />` renders these as high-visibility cards above or below the schedule with badges, dates, venues, admission info, and an optional button to inspect official source details or manually add the event.
6. Locked stops, accommodation locations, and daily time limits are 100% preserved.

---

## 7. Destination Detail Modal Integration

In `DestinationModal.tsx`, a dedicated tab **`[Festivals & Events]`** allows visitors exploring any destination to see cultural celebrations historically or geographically tied to that destination's district (e.g. Dasara when viewing Mysuru Palace, or Hampi Utsav when viewing Virupaksha Temple). If no events exist for that district, a polite empty state is displayed:
> *"No upcoming confirmed cultural events for this district. Check local administration announcements closer to your travel dates."*

---

## 8. Resilience & Privacy Guarantees

1. **Provider Isolation:** If the events data store is unreachable or empty, itinerary generation proceeds normally without error.
2. **Zero PII Exposure:** Event recommendations only consume date ranges and geographic coordinates; traveller identity, email, or credentials are never transmitted.
3. **Bilingual Support:** Every event title, description, venue, and travel advisory is localized in both English (`en`) and Kannada (`kn`).
