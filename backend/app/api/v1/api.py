from fastapi import APIRouter
from app.api.v1 import (
    health,
    projects,
    buildings,
    solar,
    optimization,
    energy,
    scheduling,
    recommendations,
    reports,
    geocoding,
    system,
    inspections,
    monitoring,
    maintenance
)

api_router = APIRouter()

from app.api.v1 import features
api_router.include_router(features.router, tags=["Solar Feature Assessments"])

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(system.router, tags=["System Integrations"])
api_router.include_router(projects.router, tags=["Projects"])
api_router.include_router(buildings.router, tags=["Buildings"])
api_router.include_router(solar.router, tags=["Solar Analysis"])
api_router.include_router(optimization.router, tags=["Budget Optimization"])
api_router.include_router(energy.router, tags=["Energy Insights & Surplus"])
api_router.include_router(scheduling.router, tags=["Smart Electricity Scheduling"])
api_router.include_router(recommendations.router, tags=["Smart Recommendations"])
api_router.include_router(reports.router, tags=["Reports"])
api_router.include_router(geocoding.router, tags=["Geocoding"])
api_router.include_router(inspections.router, tags=["Panel Inspection & Diagnostics"])
api_router.include_router(monitoring.router, tags=["Inverter Telemetry & Degradation"])
api_router.include_router(maintenance.router, tags=["Maintenance Cases"])
