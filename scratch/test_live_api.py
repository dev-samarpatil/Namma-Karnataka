import json
import urllib.request

url = "http://127.0.0.1:8000/api/v1/places/restaurants?lat=12.9507&lon=77.5844&radius_km=15"
with urllib.request.urlopen(url) as resp:
    data = json.loads(resp.read().decode())
    print("Found restaurants:", len(data))
    for r in data:
        print(f" - {r['name_en']} ({r['distance_km']} km) [{r['source_name']}]")

acc_url = "http://127.0.0.1:8000/api/v1/places/accommodations?lat=12.3051&lon=76.6551&radius_km=25"
with urllib.request.urlopen(acc_url) as resp:
    data = json.loads(resp.read().decode())
    print("Found accommodations near Mysuru:", len(data))
    for a in data:
        print(f" - {a['name_en']} ({a['distance_km']} km) [{a['source_name']}] ₹{a['estimated_cost_per_night_inr']}/night")
