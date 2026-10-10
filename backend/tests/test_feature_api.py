"""Project-scoped API/storage/report acceptance tests with an isolated in-memory DB.

The real router is mounted on a test app without importing production startup or
seeding. Solar calculations and cloud report storage are replaced by local test
fixtures; every feature engine itself is exercised through its actual route.
"""

from pathlib import Path
import re
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.v1 import buildings
from app.api.v1.api import api_router
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.feature import FeatureAssessment
from app.models.solar import SolarAnalysis
from app.services.reports import pdf_generator
from app.services.storage.s3_adapter import storage_adapter


LOCATION = {
    "candidates": [{
        "site_id": "roof-a", "name": "Surveyed roof", "latitude": 28.61, "longitude": 77.2,
        "roof_area_sqm": 70, "usable_roof_fraction": 1, "ghi_kwh_m2_day": 5,
        "irradiance_source": "Test supplied climatology", "data_basis": "climatology",
    }], "area_sqm_per_kwp": 7, "performance_ratio": 0.8,
}
PREDICTION = {
    "year": 2024, "capacity_kwp": 10,
    "monthly_irradiance": [{"month": month, "ghi_kwh_m2_day": 5} for month in range(1, 13)],
    "irradiance_source": "Test monthly climatology", "data_basis": "climatology",
    "performance_ratio": 0.8, "annual_degradation_fraction": 0,
}
DEMAND = {
    "intervals": [{"start": "2026-10-10T00:00:00Z", "end": "2026-10-10T02:00:00Z", "average_power_kw": 5}],
    "source": "Test meter observation", "base_tariff_inr_per_kwh": 8,
}
FINANCIAL = {
    "installation_cost_inr": 1000, "first_year_generation_kwh": 100,
    "onsite_consumption_fraction": 1, "import_tariff_inr_per_kwh": 10,
    "lifetime_years": 2, "annual_degradation_fraction": 0, "discount_rate_fraction": 0,
    "assumptions_source": "Test fixed financial inputs",
}
ENVIRONMENT = {
    "first_year_generation_kwh": 100, "displaced_emissions_kg_co2e_per_kwh": 0.5,
    "emissions_factor_source": "Test supplied factor", "lifetime_years": 2,
    "annual_degradation_fraction": 0, "embodied_emissions_kg_co2e": 25,
}
FAULT = {
    "readings": [{"panel_id": "panel-a", "expected_energy_kwh": 10, "actual_energy_kwh": 0, "irradiance_w_m2": 500}],
}
MONITORING = {
    "intervals": [{"panel_id": "panel-a", "start_at": "2026-10-10T00:00:00Z", "end_at": "2026-10-10T02:00:00Z",
                   "actual_energy_kwh": 5, "expected_energy_kwh": 10, "operating_status": "offline"}],
}
MAINTENANCE = {"as_of_date": "2026-10-10", "panels": [{"panel_id": "panel-a", "inverter_status": "fault"}]}
CASES = [
    ("solar-location-finder", LOCATION, "SolarLocationRequest", "SolarLocationResponse"),
    ("solar-prediction", PREDICTION, "SolarPredictionRequest", "SolarPredictionResponse"),
    ("demand-analysis", DEMAND, "DemandAnalysisRequest", "DemandAnalysisResponse"),
    ("cost-savings", FINANCIAL, "FinancialScenarioRequest", "FinancialScenarioResponse"),
    ("environmental-impact", ENVIRONMENT, "EnvironmentalImpactRequest", "EnvironmentalImpactResponse"),
    ("panel-fault-detection", FAULT, "PanelFaultDetectionRequest", "PanelFaultDetectionResponse"),
    ("performance-monitoring", MONITORING, "PerformanceMonitoringRequest", "PerformanceMonitoringResponse"),
    ("maintenance-recommendations", MAINTENANCE, "MaintenanceRecommendationsRequest", "MaintenanceRecommendationsResponse"),
]


@pytest.fixture
def isolated_api(tmp_path, monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")

    def override_db():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    monkeypatch.setattr(settings, "REPORTS_DIR", str(tmp_path / "reports"))
    monkeypatch.setattr(storage_adapter, "is_s3_active", lambda: False)
    monkeypatch.setattr(storage_adapter, "save_report_file", lambda path, name: (path, "Test local storage", False))

    async def solar_fixture(building, project, db):
        analysis = SolarAnalysis(
            building_id=building.id, usable_roof_area_sqm=56, max_pv_capacity_kwp=8,
            annual_generation_kwh=11680, monthly_generation_kwh=[11680 / 12] * 12,
            specific_yield_kwh_per_kwp=1460, performance_ratio=0.8, effective_shading_loss_pct=0,
            annual_consumption_kwh=12000, annual_onsite_consumed_kwh=10000,
            annual_exported_kwh=1680, onsite_utilization_pct=10000 / 11680 * 100,
            annual_savings_inr=85600, installation_cost_inr=400000,
            simple_payback_years=400000 / 85600, avoided_co2_kg_annual=5840,
            ghi_annual_avg_kwh_m2_day=5, irradiance_source="Test supplied climatology",
            data_quality_label="Deterministic test fixture",
        )
        db.add(analysis)
        db.commit()
        return analysis

    monkeypatch.setattr(buildings, "calculate_building_solar_potential", solar_fixture)
    # Uncompressed test PDFs allow assertions on rendered literal text without
    # adding a new PDF-reader dependency to production or the test environment.
    original_canvas_init = pdf_generator.NumberedCanvas.__init__

    def uncompressed_canvas(self, *args, **kwargs):
        kwargs["pageCompression"] = 0
        original_canvas_init(self, *args, **kwargs)

    monkeypatch.setattr(pdf_generator.NumberedCanvas, "__init__", uncompressed_canvas)
    with TestClient(app) as client:
        yield SimpleNamespace(client=client, sessions=sessions, app=app, reports_dir=tmp_path / "reports")
    engine.dispose()


def create_project(client, name="Feature API Project"):
    response = client.post("/api/v1/projects", json={
        "name": name, "organization_name": "Test <Org> & Partners", "city": "Test City",
        "latitude": 28.61, "longitude": 77.2, "budget": 1000000,
        "tariff_rate": 8, "export_tariff": 3, "co2_factor": 0.5,
    })
    assert response.status_code == 201, response.text
    return response.json()["id"]


def feature_url(project_id, key):
    return f"/api/v1/projects/{project_id}/features/{key}"


def test_latest_keeps_infrequent_features_after_history_limit(isolated_api):
    from datetime import datetime, timedelta
    client = isolated_api.client
    project_id = create_project(client)
    financial = client.post(feature_url(project_id, "cost-savings"), json=FINANCIAL)
    environment = client.post(feature_url(project_id, "environmental-impact"), json=ENVIRONMENT)
    assert financial.status_code == environment.status_code == 200
    with isolated_api.sessions() as session:
        session.add_all([FeatureAssessment(
            project_id=project_id, feature_key="environmental-impact", inputs_json=ENVIRONMENT,
            result_json=environment.json(), created_at=datetime.utcnow() + timedelta(seconds=index),
        ) for index in range(101)])
        session.commit()
    history = client.get(feature_url(project_id, "history")).json()["assessments"]
    assert len(history) == 100
    assert all(item["feature_key"] == "environmental-impact" for item in history)
    latest = client.get(feature_url(project_id, "latest")).json()["assessments"]
    assert {item["feature_key"] for item in latest} == {"cost-savings", "environmental-impact"}
    assert next(item for item in latest if item["feature_key"] == "cost-savings")["assessment_id"] == financial.headers["X-Assessment-ID"]
    assert client.get(feature_url("missing-project", "latest")).status_code == 404


def rendered_test_pdf_text(content):
    """Read literal Tj text runs in our uncompressed, ASCII test PDFs.

    Paragraph entity escaping may split a literal user string into several text
    runs. Joining rendered runs tests visible text rather than PDF chunking.
    This helper is deliberately limited to the controlled test fixture.
    """
    runs = re.findall(rb"\(((?:\\.|[^\\)])*)\)\s*Tj", content)
    return "".join(re.sub(rb"\\([\\()])", rb"\1", run).decode("latin-1") for run in runs)


@pytest.mark.parametrize("key,payload,request_schema,response_schema", CASES)
def test_all_feature_endpoints_calculate_and_persist(isolated_api, key, payload, request_schema, response_schema):
    client = isolated_api.client
    project_id = create_project(client)
    response = client.post(feature_url(project_id, key), json=payload)
    assert response.status_code == 200, response.text
    result = response.json()
    if key == "solar-location-finder":
        assert result["ranked_sites"][0]["screening_capacity_kwp"] == 10
        assert result["ranked_sites"][0]["annual_generation_kwh"] == pytest.approx(14600)
    elif key == "solar-prediction":
        assert result["annual_generation_kwh"] == pytest.approx(14640)  # Leap-year days are honored.
    elif key == "demand-analysis":
        assert result["total_energy_kwh"] == 10
        assert result["estimated_energy_cost_inr"] == 80
    elif key == "cost-savings":
        assert result["net_present_value_inr"] == 1000
        assert result["simple_payback_years"] == 1
    elif key == "environmental-impact":
        assert result["lifetime_net_avoided_kg_co2e"] == 75
        assert result["carbon_payback_years"] == 0.5
    elif key == "panel-fault-detection":
        assert result["findings"][0]["faults"][0]["code"] == "zero_output"
        assert result["image_analysis_supported"] is False
    elif key == "performance-monitoring":
        assert result["summary"]["energy_performance_ratio"] == 0.5
        assert result["summary"]["availability_pct"] == 0
    else:
        assert result["recommendations"][0]["action_code"] == "inspect_inverter"
        assert result["recommendations"][0]["priority"] == "high"

    assessment_id = response.headers["X-Assessment-ID"]
    with isolated_api.sessions() as db:
        saved = db.get(FeatureAssessment, assessment_id)
        assert saved.project_id == project_id
        assert saved.feature_key == key
        assert saved.result_json == result
        assert saved.schema_version == "1.0"
    history = client.get(feature_url(project_id, "history"), params={"feature_key": key}).json()
    assert history["project_id"] == project_id
    assert len(history["assessments"]) == 1
    assert history["assessments"][0]["assessment_id"] == assessment_id
    assert history["assessments"][0]["result"] == result
    assert history["assessments"][0]["created_at"].endswith("Z")


@pytest.mark.parametrize("key,payload,request_schema,response_schema", CASES)
def test_features_reject_nonexistent_projects_and_invalid_inputs(isolated_api, key, payload, request_schema, response_schema):
    client = isolated_api.client
    assert client.post(feature_url("missing-project", key), json=payload).status_code == 404
    project_id = create_project(client)
    assert client.post(feature_url(project_id, key), json={"unexpected": True}).status_code == 422
    with isolated_api.sessions() as db:
        assert db.query(FeatureAssessment).count() == 0


def test_history_filter_scope_limit_and_project_deletion_cascade(isolated_api):
    client = isolated_api.client
    first, second = create_project(client, "First"), create_project(client, "Second")
    first_response = client.post(feature_url(first, "cost-savings"), json=FINANCIAL)
    client.post(feature_url(first, "environmental-impact"), json=ENVIRONMENT)
    second_response = client.post(feature_url(second, "cost-savings"), json=FINANCIAL)
    history = client.get(feature_url(first, "history")).json()["assessments"]
    assert len(history) == 2
    assert {item["project_id"] for item in history} == {first}
    assert second_response.headers["X-Assessment-ID"] not in {item["assessment_id"] for item in history}
    filtered = client.get(feature_url(first, "history"), params={"feature_key": "cost-savings"}).json()["assessments"]
    assert [item["assessment_id"] for item in filtered] == [first_response.headers["X-Assessment-ID"]]
    assert len(client.get(feature_url(first, "history"), params={"limit": 1}).json()["assessments"]) == 1
    assert client.get(feature_url(first, "history"), params={"limit": 0}).status_code == 422
    assert client.get(feature_url(first, "history"), params={"feature_key": "invented-feature"}).status_code == 422
    assert client.get(feature_url("missing", "history")).status_code == 404
    assert client.delete(f"/api/v1/projects/{first}").status_code == 204
    with isolated_api.sessions() as db:
        remaining = db.query(FeatureAssessment).all()
        assert len(remaining) == 1
        assert remaining[0].project_id == second
    assert client.get(feature_url(first, "history")).status_code == 404


def test_openapi_contains_concrete_input_and_output_schemas(isolated_api):
    schema = isolated_api.client.get("/openapi.json").json()
    for key, _, request_model, response_model in CASES:
        operation = schema["paths"][feature_url("{project_id}", key)]["post"]
        assert operation["requestBody"]["content"]["application/json"]["schema"]["$ref"].endswith(f"/{request_model}")
        assert operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith(f"/{response_model}")
        assert schema["components"]["schemas"][request_model]["additionalProperties"] is False


def test_project_templates_preserve_unknown_telemetry_and_provenance(isolated_api):
    client = isolated_api.client
    project_id = create_project(client)
    assert client.get(feature_url("missing", "templates")).status_code == 404
    response = client.post(f"/api/v1/projects/{project_id}/buildings", json={
        "name": "Measured rooftop", "latitude": 28.61, "longitude": 77.2,
        "gross_roof_area": 70, "usable_roof_percentage": 80, "monthly_consumption_kwh": 1000,
    })
    assert response.status_code == 201, response.text
    templates = {item["key"]: item for item in client.get(feature_url(project_id, "templates")).json()["features"]}
    assert set(templates) == {item[0] for item in CASES}
    assert templates["panel-fault-detection"]["request"]["readings"][0]["actual_energy_kwh"] is None
    assert templates["performance-monitoring"]["request"]["intervals"][0]["operating_status"] == "unknown"
    assert templates["solar-location-finder"]["request"]["candidates"][0]["irradiance_source"] == "Test supplied climatology"
    fault = client.post(feature_url(project_id, "panel-fault-detection"), json=templates["panel-fault-detection"]["request"])
    assert fault.status_code == 200
    assert fault.json()["findings"][0]["assessment"] == "insufficient_data"
    monitoring = client.post(feature_url(project_id, "performance-monitoring"), json=templates["performance-monitoring"]["request"])
    assert monitoring.status_code == 200
    assert monitoring.json()["summary"]["availability_pct"] is None


def test_expanded_reports_use_saved_scoped_snapshots_and_preserve_prior_files(isolated_api, monkeypatch):
    client = isolated_api.client
    project_id = create_project(client, "Report <A> & B")
    other_project = create_project(client, "Other")
    own = client.post(feature_url(project_id, "cost-savings"), json=FINANCIAL).headers["X-Assessment-ID"]
    other = client.post(feature_url(other_project, "environmental-impact"), json=ENVIRONMENT).headers["X-Assessment-ID"]
    calls = []
    original_append = pdf_generator.append_feature_sections

    def capture_append(story, assessments, heading, body, caption, include_scenarios=True):
        calls.append(([item.id for item in assessments], include_scenarios))
        return original_append(story, assessments, heading, body, caption, include_scenarios)

    monkeypatch.setattr(pdf_generator, "append_feature_sections", capture_append)
    notes = "Preserve <roof> & context\nLiteral <b>review</b>."
    first = client.post(f"/api/v1/projects/{project_id}/reports", json={"notes": notes, "include_features": True, "include_scenarios": True})
    assert first.status_code == 201, first.text
    first_meta = first.json()
    first_download = client.get(first_meta["download_url"])
    assert first_download.status_code == 200
    assert first_download.headers["content-type"] == "application/pdf"
    first_bytes = first_download.content
    assert first_bytes.startswith(b"%PDF-")
    assert len(first_bytes) == first_meta["file_size_bytes"]
    first_text = rendered_test_pdf_text(first_bytes)
    assert "<roof> & context" in first_text
    assert "<b>review</b>" in first_text
    assert "Expanded Solar Assessments" in first_text
    assert "Cost & Savings Calculator" in first_text
    assert calls == [([own], True)]
    assert other not in calls[0][0]

    second = client.post(f"/api/v1/projects/{project_id}/reports", json={"notes": notes, "include_features": True, "include_scenarios": False})
    assert second.status_code == 201, second.text
    second_bytes = client.get(second.json()["download_url"]).content
    assert calls[-1] == ([own], False)
    assert "Cost & Savings Calculator" not in rendered_test_pdf_text(second_bytes)
    assert first_meta["filename"] != second.json()["filename"]
    assert client.get(first_meta["download_url"]).content == first_bytes
    assert Path(isolated_api.reports_dir / first_meta["filename"]).read_bytes() == first_bytes

    third = client.post(f"/api/v1/projects/{project_id}/reports", json={"include_features": False})
    assert third.status_code == 201
    assert len(calls) == 2
    assert "Expanded Solar Assessments" not in rendered_test_pdf_text(client.get(third.json()["download_url"]).content)
    history = client.get(f"/api/v1/projects/{project_id}/reports").json()
    assert len(history) == 3
    assert len({item["filename"] for item in history}) == 3
    assert client.post(f"/api/v1/projects/{project_id}/reports", json={"notes": "x" * 2001}).status_code == 422
    assert client.get("/api/v1/reports/missing/download").status_code == 404


def test_maintenance_api_accepts_saved_diagnostic_contracts(isolated_api):
    client = isolated_api.client
    project_id = create_project(client)
    faults = client.post(feature_url(project_id, "panel-fault-detection"), json=FAULT).json()
    performance = client.post(feature_url(project_id, "performance-monitoring"), json=MONITORING).json()
    request = dict(MAINTENANCE, fault_detection=faults, performance=performance)
    response = client.post(feature_url(project_id, "maintenance-recommendations"), json=request)
    assert response.status_code == 200, response.text
    codes = {item["action_code"] for item in response.json()["recommendations"]}
    assert {"inspect_inverter", "investigate_generation"}.issubset(codes)
    request["panels"] = [{"panel_id": "different-panel"}]
    assert client.post(feature_url(project_id, "maintenance-recommendations"), json=request).status_code == 422
