from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Any
from datetime import datetime

class BuildingBase(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(default="Academic")
    address: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    
    # Roof
    gross_roof_area: float = Field(..., gt=0.0, le=10_000_000, description="Gross roof area in m^2")
    usable_roof_percentage: float = Field(default=70.0, ge=0.0, le=100.0)
    shading_category: str = Field(default="Low") # Low, Medium, High, Custom
    custom_shading_loss: Optional[float] = Field(default=5.0, ge=0.0, le=100.0)
    roof_polygon: Optional[List[Any]] = None
    obstacles_notes: Optional[str] = None
    
    # Demand
    monthly_consumption_kwh: float = Field(..., gt=0.0, le=1_000_000_000_000, description="Monthly electricity consumption in kWh")
    tariff_inr: Optional[float] = Field(default=None, ge=0.0, le=1_000_000)
    daytime_consumption_pct: float = Field(default=65.0, ge=0.0, le=100.0)
    demand_origin: str = Field(default="Estimated profile")
    
    # Financial parameters
    cost_per_kwp: float = Field(default=50000.0, gt=0.0, le=1_000_000_000)
    fixed_cost: float = Field(default=0.0, ge=0.0, le=1_000_000_000_000_000)
    max_eligible_kwp: Optional[float] = Field(default=None, ge=0.0, le=1_000_000)

class BuildingCreate(BuildingBase):
    pass

class BuildingUpdate(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    category: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    gross_roof_area: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    usable_roof_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    shading_category: Optional[str] = None
    custom_shading_loss: Optional[float] = Field(default=None, ge=0, le=100)
    roof_polygon: Optional[List[Any]] = None
    obstacles_notes: Optional[str] = None
    monthly_consumption_kwh: Optional[float] = Field(default=None, gt=0, le=1_000_000_000_000)
    tariff_inr: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    daytime_consumption_pct: Optional[float] = Field(default=None, ge=0, le=100)
    demand_origin: Optional[str] = None
    cost_per_kwp: Optional[float] = Field(default=None, gt=0, le=1_000_000_000)
    fixed_cost: Optional[float] = Field(default=None, ge=0, le=1_000_000_000_000_000)
    max_eligible_kwp: Optional[float] = Field(default=None, ge=0, le=1_000_000)

    @field_validator('name', 'category', 'latitude', 'longitude', 'gross_roof_area',
                     'usable_roof_percentage', 'shading_category', 'monthly_consumption_kwh',
                     'daytime_consumption_pct', 'demand_origin', 'cost_per_kwp', 'fixed_cost', mode='before')
    @classmethod
    def required_if_supplied(cls, value):
        if value is None:
            raise ValueError('Required field cannot be null')
        return value

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
