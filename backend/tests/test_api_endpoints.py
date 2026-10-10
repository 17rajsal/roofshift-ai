import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "RoofShift AI" in data["service"]

def test_geocoding_search_endpoint():
    response = client.get("/api/v1/geocoding/search?q=Delhi")
    assert response.status_code == 200
    results = response.json()
    assert len(results) > 0
    assert results[0]["lat"] is not None
    assert results[0]["lon"] is not None

def test_projects_crud():
    # 1. List projects
    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    projects = res.json()
    assert isinstance(projects, list)

    # 2. Create new project
    payload = {
        "name": "Test Engineering College",
        "organization_name": "Test Trust",
        "city": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "budget": 800000.0,
        "tariff_rate": 8.0,
        "export_tariff": 3.0,
        "co2_factor": 0.716
    }
    create_res = client.post("/api/v1/projects", json=payload)
    assert create_res.status_code == 201
    p_data = create_res.json()
    proj_id = p_data["id"]
    assert p_data["name"] == "Test Engineering College"

    # 3. Add a building
    b_payload = {
        "name": "Science Block",
        "category": "Academic",
        "latitude": 12.9720,
        "longitude": 77.5950,
        "gross_roof_area": 400.0,
        "usable_roof_percentage": 70.0,
        "shading_category": "Low",
        "custom_shading_loss": 5.0,
        "monthly_consumption_kwh": 2000.0,
        "daytime_consumption_pct": 70.0,
        "cost_per_kwp": 50000.0,
        "fixed_cost": 0.0
    }
    b_res = client.post(f"/api/v1/projects/{proj_id}/buildings", json=b_payload)
    assert b_res.status_code == 201
    b_data = b_res.json()
    assert b_data["name"] == "Science Block"
    assert b_data["solar_analysis"] is not None
    assert b_data["solar_analysis"]["annual_generation_kwh"] > 0

    # 4. Run optimization
    opt_payload = {
        "budget_inr": 800000.0,
        "objective": "MAXIMIZE_SAVINGS",
        "scenario_name": "Base Scenario",
        "capacity_step_kwp": 1.0
    }
    opt_res = client.post(f"/api/v1/projects/{proj_id}/optimize", json=opt_payload)
    assert opt_res.status_code == 200
    opt_data = opt_res.json()
    assert opt_data["total_allocated_inr"] <= 800000.0
    assert len(opt_data["allocations"]) == 1

    # 5. Generate PDF report
    rep_res = client.post(f"/api/v1/projects/{proj_id}/reports", json={"include_scenarios": True, "include_load_shifting": True})
    assert rep_res.status_code == 201
    rep_data = rep_res.json()
    rep_id = rep_data["report_id"]
    assert "download_url" in rep_data

    # 6. Download PDF
    down_res = client.get(f"/api/v1/reports/{rep_id}/download")
    assert down_res.status_code == 200
    assert down_res.headers["content-type"] == "application/pdf"
    assert len(down_res.content) > 1000 # Verified PDF binary content
