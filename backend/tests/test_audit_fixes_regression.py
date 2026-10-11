"""
Regression tests for Phase 1 confirmed code fixes:
- Open-Meteo wind speed units (must be m/s, not km/h)
- Weather source provenance (current modeled NWP vs regional climatological normal)
- NASA POWER fallback state and InsufficientSolarDataError handling
- Engineering Suitability Index (no artificial clamps, transparent methodology)
- Open-area screening unverified terrain & legal status
- OSM rooftop planning assumptions transparency
"""
import pytest
from starlette.testclient import TestClient
from app.main import app
from app.services.solar.nasa_power import fetch_solar_irradiance, InsufficientSolarDataError
from app.services.geospatial.environmental_profile import fetch_meteorological_data, find_nearest_indian_region
from app.services.geospatial.osm_buildings import DEFAULT_OSM_PLANNING_ASSUMPTIONS, fetch_osm_buildings
from app.core.database import SessionLocal

client = TestClient(app)


@pytest.mark.anyio
async def test_open_meteo_wind_speed_units_and_provenance():
    """Verify wind speed is explicitly retrieved in m/s and labeled as NWP forecast."""
    nearest = find_nearest_indian_region(28.6139, 77.2090)
    met = await fetch_meteorological_data(28.6139, 77.2090, nearest)

    assert "wind_speed_ms" in met
    assert met["wind_speed_unit_verified"] == "m/s"
    assert 0.0 <= met["wind_speed_ms"] <= 35.0  # Physical wind speed in m/s (not km/h which would be ~4x higher)
    assert met["weather_data_type"] in ["current_modeled_forecast", "regional_planning_normal"]
    if not met["is_climatological_fallback"]:
        assert "Open-Meteo" in met["weather_source"]
        assert "provider_timestamp" in met


@pytest.mark.anyio
async def test_nasa_power_insufficient_solar_data_error_when_disallowed(monkeypatch):
    """When allow_illustrative=False and NASA POWER returns an error, raise InsufficientSolarDataError."""
    import httpx
    from unittest.mock import AsyncMock

    db = SessionLocal()
    try:
        # Simulate NASA API failure
        async def mock_get(*args, **kwargs):
            raise httpx.ConnectError("Simulated NASA API connection timeout")

        monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

        with pytest.raises(InsufficientSolarDataError):
            await fetch_solar_irradiance(15.1234, 76.5678, db, allow_illustrative=False)
    finally:
        db.close()


def test_engineering_suitability_metadata_and_open_area_unverified_labels():
    """Test that environmental-profile exposes engineering_suitability and open-area screening has unverified labels."""
    res = client.get("/api/v1/geospatial/environmental-profile?lat=26.9124&lng=75.7873")
    assert res.status_code == 200
    data = res.json()

    assert "engineering_suitability" in data
    eng = data["engineering_suitability"]
    assert eng["is_ai_predicted"] is False
    assert "Engineering Suitability Index" in eng["methodology"]
    assert "geographic_resolution" in eng

    # Verify open-area screening
    res_open = client.get("/api/v1/geospatial/open-area-screening?lat=26.9124&lng=75.7873")
    assert res_open.status_code == 200
    open_data = res_open.json()
    metrics = open_data["screening_metrics"]
    assert "Not verified" in metrics["terrain_slope"]
    assert "Not established" in metrics["land_use_eligibility"]
    assert "Not verified" in metrics["grid_connection"]


def test_osm_rooftop_planning_assumptions_structure():
    """Verify DEFAULT_OSM_PLANNING_ASSUMPTIONS are transparent and documented."""
    assert DEFAULT_OSM_PLANNING_ASSUMPTIONS["usable_roof_fraction"] == 0.75
    assert DEFAULT_OSM_PLANNING_ASSUMPTIONS["power_density_kwp_per_sqm"] == 0.18
    assert DEFAULT_OSM_PLANNING_ASSUMPTIONS["grid_tariff_inr_per_kwh"] == 7.50
    assert DEFAULT_OSM_PLANNING_ASSUMPTIONS["co2_emissions_factor_kg_per_kwh"] == 0.716
