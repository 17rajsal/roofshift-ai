from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HourlyPoint(BaseModel):
    hour: int
    time_label: str
    solar_generation_kw: float
    electricity_demand_kw: float
    onsite_solar_used_kw: float
    grid_import_kw: float
    solar_surplus_kw: float

class MonthlyTrendPoint(BaseModel):
    month: str
    solar_generation_kwh: float
    electricity_demand_kwh: float
    onsite_solar_kwh: float
    surplus_export_kwh: float
    grid_import_kwh: float

class BuildingEnergyMetric(BaseModel):
    building_id: str
    building_name: str
    category: str
    allocated_capacity_kwp: float
    annual_generation_kwh: float
    annual_demand_kwh: float
    generation_to_demand_ratio_pct: float
    solar_fraction_pct: float
    annual_savings_inr: float
    avoided_co2_kg: float

class EnergyInsightsResponse(BaseModel):
    project_id: str
    has_active_optimization: bool
    total_capacity_kwp: float
    total_annual_generation_kwh: float
    total_annual_demand_kwh: float
    total_onsite_solar_kwh: float
    total_surplus_kwh: float
    total_grid_import_offset_kwh: float
    grid_offset_pct: float
    
    total_installation_cost_inr: float
    total_annual_savings_inr: float
    simple_payback_years: Optional[float]
    avoided_co2_kg_annual: float
    
    peak_solar_window: str # e.g. "10:00 AM - 03:00 PM"
    hourly_profile: List[HourlyPoint] # Typical day 24-hr breakdown
    monthly_trends: List[MonthlyTrendPoint] # 12 months
    building_comparisons: List[BuildingEnergyMetric]
    monthly_hourly_surplus_kw: List[List[float]] = Field(default_factory=list, description="12 monthly representative days, each 24 hourly mean exported-kW bins; inputs to conserved scheduling")
    
    data_origin_notice: str
