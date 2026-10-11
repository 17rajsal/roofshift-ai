"""
Unit and Integration Tests for Real Machine Learning Solar Forecasting Pipeline
"""
import os
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.ml.solar_ml_service import solar_ml_service, ARTIFACTS_DIR, MODEL_FILE, METADATA_FILE

client = TestClient(app)

def test_ml_artifacts_exist_and_valid():
    """Validates that trained model and provenance metadata files exist and have required fields."""
    assert os.path.exists(MODEL_FILE), "solar_xgboost_v1.joblib artifact must exist"
    assert os.path.exists(METADATA_FILE), "model_metadata.json must exist"

    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert meta["champion_algorithm"] == "XGBoost_Regressor"
    assert meta["model_version"].startswith("1.")
    assert "dataset_provenance" in meta
    assert meta["dataset_provenance"]["total_intervals"] in (2102, 3157)
    assert "evaluation_on_held_out_test_data" in meta
    assert "unseen_site_generalization" in meta["evaluation_on_held_out_test_data"]

def test_ml_demonstrated_improvement_over_physics():
    """Verifies that the trained ML model empirically outperforms the IEC 61724 physics baseline."""
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        meta = json.load(f)

    eval_data = meta["evaluation_on_held_out_test_data"]
    phys = eval_data["physics_baseline_iec61724"]
    ml = eval_data["champion_test_metrics"]

    # ML error must be strictly lower than physics baseline on held-out test data
    assert ml["rmse"] < phys["rmse"], f"ML RMSE ({ml['rmse']}) must be lower than Physics ({phys['rmse']})"
    assert ml["mae"] < phys["mae"], f"ML MAE ({ml['mae']}) must be lower than Physics ({phys['mae']})"
    assert ml["r2_score"] > phys["r2_score"], f"ML R^2 ({ml['r2_score']}) must be higher than Physics ({phys['r2_score']})"
    assert ml["rmse_improvement_over_physics_pct"] > 50.0, "ML should achieve >50% error reduction on test set"

def test_solar_ml_service_daytime_prediction():
    """Tests solar ML inference during solar noon under typical irradiance."""
    res = solar_ml_service.predict_point(
        capacity_kwp=10.0,
        irradiance_w_m2=850.0,
        ambient_temperature_c=32.0,
        hour_of_day=12.0
    )

    assert res["capacity_kwp"] == 10.0
    assert res["ml_predicted_power_kw"] > 0.0
    assert res["physics_baseline_kw"] > 0.0
    assert res["model_status"] == "TRAINED_OPERATIONAL"
    assert res["confidence_lower_kw"] <= res["ml_predicted_power_kw"]
    assert res["confidence_upper_kw"] >= res["ml_predicted_power_kw"]
    assert "Gandikota" in res["dataset_provenance"]

def test_solar_ml_service_nighttime_zero_generation():
    """Tests that nocturnal/zero irradiance yields 0 kW generation without hallucinations."""
    res = solar_ml_service.predict_point(
        capacity_kwp=50.0,
        irradiance_w_m2=0.0,
        ambient_temperature_c=22.0,
        hour_of_day=2.0
    )

    assert res["ml_predicted_power_kw"] == 0.0
    assert res["physics_baseline_kw"] == 0.0

def test_api_ml_forecast_endpoint():
    """Tests POST /api/v1/solar-ml/forecast endpoint validation and response schema."""
    payload = {
        "capacity_kwp": 25.0,
        "irradiance_w_per_m2": 750.0,
        "ambient_temperature_c": 30.0,
        "hour_of_day": 13.5
    }
    response = client.post("/api/v1/solar-ml/forecast", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["capacity_kwp"] == 25.0
    assert data["ml_predicted_power_kw"] > 0.0
    assert data["physics_baseline_kw"] > 0.0
    assert "delta_kw" in data
    assert "confidence_lower_kw" in data
    assert "confidence_upper_kw" in data
    assert data["model_algorithm"] == "XGBoost_Regressor"
    assert data["test_r2_score"] > 0.99

def test_api_ml_diurnal_forecast_endpoint():
    """Tests POST /api/v1/solar-ml/diurnal-forecast endpoint for 24-hour simulation."""
    payload = {
        "capacity_kwp": 50.0,
        "peak_irradiance_w_m2": 950.0,
        "ambient_temperature_c": 32.0
    }
    response = client.post("/api/v1/solar-ml/diurnal-forecast", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["intervals"]) == 24
    assert data["total_daily_ml_kwh"] > 0.0
    assert data["total_daily_physics_kwh"] > 0.0

    # Hours 0-4 should be zero generation
    assert data["intervals"][1]["ml_power_kw"] == 0.0
    # Solar noon (hour 12) must have high generation
    assert data["intervals"][12]["ml_power_kw"] > 20.0

def test_api_ml_model_info_endpoint():
    """Tests GET /api/v1/solar-ml/model-info returns full provenance and status."""
    response = client.get("/api/v1/solar-ml/model-info")
    assert response.status_code == 200

    data = response.json()
    assert data["is_loaded"] is True
    assert data["model_name"] == "RoofShift Solar Forecaster"
    assert data["champion_algorithm"] == "XGBoost_Regressor"
    assert "dataset_provenance" in data
    assert "evaluation_on_held_out_test_data" in data

def test_system_integrations_reports_ml_status():
    """Tests GET /api/v1/system/integrations exposes machine_learning_status."""
    response = client.get("/api/v1/system/integrations")
    assert response.status_code == 200

    data = response.json()
    assert "machine_learning_status" in data
    ml_status = data["machine_learning_status"]
    assert ml_status["status"] == "TRAINED_OPERATIONAL"
    assert ml_status["algorithm"] == "XGBoost_Regressor"
    assert ml_status["physics_fallback_preserved"] is True


def test_api_ml_dated_weather_forecast_endpoint():
    """Tests POST /api/v1/solar-ml/dated-forecast with real Open-Meteo NWP radiation and temperature."""
    payload = {
        "latitude": 26.9124,
        "longitude": 75.7873,
        "capacity_kwp": 100.0,
        "forecast_days": 2
    }
    response = client.post("/api/v1/solar-ml/dated-forecast", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["latitude"] == 26.9124
    assert data["longitude"] == 75.7873
    assert data["capacity_kwp"] == 100.0
    assert data["total_forecast_hours"] >= 24
    assert "hourly_forecast" in data
    assert len(data["hourly_forecast"]) >= 24
    assert "Open-Meteo" in data["weather_provider"]
    assert data["model_algorithm"] == "XGBoost_Regressor"
    first = data["hourly_forecast"][0]
    assert "timestamp_iso" in first
    assert "shortwave_radiation_w_m2" in first
    assert "wind_speed_ms" in first
    assert "ml_predicted_power_kw" in first
    assert "physics_baseline_kw" in first
