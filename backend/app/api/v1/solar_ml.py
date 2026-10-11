"""
RoofShift AI — Solar Machine Learning Forecast Router
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.schemas.solar_ml import (
    SolarMLForecastRequest,
    SolarMLForecastResponse,
    SolarMLDiurnalRequest,
    SolarMLDiurnalResponse
)
from app.services.ml.solar_ml_service import solar_ml_service

router = APIRouter(prefix="/solar-ml", tags=["Machine Learning Solar Forecasting"])

@router.post("/forecast", response_model=SolarMLForecastResponse)
def get_ml_solar_forecast(payload: SolarMLForecastRequest):
    """
    Computes an empirical solar generation forecast using the trained XGBoost model
    and compares it side-by-side against the deterministic IEC 61724 physics baseline.
    """
    try:
        result = solar_ml_service.predict_point(
            capacity_kwp=payload.capacity_kwp,
            irradiance_w_m2=payload.irradiance_w_per_m2,
            ambient_temperature_c=payload.ambient_temperature_c,
            cell_temperature_c=payload.cell_temperature_c,
            hour_of_day=payload.hour_of_day
        )
        return SolarMLForecastResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solar ML forecasting error: {str(e)}")

@router.post("/diurnal-forecast", response_model=SolarMLDiurnalResponse)
def get_ml_diurnal_forecast(payload: SolarMLDiurnalRequest):
    """
    Simulates a 24-hour diurnal generation curve comparing the ML model
    against the physical derating baseline across varying ambient temperatures and irradiance.
    """
    try:
        intervals = solar_ml_service.predict_diurnal_profile(
            capacity_kwp=payload.capacity_kwp,
            peak_irradiance_w_m2=payload.peak_irradiance_w_m2,
            ambient_temperature_c=payload.ambient_temperature_c
        )
        total_ml = sum(item["ml_power_kw"] for item in intervals)
        total_phys = sum(item["physics_power_kw"] for item in intervals)
        diff_pct = round(((total_ml - total_phys) / total_phys * 100.0), 2) if total_phys > 0 else 0.0

        metadata = solar_ml_service.get_metadata()

        return SolarMLDiurnalResponse(
            capacity_kwp=payload.capacity_kwp,
            peak_irradiance_w_m2=payload.peak_irradiance_w_m2,
            intervals=intervals,
            total_daily_ml_kwh=round(total_ml, 2),
            total_daily_physics_kwh=round(total_phys, 2),
            energy_difference_pct=diff_pct,
            model_version=metadata.get("model_version", "1.0.0"),
            model_status="TRAINED_OPERATIONAL" if solar_ml_service.is_model_available() else "FALLBACK_PHYSICS"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diurnal ML forecasting error: {str(e)}")

@router.get("/model-info")
def get_ml_model_info():
    """
    Returns the complete machine learning model provenance, training metadata,
    hyperparameters, and held-out test evaluation benchmarks.
    """
    meta = solar_ml_service.get_metadata()
    meta["is_loaded"] = solar_ml_service.is_model_available()
    return meta
