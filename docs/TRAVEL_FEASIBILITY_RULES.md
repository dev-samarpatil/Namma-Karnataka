# Travel Feasibility Rules & Temporal Scheduling

## 1. Overview
The Travel Feasibility engine governs the temporal constraints, driving fatigue rules, meal window allocations, and operating hour verifications within Namma Karnataka. An itinerary must be physically executable by a human traveler in real Karnataka road conditions.

---

## 2. Daily Travel Time & Distance Feasibility Thresholds

| Metric | Target Window | Caution / Review | Fatigue Warning Escalation |
|---|---|---|---|
| **Daily Driving Time** | $\le 180\text{ minutes}$ (3 hours) | $180 - 240\text{ minutes}$ | $> 240\text{ minutes}$ (4 hours) |
| **Individual Leg Duration** | $\le 120\text{ minutes}$ (2 hours) | $120 - 180\text{ minutes}$ | $> 180\text{ minutes}$ |
| **Daily Sightseeing Stops** | 3 to 4 major attractions | 5 stops | $\ge 6\text{ stops}$ (overloaded) |
| **Daylight Sightseeing Window** | 08:30 – 18:30 IST | — | Pre-dawn or late night drives flagged |
| **Lunch Break Window** | 12:30 – 14:30 IST | — | Mandatory $\ge 45\text{ min}$ window |
| **Dinner Break Window** | 19:30 – 21:30 IST | — | Mandatory $\ge 45\text{ min}$ window |

### Fatigue Warning Format
When total calculated daily driving exceeds 240 minutes (4 hours), an explicit bilingual warning is attached to the `DayPlan.warnings` list:
- **English:** `"High daily driving time (~4.5h / ~240km). Consider pacing or splitting across days."`
- **Kannada:** `"ಹೆಚ್ಚಿನ ದೈನಂದಿನ ಚಾಲನಾ ಸಮಯ (~4.5h / ~240km). ದಿನಗಳ ನಡುವೆ ವಿಭಜಿಸಲು ಪರಿಗಣಿಸಿ."`

---

## 3. Leg-by-Leg Temporal Propagation
For any stop sequence $[S_0, S_1, \dots, S_n]$:
$$\text{Arrival Time}(S_i) = \text{Departure Time}(S_{i-1}) + \text{Transit Duration}(S_{i-1} \to S_i) + \text{Buffer Time}$$
$$\text{Departure Time}(S_i) = \max(\text{Arrival Time}(S_i), \text{Opening Time}(S_i)) + \text{Visit Duration}(S_i)$$

Where:
- **Transit Duration:** Computed via configured road routing provider (or high-fidelity regional road network fallback: $d_{\text{road}} = 1.35 \times d_{\text{haversine}}$, speed $50\text{ km/h}$).
- **Buffer Time:** 15 minutes added between inter-city attractions for parking, ticketing, and walking access.
- **Visit Duration:** Grounded in curated destination metadata (e.g. 180 min for Mysuru Palace, 60 min for Chamundi Hill viewpoint).

---

## 4. Operational & Daylight Constraints
1. **Operating Hours:** Destinations with known operating hours (e.g., 10:00 to 17:30) are checked. If arrival is within 30 minutes of closing, a schedule conflict warning is triggered.
2. **Weekly Closures:** Known weekly closure days (e.g., specific museums on Mondays) prevent scheduling on that calendar day.
3. **Daylight Limits:** Forest sanctuaries and ghat roads (e.g., Bandipur, Nagarhole, Charmadi/Agumbe Ghats) have strictly enforced forest department night curfews (typically 18:00 or 21:00 to 06:00). Itineraries avoid scheduling travel across protected forest gates during curfew hours.

---

## 5. Return Trip Handling
- When `is_return_trip=True`, the itinerary reserves time and distance on Day $N$ to return to the original departure hub (e.g., Bengaluru).
- A final `StopType.TRANSPORT` is appended to Day $N$ with:
  - `start_time`: After dinner or the final sightseeing stop.
  - `duration_minutes`: Estimated return road transit time.
  - `distance_from_prev_km`: Road distance back to origin.
  - `cost_status`: Included in the authoritative transportation budget.
