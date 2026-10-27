import requests

url = "http://127.0.0.1:8000/api/v1/planning/recommendations"
payload = {
    "origin_label": "Bengaluru",
    "duration_days": 4,
    "categories": ["heritage", "nature"],
    "pace": "balanced",
    "is_return_trip": True,
    "travelers_count": 2,
    "language": "en",
}

resp = requests.post(url, json=payload, timeout=30)
print("HTTP Status Code:", resp.status_code)
if resp.status_code != 200:
    print("Error response:", resp.text)
    exit(1)

data = resp.json()
print("Corridor:", data.get("corridor_name"))
print("Origin Label:", data.get("origin_label"))
days = data.get("days", [])
print(f"Total Days: {len(days)}")

for d in days:
    day_num = d.get("day_number")
    start_loc = d.get("start_location_name")
    end_loc = d.get("end_location_name")
    acc_name = d.get("accommodation_name")
    driving_km = d.get("driving_distance_km")
    transit_mins = d.get("transit_minutes", 0)
    stops = d.get("stops", [])
    attractions = [s.get("name") for s in stops if s.get("stop_type") == "attraction"]
    meals = [s.get("name") for s in stops if s.get("stop_type") == "meal"]
    stays = [s.get("name") for s in stops if s.get("stop_type") == "accommodation"]
    returns = [s.get("name") for s in stops if s.get("stop_type") == "transport"]

    print(f"\n==================== DAY {day_num} ====================")
    print(f"Start Location: {start_loc}")
    print(f"End Location: {end_loc}")
    print(f"Accommodation: {acc_name}")
    print(f"Driving: {driving_km} km | Transit: {transit_mins // 60}h {transit_mins % 60}m")
    print(f"Attractions ({len(attractions)}):")
    for a in attractions:
        print(f"  * {a}")
    if stays:
        print(f"Overnight Stay: {stays[0]}")
    if returns:
        print(f"Return Leg: {returns[0]}")
