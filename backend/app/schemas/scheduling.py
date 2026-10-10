from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class EnergyActivityCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    building_id: Optional[str] = None
    power_kw: float = Field(..., gt=0.0)
    duration_hours: float = Field(..., ge=0.5, le=12.0)
    earliest_hour: int = Field(default=8, ge=0, le=23)
    latest_hour: int = Field(default=18, ge=0, le=23)
    preferred_hour: int = Field(default=18, ge=0, le=23)
    days_per_week: int = Field(default=5, ge=1, le=7)
    is_shiftable: bool = Field(default=True)

class EnergyActivityResponse(EnergyActivityCreate):
    id: str
    project_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ShiftRecommendation(BaseModel):
    activity_id: str
    activity_name: str
    building_name: str
    original_window: str
    recommended_window: str
    recommended_start_hour: int
    duration_hours: float
    power_kw: float
    energy_kwh_per_session: float
    available_surplus_in_window_kwh: float
    additional_solar_absorbed_kwh: float
    estimated_annual_savings_inr: float
    reason: str
    practical_notes: str

class HourlyProfileComparison(BaseModel):
    hour: int
    time_label: str
    solar_generation_kw: float
    baseline_load_kw: float
    shifted_load_kw: float
    surplus_before_kw: float
    surplus_after_kw: float

class SchedulingOptimizationResponse(BaseModel):
    project_id: str
    activities_analyzed: int
    shiftable_activities_count: int
    recommendations: List[ShiftRecommendation]
    hourly_comparison: List[HourlyProfileComparison]
    daily_surplus_before_kwh: float
    daily_surplus_after_kwh: float
    daily_solar_absorption_gain_kwh: float
    annual_solar_absorption_gain_kwh: float
    annual_financial_gain_inr: float
    co2_reduction_gain_kg: float
    disclaimer: str
