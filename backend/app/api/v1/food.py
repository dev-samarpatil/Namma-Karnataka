"""Regional Food and Culinary Intelligence API endpoints.

Provides Karnataka regional signature dishes, dietary safety checks, and
authentic local eatery pricing across the distinct culinary regions.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.food_recommendation import (
    CulinaryRegion,
    RegionalDish,
    get_food_recommendation_service,
)
from app.services.local_food_guide import (
    MealRecommendation,
    RegionalSpeciality,
    VerifiedEatery,
    get_local_food_guide_service,
)

router = APIRouter(prefix="/food", tags=["Regional Food"])


@router.get("/recommendations", response_model=list[RegionalDish])
def get_food_recommendations(
    district: str | None = Query(None, description="Karnataka district name"),
    meal_type: str | None = Query(None, description="breakfast, lunch, dinner, or snack"),
    dietary_preference: str | None = Query(
        None, description="veg, vegan, jain, non_veg, no_seafood"
    ),
    max_cost_inr: float | None = Query(None, ge=10.0, description="Max cost in INR"),
    limit: int = Query(6, ge=1, le=20, description="Max results"),
) -> list[RegionalDish]:
    """Retrieve authentic region-specific dishes and typical local venues."""
    svc = get_food_recommendation_service()
    return svc.get_recommendations(
        district_name=district,
        meal_type=meal_type,
        dietary_preference=dietary_preference,
        max_cost_inr=max_cost_inr,
        limit=limit,
    )


@router.get("/regions")
def get_culinary_regions() -> list[dict[str, str]]:
    """Return the 8 authentic Karnataka culinary regions."""
    return [{"id": r.value, "label": r.name.replace("_", " ").title()} for r in CulinaryRegion]


@router.get("/specialities", response_model=list[RegionalSpeciality])
def get_regional_specialities(
    district: str | None = Query(None, description="Karnataka district name"),
    meal_type: str | None = Query(None, description="breakfast, lunch, dinner, snack"),
    dietary_preference: str | None = Query(None, description="vegetarian, vegan, jain, non_veg"),
) -> list[RegionalSpeciality]:
    """Retrieve verified regional Karnataka dishes."""
    svc = get_local_food_guide_service()
    if district:
        return svc.get_specialities_for_district(
            district=district,
            meal_type=meal_type,
            dietary_preference=dietary_preference,
        )
    return svc.get_all_specialities()


@router.get("/eateries", response_model=list[VerifiedEatery])
def get_verified_eateries(
    district: str | None = Query(None, description="District name"),
    lat: float | None = Query(None, ge=11.0, le=19.0, description="Latitude"),
    lon: float | None = Query(None, ge=74.0, le=79.0, description="Longitude"),
    radius_km: float = Query(45.0, ge=1.0, le=150.0, description="Radius in km"),
    price_tier: str | None = Query(None, description="budget, mid_range, premium"),
    is_vegetarian_only: bool = Query(False, description="Filter for vegetarian venues"),
) -> list[VerifiedEatery]:
    """Retrieve verified authentic local eateries and messes."""
    svc = get_local_food_guide_service()
    if lat is not None and lon is not None:
        nearby = svc.get_eateries_near(
            latitude=lat,
            longitude=lon,
            radius_km=radius_km,
            price_tier=price_tier,
            is_vegetarian_only=is_vegetarian_only,
        )
        return [eatery for _, eatery in nearby]
    if district:
        return svc.get_eateries_by_district(district)
    return svc.get_all_eateries()


@router.get("/recommendation", response_model=MealRecommendation)
def get_meal_recommendation(
    district: str = Query("Bengaluru Urban", description="Karnataka district"),
    meal_type: str = Query("lunch", description="breakfast, lunch, dinner"),
    lat: float | None = Query(None, ge=11.0, le=19.0, description="Current latitude"),
    lon: float | None = Query(None, ge=74.0, le=79.0, description="Current longitude"),
    dietary_preference: str | None = Query(None, description="vegetarian, vegan, jain"),
    budget_scenario: str = Query("standard", description="budget, standard, comfort"),
) -> MealRecommendation:
    """Generate a single contextual meal recommendation with dish, verified eatery, and map action."""
    svc = get_local_food_guide_service()
    return svc.recommend_meal(
        district=district,
        meal_type=meal_type,
        latitude=lat,
        longitude=lon,
        dietary_preference=dietary_preference,
        budget_scenario=budget_scenario,
    )
