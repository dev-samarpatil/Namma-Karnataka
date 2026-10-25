"""Karnataka regional travel corridors and geographic clustering."""

from __future__ import annotations

import math
from typing import Any, NamedTuple

from app.schemas.destinations import Coordinates


class HubCoordinates(NamedTuple):
    name: str
    lat: float
    lon: float


# Comprehensive geographic coordinate registry for major Karnataka travel origin hubs
ORIGIN_HUB_COORDINATES: dict[str, tuple[float, float]] = {
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "mysuru": (12.3051, 76.6551),
    "mysore": (12.3051, 76.6551),
    "mangaluru": (12.9141, 74.8560),
    "mangalore": (12.9141, 74.8560),
    "hubballi": (15.3647, 75.1240),
    "hubli": (15.3647, 75.1240),
    "dharwad": (15.4589, 75.0078),
    "belagavi": (15.8497, 74.4977),
    "belgaum": (15.8497, 74.4977),
    "shivamogga": (13.9299, 75.5681),
    "shimoga": (13.9299, 75.5681),
    "hassan": (13.0033, 76.1004),
    "chikkamagaluru": (13.3161, 75.7720),
    "chikmagalur": (13.3161, 75.7720),
    "madikeri": (12.4244, 75.7382),
    "coorg": (12.4244, 75.7382),
    "udupi": (13.3409, 74.7421),
    "gokarna": (14.5433, 74.3167),
    "karwar": (14.8136, 74.1297),
    "hampi": (15.3350, 76.4600),
    "hospete": (15.2689, 76.3909),
    "hosapete": (15.2689, 76.3909),
    "ballari": (15.1394, 76.9214),
    "bellary": (15.1394, 76.9214),
    "badami": (15.9189, 75.6833),
    "bagalkote": (16.1817, 75.6958),
    "vijayapura": (16.8319, 75.7289),
    "bijapur": (16.8319, 75.7289),
    "kalaburagi": (17.3297, 76.8343),
    "gulbarga": (17.3297, 76.8343),
    "bidar": (17.9104, 77.5199),
    "chitradurga": (14.2251, 76.3980),
    "davanagere": (14.4644, 75.9218),
    "tumakuru": (13.3379, 77.1010),
    "kolar": (13.1367, 78.1292),
    "ramanagara": (12.7209, 77.2799),
    "chamarajanagar": (11.9261, 76.9437),
}


def get_origin_coordinates(origin_label: str) -> Coordinates:
    """Resolve origin label to geographic coordinates, defaulting to Bengaluru."""
    clean_label = origin_label.strip().lower()
    for key, coords in ORIGIN_HUB_COORDINATES.items():
        if key in clean_label or clean_label in key:
            return Coordinates(lat=coords[0], lon=coords[1])
    # Fallback to Bengaluru city center
    return Coordinates(lat=12.9716, lon=77.5946)


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great circle distance in kilometers."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


class TravelCorridor(NamedTuple):
    corridor_id: str
    name_en: str
    name_kn: str
    districts: set[str]
    center_lat: float
    center_lon: float
    primary_hubs: list[str]


# The 6 authoritative, coherent travel corridors spanning Karnataka
KARNATAKA_CORRIDORS: list[TravelCorridor] = [
    TravelCorridor(
        corridor_id="southern_heritage_wildlife",
        name_en="Southern Heritage, Palaces & Wildlife Circuit",
        name_kn="ದಕ್ಷಿಣ ಕರ್ನಾಟಕದ ಪರಂಪರೆ, ಅರಮನೆಗಳು ಮತ್ತು ವನ್ಯಧಾಮ ಸರ್ಕ್ಯೂಟ್",
        districts={"KA-BLRU", "KA-BLRR", "KA-RAM", "KA-MAN", "KA-MYS", "KA-CHA", "KA-KOD"},
        center_lat=12.4200,
        center_lon=76.6200,
        primary_hubs=["Bengaluru", "Ramanagara", "Mandya", "Mysuru", "Bandipur", "Madikeri"],
    ),
    TravelCorridor(
        corridor_id="malnad_coffee_hills",
        name_en="Malnad, Coffee Hills & Waterfalls Circuit",
        name_kn="ಮಲೆನಾಡು, ಕಾಫಿ ಗಿರಿಧಾಮಗಳು ಮತ್ತು ಜಲಪಾತಗಳ ಸರ್ಕ್ಯೂಟ್",
        districts={"KA-HAS", "KA-CKM", "KA-SHI"},
        center_lat=13.4100,
        center_lon=75.7500,
        primary_hubs=[
            "Hassan",
            "Belur",
            "Chikkamagaluru",
            "Mullayanagiri",
            "Shivamogga",
            "Jog Falls",
        ],
    ),
    TravelCorridor(
        corridor_id="coastal_karavali",
        name_en="Coastal Karavali & Temple Coast Circuit",
        name_kn="ಕರಾವಳಿ ಕರ್ನಾಟಕ, ಕಡಲತೀರಗಳು ಮತ್ತು ದೇವಾಲಯ ಸರ್ಕ್ಯೂಟ್",
        districts={"KA-DKN", "KA-UDU", "KA-UKN"},
        center_lat=13.8500,
        center_lon=74.6500,
        primary_hubs=["Mangaluru", "Udupi", "Murudeshwar", "Gokarna", "Karwar"],
    ),
    TravelCorridor(
        corridor_id="vijayanagara_chalukya_heritage",
        name_en="Vijayanagara Empire & Chalukya Heritage Circuit",
        name_kn="ವಿಜಯನಗರ ಸಾಮ್ರಾಜ್ಯ ಮತ್ತು ಚಾಲುಕ್ಯ ವಾಸ್ತುಶಿಲ್ಪ ಸರ್ಕ್ಯೂಟ್",
        districts={"KA-VJN", "KA-BLR", "KA-BAG", "KA-GAD", "KA-KOP"},
        center_lat=15.5200,
        center_lon=76.0500,
        primary_hubs=["Hampi", "Hosapete", "Badami", "Pattadakal", "Aihole", "Gadag"],
    ),
    TravelCorridor(
        corridor_id="deccan_northern_forts",
        name_en="Northern Deccan Forts & Monuments Circuit",
        name_kn="ಉತ್ತರ ಕರ್ನಾಟಕದ ಡೆಕ್ಕನ್ ಕೋಟೆಗಳು ಮತ್ತು ಸ್ಮಾರಕಗಳ ಸರ್ಕ್ಯೂಟ್",
        districts={"KA-VIJ", "KA-KLB", "KA-BID", "KA-YAD"},
        center_lat=17.1500,
        center_lon=76.5500,
        primary_hubs=["Vijayapura", "Gol Gumbaz", "Kalaburagi", "Bidar"],
    ),
    TravelCorridor(
        corridor_id="central_belagavi_circuit",
        name_en="Central Karnataka & Belagavi Plateau Circuit",
        name_kn="ಮಧ್ಯ ಕರ್ನಾಟಕ ಮತ್ತು ಬೆಳಗಾವಿ ಪ್ರಸ್ಥಭೂಮಿ ಸರ್ಕ್ಯೂಟ್",
        districts={"KA-CTA", "KA-DAV", "KA-BLG", "KA-DHA", "KA-HAV"},
        center_lat=15.1000,
        center_lon=75.3000,
        primary_hubs=["Chitradurga", "Davanagere", "Hubballi", "Dharwad", "Belagavi"],
    ),
]


def identify_best_corridor(
    origin_coords: Coordinates | str | None = None,
    preferred_districts: list[str] | None = None,
    duration_days: int = 2,
    preferred_categories: list[Any] | None = None,
    **kwargs: Any,
) -> tuple[TravelCorridor, list[str]]:
    """Determine the optimal geographic corridor, returning corridor and omitted distant districts.

    Balances user district preferences against geographic feasibility from origin.
    """
    if origin_coords is None:
        origin_label = kwargs.get("origin_label", "Bengaluru")
        resolved_coords = get_origin_coordinates(origin_label)
    elif isinstance(origin_coords, str):
        resolved_coords = get_origin_coordinates(origin_coords)
    else:
        resolved_coords = origin_coords

    preferred_districts = preferred_districts or []
    omitted_districts: list[str] = []

    # 1. If user explicitly provided preferred districts:
    if preferred_districts:
        district_set = set(preferred_districts)
        # Score each corridor by number of matching preferred districts
        corridor_scores: list[tuple[float, TravelCorridor]] = []
        for corridor in KARNATAKA_CORRIDORS:
            matches = len(district_set.intersection(corridor.districts))
            if matches > 0:
                # Proximity and feasibility from origin
                dist_to_corridor = haversine_distance_km(
                    resolved_coords.lat,
                    resolved_coords.lon,
                    corridor.center_lat,
                    corridor.center_lon,
                )
                # Feasibility constraint: for short trips, penalize corridors that are too distant to reach safely
                max_feasible_dist = max(180.0, duration_days * 160.0)
                feasibility_penalty = (
                    max(0.0, (dist_to_corridor - max_feasible_dist) * 2.0)
                    if dist_to_corridor > max_feasible_dist
                    else 0.0
                )
                # Score formula: heavy weight on district matches, distance penalty, feasibility penalty
                score = (matches * 100.0) - (dist_to_corridor * 0.15) - feasibility_penalty
                corridor_scores.append((score, corridor))

        if corridor_scores:
            corridor_scores.sort(key=lambda x: x[0], reverse=True)
            best_corridor = corridor_scores[0][1]

            # Find districts outside this chosen corridor
            for d in preferred_districts:
                if d not in best_corridor.districts:
                    omitted_districts.append(d)

            return best_corridor, omitted_districts

    # 2. If no preferred districts or no matches: pick closest corridor to origin
    corridor_by_dist = sorted(
        KARNATAKA_CORRIDORS,
        key=lambda c: haversine_distance_km(
            resolved_coords.lat, resolved_coords.lon, c.center_lat, c.center_lon
        ),
    )
    return corridor_by_dist[0], []
