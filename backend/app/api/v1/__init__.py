from fastapi import APIRouter

from app.api.v1.destinations import router as destinations_router
from app.api.v1.health import router as health_router
from app.api.v1.places import router as places_router
from app.api.v1.planning import router as planning_router
from app.api.v1.transit import router as transit_router
from app.api.v1.trips import router as trips_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(destinations_router)
api_v1_router.include_router(places_router)
api_v1_router.include_router(planning_router)
api_v1_router.include_router(transit_router)
api_v1_router.include_router(trips_router)

