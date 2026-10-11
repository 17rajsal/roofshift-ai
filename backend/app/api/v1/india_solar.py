"""India Solar Intelligence API Router.
Provides public endpoints for India-scale geospatial solar opportunity,
environmental intelligence layers, and AI suitability assessments.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, status
from app.services.solar.india_solar_intelligence import (
    get_all_regions,
    get_region_by_id,
    compute_national_summary,
    get_sample_campus_metadata,
    get_scoring_methodology
)

router = APIRouter(prefix="/solar-intelligence")


@router.get("/summary", response_model=Dict[str, Any])
def get_national_solar_summary():
    """Retrieve aggregate national solar metrics across India.
    Includes total rooftop potential, open-land potential, average GHI/DNI,
    and top opportunity states.
    """
    return compute_national_summary()


@router.get("/regions", response_model=List[Dict[str, Any]])
def list_india_solar_regions(
    zone: Optional[str] = Query(None, description="Filter by geographical zone (e.g. Arid, Deccan, Gangetic)"),
    min_suitability: Optional[int] = Query(None, ge=0, le=100, description="Minimum AI suitability composite score"),
    search: Optional[str] = Query(None, description="Search query matching region name, short code, or corridor")
):
    """Retrieve list of Indian States & Union Territories with comprehensive
    solar irradiance, ambient heat, wind speed, cloud factor, and AI suitability metrics.
    """
    return get_all_regions(zone_filter=zone, min_suitability=min_suitability, search_query=search)


@router.get("/regions/{region_id}", response_model=Dict[str, Any])
def get_india_solar_region_detail(region_id: str):
    """Retrieve deep-dive solar climatology profile and AI engineering recommendations
    for a specific Indian state or solar corridor.
    """
    region = get_region_by_id(region_id)
    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Solar region '{region_id}' not found in India database."
        )
    return region


@router.get("/sample-campus", response_model=Dict[str, Any])
def get_sample_campus_info():
    """Return metadata about the optional Sample Campus Demo (BITS Pilani)
    demonstrating building-level 3D polygon PV sizing.
    """
    return get_sample_campus_metadata()


@router.get("/methodology", response_model=Dict[str, Any])
def get_solar_intelligence_methodology():
    """Retrieve full engineering methodology, multi-variable formulas,
    provenance datasets, geographic resolution, and limitations.
    """
    return get_scoring_methodology()


@router.get("/environmental-profile", response_model=Dict[str, Any])
async def get_solar_environmental_profile(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
):
    """Retrieve coordinate-level environmental profile with solar irradiance,
    meteorological data, deterministic sun position, and AI suitability.
    """
    from app.core.database import SessionLocal
    from app.services.geospatial.environmental_profile import generate_environmental_profile
    db = SessionLocal()
    try:
        return await generate_environmental_profile(lat, lng, db)
    finally:
        db.close()


@router.get("/buildings", response_model=Dict[str, Any])
async def get_solar_osm_buildings(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    radius_m: int = Query(250, ge=50, le=1000, description="Search radius in meters")
):
    """Retrieve real OpenStreetMap mapped building footprints and solar PV potential."""
    from app.services.geospatial.osm_buildings import fetch_osm_buildings
    return await fetch_osm_buildings(lat, lng, radius_m)


@router.get("/open-area-screening", response_model=Dict[str, Any])
async def get_solar_open_area_screening(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees")
):
    """Evaluates utility-scale open area suitability with legal and grid disclaimers."""
    from app.core.database import SessionLocal
    from app.services.geospatial.environmental_profile import generate_open_area_screening
    db = SessionLocal()
    try:
        return await generate_open_area_screening(lat, lng, db)
    finally:
        db.close()
