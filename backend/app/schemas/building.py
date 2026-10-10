from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class BuildingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(default="Academic")
    address: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    
    # Roof
    gross_roof_area: float = Field(..., gt=0.0, description="Gross roof area in m^2")
    usable_roof_percentage: float = Field(default=70.0, ge=5.0, le=100.0)
    shading_category: str = Field(default="Low") # Low, Medium, High, Custom
    custom_shading_loss: Optional[float] = Field(default=5.0, ge=0.0, le=90.0)
    roof_polygon: Optional[List[Any]] = None
    obstacles_notes: Optional[str] = None
    
    # Demand
    monthly_consumption_kwh: float = Field(..., gt=0.0, description="Monthly electricity consumption in kWh")
    tariff_inr: Optional[float] = None
    daytime_consumption_pct: float = Field(default=65.0, ge=10.0, le=100.0)
    demand_origin: str = Field(default="Estimated profile")
    
    # Financial parameters
    cost_per_kwp: float = Field(default=50000.0, gt=0.0)
    fixed_cost: float = Field(default=0.0, ge=0.0)
    max_eligible_kwp: Optional[float] = None

class BuildingCreate(BuildingBase):
    pass

class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    gross_roof_area: Optional[float] = None
    usable_roof_percentage: Optional[float] = None
    shading_category: Optional[str] = None
    custom_shading_loss: Optional[float] = None
    roof_polygon: Optional[List[Any]] = None
    obstacles_notes: Optional[str] = None
    monthly_consumption_kwh: Optional[float] = None
    tariff_inr: Optional[float] = None
    daytime_consumption_pct: Optional[float] = None
    demand_origin: Optional[str] = None
    cost_per_kwp: Optional[float] = None
    fixed_cost: Optional[float] = None
    max_eligible_kwp: Optional[float] = None

class SolarAnalysisSummary(BaseModel):
    id: str
    usable_roof_area_sqm: float
    max_pv_capacity_kwp: float
    annual_generation_kwh: float
    monthly_generation_kwh: List[float]
    specific_yield_kwh_per_kwp: float
    performance_ratio: float
    effective_shading_loss_pct: float
    annual_consumption_kwh: float
    annual_onsite_consumed_kwh: float
    annual_exported_kwh: float
    onsite_utilization_pct: float
    annual_savings_inr: float
    installation_cost_inr: float
    simple_payback_years: Optional[float]
    avoided_co2_kg_annual: float
    ghi_annual_avg_kwh_m2_day: float
    irradiance_source: str
    data_quality_label: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BuildingResponse(BuildingBase):
    id: str
    project_id: str
    usable_roof_area: float = 0.0
    solar_analysis: Optional[SolarAnalysisSummary] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
