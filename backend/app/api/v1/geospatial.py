"""Geospatial Intelligence API Router.
Provides real-data endpoints for arbitrary coordinate inspection in India:
1. Environmental & Solar Profile (NASA POWER + Open-Meteo + IMD)
2. Real OpenStreetMap Building Footprints (Overpass API)
3. Open-Area & Ground-Mount Solar Screening
4. Deterministic Sun Position & Ephemeris
"""
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.geospatial.environmental_profile import (
    generate_environmental_profile,
    generate_open_area_screening
)
from app.services.geospatial.osm_buildings import fetch_osm_buildings
from app.services.solar.sun_position import calculate_sun_position

router = APIRouter(prefix="/geospatial")
logger = logging.getLogger(__name__)


def validate_coordinates(lat: float, lng: float):
    if not (-90.0 <= lat <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Latitude {lat} is out of bounds (-90 to 90)."
        )
    if not (-180.0 <= lng <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Longitude {lng} is out of bounds (-180 to 180)."
        )


@router.get("/environmental-profile", response_model=Dict[str, Any])
async def get_environmental_profile(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    db: Session = Depends(get_db)
):
    """Retrieve verified environmental profile (NASA POWER GHI/DNI/DHI, Open-Meteo
    temperature/wind/humidity/cloud, deterministic sun position, and AI suitability)
    for any geographic coordinate.
    """
    validate_coordinates(lat, lng)
    return await generate_environmental_profile(lat, lng, db)


@router.get("/buildings", response_model=Dict[str, Any])
async def get_osm_buildings(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    radius_m: int = Query(250, ge=50, le=1000, description="Search radius in meters (50 to 1000)")
):
    """Retrieve real OpenStreetMap mapped building footprints and polygon boundaries
    surrounding the target coordinate. Calculates gross and usable roof areas and PV capacity.
    Strictly avoids synthetic fake data when unmapped.
    """
    validate_coordinates(lat, lng)
    return await fetch_osm_buildings(lat, lng, radius_m)


@router.get("/open-area-screening", response_model=Dict[str, Any])
async def get_open_area_screening(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    db: Session = Depends(get_db)
):
    """Evaluates utility-scale / open-area solar feasibility for given coordinates.
    Includes slope screening, wasteland indicator, and explicit regulatory/grid disclaimers.
    """
    validate_coordinates(lat, lng)
    return await generate_open_area_screening(lat, lng, db)


@router.get("/sun-position", response_model=Dict[str, Any])
def get_sun_position(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees"),
    tz_offset_hours: float = Query(5.5, description="Timezone offset from UTC (default 5.5 for IST)")
):
    """Calculates deterministic solar elevation, zenith, azimuth, sunrise, sunset,
    and day length using NOAA/Spencer solar ephemeris equations.
    """
    validate_coordinates(lat, lng)
    return calculate_sun_position(lat, lng, tz_offset_hours=tz_offset_hours)
