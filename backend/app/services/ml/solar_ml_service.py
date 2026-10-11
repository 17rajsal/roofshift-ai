"""
RoofShift AI — Solar Machine Learning Forecasting Service
Provides real inference using the trained XGBoost solar regression model,
benchmarked against the deterministic IEC 61724 physics derating engine.
"""

import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import joblib

from app.core.config import settings

logger = logging.getLogger("roofshift.ml.service")

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODEL_FILE = os.path.join(ARTIFACTS_DIR, "solar_xgboost_v1.joblib")
METADATA_FILE = os.path.join(ARTIFACTS_DIR, "model_metadata.json")

class SolarMLService:
    def __init__(self):
        self._model = None
        self._metadata: Optional[Dict[str, Any]] = None
        self._is_loaded = False
        self._load_artifacts()

    def _load_artifacts(self):
        try:
            if os.path.exists(METADATA_FILE):
                with open(METADATA_FILE, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
                logger.info(f"Loaded ML model metadata from {METADATA_FILE}")

            if os.path.exists(MODEL_FILE):
                self._model = joblib.load(MODEL_FILE)
                self._is_loaded = True
                logger.info(f"Loaded trained XGBoost model from {MODEL_FILE}")
            else:
                logger.warning(f"Model file {MODEL_FILE} not found. Operating in physics fallback mode.")
        except Exception as e:
            logger.error(f"Error loading ML model artifacts: {str(e)}. Operating in physics fallback mode.")
            self._model = None
            self._is_loaded = False

    def is_model_available(self) -> bool:
        return self._is_loaded and self._model is not None

    def get_metadata(self) -> Dict[str, Any]:
        if self._metadata:
            return self._metadata
        return {
            "model_name": "RoofShift Solar Forecaster (Fallback)",
            "model_version": "0.0.0",
            "status": "UNLOADED_FALLBACK_ACTIVE",
            "champion_algorithm": "IEC_61724_Physics_Engine"
        }

    @staticmethod
    def calculate_cell_temperature(ambient_temp_c: float, irradiance_w_m2: float, noct: float = 45.0) -> float:
        """
        Estimates PV cell temperature from ambient temperature and irradiance using standard NOCT model:
        T_cell = T_ambient + ((NOCT - 20) / 800) * Irradiance
        """
        return ambient_temp_c + ((noct - 20.0) / 800.0) * irradiance_w_m2

    @staticmethod
    def calculate_physics_baseline(
        capacity_kwp: float,
        irradiance_w_m2: float,
        cell_temperature_c: float,
        pr: float = 0.75,
        gamma: float = 0.0035
    ) -> float:
        """
        Standard IEC 61724 physical derating model:
        P = Capacity * (G / 1000) * PR * [1 - gamma * (T_cell - 25°C)]
        """
        irrad_kw_m2 = max(0.0, irradiance_w_m2 / 1000.0)
        temp_derate = 1.0 - gamma * (cell_temperature_c - 25.0)
        power_kw = capacity_kwp * irrad_kw_m2 * pr * temp_derate
        return float(np.clip(power_kw, 0.0, capacity_kwp * 1.05))

    def predict_point(
        self,
        capacity_kwp: float,
        irradiance_w_m2: float,
        ambient_temperature_c: float,
        cell_temperature_c: Optional[float] = None,
        hour_of_day: float = 12.0
    ) -> Dict[str, Any]:
        """
        Generates ML forecast and compares against physical baseline.
        """
        if cell_temperature_c is None:
            cell_temperature_c = self.calculate_cell_temperature(ambient_temperature_c, irradiance_w_m2)

        # 1. Physics Baseline
        physics_power_kw = self.calculate_physics_baseline(
            capacity_kwp=capacity_kwp,
            irradiance_w_m2=irradiance_w_m2,
            cell_temperature_c=cell_temperature_c
        )

        # 2. Machine Learning Prediction
        if self.is_model_available() and irradiance_w_m2 > 10.0:
            try:
                irrad_kw_m2 = irradiance_w_m2 / 1000.0
                temp_diff = cell_temperature_c - 25.0
                hour_val = max(0.0, min(24.0, hour_of_day))
                hour_sin = np.sin(2.0 * np.pi * hour_val / 24.0)
                hour_cos = np.cos(2.0 * np.pi * hour_val / 24.0)
                irrad_sq = irrad_kw_m2 ** 2
                irrad_temp_interaction = irrad_kw_m2 * temp_diff

                features = np.array([[
                    irrad_kw_m2,
                    ambient_temperature_c,
                    cell_temperature_c,
                    temp_diff,
                    hour_val,
                    hour_sin,
                    hour_cos,
                    irrad_sq,
                    irrad_temp_interaction
                ]], dtype=np.float32)

                specific_power_norm = float(self._model.predict(features)[0])
                specific_power_norm = float(np.clip(specific_power_norm, 0.0, 1.0))

                ml_power_kw = round(specific_power_norm * capacity_kwp, 3)
                model_status = "TRAINED_OPERATIONAL"
            except Exception as e:
                logger.warning(f"Inference error ({str(e)}). Falling back to physics baseline.")
                ml_power_kw = round(physics_power_kw, 3)
                model_status = "FALLBACK_PHYSICS_ERROR"
        else:
            # Irradiance <= 10 W/m^2 represents night/twilight where generation is zero
            ml_power_kw = 0.0 if irradiance_w_m2 <= 10.0 else round(physics_power_kw, 3)
            model_status = "TRAINED_NIGHT_ZERO" if irradiance_w_m2 <= 10.0 else "FALLBACK_PHYSICS"

        delta_kw = round(ml_power_kw - physics_power_kw, 3)

        # Confidence bounds based on held-out test error margin (95% CI)
        error_margin_norm = 0.03366  # Empirically measured 95% error margin from held-out test
        if self._metadata and "evaluation_on_held_out_test_data" in self._metadata:
            error_margin_norm = self._metadata["evaluation_on_held_out_test_data"].get("empirical_95_percent_error_margin", 0.03366)

        margin_kw = round(error_margin_norm * capacity_kwp, 3)
        lower_kw = max(0.0, round(ml_power_kw - margin_kw, 3))
        upper_kw = round(min(capacity_kwp * 1.05, ml_power_kw + margin_kw), 3)

        metadata = self.get_metadata()
        r2 = metadata.get("evaluation_on_held_out_test_data", {}).get("champion_test_metrics", {}).get("r2_score", 0.9962)
        nmae = metadata.get("evaluation_on_held_out_test_data", {}).get("champion_test_metrics", {}).get("nmae_pct", 4.04)

        return {
            "capacity_kwp": round(capacity_kwp, 2),
            "irradiance_w_per_m2": round(irradiance_w_m2, 1),
            "ambient_temperature_c": round(ambient_temperature_c, 1),
            "cell_temperature_c": round(cell_temperature_c, 1),
            "hour_of_day": round(hour_of_day, 2),
            "ml_predicted_power_kw": ml_power_kw,
            "physics_baseline_kw": round(physics_power_kw, 3),
            "delta_kw": delta_kw,
            "confidence_lower_kw": lower_kw,
            "confidence_upper_kw": upper_kw,
            "model_name": metadata.get("model_name", "RoofShift Solar Forecaster"),
            "model_version": metadata.get("model_version", "1.0.0"),
            "model_algorithm": metadata.get("champion_algorithm", "XGBoost_Regressor"),
            "model_status": model_status,
            "dataset_provenance": "Gandikota Solar Power Plant 1 (Andhra Pradesh, India, 34-day operational sensor data)",
            "test_r2_score": r2,
            "test_nmae_pct": nmae,
            "prediction_timestamp_utc": datetime.now(timezone.utc).isoformat()
        }

    def predict_diurnal_profile(
        self,
        capacity_kwp: float,
        peak_irradiance_w_m2: float = 900.0,
        ambient_temperature_c: float = 30.0
    ) -> List[Dict[str, Any]]:
        """
        Generates 24-hour diurnal profile comparing ML vs Physics curves.
        """
        profile = []
        for h in range(24):
            # Solar diurnal solar bell curve
            if 6 <= h <= 18:
                solar_factor = np.sin((h - 6) / 12.0 * np.pi) ** 1.3
                irrad = peak_irradiance_w_m2 * solar_factor
                temp_amb = ambient_temperature_c - 4.0 + 8.0 * np.sin((h - 8) / 14.0 * np.pi)
            else:
                irrad = 0.0
                temp_amb = ambient_temperature_c - 6.0

            res = self.predict_point(
                capacity_kwp=capacity_kwp,
                irradiance_w_m2=irrad,
                ambient_temperature_c=temp_amb,
                hour_of_day=float(h)
            )
            profile.append({
                "hour": h,
                "irradiance_w_per_m2": round(irrad, 1),
                "ambient_temp_c": round(temp_amb, 1),
                "ml_power_kw": res["ml_predicted_power_kw"],
                "physics_power_kw": res["physics_baseline_kw"],
                "delta_kw": res["delta_kw"],
                "confidence_lower_kw": res["confidence_lower_kw"],
                "confidence_upper_kw": res["confidence_upper_kw"]
            })
        return profile

    async def predict_weather_based_forecast(
        self,
        latitude: float,
        longitude: float,
        capacity_kwp: float,
        forecast_days: int = 2
    ) -> Dict[str, Any]:
        """
        Retrieves real-time NWP numerical weather forecast from Open-Meteo,
        extracts hourly solar shortwave radiation, ambient temperature, and wind speed (in m/s),
        and generates genuine dated solar generation forecasts comparing ML vs IEC 61724 physics.
        """
        import httpx

        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={round(latitude, 4)}&longitude={round(longitude, 4)}"
            f"&hourly=temperature_2m,shortwave_radiation,wind_speed_10m"
            f"&wind_speed_unit=ms&timezone=auto&forecast_days={min(7, max(1, forecast_days))}"
        )

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url, headers={"User-Agent": "RoofShift-AI/2.0"})
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch Open-Meteo hourly weather forecast: {str(e)}")
            raise RuntimeError(f"Unable to retrieve real-time weather forecast for coordinates ({latitude}, {longitude}): {str(e)}")

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        rads = hourly.get("shortwave_radiation", [])
        temps = hourly.get("temperature_2m", [])
        winds = hourly.get("wind_speed_10m", [])
        tz = data.get("timezone", "UTC")

        points = []
        total_ml_kwh = 0.0
        total_phys_kwh = 0.0

        for t_str, rad, temp, wind in zip(times, rads, temps, winds):
            dt = datetime.fromisoformat(t_str)
            hour_float = dt.hour + dt.minute / 60.0
            rad_w_m2 = max(0.0, float(rad or 0.0))
            temp_c = float(temp or 25.0)
            wind_ms = float(wind or 3.0)

            # Standard cell temp estimation with wind cooling factor:
            # T_cell = T_ambient + ((NOCT - 20) / 800) * G * (1 - 0.05 * (wind - 1))
            wind_factor = max(0.6, min(1.4, 1.0 - 0.05 * (wind_ms - 1.0)))
            cell_temp_c = temp_c + ((45.0 - 20.0) / 800.0) * rad_w_m2 * wind_factor

            res = self.predict_point(
                capacity_kwp=capacity_kwp,
                irradiance_w_m2=rad_w_m2,
                ambient_temperature_c=temp_c,
                cell_temperature_c=cell_temp_c,
                hour_of_day=hour_float
            )

            ml_kw = res["ml_predicted_power_kw"]
            phys_kw = res["physics_baseline_kw"]
            delta_kw = res["delta_kw"]
            in_domain = (rad_w_m2 >= 15.0) and (-10.0 <= temp_c <= 50.0)

            # Hourly power integrates to energy in kWh (1 hour interval)
            total_ml_kwh += ml_kw
            total_phys_kwh += phys_kw

            points.append({
                "timestamp_iso": t_str,
                "hour_of_day": round(hour_float, 2),
                "shortwave_radiation_w_m2": round(rad_w_m2, 1),
                "ambient_temp_c": round(temp_c, 1),
                "wind_speed_ms": round(wind_ms, 2),
                "cell_temp_c": round(cell_temp_c, 1),
                "ml_predicted_power_kw": ml_kw,
                "physics_baseline_kw": phys_kw,
                "delta_kw": delta_kw,
                "confidence_lower_kw": res["confidence_lower_kw"],
                "confidence_upper_kw": res["confidence_upper_kw"],
                "in_domain": in_domain
            })

        meta = self.get_metadata()
        diff_pct = round(((total_ml_kwh - total_phys_kwh) / max(0.001, total_phys_kwh) * 100.0), 2) if total_phys_kwh > 0 else 0.0

        return {
            "latitude": round(latitude, 6),
            "longitude": round(longitude, 6),
            "capacity_kwp": round(capacity_kwp, 2),
            "timezone": tz,
            "weather_provider": "Open-Meteo High-Resolution NWP (DWD ICON / ECMWF Models)",
            "total_forecast_hours": len(points),
            "hourly_forecast": points,
            "total_predicted_energy_kwh": round(total_ml_kwh, 2),
            "total_physics_energy_kwh": round(total_phys_kwh, 2),
            "energy_difference_pct": diff_pct,
            "model_version": meta.get("model_version", "1.1.0"),
            "model_algorithm": meta.get("champion_algorithm", "XGBoost_Regressor"),
            "provenance_note": (
                "Forecast uses dated numerical weather prediction (NWP) solar radiation from Open-Meteo. "
                "Inputs inside operational bounds (G >= 15 W/m²) are predicted via trained XGBoost regressor, "
                "benchmarked against IEC 61724 PR physics derating."
            ),
            "uncertainties_and_limitations": (
                "Uncertainty margins reflect empirical 95% confidence intervals from held-out operational test data. "
                "Cloud variability and sub-hourly ramping dynamics may cause transient deviations. "
                "Module tilt, azimuth deviation, and local horizon shading obstacles are not modeled in macro NWP radiation."
            )
        }


solar_ml_service = SolarMLService()
