"""Tests for India Solar Intelligence service and API endpoints.
Verifies region data structures, layer metrics, filtering, AI suitability rankings,
national summary calculations, and data provenance assertions.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.solar.india_solar_intelligence import (
    INDIA_REGIONS_DATABASE,
    compute_national_summary,
    get_all_regions,
    get_region_by_id,
    get_sample_campus_metadata
)

client = TestClient(app)


def test_india_regions_database_integrity():
    """Verify all 36 Indian States and Union Territories have complete climatological and geospatial fields."""
    assert len(INDIA_REGIONS_DATABASE) == 36
    for r in INDIA_REGIONS_DATABASE:
        assert "id" in r
        assert "name" in r
        assert "zone" in r
        assert "coordinates" in r
        assert "lat" in r["coordinates"] and "lng" in r["coordinates"]
        assert 0.0 <= r["ghi_daily_kwh"] <= 10.0
        assert 0.0 <= r["dni_daily_kwh"] <= 10.0
        assert 0.0 <= r["cloud_monsoon_pct"] <= 100.0
        assert 0 <= r["rooftop_suitability_score"] <= 100
        assert 0 <= r["open_land_suitability_score"] <= 100
        assert 0 <= r["ai_suitability_composite"] <= 100
        assert r["suitability_tier"] in ["A+", "A", "B+", "B", "C+", "C"]
        assert "ai_recommendations" in r
        assert "module_technology" in r["ai_recommendations"]
        assert "monthly_ghi" in r
        assert len(r["monthly_ghi"]) == 12


def test_compute_national_summary():
    """Verify national aggregation figures across all 36 States & UTs."""
    summary = compute_national_summary()
    assert summary["total_analyzed_regions"] == 36
    assert summary["total_national_rooftop_potential_gw"] == 748.0
    assert summary["total_national_openland_potential_gw"] == 1240.0
    assert 4.5 <= summary["national_avg_daily_ghi_kwh"] <= 6.5
    assert len(summary["top_opportunity_regions"]) == 5
    assert summary["provenance_summary"]["satellite_climatology"].startswith("NASA POWER")


def test_api_get_national_summary():
    """Verify GET /api/v1/solar-intelligence/summary endpoint."""
    response = client.get("/api/v1/solar-intelligence/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_analyzed_regions" in data
    assert "total_national_rooftop_potential_gw" in data
    assert "national_avg_daily_ghi_kwh" in data
    assert len(data["top_opportunity_regions"]) == 5


def test_api_list_regions_and_filters():
    """Verify GET /api/v1/solar-intelligence/regions with filters and search."""
    # 1. Unfiltered
    response = client.get("/api/v1/solar-intelligence/regions")
    assert response.status_code == 200
    regions = response.json()
    assert len(regions) == len(INDIA_REGIONS_DATABASE)

    # 2. Zone filter
    res_arid = client.get("/api/v1/solar-intelligence/regions?zone=Arid")
    assert res_arid.status_code == 200
    arid_regions = res_arid.json()
    assert len(arid_regions) >= 1
    assert any(r["id"] == "rajasthan" for r in arid_regions)

    # 3. Minimum suitability filter
    res_high = client.get("/api/v1/solar-intelligence/regions?min_suitability=90")
    assert res_high.status_code == 200
    for r in res_high.json():
        assert r["ai_suitability_composite"] >= 90

    # 4. Search query
    res_search = client.get("/api/v1/solar-intelligence/regions?search=Ladakh")
    assert res_search.status_code == 200
    ladakh_list = res_search.json()
    assert len(ladakh_list) == 1
    assert ladakh_list[0]["id"] == "ladakh"
    assert ladakh_list[0]["suitability_tier"] == "A+"


def test_api_get_region_detail_and_404():
    """Verify GET /api/v1/solar-intelligence/regions/{region_id} endpoint."""
    # Existing region
    res = client.get("/api/v1/solar-intelligence/regions/rajasthan")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Rajasthan"
    assert data["ai_suitability_composite"] >= 95
    assert "monthly_ghi" in data
    assert "ai_recommendations" in data

    # Non-existing region
    res_404 = client.get("/api/v1/solar-intelligence/regions/non_existent_state")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()

    # Backwards compatibility alias for assam_northeast
    res_alias = client.get("/api/v1/solar-intelligence/regions/assam_northeast")
    assert res_alias.status_code == 200
    assert res_alias.json()["id"] == "assam"


def test_api_sample_campus_metadata():
    """Verify GET /api/v1/solar-intelligence/sample-campus returns transparent demo metadata."""
    res = client.get("/api/v1/solar-intelligence/sample-campus")
    assert res.status_code == 200
    data = res.json()
    assert "BITS Pilani" in data["campus_name"]
    assert data["buildings_count"] == 5
    assert "demonstrates" in data["purpose"].lower()


def test_api_get_scoring_methodology():
    """Verify GET /api/v1/solar-intelligence/methodology returns documented formulas, weights, and limitations."""
    res = client.get("/api/v1/solar-intelligence/methodology")
    assert res.status_code == 200
    data = res.json()
    assert "engine_version" in data
    assert "geographic_resolution" in data
    assert "macro_regional_layer" in data["geographic_resolution"]
    assert "0.5°" in data["geographic_resolution"]["macro_regional_layer"]
    assert "rooftop_scoring_model" in data
    assert len(data["rooftop_scoring_model"]["inputs_and_weights"]) == 5
    assert "open_land_scoring_model" in data
    assert len(data["open_land_scoring_model"]["inputs_and_weights"]) == 5
    assert "composite_scoring" in data
    assert "limitations" in data
    assert len(data["limitations"]) >= 3
