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
