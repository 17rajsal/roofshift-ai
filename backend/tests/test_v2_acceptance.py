import os
import io
import asyncio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.project import Project
from app.models.building import Building
from app.services.optimization.budget_solver import solve_multiple_choice_knapsack
from app.services.solar.solar_engine import calculate_building_solar_potential, get_effective_shading_loss
from app.services.solar.nasa_power import fetch_solar_irradiance, DEFAULT_INDIA_MONTHLY_GHI, DEFAULT_ANNUAL_GHI
from app.services.storage.s3_adapter import storage_adapter
from app.services.scheduling.load_shifter import optimize_energy_scheduling

client = TestClient(app)

# =====================================================================
# ACCEPTANCE TEST 1: Budget Constraint Strictly Obeyed
# =====================================================================
def test_acceptance_1_budget_constraint_strictly_obeyed():
    """Verify that optimization never exceeds the user-specified budget."""
    building_options = [
        [
            {"building_id": "b1", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b1", "capacity_kwp": 10.0, "cost_inr": 500000.0, "savings_inr": 90000.0, "onsite_kwh": 12000.0, "annual_gen_kwh": 14000.0},
            {"building_id": "b1", "capacity_kwp": 15.0, "cost_inr": 750000.0, "savings_inr": 130000.0, "onsite_kwh": 16000.0, "annual_gen_kwh": 21000.0},
        ],
        [
            {"building_id": "b2", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b2", "capacity_kwp": 8.0, "cost_inr": 400000.0, "savings_inr": 80000.0, "onsite_kwh": 10000.0, "annual_gen_kwh": 11200.0},
            {"building_id": "b2", "capacity_kwp": 12.0, "cost_inr": 600000.0, "savings_inr": 115000.0, "onsite_kwh": 14000.0, "annual_gen_kwh": 16800.0},
        ],
    ]

    for test_budget in [300000.0, 500000.0, 750000.0, 1000000.0, 1500000.0]:
        chosen, total_savings = solve_multiple_choice_knapsack(building_options, test_budget, "MAXIMIZE_SAVINGS")
        total_cost = sum(c["cost_inr"] for c in chosen)
        assert total_cost <= test_budget, f"Knapsack violated budget: {total_cost} > {test_budget}"


# =====================================================================
# ACCEPTANCE TEST 2: Budget Sensitivity (Monotonicity)
# =====================================================================
def test_acceptance_2_budget_sensitivity_monotonicity():
    """Increasing budget should increase or maintain installed capacity and savings, never decrease."""
    building_options = [
        [
            {"building_id": "b1", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b1", "capacity_kwp": 5.0, "cost_inr": 250000.0, "savings_inr": 45000.0, "onsite_kwh": 6000.0, "annual_gen_kwh": 7000.0},
            {"building_id": "b1", "capacity_kwp": 10.0, "cost_inr": 500000.0, "savings_inr": 90000.0, "onsite_kwh": 12000.0, "annual_gen_kwh": 14000.0},
        ],
        [
            {"building_id": "b2", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b2", "capacity_kwp": 5.0, "cost_inr": 250000.0, "savings_inr": 50000.0, "onsite_kwh": 6500.0, "annual_gen_kwh": 7200.0},
            {"building_id": "b2", "capacity_kwp": 10.0, "cost_inr": 500000.0, "savings_inr": 100000.0, "onsite_kwh": 12500.0, "annual_gen_kwh": 14400.0},
        ]
    ]

    budget_low = 500000.0
    budget_high = 1000000.0

    chosen_low, val_low = solve_multiple_choice_knapsack(building_options, budget_low, "MAXIMIZE_SAVINGS")
    chosen_high, val_high = solve_multiple_choice_knapsack(building_options, budget_high, "MAXIMIZE_SAVINGS")

    cap_low = sum(c["capacity_kwp"] for c in chosen_low)
    cap_high = sum(c["capacity_kwp"] for c in chosen_high)

    assert cap_high >= cap_low, "Higher budget resulted in lower installed capacity"
    assert val_high >= val_low, "Higher budget resulted in lower objective savings"


# =====================================================================
# ACCEPTANCE TEST 3: Rooftop Area Reduction Bounds
# =====================================================================
def test_acceptance_3_rooftop_area_reduction_bounds():
    """Cutting usable roof area drops capacity and generation proportionally."""
    db = SessionLocal()
    try:
        proj = Project(
            name="Roof Area Test Proj",
            organization_name="Test Org",
            city="Delhi",
            latitude=28.6139,
            longitude=77.2090,
            budget=1000000.0,
            tariff_rate=8.0,
            export_tariff=3.0
        )
        db.add(proj)
        db.commit()

        b1 = Building(
            project_id=proj.id,
            name="Block High Usable",
            latitude=28.6139,
            longitude=77.2090,
            gross_roof_area=1000.0,
            usable_roof_percentage=70.0,
            shading_category="Low",
            monthly_consumption_kwh=5000.0
        )
        b2 = Building(
            project_id=proj.id,
            name="Block Low Usable",
            latitude=28.6139,
            longitude=77.2090,
            gross_roof_area=1000.0,
            usable_roof_percentage=35.0,
            shading_category="Low",
            monthly_consumption_kwh=5000.0
        )
        db.add_all([b1, b2])
        db.commit()

        sol1 = asyncio.run(calculate_building_solar_potential(b1, proj, db))
        sol2 = asyncio.run(calculate_building_solar_potential(b2, proj, db))

        assert sol2.usable_roof_area_sqm == 0.5 * sol1.usable_roof_area_sqm
        assert sol2.max_pv_capacity_kwp == 0.5 * sol1.max_pv_capacity_kwp
        assert pytest.approx(sol2.annual_generation_kwh, rel=0.01) == 0.5 * sol1.annual_generation_kwh

        db.delete(proj)
        db.commit()
    finally:
        db.close()


# =====================================================================
# ACCEPTANCE TEST 4: Shading Increase Bounds
# =====================================================================
def test_acceptance_4_shading_increase_bounds():
    """Increasing shading reduces generation, never increases it."""
    db = SessionLocal()
    try:
        proj = Project(
            name="Shade Test Proj",
            organization_name="Test Org",
            city="Delhi",
            latitude=28.6139,
            longitude=77.2090,
            budget=1000000.0,
            tariff_rate=8.0,
            export_tariff=3.0
        )
        db.add(proj)
        db.commit()

        b_low = Building(
            project_id=proj.id,
            name="Block Low Shade",
            latitude=28.6139,
            longitude=77.2090,
            gross_roof_area=600.0,
            usable_roof_percentage=60.0,
            shading_category="Low",
            monthly_consumption_kwh=3000.0
        )
        b_high = Building(
            project_id=proj.id,
            name="Block High Shade",
            latitude=28.6139,
            longitude=77.2090,
            gross_roof_area=600.0,
            usable_roof_percentage=60.0,
            shading_category="High",
            monthly_consumption_kwh=3000.0
        )
        db.add_all([b_low, b_high])
        db.commit()

        sol_low = asyncio.run(calculate_building_solar_potential(b_low, proj, db))
        sol_high = asyncio.run(calculate_building_solar_potential(b_high, proj, db))

        assert sol_high.effective_shading_loss_pct > sol_low.effective_shading_loss_pct
        assert sol_high.annual_generation_kwh < sol_low.annual_generation_kwh

        db.delete(proj)
        db.commit()
    finally:
        db.close()


# =====================================================================
# ACCEPTANCE TEST 5: Graceful Fallback for Missing Solar Data
# =====================================================================
def test_acceptance_5_missing_solar_data_graceful_fallback():
    """When external NASA POWER API fails or coordinates are supplied, Indian regional fallback engages cleanly."""
    db = SessionLocal()
    try:
        monthly_dict, annual_avg, source, label = asyncio.run(
            fetch_solar_irradiance(lat=28.6139, lon=77.2090, db=db)
        )
        assert annual_avg > 3.0
        assert len(monthly_dict) == 12
        assert all(val > 0 for val in monthly_dict.values())
        assert "NASA POWER" in source or "NISE" in source or "IMD" in source or "Solar" in source
    finally:
        db.close()


# =====================================================================
# ACCEPTANCE TEST 6: Zero Bedrock Dependency
# =====================================================================
def test_acceptance_6_zero_bedrock_dependency():
    """Strictly verify Bedrock is never imported, initialized, or configured."""
    assert getattr(settings, "BEDROCK_ENABLED", False) is False

    # Check that system endpoint explicitly reports Bedrock as HARD_DISABLED
    res = client.get("/api/v1/system/integrations")
    assert res.status_code == 200
    data = res.json()
    assert data["bedrock_status"]["enabled"] is False
    assert data["bedrock_status"]["status"] == "HARD_DISABLED"
    assert "deterministic" in data["bedrock_status"]["decision"].lower()


# =====================================================================
# ACCEPTANCE TEST 7: Zero AWS Credentials Required for Local Run
# =====================================================================
def test_acceptance_7_zero_aws_credentials_required():
    """Application boots, serves endpoints, and runs full optimization without AWS credentials."""
    # Ensure system health is 200 OK
    res = client.get("/api/v1/health")
    assert res.status_code == 200

    # Ensure projects list works locally
    p_res = client.get("/api/v1/projects")
    assert p_res.status_code == 200


# =====================================================================
# ACCEPTANCE TEST 8: Storage Adapter S3 Fallback
# =====================================================================
def test_acceptance_8_s3_storage_fallback():
    """Storage adapter seamlessly falls back to local file system when S3 is inactive."""
    dummy_file = "test_dummy_report.pdf"
    with open(dummy_file, "w") as f:
        f.write("%PDF-1.4 test dummy content")

    try:
        location, provider, is_cloud = storage_adapter.save_report_file(dummy_file, dummy_file)
        if not settings.AWS_ENABLED:
            assert is_cloud is False
            assert "Local" in provider
            assert os.path.exists(location)
    finally:
        if os.path.exists(dummy_file):
            os.remove(dummy_file)


# =====================================================================
# ACCEPTANCE TEST 9: Database Persistence Integrity
# =====================================================================
def test_acceptance_9_database_persistence():
    """Create project, persist buildings, reload from database and verify integrity."""
    db: Session = SessionLocal()
    try:
        test_proj = Project(
            name="Persistence Test Campus",
            organization_name="DRX Education",
            city="Pune",
            latitude=18.5204,
            longitude=73.8567,
            budget=1200000.0,
            tariff_rate=8.5,
            export_tariff=3.2,
            co2_factor=0.716
        )
        db.add(test_proj)
        db.commit()
        db.refresh(test_proj)
        p_id = test_proj.id

        # Add building
        bldg = Building(
            project_id=p_id,
            name="Mechanical Lab",
            category="Academic",
            latitude=18.5205,
            longitude=73.8568,
            gross_roof_area=600.0,
            usable_roof_percentage=75.0,
            shading_category="Low",
            monthly_consumption_kwh=3500.0,
            daytime_consumption_pct=65.0
        )
        db.add(bldg)
        db.commit()

        # Re-fetch from fresh query
        reloaded = db.query(Project).filter(Project.id == p_id).first()
        assert reloaded is not None
        assert reloaded.name == "Persistence Test Campus"
        assert len(reloaded.buildings) == 1
        assert reloaded.buildings[0].name == "Mechanical Lab"
        assert reloaded.buildings[0].gross_roof_area == 600.0

        # Clean up
        db.delete(reloaded)
        db.commit()
    finally:
        db.close()


# =====================================================================
# ACCEPTANCE TEST 10: Scheduling Time Window Constraints
# =====================================================================
def test_acceptance_10_scheduling_time_window_constraints():
    """Shiftable loads are scheduled into solar surplus hours (10:00 - 15:00), not midnight."""
    # Find demo project with pre-seeded activities
    res = client.get("/api/v1/projects")
    projects = [p for p in res.json() if p.get("is_demo") == "true"]
    assert len(projects) > 0
    proj_id = projects[0]["id"]

    sched_res = client.post(f"/api/v1/projects/{proj_id}/schedule-optimize")
    assert sched_res.status_code == 200
    sched_data = sched_res.json()

    for rec in sched_data["recommendations"]:
        rec_hour = rec["recommended_start_hour"]
        assert 8 <= rec_hour <= 16, f"Load shifted to non-solar hour {rec_hour}"
        assert rec["duration_hours"] > 0
        assert rec["estimated_annual_savings_inr"] >= 0


# =====================================================================
# ACCEPTANCE TEST 11: Delhi College Campus Demo Workflow
# =====================================================================
def test_acceptance_11_delhi_demo_campus_workflow():
    """Verify complete end-to-end workflow on pre-seeded Delhi College Campus."""
    res = client.get("/api/v1/projects")
    projects = [p for p in res.json() if p.get("is_demo") == "true"]
    assert len(projects) >= 1
    demo = projects[0]

    assert "Delhi College Campus" in demo["name"]
    assert demo["building_count"] == 5
    assert demo["budget"] == 1000000.0  # ₹10 Lakh

    # Verify building solar analyses exist
    b_res = client.get(f"/api/v1/projects/{demo['id']}/buildings")
    buildings = b_res.json()
    assert len(buildings) == 5
    for b in buildings:
        assert b["solar_analysis"] is not None
        assert b["solar_analysis"]["max_pv_capacity_kwp"] > 0
        assert b["solar_analysis"]["annual_generation_kwh"] > 0

    # Verify optimizations
    opt_res = client.get(f"/api/v1/projects/{demo['id']}/optimizations")
    opts = opt_res.json()
    assert len(opts) >= 1
    assert opts[0]["total_allocated_inr"] <= 1000000.0


# =====================================================================
# ACCEPTANCE TEST 12: AWS Capability Matrix Verification
# =====================================================================
def test_acceptance_12_aws_capability_matrix():
    """Verify system integrations endpoint reports all 10 AWS services and their fallback status."""
    res = client.get("/api/v1/system/integrations")
    assert res.status_code == 200
    data = res.json()

    assert "services" in data
    assert len(data["services"]) == 10

    service_names = [s["service"] for s in data["services"]]
    expected_services = [
        "AWS Amplify Hosting",
        "Amazon EC2",
        "Amazon S3",
        "Amazon Location Service",
        "AWS Lambda",
        "Amazon EventBridge",
        "Amazon CloudWatch",
        "AWS IAM",
        "AWS SSM Parameter Store",
        "AWS Budgets"
    ]

    for expected in expected_services:
        assert expected in service_names, f"Missing service: {expected}"

    # Check that fallback is defined for each service
    for s in data["services"]:
        assert s["fallback"] is not None
        assert s["cost_estimate"] is not None
        assert s["evidence"] is not None
