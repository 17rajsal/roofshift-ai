"""Comprehensive verification of the Real Geospatial Intelligence Pipeline:
1. Environmental Profile (NASA POWER GHI, Open-Meteo Climatology, Sun Ephemeris)
2. OpenStreetMap Building Footprints Adapter & Transparent Empty Status
3. Deterministic Sun Position & Ephemeris
4. Open-Area & Utility Solar Feasibility Screening with Regulatory Disclaimers
5. Validation across 10 diverse Indian geographies.
"""
import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

TEN_INDIAN_LOCATIONS = [
    {"city": "Delhi", "lat": 28.6139, "lng": 77.2090, "expected_zone": "North Arid / Gangetic Basin"},
    {"city": "Jaipur", "lat": 26.9124, "lng": 75.7873, "expected_zone": "North-West Arid"},
    {"city": "Ahmedabad", "lat": 23.0225, "lng": 72.5714, "expected_zone": "Western Arid Coastal"},
    {"city": "Mumbai", "lat": 19.0760, "lng": 72.8777, "expected_zone": "Western Coastal Wet"},
    {"city": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "expected_zone": "Southern Deccan Plateau"},
    {"city": "Chennai", "lat": 13.0827, "lng": 80.2707, "expected_zone": "Southern Coastal Tropical"},
    {"city": "Hyderabad", "lat": 17.3850, "lng": 78.4867, "expected_zone": "Deccan Semi-Arid"},
    {"city": "Lucknow", "lat": 26.8467, "lng": 80.9462, "expected_zone": "Gangetic Plain"},
    {"city": "Leh", "lat": 34.1526, "lng": 77.5771, "expected_zone": "Trans-Himalayan Cold Desert"},
    {"city": "Jaisalmer Rural", "lat": 26.9157, "lng": 70.9083, "expected_zone": "North-West Arid"}
]


def test_sun_position_deterministic():
    """Sun position must return physically valid elevation, azimuth, sunrise, and sunset."""
    res = client.get("/api/v1/geospatial/sun-position?lat=28.6139&lng=77.2090")
    assert res.status_code == 200
    data = res.json()
    assert -90.0 <= data["solar_elevation_deg"] <= 90.0
    assert 0.0 <= data["solar_azimuth_deg"] <= 360.0
    assert 0.0 <= data["solar_noon_elevation_deg"] <= 90.0
    assert "IST" in data["sunrise_time"]
    assert "IST" in data["sunset_time"]
    assert 8.0 <= data["day_length_hours"] <= 16.0
    assert "unavailable" in data["shading_assessment_status"]
    assert "LiDAR" in data["shading_limitation_notice"]


def test_environmental_profile_across_ten_cities():
    """Verifies that arbitrary coordinates in 10 diverse Indian cities return valid profiles."""
    for loc in TEN_INDIAN_LOCATIONS:
        lat, lng = loc["lat"], loc["lng"]
        res = client.get(f"/api/v1/geospatial/environmental-profile?lat={lat}&lng={lng}")
        assert res.status_code == 200, f"Failed for {loc['city']}: {res.text}"
        data = res.json()

        assert data["status"] == "success"
        assert data["in_india_bounds"] is True
        assert data["nearest_region"]["name"] is not None

        # Solar irradiance
        irr = data["solar_irradiance"]
        assert 3.0 <= irr["ghi_daily_kwh"] <= 7.5
        assert irr["dni_daily_kwh"] > 0
        assert irr["dhi_daily_kwh"] > 0
        assert len(irr["monthly_ghi"]) == 12
        assert 1000.0 <= irr["annual_yield_kwh_per_kwp"] <= 2200.0

        # Meteorological
        met = data["meteorological_conditions"]
        assert -20.0 <= met["ambient_temperature_celsius"] <= 55.0
        assert 0.0 <= met["wind_speed_ms"] <= 30.0
        assert 0.0 <= met["relative_humidity_pct"] <= 100.0
        assert 0.0 <= met["cloud_cover_pct"] <= 100.0

        # Sun position
        sun = data["sun_ephemeris"]
        assert -90.0 <= sun["solar_elevation_deg"] <= 90.0
        assert 0.0 <= sun["solar_azimuth_deg"] <= 360.0

        # AI suitability
        suit = data["ai_suitability"]
        assert 30.0 <= suit["rooftop_suitability_score"] <= 100.0
        assert 30.0 <= suit["open_land_suitability_score"] <= 100.0
        assert suit["tier"] in ["A+", "A", "B+", "B", "C+", "C"]

        # Shading limitation disclaimer
        assert "shading_disclaimer" in data


def test_open_area_screening():
    """Open-area utility solar screening returns slope, wasteland indicators, and legal caveats."""
    res = client.get("/api/v1/geospatial/open-area-screening?lat=26.9124&lng=75.7873")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "success"
    assert data["nearest_region_name"] == "Rajasthan"
    assert "screening_metrics" in data
    assert data["screening_metrics"]["daily_ghi_kwh"] >= 5.0
    assert "CTU/STU" in data["regulatory_and_grid_disclaimer"]
    assert "Section 143/CLU" in data["regulatory_and_grid_disclaimer"]


def test_osm_buildings_transparent_empty_handling():
    """If coordinate has no mapped OSM footprints, API must be truthful and NOT synthesize fake buildings."""
    # Remote Thar desert coordinate with zero OSM buildings
    res = client.get("/api/v1/geospatial/buildings?lat=27.1234&lng=71.1234&radius_m=100")
    assert res.status_code == 200
    data = res.json()

    assert data["source"] is not None
    # If empty, must clearly state so
    if data["status"] == "empty":
        assert data["building_count"] == 0
        assert len(data["buildings"]) == 0
        assert "No mapped building footprints" in data["message"]
        assert "Draw custom roof polygon" in data["action_required"]
    else:
        # If OSM actually had a mapped structure nearby, check properties
        for b in data["buildings"]:
            assert b["gross_roof_area"] > 0
            assert b["usable_roof_area"] > 0
            assert "Standard horizontal obstacle" in b["shading_assessment_notice"]


def test_geospatial_out_of_bounds_validation():
    """Validates that invalid latitude and longitude are rejected with HTTP 422."""
    res1 = client.get("/api/v1/geospatial/environmental-profile?lat=95.0&lng=77.0")
    assert res1.status_code == 422

    res2 = client.get("/api/v1/geospatial/environmental-profile?lat=28.0&lng=195.0")
    assert res2.status_code == 422
