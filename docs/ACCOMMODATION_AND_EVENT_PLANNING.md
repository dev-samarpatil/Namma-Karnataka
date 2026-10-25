# Accommodation and Event Planning Architecture

## 1. Overview
Multi-day trips require two core physical anchors:
1. **Overnight Accommodation:** Practical lodging located near the end of Day $d$ that establishes the next day's physical departure point.
2. **Authentic Cultural Events & Festivals:** Grounded Karnataka cultural events, festivals, and exhibitions sourced from verified state tourism authorities.

---

## 2. Overnight Accommodation Continuity
### 2.1 Placement Strategy
- The overnight stay for Day $d$ is anchored to the cluster hub or the final sightseeing destination of Day $d$.
- A `StopType.ACCOMMODATION` stop is inserted at approximately 20:30–21:30 IST.
- If verified hotel listings are available from `PlacesService`, the nearest verified property matching the traveler's budget profile (`budget`, `standard`, `comfort`) is attached.
- If no verified listing is present, an honest regional accommodation placeholder is used:
  - Format: `Overnight Stay in {District / Hub Name}`
  - Price: Grounded in regional averages (₹1,500 budget, ₹3,500 standard, ₹6,500 comfort per room/night).

### 2.2 Next-Day Geographic Continuity
- In previous versions, Day $d+1$ arbitrarily reset origin to Bengaluru.
- Under Phase 10+, Day $d+1$ adopts the exact GPS coordinates and label of the Day $d$ accommodation as its origin.
- The first leg of Day $d+1$ measures the true distance from the hotel to Day $d+1$'s first attraction.

---

## 3. Cultural Events & Festivals Integration
### 3.1 Provenance & Data Hierarchy
All events in `data/seed/events.json` originate from authoritative primary sources:
1. Karnataka Tourism Development Corporation (KSTDC) & Department of Tourism.
2. District Administration official festival bulletins (e.g. Mysuru Dasara Executive Committee, Vijayanagara District Administration for Hampi Utsav).
3. Official Temple Management Committees (e.g. Melukote Vairamudi Brahmotsava).
4. Traditional cultural bodies (e.g. District Kambala Samiti).

### 3.2 Curated Event Catalogue (Examples)
| Event ID | Name (EN / KN) | District | Typical Window | Status | Ticket Cost |
|---|---|---|---|---|---|
| `event-mysuru-dasara` | Mysuru Dasara (ಮೈಸೂರು ದಸರಾ) | Mysuru | Ashvina / Oct (10 days) | `confirmed_annual` | ₹0 – ₹500 |
| `event-hampi-utsav` | Hampi Utsav (ಹಂಪಿ ಉತ್ಸವ) | Vijayanagara | November | `confirmed_annual` | Free entry |
| `event-kambala-coastal` | Coastal Karnataka Kambala (ಕರಾವಳಿ ಕಂಬಳ) | Dakshina Kannada / Udupi | Nov – March | `confirmed_annual` | Free / Reserved |
| `event-pattadakal-dance` | Pattadakal Dance Festival (ಪಟ್ಟದಕಲ್ಲು ನೃತ್ಯೋತ್ಸವ) | Bagalkote | January | `confirmed_annual` | Free entry |
| `event-bengaluru-karaga` | Bengaluru Karaga Shaktyotsava (ಬೆಂಗಳೂರು ಕರಗ) | Bengaluru Urban | Chaitra Purnima (March/April) | `confirmed_annual` | Free entry |
| `event-chalukya-utsav` | Chalukya Utsav (ಚಾಲುಕ್ಯ ಉತ್ಸವ) | Bagalkote | February | `confirmed_annual` | Free entry |
| `event-karavali-utsav` | Karavali Utsav (ಕರಾವಳಿ ಉತ್ಸವ) | Dakshina Kannada | Dec – Jan | `confirmed_annual` | Free entry |

### 3.3 Date Matching & Uncertainty Disclosure
- **Confirmed Travel Dates:** If the user specifies travel dates, the `EventsService` filters events whose `start_datetime` and `end_datetime` overlap the trip window.
- **Unconfirmed / Seasonal Dates:** Many traditional Hindu lunar festivals (Karaga, Vairamudi, Dasara) change Gregorian calendar dates each year. When exact dates for the travel year are unconfirmed, the record is flagged as `recurring_approximate` with an explicit advisory.
- **Detour & Schedule Feasibility:** An event stop (`StopType.EVENT`) is only scheduled if its venue is within 60 km of the current day's corridor circuit and visit duration fits within the daylight/evening window.
