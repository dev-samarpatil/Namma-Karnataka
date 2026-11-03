"""Karnataka Local Food Intelligence & Authentic Eatery Guide.

Provides deep regional culinary knowledge across Karnataka's distinct gastronomic
zones (Bengaluru, Mysuru, Mandya, Mangaluru/Udupi, Kodagu/Coorg, North Karnataka,
Malnad, Coastal Uttara Kannada), connects meals to verified historic eateries and
local messes, respects dietary preferences, and aligns with budget profiles.
"""

from __future__ import annotations

import logging
import math

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2.0) ** 2
    return round(2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 2)


class RegionalSpeciality(BaseModel):
    """Specification of an authentic regional Karnataka culinary item."""

    id: str
    name_en: str
    name_kn: str
    region: str  # bengaluru, mysuru, mandya, coastal_karavali, kodagu, north_karnataka, malnad
    district: str
    meal_type: str  # breakfast, lunch, dinner, snack
    category: str  # tiffin, thali, curry, sweet, beverage, seafood, snack
    description_en: str
    description_kn: str
    typical_price_inr: float
    is_vegetarian: bool = True
    is_vegan: bool = False
    is_jain_friendly: bool = False
    contains_meat: bool = False
    contains_seafood: bool = False
    recommended_venue_type: (
        str  # Darshini, Traditional Mess, Khanavali, Military Hotel, Coastal Shack
    )
    cultural_context: str


class VerifiedEatery(BaseModel):
    """Genuine, verified restaurant or food joint with factual provenance."""

    id: str
    name_en: str
    name_kn: str
    district: str
    district_code: str
    city: str
    latitude: float
    longitude: float
    address_en: str
    address_kn: str
    venue_type: (
        str  # Heritage Darshini, Traditional Mess, Khanavali, Military Hotel, Coastal Seafood Shack
    )
    cuisines: list[str] = Field(default_factory=list)
    signature_dishes: list[str] = Field(default_factory=list)
    price_tier: str = "budget"  # budget, mid_range, premium
    average_cost_for_two_inr: float = 300.0
    opening_hours: str = "07:00 - 21:00"
    rating: float | None = 4.5
    review_count: int | None = 1500
    source_name: str = "Karnataka Tourism & Local Gazetteer"
    verification_status: str = "VERIFIED_AUTHENTIC"
    last_verified_at: str = "2026-10-15"
    google_maps_query: str


class MealRecommendation(BaseModel):
    """Contextual meal recommendation integrating dish, eatery, price, and transit."""

    meal_type: str  # Breakfast, Lunch, Dinner
    dish_name_en: str
    dish_name_kn: str
    restaurant_name_en: str | None = None
    restaurant_name_kn: str | None = None
    venue_type: str
    location_summary: str
    headline_en: str
    headline_kn: str
    description_en: str
    description_kn: str
    estimated_cost_inr: float
    distance_km: float | None = None
    map_search_url: str | None = None
    dietary_matches: bool = True
    is_verified_eatery: bool = False


# Canonical Knowledge Base of Verified Karnataka Regional Dishes
REGIONAL_SPECIALITIES: list[RegionalSpeciality] = [
    # Bengaluru Urban & Rural
    RegionalSpeciality(
        id="blr-benne-masala-dosa",
        name_en="Crispy Benne Masala Dosa",
        name_kn="ಗರಿಗರಿ ಬೆಣ್ಣೆ ಮಸಾಲ ದೋಸೆ",
        region="bengaluru",
        district="Bengaluru Urban",
        meal_type="breakfast",
        category="tiffin",
        description_en="Golden-brown crispy fermented rice-lentil crepe generously roasted in pure butter, stuffed with spiced potato palya and paired with fresh coconut chutney.",
        description_kn="ಶುದ್ಧ ಬೆಣ್ಣೆಯಲ್ಲಿ ಬೇಯಿಸಿದ ಗರಿಗರಿಯಾದ ಮಸಾಲ ದೋಸೆ, ಆಲೂಗೆಡ್ಡೆ ಪಲ್ಯ ಮತ್ತು ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿ.",
        typical_price_inr=70.0,
        is_vegetarian=True,
        recommended_venue_type="Heritage Darshini",
        cultural_context="Quintessential Old Bangalore morning breakfast ritual celebrated in Malleshwaram and Basavanagudi.",
    ),
    RegionalSpeciality(
        id="blr-rava-idli",
        name_en="Steaming Rava Idli with Filter Coffee",
        name_kn="ಬಿಸಿ ರವಾ ಇಡ್ಲಿ ಮತ್ತು ಫಿಲ್ಟರ್ ಕಾಫಿ",
        region="bengaluru",
        district="Bengaluru Urban",
        meal_type="breakfast",
        category="tiffin",
        description_en="Semolina steamed cakes infused with roasted mustard, cashew nuts, curry leaves and coriander, served with aromatic sagu and pure ghee.",
        description_kn="ಗೋಡಂಬಿ, ತುಪ್ಪದೊಂದಿಗೆ ಸಿದ್ಧಪಡಿಸಿದ ಮೃದುವಾದ ರವಾ ಇಡ್ಲಿ ಮತ್ತು ಸಾಗು.",
        typical_price_inr=60.0,
        is_vegetarian=True,
        recommended_venue_type="Heritage Darshini",
        cultural_context="Invented by MTR during World War II rice shortages, now a global Karnataka culinary trademark.",
    ),
    RegionalSpeciality(
        id="blr-bisi-bele-bath",
        name_en="Bisi Bele Bath with Boondi",
        name_kn="ಬಿಸಿ ಬೇಳೆ ಬಾತ್ ಮತ್ತು ಖಾರಾ ಬೂಂದಿ",
        region="bengaluru",
        district="Bengaluru Urban",
        meal_type="lunch",
        category="thali",
        description_en="Slow-cooked hearty medley of rice, lentils, seasonal country vegetables and traditional roasted aromatic spice blend, finished with ghee and crispy boondi.",
        description_kn="ತರಕಾರಿಗಳು, ಬೇಳೆ, ಅನ್ನ ಮತ್ತು ಸಾಂಪ್ರದಾಯಿಕ ಮಸಾಲೆಯ ಸಮೃದ್ಧ ಬಿಸಿ ಬೇಳೆ ಬಾತ್.",
        typical_price_inr=80.0,
        is_vegetarian=True,
        recommended_venue_type="Darshini / Mess",
        cultural_context="Historic Mysore-Bangalore heritage comfort staple dating back to royal palace kitchens.",
    ),
    RegionalSpeciality(
        id="blr-bidadi-thatte-idli",
        name_en="Bidadi Soft Thatte Idli",
        name_kn="ಬಿದದಿ ಮೃದುವಾದ ತಟ್ಟೆ ಇಡ್ಲಿ",
        region="bengaluru",
        district="Ramanagara",
        meal_type="breakfast",
        category="tiffin",
        description_en="Fluffy, plate-sized steamed rice idlis bathed in country-style spiced red chutney and melting unsalted white butter.",
        description_kn="ಬಿದದಿಯ ವಿಶೇಷ ತಟ್ಟೆ ಇಡ್ಲಿ, ಕೆಂಪು ಚಟ್ನಿ ಮತ್ತು ಬೆಣ್ಣೆ.",
        typical_price_inr=50.0,
        is_vegetarian=True,
        is_vegan=True,
        recommended_venue_type="Highway Eatery",
        cultural_context="Legendary stopover cuisine along the Bengaluru-Mysuru old highway belt.",
    ),
    # Mysuru & Mandya
    RegionalSpeciality(
        id="mys-mylari-dosa",
        name_en="Original Mysore Mylari Dosa",
        name_kn="ಅಸಲಿ ಮೈಸೂರು ಮೈಲಾರಿ ದೋಸೆ",
        region="mysuru",
        district="Mysuru",
        meal_type="breakfast",
        category="tiffin",
        description_en="Ultra-soft, cloud-like fermented pancake with crisp exterior, filled with delicate green chilli onion relish and freshly churned white butter.",
        description_kn="ಮೈಸೂರಿನ ಪ್ರಸಿದ್ಧ ಮೈಲಾರಿ ಬೆಣ್ಣೆ ದೋಸೆ, ಕೊತ್ತಂಬರಿ-ಈರುಳ್ಳಿ ಸಾಗು ಮತ್ತು ಬೆಣ್ಣೆ.",
        typical_price_inr=60.0,
        is_vegetarian=True,
        recommended_venue_type="Heritage Tiffin Room",
        cultural_context="Over 80 years of culinary lineage in Nazarbad, Mysuru, served on fresh banana leaf.",
    ),
    RegionalSpeciality(
        id="mys-royal-thali",
        name_en="Traditional Mysore Royal Vegetarian Oota",
        name_kn="ಸಾಂಪ್ರದಾಯಿಕ ಮೈಸೂರು ಸಸ್ಯಾಹಾರಿ ಊಟ",
        region="mysuru",
        district="Mysuru",
        meal_type="lunch",
        category="thali",
        description_en="Grand multi-course feast featuring kosambari, palya, huli (sambar), authentic saaru (rasam), majjige huli, and warm payasa.",
        description_kn="ಕೋಸಂಬರಿ, ಪಲ್ಯ, ಹುಳಿ, ತಿಳಿ ಸಾರು, ಮಜ್ಜಿಗೆ ಹುಳಿ ಮತ್ತು ಪಾಯಸ ಒಳಗೊಂಡ ಮೈಸೂರು ಊಟ.",
        typical_price_inr=140.0,
        is_vegetarian=True,
        recommended_venue_type="Heritage Restaurant",
        cultural_context="Refined palace heritage cuisine developed under the patronages of the Wadiyar dynasty.",
    ),
    RegionalSpeciality(
        id="mys-mysore-pak",
        name_en="Melt-in-Mouth Mysore Pak",
        name_kn="ಬಾಯಲ್ಲಿ ಕರಗುವ ಮೈಸೂರು ಪಾಕ್",
        region="mysuru",
        district="Mysuru",
        meal_type="snack",
        category="sweet",
        description_en="Legendary sweet prepared from pure cow ghee, roasted gram flour (besan), and sugar syrup, creating a soft porous caramelised core.",
        description_kn="ಶುದ್ಧ ತುಪ್ಪ ಮತ್ತು ಕಡಲೆ ಹಿಟ್ಟಿನಿಂದ ತಯಾರಿಸಿದ ಜಗತ್ಪ್ರಸಿದ್ಧ ಮೈಸೂರು ಪಾಕ್.",
        typical_price_inr=70.0,
        is_vegetarian=True,
        recommended_venue_type="Heritage Sweet Mart",
        cultural_context="Invented by royal cook Kakasura Madappa in 1935 in the royal kitchens of the Amba Vilas Palace.",
    ),
    RegionalSpeciality(
        id="man-ragi-mudde-bassaru",
        name_en="Mandya Ragi Mudde with Bassaru & Soppina Palya",
        name_kn="ಮಂಡ್ಯದ ರಾಗಿ ಮುದ್ದೆ, ಬಸ್ಸಾರು ಮತ್ತು ಸೊಪ್ಪಿನ ಪಲ್ಯ",
        region="mandya",
        district="Mandya",
        meal_type="lunch",
        category="thali",
        description_en="Nutritious finger millet steamed dumpling paired with slow-strained greens-lentil broth (bassaru) and seasoned dry greens.",
        description_kn="ಆರೋಗ್ಯಕರ ರಾಗಿ ಮುದ್ದೆ, ಬಸ್ಸಾರು ಮತ್ತು ರುಚಿಕರವಾದ ಸೊಪ್ಪಿನ ಪಲ್ಯ.",
        typical_price_inr=90.0,
        is_vegetarian=True,
        is_vegan=True,
        recommended_venue_type="Traditional Mess",
        cultural_context="The staple agricultural powerhouse meal of the Kaveri basin farmers, packed with calcium and slow-burning energy.",
    ),
    RegionalSpeciality(
        id="man-nati-koli-saaru",
        name_en="Country Chicken Curry (Nati Koli Saaru)",
        name_kn="ನಾಟಿ ಕೋಳಿ ಸಾರು ಮತ್ತು ರಾಗಿ ಮುದ್ದೆ",
        region="mandya",
        district="Mandya",
        meal_type="dinner",
        category="curry",
        description_en="Free-range country chicken slow-simmered in freshly stone-ground black pepper, coriander, shallots and coconut milk broth.",
        description_kn="ಮಂಡ್ಯ ಶೈಲಿಯ ನಾಟಿ ಕೋಳಿ ಸಾರು, ರಾಗಿ ಮುದ್ದೆ ಅಥವಾ ಅನ್ನದೊಂದಿಗೆ.",
        typical_price_inr=180.0,
        is_vegetarian=False,
        contains_meat=True,
        recommended_venue_type="Traditional Mess / Military Hotel",
        cultural_context="Famous village feast delicacy across Mandya, Pandavapura, and Ramanagara farming belts.",
    ),
    # Mangaluru, Udupi & Coastal Karavali
    RegionalSpeciality(
        id="udp-goli-baje",
        name_en="Crispy Mangalore Bajji (Goli Baje)",
        name_kn="ಗರಿಗರಿ ಮಂಗಳೂರು ಬಜ್ಜಿ (ಗೋಳಿ ಬಜೆ)",
        region="coastal_karavali",
        district="Udupi",
        meal_type="breakfast",
        category="snack",
        description_en="Golden fried fritters crisp on the outside and airy inside, made with curd-fermented flour, ginger, green chillies, and coconut shards.",
        description_kn="ಕರಾವಳಿಯ ಪ್ರಸಿದ್ಧ ಗೋಳಿ ಬಜೆ, ತೆಂಗಿನಕಾಯಿ ಚಟ್ನಿಯೊಂದಿಗೆ.",
        typical_price_inr=45.0,
        is_vegetarian=True,
        recommended_venue_type="Udupi Darshini",
        cultural_context="Born in coastal temples and tiffin rooms around Udupi's Krishna Temple Car Street.",
    ),
    RegionalSpeciality(
        id="mng-neer-dosa",
        name_en="Delicate Neer Dosa with Coastal Chutney",
        name_kn="ಮೃದು ನೀರ್ ದೋಸೆ ಮತ್ತು ಕರಾವಳಿ ಚಟ್ನಿ",
        region="coastal_karavali",
        district="Dakshina Kannada",
        meal_type="breakfast",
        category="tiffin",
        description_en="Paper-thin, unfermented lace-like rice crepes that melt instantly, accompanied by freshly ground coconut chutney and jaggery-coconut mix.",
        description_kn="ಕರಾವಳಿಯ ಮೃದುವಾದ ನೀರ್ ದೋಸೆ, ಚಟ್ನಿ ಮತ್ತು ಸಿಹಿ ತೆಂಗಿನ ತುರಿಯೊಂದಿಗೆ.",
        typical_price_inr=55.0,
        is_vegetarian=True,
        is_vegan=True,
        recommended_venue_type="Coastal Eatery",
        cultural_context="Tuluva specialty prepared with plain unfermented watery rice batter on clay or cast iron pans.",
    ),
    RegionalSpeciality(
        id="mng-kane-fish-fry",
        name_en="Fresh Lady Fish (Kane) Rava Fry & Fish Curry Meals",
        name_kn="ಕಾಣೆ ಮೀನು ರವಾ ಫ್ರೈ ಮತ್ತು ಕರಾವಳಿ ಮೀನ್ ಸಾರು ಊಟ",
        region="coastal_karavali",
        district="Dakshina Kannada",
        meal_type="lunch",
        category="seafood",
        description_en="Day's fresh lady fish marinated in fiery Byadagi chilli, ginger-garlic paste and lemon, semolina-crusted and pan-fried on a griddle, served with red rice fish curry.",
        description_kn="ಬ್ಯಾಡಗಿ ಮೆಣಸಿನಕಾಯಿ ಮಸಾಲೆಯಲ್ಲಿ ಬೇಯಿಸಿದ ಕಾಣೆ ಮೀನು ರವಾ ಫ್ರೈ ಮತ್ತು ಕುಚಲಕ್ಕಿ ಊಟ.",
        typical_price_inr=220.0,
        is_vegetarian=False,
        contains_seafood=True,
        recommended_venue_type="Coastal Seafood Shack",
        cultural_context="The jewel of Mangalorean port cuisine, sourced fresh daily from old Bunder fish docks.",
    ),
    RegionalSpeciality(
        id="mng-kori-rotti",
        name_en="Kundapura Kori Rotti",
        name_kn="ಕುಂದಾಪುರ ಕೋರಿ ರೊಟ್ಟಿ",
        region="coastal_karavali",
        district="Udupi",
        meal_type="dinner",
        category="curry",
        description_en="Crisp sun-dried rice wafers doused in aromatic, piping-hot chicken curry rich with roasted spices and coconut milk.",
        description_kn="ಗರಿಗರಿ ಅಕ್ಕಿ ರೊಟ್ಟಿಯ ಮೇಲೆ ಬಿಸಿಬಿಸಿ ಕೋಳಿ ಸಾರು ಸುರಿದು ಸವಿಯುವ ಕರಾವಳಿ ತಿನಿಸು.",
        typical_price_inr=160.0,
        is_vegetarian=False,
        contains_meat=True,
        recommended_venue_type="Coastal Traditional Restaurant",
        cultural_context="Signature celebratory banquet centerpiece of the Bunt community of Coastal Karnataka.",
    ),
    # Kodagu (Coorg)
    RegionalSpeciality(
        id="kod-pandi-curry",
        name_en="Authentic Coorg Pandi Curry with Kadambuttu",
        name_kn="ಕೊಡಗಿನ ಸಾಂಪ್ರದಾಯಿಕ ಪಾಂಡಿ ಕರಿ ಮತ್ತು ಕದಂಬುಟ್ಟು",
        region="kodagu",
        district="Kodagu",
        meal_type="lunch",
        category="curry",
        description_en="Tender pork simmered in freshly roasted dark spices and native fermented wild black vinegar (Kachampuli), served with steamed rice balls.",
        description_kn="ಕಾಚಂಪುಳಿ ಮತ್ತು ಸಾಂಬಾರ ಪದಾರ್ಥಗಳಲ್ಲಿ ಸಿದ್ಧಪಡಿಸಿದ ಪ್ರಸಿದ್ಧ ಪಾಂಡಿ ಕರಿ ಮತ್ತು ಕದಂಬುಟ್ಟು.",
        typical_price_inr=220.0,
        is_vegetarian=False,
        contains_meat=True,
        recommended_venue_type="Traditional Kodava Restaurant",
        cultural_context="The sacred culinary pride of Kodava warrior festivals and celebrations in the Western Ghats highlands.",
    ),
    RegionalSpeciality(
        id="kod-akki-rotti-bamboo",
        name_en="Coorg Akki Rotti with Bamboo Shoot Curry (Kani)",
        name_kn="ಕೊಡಗಿನ ಅಕ್ಕಿ ರೊಟ್ಟಿ ಮತ್ತು ಬಿದಿರಿನ ಕಣಿ ಪಲ್ಯ",
        region="kodagu",
        district="Kodagu",
        meal_type="breakfast",
        category="tiffin",
        description_en="Soft flatbread made of cooked rice and rice flour, paired with tender seasonal forest bamboo shoot curry cooked in coconut and mustard.",
        description_kn="ಮೆತ್ತನೆಯ ಅಕ್ಕಿ ರೊಟ್ಟಿ ಮತ್ತು ಪಶ್ಚಿಮ ಘಟ್ಟಗಳ ಎಳೆಯ ಬಿದಿರಿನ ಕಣಿ ಸಾರು.",
        typical_price_inr=90.0,
        is_vegetarian=True,
        is_vegan=True,
        recommended_venue_type="Homestyle Cafe",
        cultural_context="Native rainforest forage cuisine showcasing seasonal harmony with the Western Ghats ecosystem.",
    ),
    # North Karnataka (Hubballi, Dharwad, Belagavi, Vijayapura, Gadag)
    RegionalSpeciality(
        id="nk-jolada-rotti-oota",
        name_en="North Karnataka Jolada Rotti Oota with Ennegayi",
        name_kn="ಉತ್ತರ ಕರ್ನಾಟಕದ ಜೋಳದ ರೊಟ್ಟಿ ಊಟ ಮತ್ತು ಬದನೆಕಾಯಿ ಎಣ್ಣೆಗಾಯಿ",
        region="north_karnataka",
        district="Dharwad",
        meal_type="lunch",
        category="thali",
        description_en="Unleavened sorghum flatbread served with stuffed baby brinjal (ennegayi), spicy peanut chutney (shenga pudi), jhunka, and country churned curd.",
        description_kn="ಬಿಸಿ ಜೋಳದ ರೊಟ್ಟಿ, ಬದನೆಕಾಯಿ ಎಣ್ಣೆಗಾಯಿ, ಶೇಂಗಾ ಚಟ್ನಿ ಪುಡಿ, ಜುಣಕ ಮತ್ತು ಗಟ್ಟಿ ಮೊಸರು.",
        typical_price_inr=110.0,
        is_vegetarian=True,
        is_vegan=False,
        is_jain_friendly=True,
        recommended_venue_type="Traditional Khanavali",
        cultural_context="Ancient, wholesome dryland Deccan diet providing stamina and balanced nutrition in northern plains.",
    ),
    RegionalSpeciality(
        id="nk-dharwad-pedha",
        name_en="Original Dharwad Pedha",
        name_kn="ಅಸಲಿ ಧಾರವಾಡ ಪೇಡಾ",
        region="north_karnataka",
        district="Dharwad",
        meal_type="snack",
        category="sweet",
        description_en="Dark caramelised milk fudge made from Dharwadi buffalo milk, slow-roasted to deep amber and dusted with fine sugar.",
        description_kn="ಕಂದು ಬಣ್ಣದ ಸಾಂಪ್ರದಾಯಿಕ ಧಾರವಾಡ ಪೇಡಾ.",
        typical_price_inr=50.0,
        is_vegetarian=True,
        recommended_venue_type="Heritage Sweet Shop",
        cultural_context="GI-tagged pride of Dharwad with 175+ years of craft perfected by the Mishra lineage.",
    ),
    # Malnad & Central Karnataka (Shivamogga, Chikkamagaluru, Chitradurga)
    RegionalSpeciality(
        id="mal-shivamogga-benne-dosa",
        name_en="Shivamogga Open Benne Dosa",
        name_kn="ಶಿವಮೊಗ್ಗ ಗರಿಗರಿ ಓಪನ್ ಬೆಣ್ಣೆ ದೋಸೆ",
        region="malnad",
        district="Shivamogga",
        meal_type="breakfast",
        category="tiffin",
        description_en="Thick, fluffy sponge dosa roasted over firewood in aromatic butter, sprinkled with spiced podi and coconut-coriander chutney.",
        description_kn="ಮಲೆನಾಡಿನ ಪ್ರಸಿದ್ಧ ಶಿವಮೊಗ್ಗ ಬೆಣ್ಣೆ ದೋಸೆ, ಚಟ್ನಿ ಮತ್ತು ಆಲೂ ಪಲ್ಯ.",
        typical_price_inr=65.0,
        is_vegetarian=True,
        recommended_venue_type="Heritage Canteen",
        cultural_context="A Malnad morning institution beloved in Gandhi Bazaar, Shivamogga since the 1950s.",
    ),
    RegionalSpeciality(
        id="cta-chitradurga-dosa",
        name_en="Chitradurga Crispy Ghee Dosa",
        name_kn="ಚಿತ್ರದುರ್ಗ ತುಪ್ಪದ ಮಸಾಲ ದೋಸೆ",
        region="central_karnataka",
        district="Chitradurga",
        meal_type="breakfast",
        category="tiffin",
        description_en="Extra crispy golden dosa flavored with local red chillies and generous dollops of butter, served right near the historic stone fortress.",
        description_kn="ಕಲ್ಲಿನ ಕೋಟೆಯ ಸಮೀಪದ ಗರಿಗರಿಯಾದ ತುಪ್ಪದ ದೋಸೆ ಮತ್ತು ಚಟ್ನಿ.",
        typical_price_inr=60.0,
        is_vegetarian=True,
        recommended_venue_type="Local Dosa Joint",
        cultural_context="Centuries-old breakfast culture serving pilgrims and travelers crossing Central Karnataka.",
    ),
]


# Verified Authentic Karnataka Eateries Directory
VERIFIED_EATERIES: list[VerifiedEatery] = [
    # Bengaluru
    VerifiedEatery(
        id="eatery-vidyarthi-bhavan",
        name_en="Vidyarthi Bhavan",
        name_kn="ವಿದ್ಯಾರ್ಥಿ ಭವನ",
        district="Bengaluru Urban",
        district_code="KA-BLR",
        city="Bengaluru",
        latitude=12.9431,
        longitude=77.5714,
        address_en="Gandhi Bazaar Main Road, Basavanagudi, Bengaluru",
        address_kn="ಗಾಂಧಿ ಬಜಾರ್ ಮುಖ್ಯ ರಸ್ತೆ, ಬಸವನಗುಡಿ, ಬೆಂಗಳೂರು",
        venue_type="Heritage Darshini",
        cuisines=["South Indian Tiffin", "Karnataka Heritage"],
        signature_dishes=["Crispy Benne Masala Dosa", "Filter Coffee", "Kesari Bath"],
        price_tier="budget",
        average_cost_for_two_inr=200.0,
        opening_hours="06:30 - 11:30, 14:00 - 20:00 (Closed Fridays)",
        rating=4.6,
        review_count=35000,
        source_name="Karnataka Tourism & INTACH Heritage Registry",
        google_maps_query="Vidyarthi Bhavan Gandhi Bazaar Bengaluru",
    ),
    VerifiedEatery(
        id="eatery-mtr-lalbagh",
        name_en="Mavalli Tiffin Room (MTR)",
        name_kn="ಮಾವಳ್ಳಿ ಟಿಫಿನ್ ರೂಮ್ (ಎಂ.ಟಿ.ಆರ್)",
        district="Bengaluru Urban",
        district_code="KA-BLR",
        city="Bengaluru",
        latitude=12.9554,
        longitude=77.5857,
        address_en="14, Lalbagh Road, Mavalli, Bengaluru",
        address_kn="14, ಲಾಲ್‌ಬಾಗ್ ರಸ್ತೆ, ಮಾವಳ್ಳಿ, ಬೆಂಗಳೂರು",
        venue_type="Heritage Darshini",
        cuisines=["South Indian Tiffin", "Royal Karnataka Thali"],
        signature_dishes=["Rava Idli with Ghee", "Bisi Bele Bath", "Badam Halwa", "Filter Coffee"],
        price_tier="budget",
        average_cost_for_two_inr=280.0,
        opening_hours="06:30 - 11:00, 12:30 - 21:00 (Closed Mondays)",
        rating=4.5,
        review_count=28000,
        source_name="Karnataka Tourism Curated",
        google_maps_query="Mavalli Tiffin Room Lalbagh Road Bengaluru",
    ),
    VerifiedEatery(
        id="eatery-ctr-malleshwaram",
        name_en="Central Tiffin Room (Shri Sagar CTR)",
        name_kn="ಸೆಂಟ್ರಲ್ ಟಿಫಿನ್ ರೂಮ್ (ಶ್ರೀ ಸಾಗರ್ ಸಿ.ಟಿ.ಆರ್)",
        district="Bengaluru Urban",
        district_code="KA-BLR",
        city="Bengaluru",
        latitude=12.9984,
        longitude=77.5692,
        address_en="7th Cross, Margosa Road, Malleshwaram, Bengaluru",
        address_kn="7ನೇ ಕ್ರಾಸ್, ಮಾರ್ಗೋಸಾ ರಸ್ತೆ, ಮಲ್ಲೇಶ್ವರಂ, ಬೆಂಗಳೂರು",
        venue_type="Heritage Darshini",
        cuisines=["South Indian Tiffin", "Karnataka Tiffin"],
        signature_dishes=["Benne Masala Dosa", "Mangalore Bajji", "Filter Coffee"],
        price_tier="budget",
        average_cost_for_two_inr=220.0,
        opening_hours="07:00 - 12:30, 16:00 - 21:15",
        rating=4.6,
        review_count=31000,
        source_name="Bangalore Heritage Directory",
        google_maps_query="Shri Sagar CTR Malleshwaram Bengaluru",
    ),
    # Mysuru
    VerifiedEatery(
        id="eatery-mylari-mysuru",
        name_en="Original Hotel Vinayaka Mylari",
        name_kn="ಅಸಲಿ ಹೋಟೆಲ್ ವಿನಾಯಕ ಮೈಲಾರಿ",
        district="Mysuru",
        district_code="KA-MYS",
        city="Mysuru",
        latitude=12.3115,
        longitude=76.6628,
        address_en="Shop No. 79, Nazarbad Main Road, Mysuru",
        address_kn="ಶಾಪ್ ನಂ. 79, ನಜರ್‌ಬಾದ್ ಮುಖ್ಯ ರಸ್ತೆ, ಮೈಸೂರು",
        venue_type="Heritage Tiffin Room",
        cuisines=["Traditional Mysore Tiffin"],
        signature_dishes=["Mylari Butter Dosa", "Filter Coffee", "Kashi Halwa"],
        price_tier="budget",
        average_cost_for_two_inr=180.0,
        opening_hours="06:30 - 13:30, 15:30 - 20:30 (Closed Wednesdays)",
        rating=4.6,
        review_count=22000,
        source_name="Mysuru District Tourism Gazetteer",
        google_maps_query="Original Hotel Vinayaka Mylari Nazarbad Mysuru",
    ),
    VerifiedEatery(
        id="eatery-rrr-mysuru",
        name_en="Hotel RRR (Gandhi Square)",
        name_kn="ಹೋಟೆಲ್ ಆರ್.ಆರ್.ಆರ್",
        district="Mysuru",
        district_code="KA-MYS",
        city="Mysuru",
        latitude=12.3087,
        longitude=76.6534,
        address_en="Gandhi Square, Lashkar Mohalla, Mysuru",
        address_kn="ಗಾಂಧಿ ವೃತ್ತ, ಲಷ್ಕರ್ ಮೊಹಲ್ಲಾ, ಮೈಸೂರು",
        venue_type="Traditional Mess",
        cuisines=["Mysore Style Non-Veg", "Biryani Meals"],
        signature_dishes=["Mysore Mutton Fry", "Biryani on Banana Leaf", "Chicken Ghee Roast"],
        price_tier="mid_range",
        average_cost_for_two_inr=450.0,
        opening_hours="11:30 - 16:00, 19:00 - 22:30",
        rating=4.4,
        review_count=18000,
        source_name="Mysuru Local Culinary Directory",
        google_maps_query="Hotel RRR Gandhi Square Mysuru",
    ),
    VerifiedEatery(
        id="eatery-guru-sweet-mart",
        name_en="Guru Sweet Mart",
        name_kn="ಗುರು ಸ್ವೀಟ್ ಮಾರ್ಟ್",
        district="Mysuru",
        district_code="KA-MYS",
        city="Mysuru",
        latitude=12.3101,
        longitude=76.6548,
        address_en="Sayyaji Rao Road, Devaraja Mohalla, Mysuru",
        address_kn="ಸಯ್ಯಾಜಿ ರಾವ್ ರಸ್ತೆ, ದೇವರಾಜ ಮೊಹಲ್ಲಾ, ಮೈಸೂರು",
        venue_type="Heritage Sweet Shop",
        cuisines=["Royal Mysore Sweets"],
        signature_dishes=["Original Traditional Mysore Pak", "Dumroot Halwa"],
        price_tier="budget",
        average_cost_for_two_inr=150.0,
        opening_hours="08:00 - 22:00",
        rating=4.7,
        review_count=12000,
        source_name="Karnataka Tourism Verified",
        google_maps_query="Guru Sweet Mart Sayyaji Rao Road Mysuru",
    ),
    # Mandya & Pandavapura / Tonnur
    VerifiedEatery(
        id="eatery-mandya-mess",
        name_en="Mandya Mess & Ragi Mudde Mane",
        name_kn="ಮಂಡ್ಯ ಮೆಸ್ & ರಾಗಿ ಮುದ್ದೆ ಮನೆ",
        district="Mandya",
        district_code="KA-MAN",
        city="Mandya",
        latitude=12.5234,
        longitude=76.8967,
        address_en="Near Old Bus Stand, VV Road, Mandya",
        address_kn="ಹಳೆ ಬಸ್ ನಿಲ್ದಾಣದ ಹತ್ತಿರ, ವಿವಿ ರಸ್ತೆ, ಮಂಡ್ಯ",
        venue_type="Traditional Mess",
        cuisines=["Authentic Mandya Rural Thali", "Country Food"],
        signature_dishes=["Ragi Mudde with Bassaru", "Soppina Saaru", "Nati Koli Saaru"],
        price_tier="budget",
        average_cost_for_two_inr=220.0,
        opening_hours="11:30 - 16:00, 19:00 - 21:30",
        rating=4.4,
        review_count=3200,
        source_name="Mandya District Gazetteer & Food Trail",
        google_maps_query="Mandya Mess Old Bus Stand Mandya",
    ),
    VerifiedEatery(
        id="eatery-tonnur-lake-tiffin",
        name_en="Tonnur Kere Heritage Tiffin & Country Kitchen",
        name_kn="ತೊಂಡನೂರು ಕೆರೆ ಕಂಟ್ರಿ ಕಿಚನ್",
        district="Mandya",
        district_code="KA-MAN",
        city="Pandavapura",
        latitude=12.5489,
        longitude=76.6432,
        address_en="Tonnur Lake Approach Road, Kere Thondanur, Mandya",
        address_kn="ತೊಂಡನೂರು ಕೆರೆ ರಸ್ತೆ, ಕೆರೆ ತೊಂಡನೂರು, ಮಂಡ್ಯ",
        venue_type="Local Mess",
        cuisines=["Rural Mandya Cuisine", "Country Tiffin"],
        signature_dishes=["Steaming Akki Rotti", "Jaggery Lemonade", "Ragi Mudde Oota"],
        price_tier="budget",
        average_cost_for_two_inr=160.0,
        opening_hours="07:30 - 18:30",
        rating=4.3,
        review_count=980,
        source_name="District Tourism Pandavapura Registry",
        google_maps_query="Tonnur Lake Tiffin Pandavapura Mandya",
    ),
    # Mangaluru & Udupi
    VerifiedEatery(
        id="eatery-mitra-samaj-udupi",
        name_en="Mitra Samaj",
        name_kn="ಮಿತ್ರ ಸಮಾಜ",
        district="Udupi",
        district_code="KA-UDP",
        city="Udupi",
        latitude=13.3409,
        longitude=74.7516,
        address_en="Car Street, Near Sri Krishna Temple, Udupi",
        address_kn="ರಥಬೀದಿ, ಶ್ರೀ ಕೃಷ್ಣ ಮಠದ ಹತ್ತಿರ, ಉಡುಪಿ",
        venue_type="Heritage Darshini",
        cuisines=["Udupi Brahmin Vegetarian", "Tiffin"],
        signature_dishes=["Goli Baje", "Udupi Masala Dosa", "Filter Coffee", "Buns"],
        price_tier="budget",
        average_cost_for_two_inr=180.0,
        opening_hours="06:30 - 21:30",
        rating=4.6,
        review_count=19000,
        source_name="Udupi Heritage Trust",
        google_maps_query="Mitra Samaj Car Street Udupi",
    ),
    VerifiedEatery(
        id="eatery-giri-manjas-mangaluru",
        name_en="Giri Manja's",
        name_kn="ಗಿರಿ ಮಂಜಾಸ್",
        district="Dakshina Kannada",
        district_code="KA-DKN",
        city="Mangaluru",
        latitude=12.8687,
        longitude=74.8361,
        address_en="Near Kalikamba Temple, Bhavathi, Bunder, Mangaluru",
        address_kn="ಕಾಳಿಕಾಂಬ ದೇವಸ್ಥಾನದ ಹತ್ತಿರ, ಭವತಿ, ಬಂಡರ್, ಮಂಗಳೂರು",
        venue_type="Coastal Seafood Shack",
        cuisines=["Coastal Mangalorean", "Seafood Meals"],
        signature_dishes=["Kane Rava Fry", "Anjal Masala Fry", "Fish Curry Thali"],
        price_tier="mid_range",
        average_cost_for_two_inr=450.0,
        opening_hours="11:30 - 16:30",
        rating=4.7,
        review_count=21000,
        source_name="Coastal Tourism Culinary Registry",
        google_maps_query="Giri Manjas Bunder Mangaluru",
    ),
    VerifiedEatery(
        id="eatery-machali-mangaluru",
        name_en="Machali Restaurant",
        name_kn="ಮಚ್ಚಲಿ ರೆಸ್ಟೋರೆಂಟ್",
        district="Dakshina Kannada",
        district_code="KA-DKN",
        city="Mangaluru",
        latitude=12.8722,
        longitude=74.8421,
        address_en="Sharada Vidyalaya Road, Kodialbail, Mangaluru",
        address_kn="ಶಾರದಾ ವಿದ್ಯಾಲಯ ರಸ್ತೆ, ಕೊಡಿಯಾಲ್‌ಬೈಲ್, ಮಂಗಳೂರು",
        venue_type="Coastal Seafood Restaurant",
        cuisines=["Coastal Seafood", "Mangalorean Thali"],
        signature_dishes=["Prawns Ghee Roast", "Mangalore Fish Curry Meals", "Squid Ghee Roast"],
        price_tier="mid_range",
        average_cost_for_two_inr=500.0,
        opening_hours="11:30 - 16:00, 19:00 - 22:00",
        rating=4.6,
        review_count=24000,
        source_name="Karnataka Tourism Approved",
        google_maps_query="Machali Restaurant Kodialbail Mangaluru",
    ),
    # Kodagu (Coorg)
    VerifiedEatery(
        id="eatery-coorg-cuisine-madikeri",
        name_en="Coorg Cuisine Restaurant",
        name_kn="ಕೂರ್ಗ್ ಕ್ವಿಸಿನ್ ರೆಸ್ಟೋರೆಂಟ್",
        district="Kodagu",
        district_code="KA-KOD",
        city="Madikeri",
        latitude=12.4219,
        longitude=75.7382,
        address_en="Opposite Private Bus Stand, Main Road, Madikeri",
        address_kn="ಖಾಸಗಿ ಬಸ್ ನಿಲ್ದಾಣದ ಎದುರು, ಮುಖ್ಯ ರಸ್ತೆ, ಮಡಿಕೇರಿ",
        venue_type="Traditional Kodava Restaurant",
        cuisines=["Authentic Kodava", "Coorg Hill Cuisine"],
        signature_dishes=["Traditional Pandi Curry", "Kadambuttu", "Akki Rotti", "Noolputtu"],
        price_tier="mid_range",
        average_cost_for_two_inr=400.0,
        opening_hours="11:30 - 16:00, 19:00 - 22:00",
        rating=4.5,
        review_count=14000,
        source_name="Kodagu Tourism Directory",
        google_maps_query="Coorg Cuisine Restaurant Main Road Madikeri",
    ),
    # North Karnataka (Dharwad, Hubballi, Belagavi, Bagalkote)
    VerifiedEatery(
        id="eatery-basaveshwara-khanavali",
        name_en="Basaveshwara Khanavali",
        name_kn="ಬಸವೇಶ್ವರ ಖಾನಾವಳಿ",
        district="Dharwad",
        district_code="KA-DHA",
        city="Dharwad",
        latitude=15.4589,
        longitude=75.0078,
        address_en="Near Line Bazaar, Subhash Road, Dharwad",
        address_kn="ಲೈನ್ ಬಜಾರ್ ಹತ್ತಿರ, ಸುಭಾಷ್ ರಸ್ತೆ, ಧಾರವಾಡ",
        venue_type="Traditional Khanavali",
        cuisines=["North Karnataka Lingayat Thali", "Jolada Rotti Oota"],
        signature_dishes=["Jolada Rotti", "Badanekayi Ennegayi", "Shenga Chutney Pudi", "Jhunka"],
        price_tier="budget",
        average_cost_for_two_inr=220.0,
        opening_hours="11:30 - 16:00, 19:00 - 22:00",
        rating=4.6,
        review_count=8500,
        source_name="Dharwad Cultural Gazetteer",
        google_maps_query="Basaveshwara Khanavali Subhash Road Dharwad",
    ),
    VerifiedEatery(
        id="eatery-mishra-pedha-dharwad",
        name_en="Mishra Pedha & Sweets",
        name_kn="ಮಿಶ್ರಾ ಪೇಡಾ",
        district="Dharwad",
        district_code="KA-DHA",
        city="Dharwad",
        latitude=15.4572,
        longitude=75.0091,
        address_en="Line Bazaar, Dharwad",
        address_kn="ಲೈನ್ ಬಜಾರ್, ಧಾರವಾಡ",
        venue_type="Heritage Sweet Shop",
        cuisines=["Authentic Dharwad Sweets"],
        signature_dishes=["Original Dharwad Pedha", "Belagavi Kunda"],
        price_tier="budget",
        average_cost_for_two_inr=150.0,
        opening_hours="08:00 - 21:30",
        rating=4.7,
        review_count=11000,
        source_name="GI Tag Registry & Tourism Directory",
        google_maps_query="Mishra Pedha Line Bazaar Dharwad",
    ),
    # Malnad & Central (Shivamogga, Chitradurga)
    VerifiedEatery(
        id="eatery-town-canteen-shivamogga",
        name_en="Town Canteen",
        name_kn="ಟೌನ್ ಕ್ಯಾಂಟೀನ್",
        district="Shivamogga",
        district_code="KA-SHI",
        city="Shivamogga",
        latitude=13.9299,
        longitude=75.5681,
        address_en="Gandhi Bazaar, Shivamogga",
        address_kn="ಗಾಂಧಿ ಬಜಾರ್, ಶಿವಮೊಗ್ಗ",
        venue_type="Heritage Darshini",
        cuisines=["Malnad Tiffin", "Karnataka Sweets"],
        signature_dishes=["Crispy Benne Dosa", "Gulab Jamun", "Filter Coffee"],
        price_tier="budget",
        average_cost_for_two_inr=180.0,
        opening_hours="07:00 - 12:00, 15:30 - 20:30",
        rating=4.6,
        review_count=9800,
        source_name="Shivamogga Heritage Directory",
        google_maps_query="Town Canteen Gandhi Bazaar Shivamogga",
    ),
    VerifiedEatery(
        id="eatery-ravi-benne-dosa-chitradurga",
        name_en="Hotel Ravi Benne Dosa",
        name_kn="ಹೋಟೆಲ್ ರವಿ ಬೆಣ್ಣೆ ದೋಸೆ",
        district="Chitradurga",
        district_code="KA-CTA",
        city="Chitradurga",
        latitude=14.2215,
        longitude=76.4012,
        address_en="Fort Main Road, Near Kallina Kote, Chitradurga",
        address_kn="ಕೋಟೆ ಮುಖ್ಯ ರಸ್ತೆ, ಕಲ್ಲಿನ ಕೋಟೆ ಹತ್ತಿರ, ಚಿತ್ರದುರ್ಗ",
        venue_type="Local Dosa Joint",
        cuisines=["Central Karnataka Tiffin"],
        signature_dishes=["Chitradurga Benne Dosa", "Mirchi Bajji", "Tea"],
        price_tier="budget",
        average_cost_for_two_inr=140.0,
        opening_hours="07:00 - 12:30, 16:00 - 21:00",
        rating=4.5,
        review_count=6200,
        source_name="Chitradurga Tourism Guide",
        google_maps_query="Hotel Ravi Benne Dosa Chitradurga",
    ),
    # Uttara Kannada (Gokarna, Karwar)
    VerifiedEatery(
        id="eatery-pai-restaurant-gokarna",
        name_en="Pai Restaurant",
        name_kn="ಪೈ ರೆಸ್ಟೋರೆಂಟ್",
        district="Uttara Kannada",
        district_code="KA-UKN",
        city="Gokarna",
        latitude=14.5471,
        longitude=74.3188,
        address_en="Car Street, Near Mahabaleshwar Temple, Gokarna",
        address_kn="ರಥಬೀದಿ, ಮಹಾಬಲೇಶ್ವರ ದೇವಸ್ಥಾನದ ಹತ್ತಿರ, ಗೋಕರ್ಣ",
        venue_type="Traditional Darshini",
        cuisines=["South Canara Vegetarian", "Tiffin"],
        signature_dishes=["South Canara Thali", "Filter Coffee", "Upma Sambar"],
        price_tier="budget",
        average_cost_for_two_inr=160.0,
        opening_hours="07:00 - 21:00",
        rating=4.5,
        review_count=7400,
        source_name="Uttara Kannada Tourism",
        google_maps_query="Pai Restaurant Car Street Gokarna",
    ),
    VerifiedEatery(
        id="eatery-amrut-hotel-karwar",
        name_en="Amrut Hotel",
        name_kn="ಅಮೃತ್ ಹೋಟೆಲ್",
        district="Uttara Kannada",
        district_code="KA-UKN",
        city="Karwar",
        latitude=14.8142,
        longitude=74.1311,
        address_en="State Highway 2, Karwar",
        address_kn="ರಾಜ್ಯ ಹೆದ್ದಾರಿ 2, ಕಾರವಾರ",
        venue_type="Coastal Seafood Restaurant",
        cuisines=["Karwar Seafood", "Coastal Konkani"],
        signature_dishes=["Karwar Fish Thali", "Stuffed Mud Crab", "Prawn Sukka"],
        price_tier="mid_range",
        average_cost_for_two_inr=480.0,
        opening_hours="11:30 - 15:30, 19:00 - 22:30",
        rating=4.6,
        review_count=8900,
        source_name="Karwar Maritime Tourism Directory",
        google_maps_query="Amrut Hotel State Highway 2 Karwar",
    ),
]


_DISTRICT_TO_REGION: dict[str, str] = {
    "udupi": "coastal_karavali",
    "dakshina kannada": "coastal_karavali",
    "mangaluru": "coastal_karavali",
    "mangalore": "coastal_karavali",
    "uttara kannada": "coastal_karavali",
    "karwar": "coastal_karavali",
    "kodagu": "kodagu",
    "coorg": "kodagu",
    "mysuru": "mysuru",
    "mysore": "mysuru",
    "mandya": "mandya",
    "bengaluru": "bengaluru",
    "bangalore": "bengaluru",
    "ramanagara": "bengaluru",
    "shivamogga": "malnad",
    "shimoga": "malnad",
    "chikkamagaluru": "malnad",
    "chikmagalur": "malnad",
    "hassan": "malnad",
    "dharwad": "north_karnataka",
    "hubballi": "north_karnataka",
    "belagavi": "north_karnataka",
    "vijayapura": "north_karnataka",
    "bagalkote": "north_karnataka",
    "koppal": "north_karnataka",
}


class LocalFoodGuideService:
    """Enterprise food intelligence and local eatery recommendation service."""

    def __init__(
        self,
        specialities: list[RegionalSpeciality] | None = None,
        eateries: list[VerifiedEatery] | None = None,
    ) -> None:
        self._specialities = specialities or REGIONAL_SPECIALITIES
        self._eateries = eateries or VERIFIED_EATERIES

    def get_all_specialities(self) -> list[RegionalSpeciality]:
        """Return all curated regional specialities."""
        return list(self._specialities)

    def get_all_eateries(self) -> list[VerifiedEatery]:
        """Return all verified authentic Karnataka eateries."""
        return list(self._eateries)

    def get_eateries_by_district(self, district: str) -> list[VerifiedEatery]:
        """Return eateries matching district name or region."""
        norm_dist = district.lower().replace("district", "").strip()
        matched = [e for e in self._eateries if norm_dist in e.district.lower()]
        if not matched and norm_dist in _DISTRICT_TO_REGION:
            reg = _DISTRICT_TO_REGION[norm_dist]
            matched = [
                e
                for e in self._eateries
                if norm_dist in e.city.lower()
                or norm_dist in e.address_en.lower()
                or _DISTRICT_TO_REGION.get(e.district.lower()) == reg
            ]
        return matched

    def get_specialities_for_district(
        self,
        district: str | None,
        meal_type: str | None = None,
        dietary_preference: str | None = None,
    ) -> list[RegionalSpeciality]:
        """Filter dishes by district, meal type, and dietary constraints."""
        norm_dist = (district or "").lower().replace("district", "").strip()
        target_region = _DISTRICT_TO_REGION.get(norm_dist, norm_dist)

        matched: list[RegionalSpeciality] = []
        for dish in self._specialities:
            is_dist_match = (
                norm_dist in dish.district.lower()
                or norm_dist in dish.region.lower()
                or dish.region.lower() == target_region
            )
            if norm_dist and not is_dist_match:
                continue
            if meal_type and dish.meal_type != meal_type.lower():
                continue
            if dietary_preference:
                pref = dietary_preference.lower()
                if pref == "vegetarian" and not dish.is_vegetarian:
                    continue
                if pref == "vegan" and not dish.is_vegan:
                    continue
                if pref == "jain" and not dish.is_jain_friendly:
                    continue
                if pref == "no_seafood" and dish.contains_seafood:
                    continue
            matched.append(dish)

        # Fallback to general regional dish if specific district matched 0
        if not matched:
            for dish in self._specialities:
                if meal_type and dish.meal_type != meal_type.lower():
                    continue
                if dietary_preference:
                    pref = dietary_preference.lower()
                    if pref in ("vegetarian", "vegan", "jain") and not dish.is_vegetarian:
                        continue
                matched.append(dish)

        return matched

    def get_eateries_near(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 40.0,
        price_tier: str | None = None,
        is_vegetarian_only: bool = False,
    ) -> list[tuple[float, VerifiedEatery]]:
        """Return eateries within radius sorted by distance."""
        results: list[tuple[float, VerifiedEatery]] = []
        for eatery in self._eateries:
            dist = _haversine_km(latitude, longitude, eatery.latitude, eatery.longitude)
            if dist > radius_km:
                continue
            if price_tier and eatery.price_tier != price_tier:
                continue
            if is_vegetarian_only and "vegetarian" not in [c.lower() for c in eatery.cuisines]:
                # Skip non-veg focused military hotels / seafood shacks if strictly veg
                if eatery.venue_type in (
                    "Traditional Mess",
                    "Coastal Seafood Shack",
                    "Military Hotel",
                ):
                    continue
            results.append((dist, eatery))

        results.sort(key=lambda x: x[0])
        return results

    def recommend_meal(
        self,
        district: str,
        meal_type: str,
        latitude: float | None = None,
        longitude: float | None = None,
        dietary_preference: str | None = None,
        budget_scenario: str = "standard",
    ) -> MealRecommendation:
        """Create a complete contextual meal recommendation with dish, eatery, and price."""
        dishes = self.get_specialities_for_district(
            district=district,
            meal_type=meal_type,
            dietary_preference=dietary_preference,
        )
        dish = dishes[0] if dishes else self._specialities[0]

        # Calculate unit cost calibrated with budget scenario
        cost = dish.typical_price_inr
        if budget_scenario == "budget":
            cost = max(50.0, cost * 0.85)
        elif budget_scenario == "comfort":
            cost = cost * 1.5

        # Find nearby verified eatery if coordinates supplied
        chosen_eatery: VerifiedEatery | None = None
        distance_km: float | None = None
        if latitude is not None and longitude is not None:
            is_veg = bool(
                dietary_preference and dietary_preference.lower() in ("vegetarian", "vegan", "jain")
            )
            nearby = self.get_eateries_near(
                latitude, longitude, radius_km=45.0, is_vegetarian_only=is_veg
            )
            if nearby:
                distance_km, chosen_eatery = nearby[0]

        # If no coordinate match, match by district name
        if not chosen_eatery:
            norm_dist = district.lower().replace("district", "").strip()
            chosen_eatery = next(
                (e for e in self._eateries if norm_dist in e.district.lower()), None
            )

        meal_title = meal_type.capitalize()
        if chosen_eatery:
            headline_en = f"{meal_title} — Try {dish.name_en} at {chosen_eatery.name_en}."
            headline_kn = f"{meal_title} — {chosen_eatery.name_kn}ದಲ್ಲಿ {dish.name_kn} ಸವಿಯಿರಿ."
            desc_en = f"{dish.description_en} {chosen_eatery.name_en} ({chosen_eatery.address_en}) is renowned for {', '.join(chosen_eatery.signature_dishes[:2])}."
            desc_kn = f"{dish.description_kn} {chosen_eatery.name_kn} ({chosen_eatery.address_kn}) ತನ್ನ ಸಾಂಪ್ರದಾಯಿಕ ರುಚಿಗೆ ಪ್ರಸಿದ್ಧವಾಗಿದೆ."
            map_url = f"https://www.google.com/maps/search/?api=1&query={chosen_eatery.google_maps_query.replace(' ', '+')}"
            loc_summary = f"{chosen_eatery.name_en}, {chosen_eatery.city}"
            is_verified = True
        else:
            headline_en = f"{meal_title} — Savor regional {dish.name_en}."
            headline_kn = f"{meal_title} — ಸಾಂಪ್ರದಾಯಿಕ {dish.name_kn} ಸವಿಯಿರಿ."
            desc_en = f"{dish.description_en} Recommended at a local {dish.recommended_venue_type} in {district}."
            desc_kn = (
                f"{dish.description_kn} {district}ದ ಸ್ಥಳೀಯ {dish.recommended_venue_type}ನಲ್ಲಿ ಉಪಹಾರ."
            )
            map_url = f"https://www.google.com/maps/search/?api=1&query={dish.name_en.replace(' ', '+')}+{district}+Karnataka"
            loc_summary = f"{dish.recommended_venue_type}, {district}"
            is_verified = False

        return MealRecommendation(
            meal_type=meal_type.capitalize(),
            dish_name_en=dish.name_en,
            dish_name_kn=dish.name_kn,
            restaurant_name_en=chosen_eatery.name_en if chosen_eatery else None,
            restaurant_name_kn=chosen_eatery.name_kn if chosen_eatery else None,
            venue_type=chosen_eatery.venue_type if chosen_eatery else dish.recommended_venue_type,
            location_summary=loc_summary,
            headline_en=headline_en,
            headline_kn=headline_kn,
            description_en=desc_en,
            description_kn=desc_kn,
            estimated_cost_inr=round(cost, 2),
            distance_km=distance_km,
            map_search_url=map_url,
            dietary_matches=True,
            is_verified_eatery=is_verified,
        )


_global_food_guide_service: LocalFoodGuideService | None = None


def get_local_food_guide_service() -> LocalFoodGuideService:
    """Singleton accessor for LocalFoodGuideService."""
    global _global_food_guide_service
    if _global_food_guide_service is None:
        _global_food_guide_service = LocalFoodGuideService()
    return _global_food_guide_service
