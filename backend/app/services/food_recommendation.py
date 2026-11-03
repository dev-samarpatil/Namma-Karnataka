"""Karnataka Regional Food & Culinary Intelligence Service.

Authoritative knowledge base and recommendation engine covering Karnataka's
8 distinct culinary regions, authentic signature dishes, dietary safety,
and realistic local pricing across meal times.
"""

from __future__ import annotations

from enum import Enum
from typing import Sequence
from pydantic import BaseModel, Field


class CulinaryRegion(str, Enum):
    BENGALURU_URBAN = "bengaluru_urban"
    MYSURU_MANDYA = "mysuru_mandya"
    COASTAL_KARAVALI = "coastal_karavali"
    MALNAD = "malnad"
    KODAGU = "kodagu"
    NORTH_KARNATAKA = "north_karnataka"
    KALYANA_KARNATAKA = "kalyana_karnataka"
    CENTRAL_KARNATAKA = "central_karnataka"


class RegionalDish(BaseModel):
    """Normalized specification for a regional Karnataka culinary item."""

    id: str
    name_en: str
    name_kn: str
    region: CulinaryRegion
    meal_type: str  # breakfast, lunch, dinner, snack
    is_vegetarian: bool
    is_vegan: bool = False
    is_jain_friendly: bool = False
    contains_seafood: bool = False
    contains_meat: bool = False
    description_en: str
    description_kn: str
    typical_cost_min_inr: float
    typical_cost_max_inr: float
    recommended_venue_type: str  # Darshini, Khanavali, Military Hotel, Coastal Shack, Mess
    cultural_context: str
    primary_districts: list[str] = Field(default_factory=list)


# District to Culinary Region mapping
DISTRICT_REGION_MAP: dict[str, CulinaryRegion] = {
    # Bengaluru Urban
    "bengaluru urban": CulinaryRegion.BENGALURU_URBAN,
    "bengaluru": CulinaryRegion.BENGALURU_URBAN,
    "bangalore": CulinaryRegion.BENGALURU_URBAN,
    "bengaluru rural": CulinaryRegion.BENGALURU_URBAN,
    "ramananagara": CulinaryRegion.BENGALURU_URBAN,
    # Mysuru & Mandya
    "mysuru": CulinaryRegion.MYSURU_MANDYA,
    "mysore": CulinaryRegion.MYSURU_MANDYA,
    "mandya": CulinaryRegion.MYSURU_MANDYA,
    "chamarajanagar": CulinaryRegion.MYSURU_MANDYA,
    # Coastal Karavali
    "dakshina kannada": CulinaryRegion.COASTAL_KARAVALI,
    "mangaluru": CulinaryRegion.COASTAL_KARAVALI,
    "mangalore": CulinaryRegion.COASTAL_KARAVALI,
    "udupi": CulinaryRegion.COASTAL_KARAVALI,
    "uttara kannada": CulinaryRegion.COASTAL_KARAVALI,
    "karwar": CulinaryRegion.COASTAL_KARAVALI,
    # Malnad
    "chikkamagaluru": CulinaryRegion.MALNAD,
    "shivamogga": CulinaryRegion.MALNAD,
    "shimoga": CulinaryRegion.MALNAD,
    "hassan": CulinaryRegion.MALNAD,
    # Kodagu
    "kodagu": CulinaryRegion.KODAGU,
    "coorg": CulinaryRegion.KODAGU,
    "madikeri": CulinaryRegion.KODAGU,
    # North Karnataka
    "dharwad": CulinaryRegion.NORTH_KARNATAKA,
    "hubballi": CulinaryRegion.NORTH_KARNATAKA,
    "belagavi": CulinaryRegion.NORTH_KARNATAKA,
    "belgaum": CulinaryRegion.NORTH_KARNATAKA,
    "bagalkote": CulinaryRegion.NORTH_KARNATAKA,
    "vijayapura": CulinaryRegion.NORTH_KARNATAKA,
    "bijapur": CulinaryRegion.NORTH_KARNATAKA,
    "gadag": CulinaryRegion.NORTH_KARNATAKA,
    "haveri": CulinaryRegion.NORTH_KARNATAKA,
    # Kalyana Karnataka
    "kalaburagi": CulinaryRegion.KALYANA_KARNATAKA,
    "gulbarga": CulinaryRegion.KALYANA_KARNATAKA,
    "bidar": CulinaryRegion.KALYANA_KARNATAKA,
    "raichur": CulinaryRegion.KALYANA_KARNATAKA,
    "koppal": CulinaryRegion.KALYANA_KARNATAKA,
    "yadgir": CulinaryRegion.KALYANA_KARNATAKA,
    # Central Karnataka
    "davanagere": CulinaryRegion.CENTRAL_KARNATAKA,
    "chitradurga": CulinaryRegion.CENTRAL_KARNATAKA,
    "ballari": CulinaryRegion.CENTRAL_KARNATAKA,
    "bellary": CulinaryRegion.CENTRAL_KARNATAKA,
    "vijayanagara": CulinaryRegion.CENTRAL_KARNATAKA,
    "hampi": CulinaryRegion.CENTRAL_KARNATAKA,
    "tumakuru": CulinaryRegion.CENTRAL_KARNATAKA,
}


class FoodRecommendationService:
    """Service providing region-specific Karnataka culinary recommendations."""

    def __init__(self) -> None:
        self._dishes: list[RegionalDish] = [
            # 1. Bengaluru Urban
            RegionalDish(
                id="blr-crispy-masala-dosa",
                name_en="Crispy Butter Masala Dosa & Filter Kaapi",
                name_kn="ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಫಿಲ್ಟರ್ ಕಾಫಿ",
                region=CulinaryRegion.BENGALURU_URBAN,
                meal_type="breakfast",
                is_vegetarian=True,
                is_vegan=False,
                is_jain_friendly=False,
                description_en="Golden crisp rice-lentil crepe smeared with red garlic chutney, filled with seasoned potato palya, topped with dollop of fresh butter, accompanied by hot degree filter coffee.",
                description_kn="ಬೆಣ್ಣೆ ಸವರಿದ ಗರಿಗರಿಯಾದ ಮಸಾಲ ದೋಸೆ, ಆಲೂಗೆಡ್ಡೆ ಪಲ್ಯ, ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿ ಮತ್ತು ಘಮಘಮಿಸುವ ಫಿಲ್ಟರ್ ಕಾಫಿ.",
                typical_cost_min_inr=70.0,
                typical_cost_max_inr=140.0,
                recommended_venue_type="Heritage Darshini / Brahmin Tiffin Room (CTR, Vidyarthi Bhavan, Taaza Thindi)",
                cultural_context="Quintessential Bengaluru morning ritual since the 1950s.",
                primary_districts=["Bengaluru Urban", "Bengaluru Rural"],
            ),
            RegionalDish(
                id="blr-bisi-bele-bath",
                name_en="Bisi Bele Bath with Boondi",
                name_kn="ಬಿಸಿಬೇಳೆ ಬಾತ್ ಮತ್ತು ಕಾರಾ ಬೂಂದಿ",
                region=CulinaryRegion.BENGALURU_URBAN,
                meal_type="lunch",
                is_vegetarian=True,
                is_vegan=False,
                is_jain_friendly=True,
                description_en="Nutrient-rich, comforting hot lentil-rice mash cooked with seasonal local vegetables, tamarind, aromatic bisi bele bath spices, and ghee.",
                description_kn="ತರಕಾರಿಗಳು, ಬೇಳೆ, ಅಕ್ಕಿ ಮತ್ತು ತುಪ್ಪದ ಒಗ್ಗರಣೆಯೊಂದಿಗೆ ಸಿದ್ಧಪಡಿಸಿದ ಪೌಷ್ಟಿಕ ಬಿಸಿಬೇಳೆ ಬಾತ್.",
                typical_cost_min_inr=60.0,
                typical_cost_max_inr=120.0,
                recommended_venue_type="Darshini / South Indian Veg Restaurant",
                cultural_context="Originated in the royal kitchens of the Mysore Palace and perfected in Karnataka homes.",
                primary_districts=["Bengaluru Urban", "Mysuru"],
            ),

            # 2. Mysuru & Mandya
            RegionalDish(
                id="mys-ragi-mudde-nati-koli",
                name_en="Ragi Mudde with Nati Koli Saaru (or Bassaru for Veg)",
                name_kn="ರಾಗಿ ಮುದ್ದೆ, ನಾಟಿ ಕೋಳಿ ಸಾರು / ಬಸ್ಸಾರು",
                region=CulinaryRegion.MYSURU_MANDYA,
                meal_type="lunch",
                is_vegetarian=False,
                is_vegan=False,
                is_jain_friendly=False,
                contains_meat=True,
                description_en="Wholesome finger-millet dumpling swallowed with country chicken gravy spiced with fresh ground coriander, poppy seeds, and coconut (or traditional green dill bassaru for vegetarians).",
                description_kn="ದಕ್ಷಿಣ ಕರ್ನಾಟಕದ ಸಾಂಪ್ರದಾಯಿಕ ರಾಗಿ ಮುದ್ದೆ, ಘಮಘಮಿಸುವ ನಾಟಿ ಕೋಳಿ ಸಾರು ಅಥವಾ ಸೊಪ್ಪಿನ ಬಸ್ಸಾರು.",
                typical_cost_min_inr=140.0,
                typical_cost_max_inr=260.0,
                recommended_venue_type="Authentic Military Hotel / Country Mess (Mysuru / Mandya Highway)",
                cultural_context="The agrarian lifeblood of Old Mysore and Mandya farmers.",
                primary_districts=["Mysuru", "Mandya", "Chamarajanagar", "Ramanagara"],
            ),
            RegionalDish(
                id="mys-maddur-vada",
                name_en="Crisp Maddur Vada with Coconut Chutney",
                name_kn="ಮದ್ದೂರು ವಡೆ ಮತ್ತು ಚಟ್ನಿ",
                region=CulinaryRegion.MYSURU_MANDYA,
                meal_type="snack",
                is_vegetarian=True,
                is_vegan=True,
                is_jain_friendly=False,
                description_en="Crunchy on the edges, soft in the center snack made of semolina, rice flour, maida, sliced onions, curry leaves, and green chillies.",
                description_kn="ಮದ್ದೂರಿನ ಪ್ರಸಿದ್ಧ ಗರಿಗರಿಯಾದ ಈರುಳ್ಳಿ ವಡೆ, ಮೈಸೂರು-ಬೆಂಗಳೂರು ಹೆದ್ದಾರಿಯ ಜನಪ್ರಿಯ ತಿಂಡಿ.",
                typical_cost_min_inr=25.0,
                typical_cost_max_inr=50.0,
                recommended_venue_type="Railway Canteen / Highway Tiffin Stall (Maddur Tiffanys)",
                cultural_context="Born at Maddur Railway Station in 1917, iconic travel refreshment.",
                primary_districts=["Mandya", "Mysuru", "Ramanagara"],
            ),

            # 3. Coastal Karavali
            RegionalDish(
                id="kar-neer-dosa-kori-rotti",
                name_en="Neer Dosa with Coastal Fish / Kundapura Chicken Curry",
                name_kn="ನೀರ್ ದೋಸೆ ಮತ್ತು ಕುಂದಾಪುರ ಕೋಳಿ / ಮೀನು ಸಾರು",
                region=CulinaryRegion.COASTAL_KARAVALI,
                meal_type="lunch",
                is_vegetarian=False,
                is_vegan=False,
                is_jain_friendly=False,
                contains_meat=True,
                description_en="Delicate, lacy water crepes crafted from ground rice and coconut, served with fiery red Byadgi chilli and coconut Kundapura curry.",
                description_kn="ಕರಾವಳಿ ತುಳುನಾಡಿನ ಮೃದುವಾದ ನೀರ್ ದೋಸೆ, ತೆಂಗಿನಕಾಯಿ ಮತ್ತು ಬ್ಯಾಡಗಿ ಮೆಣಸಿನ ಕುಂದಾಪುರ ಚಿಕನ್ ಅಥವಾ ಮೀನು ಸಾರು.",
                typical_cost_min_inr=120.0,
                typical_cost_max_inr=240.0,
                recommended_venue_type="Coastal Seafood Restaurant / Canara Family Mess",
                cultural_context="Celebrated staple of Bunt and Coastal Canara culinary heritage.",
                primary_districts=["Dakshina Kannada", "Udupi", "Uttara Kannada"],
            ),
            RegionalDish(
                id="kar-goli-baje-chutney",
                name_en="Mangalore Goli Baje (Mangalore Bajji)",
                name_kn="ಮಂಗಳೂರು ಗೋಳಿಬಜೆ",
                region=CulinaryRegion.COASTAL_KARAVALI,
                meal_type="snack",
                is_vegetarian=True,
                is_vegan=False,
                is_jain_friendly=False,
                description_en="Golden fried, fluffy sour curd and maida fritters speckled with chopped ginger, curry leaves, and green chillies, served with fresh coconut chutney.",
                description_kn="ಮೊಸರಿನಿಂದ ತಯಾರಿಸಿದ ಬಾಯಲ್ಲಿ ಕರಗುವ ಗರಿಗರಿ ಗೋಳಿಬಜೆ, ಸಂಜೆಯ ಕಾಫಿಯ ಜೊತೆಗೆ ಪರಿಪೂರ್ಣ ತಿನಿಸು.",
                typical_cost_min_inr=30.0,
                typical_cost_max_inr=60.0,
                recommended_venue_type="Udupi Brahmin Tiffin Canteen / Coastal Tea Stall",
                cultural_context="A rainy-day and sunset coastal tea essential.",
                primary_districts=["Dakshina Kannada", "Udupi"],
            ),

            # 4. Malnad
            RegionalDish(
                id="mal-akki-rotti-chutney",
                name_en="Malnad Akki Rotti with Yennegayi & Coconut Chutney",
                name_kn="ಮಲೆನಾಡು ಅಕ್ಕಿ ರೊಟ್ಟಿ ಮತ್ತು ಎಣ್ಣೆಗಾಯಿ / ಚಟ್ನಿ",
                region=CulinaryRegion.MALNAD,
                meal_type="breakfast",
                is_vegetarian=True,
                is_vegan=True,
                is_jain_friendly=True,
                description_en="Rice flour flatbread hand-flattened on plantain leaves, kneaded with grated coconut, dill leaves, cumin seeds, and onions, roasted on iron griddles.",
                description_kn="ಬಾಳೆ ಎಲೆಯ ಮೇಲೆ ತಟ್ಟಿದ ಘಮಘಮಿಸುವ ಅಕ್ಕಿ ರೊಟ್ಟಿ, ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿ ಮತ್ತು ಮಲೆನಾಡಿನ ತಾಜಾ ಕಾಫಿ.",
                typical_cost_min_inr=60.0,
                typical_cost_max_inr=110.0,
                recommended_venue_type="Malnad Homestay / Local High-Range Eatery",
                cultural_context="Traditional morning meal sustaining coffee plantation estates and hill villages.",
                primary_districts=["Chikkamagaluru", "Shivamogga", "Hassan"],
            ),

            # 5. Kodagu
            RegionalDish(
                id="kod-kadambuttu-pandi-curry",
                name_en="Kadambuttu (Steamed Rice Spheres) with Pandi Curry",
                name_kn="ಕಾದಂಬುಟ್ಟು ಮತ್ತು ಕೂರ್ಗ್ ಪಾಂಡಿ ಸಾರು",
                region=CulinaryRegion.KODAGU,
                meal_type="dinner",
                is_vegetarian=False,
                is_vegan=False,
                is_jain_friendly=False,
                contains_meat=True,
                description_en="Classic Kodava dish of pillowy steamed broken-rice spheres simmered in dark roasted spice curry sour-tarted with garcinia (Kachampuli vinegar).",
                description_kn="ಕೊಡಗಿನ ಅಪ್ಪಟ ಸಂಸ್ಕೃತಿಯ ಕಾದಂಬುಟ್ಟು (ಅಕ್ಕಿ ಉಂಡೆಗಳು) ಮತ್ತು ಕಾಚಂಪುಳಿ ಹುಳಿಯ ಪಾಂಡಿ ಸಾರು.",
                typical_cost_min_inr=180.0,
                typical_cost_max_inr=350.0,
                recommended_venue_type="Kodava Heritage Homestay / Madikeri Specialty Restaurant",
                cultural_context="The sovereign feast of Kodava festivals and weddings.",
                primary_districts=["Kodagu"],
            ),

            # 6. North Karnataka
            RegionalDish(
                id="nk-jolada-rotti-ennegayi-oota",
                name_en="Jolada Rotti Oota with Ennegayi & Shenga Chutney",
                name_kn="ಉತ್ತರ ಕರ್ನಾಟಕದ ಜೋಳದ ರೊಟ್ಟಿ ಊಟ ಮತ್ತು ಎಣ್ಣೆಗಾಯಿ ಬದನೆಕಾಯಿ",
                region=CulinaryRegion.NORTH_KARNATAKA,
                meal_type="lunch",
                is_vegetarian=True,
                is_vegan=True,
                is_jain_friendly=False,
                description_en="Unleavened sorghum (jowar) bread hand-clapped and fire-baked, served with stuffed small brinjals in peanut-sesame gravy, spicy peanut gunpowder, fresh curd, and spring onions.",
                description_kn="ಬಿಸಿಬಿಸಿ ಜೋಳದ ರೊಟ್ಟಿ, ಎಣ್ಣೆಗಾಯಿ ಬದನೆಕಾಯಿ ಪಲ್ಯ, ಶೇಂಗಾ ಚಟ್ನಿ ಪುಡಿ, ಮೊಸರು ಮತ್ತು ಉಳ್ಳಾಗಡ್ಡಿ.",
                typical_cost_min_inr=80.0,
                typical_cost_max_inr=160.0,
                recommended_venue_type="Traditional Lingayat Khanavali (Dharwad, Belagavi, Vijayapura)",
                cultural_context="Ancient, healthy, low-glycemic heartland food culture of northern Karnataka.",
                primary_districts=["Dharwad", "Belagavi", "Bagalkote", "Vijayapura", "Gadag"],
            ),

            # 7. Kalyana Karnataka
            RegionalDish(
                id="kk-kalaburagi-tahari",
                name_en="Kalaburagi Tahari (Aromatic Deccan Spiced Rice)",
                name_kn="ಕಲಬುರಗಿ ತಹಾರಿ (ದಖನಿ ಸುಗಂಧಿತ ಮಸಾಲಾ ಅನ್ನ)",
                region=CulinaryRegion.KALYANA_KARNATAKA,
                meal_type="lunch",
                is_vegetarian=False,
                is_vegan=False,
                is_jain_friendly=False,
                contains_meat=True,
                description_en="One-pot medieval Bahmani recipe combining long grain rice, marinated tender meat (or spiced paneer/potatoes), browned onions, green chillies, and mint.",
                description_kn="ಕಲಬುರಗಿಯ ಪ್ರಸಿದ್ಧ ರುಚಿಕರ ತಹಾರಿ, ಬಹಮನಿ ಕಾಲದ ಸುಗಂಧಿತ ಮಸಾಲೆಗಳಿಂದ ಕೂಡಿದ ಊಟ.",
                typical_cost_min_inr=130.0,
                typical_cost_max_inr=220.0,
                recommended_venue_type="Local Kalyana Dining Hall / Historic Market Mess",
                cultural_context="Signature celebratory dish of the Gulbarga and Bidar royal courts.",
                primary_districts=["Kalaburagi", "Bidar", "Raichur"],
            ),

            # 8. Central Karnataka
            RegionalDish(
                id="ck-davanagere-benne-dosa",
                name_en="Davanagere Benne Dosa with Aloo Palya & Chutney",
                name_kn="ದಾವಣಗೆರೆ ಬೆಣ್ಣೆ ದೋಸೆ, ಆಲೂ ಪಲ್ಯ ಮತ್ತು ಕಾರದ ಚಟ್ನಿ",
                region=CulinaryRegion.CENTRAL_KARNATAKA,
                meal_type="breakfast",
                is_vegetarian=True,
                is_vegan=False,
                is_jain_friendly=False,
                description_en="Cooked on wood-fired cast-iron tawas with freshly churned unsalted white butter, giving a crisp golden exterior and spongy, melt-in-mouth interior.",
                description_kn="ಕಟ್ಟಿಗೆ ಒಲೆಯ ಮೇಲೆ ತಾಜಾ ಬೆಣ್ಣೆ ಹಾಕಿ ಬೇಯಿಸಿದ ಗರಿಗರಿಯಾದ ಪ್ರಸಿದ್ಧ ದಾವಣಗೆರೆ ಬೆಣ್ಣೆ ದೋಸೆ.",
                typical_cost_min_inr=60.0,
                typical_cost_max_inr=110.0,
                recommended_venue_type="Original Davanagere Benne Dosa Stall / Highway Eatery",
                cultural_context="Born in Davanagere near the textile mills in 1928, now legendary across India.",
                primary_districts=["Davanagere", "Chitradurga", "Ballari", "Vijayanagara"],
            ),
        ]

    def get_region_for_district(self, district_name: str | None) -> CulinaryRegion:
        """Resolve a district name to its primary culinary region."""
        if not district_name:
            return CulinaryRegion.BENGALURU_URBAN
        cleaned = district_name.strip().lower()
        return DISTRICT_REGION_MAP.get(cleaned, CulinaryRegion.BENGALURU_URBAN)

    def get_recommendations(
        self,
        district_name: str | None = None,
        meal_type: str | None = None,
        dietary_preference: str | None = None,  # veg, vegan, jain, non_veg, no_seafood
        max_cost_inr: float | None = None,
        limit: int = 4,
    ) -> list[RegionalDish]:
        """Fetch targeted authentic culinary recommendations filtered by diet and region."""
        target_region = self.get_region_for_district(district_name)
        candidates: list[RegionalDish] = []

        for d in self._dishes:
            # 1. Region match (prefer exact region, but include adjacent if sparse)
            if d.region != target_region and district_name:
                # Check if district is in primary_districts
                if not any(district_name.lower() in p.lower() for p in d.primary_districts):
                    continue

            # 2. Meal type filter
            if meal_type and d.meal_type.lower() != meal_type.lower():
                continue

            # 3. Dietary preference filter
            pref = (dietary_preference or "").lower()
            if pref in ("veg", "vegetarian") and not d.is_vegetarian:
                continue
            if pref == "vegan" and not d.is_vegan:
                continue
            if pref == "jain" and not d.is_jain_friendly:
                continue
            if pref == "no_seafood" and d.contains_seafood:
                continue

            # 4. Budget filter
            if max_cost_inr and d.typical_cost_min_inr > max_cost_inr:
                continue

            candidates.append(d)

        # Fallback if filtered out: return veg/safe dishes from the region
        if not candidates and district_name:
            candidates = [d for d in self._dishes if d.region == target_region and d.is_vegetarian]

        return candidates[:limit]


_global_food_service: FoodRecommendationService | None = None


def get_food_recommendation_service() -> FoodRecommendationService:
    """Singleton accessor for FoodRecommendationService."""
    global _global_food_service
    if _global_food_service is None:
        _global_food_service = FoodRecommendationService()
    return _global_food_service

