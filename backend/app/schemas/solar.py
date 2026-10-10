from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class MonthlySolarItem(BaseModel):
    month: str
    month_index: int
    ghi_kwh_m2_day: float
    generation_kwh: float
    consumption_kwh: float
    onsite_used_kwh: float
    export_kwh: float

class SolarAnalysisResponse(BaseModel):
    building_id: str
    building_name: str
    gross_roof_area_sqm: float
    usable_roof_area_sqm: float
    max_pv_capacity_kwp: float
    annual_generation_kwh: float
    monthly_breakdown: List[MonthlySolarItem]
    specific_yield_kwh_per_kwp: float
    performance_ratio: float
    effective_shading_loss_pct: float
    
    annual_consumption_kwh: float
    annual_onsite_consumed_kwh: float
    annual_exported_kwh: float
    onsite_utilization_pct: float
    
    installation_cost_inr: float
    annual_savings_inr: float
    simple_payback_years: Optional[float]
    avoided_co2_kg_annual: float
    
    ghi_annual_avg_kwh_m2_day: float
    irradiance_source: str
    data_quality_label: str
    calculation_notes: Optional[str] = None
    last_updated: datetime
