"""
Pydantic Schemas for Solar Machine Learning Forecast API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SolarMLForecastRequest(BaseModel):
    capacity_kwp: float = Field(..., gt=0.0, le=100000.0, description="Rated solar PV system capacity in kWp")
    irradiance_w_per_m2: float = Field(..., ge=0.0, le=2000.0, description="Plane of array irradiance in W/m²")
    ambient_temperature_c: float = Field(28.0, ge=-20.0, le=60.0, description="Ambient air temperature in °C")
    cell_temperature_c: Optional[float] = Field(None, ge=-20.0, le=100.0, description="PV cell temperature in °C (estimated from NOCT if null)")
    hour_of_day: float = Field(12.0, ge=0.0, le=24.0, description="Hour of the day (0.0 to 24.0)")

class SolarMLForecastResponse(BaseModel):
    capacity_kwp: float
    irradiance_w_per_m2: float
    ambient_temperature_c: float
    cell_temperature_c: float
    hour_of_day: float
    ml_predicted_power_kw: float
    physics_baseline_kw: float
    delta_kw: float
    confidence_lower_kw: float
    confidence_upper_kw: float
    model_name: str
    model_version: str
    model_algorithm: str
    model_status: str
    dataset_provenance: str
    test_r2_score: float
    test_nmae_pct: float
    prediction_timestamp_utc: str

class SolarMLDiurnalRequest(BaseModel):
    capacity_kwp: float = Field(..., gt=0.0, le=100000.0, description="Rated solar capacity in kWp")
    peak_irradiance_w_m2: float = Field(900.0, ge=100.0, le=1500.0, description="Peak solar irradiance at solar noon in W/m²")
    ambient_temperature_c: float = Field(30.0, ge=-20.0, le=55.0, description="Base ambient temperature in °C")

class DiurnalIntervalPrediction(BaseModel):
    hour: int
    irradiance_w_per_m2: float
    ambient_temp_c: float
    ml_power_kw: float
    physics_power_kw: float
    delta_kw: float
    confidence_lower_kw: float
    confidence_upper_kw: float

class SolarMLDiurnalResponse(BaseModel):
    capacity_kwp: float
    peak_irradiance_w_m2: float
    intervals: List[DiurnalIntervalPrediction]
    total_daily_ml_kwh: float
    total_daily_physics_kwh: float
    energy_difference_pct: float
    model_version: str
    model_status: str
    simulation_notice: str = "Simulated synthetic solar diurnal profile for conceptual sensitivity analysis. Use /dated-forecast for real NWP weather-driven generation."


class DatedHourlyForecastPoint(BaseModel):
    timestamp_iso: str
    hour_of_day: float
    shortwave_radiation_w_m2: float
    ambient_temp_c: float
    wind_speed_ms: float
    cell_temp_c: float
    ml_predicted_power_kw: float
    physics_baseline_kw: float
    delta_kw: float
    confidence_lower_kw: float
    confidence_upper_kw: float
    in_domain: bool


class SolarMLDatedWeatherForecastRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Site latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Site longitude")
    capacity_kwp: float = Field(..., gt=0.0, le=100000.0, description="Installed or modeled solar PV capacity in kWp")
    forecast_days: int = Field(2, ge=1, le=7, description="Number of forecast days (1 to 7)")


class SolarMLDatedWeatherForecastResponse(BaseModel):
    latitude: float
    longitude: float
    capacity_kwp: float
    timezone: str
    weather_provider: str
    total_forecast_hours: int
    hourly_forecast: List[DatedHourlyForecastPoint]
    total_predicted_energy_kwh: float
    total_physics_energy_kwh: float
    energy_difference_pct: float
    model_version: str
    model_algorithm: str
    provenance_note: str
    uncertainties_and_limitations: str
