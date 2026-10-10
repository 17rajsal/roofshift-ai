from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    name: str = Field(..., min_length=2, max_length=150)
    organization_name: str = Field(default="Campus / Organization")
    city: str = Field(default="New Delhi")
    latitude: float = Field(default=28.6139, ge=-90.0, le=90.0)
    longitude: float = Field(default=77.2090, ge=-180.0, le=180.0)
    budget: float = Field(default=1000000.0, ge=1000.0, le=1_000_000_000_000_000) # INR
    tariff_rate: float = Field(default=8.5, gt=0.0, le=1_000_000) # INR / kWh
    export_tariff: float = Field(default=3.5, ge=0.0, le=1_000_000) # INR / kWh
    co2_factor: float = Field(default=0.716, ge=0.0, le=1000)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    organization_name: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    budget: Optional[float] = Field(default=None, ge=1000, le=1_000_000_000_000_000)
    tariff_rate: Optional[float] = Field(default=None, gt=0, le=1_000_000)
    export_tariff: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    co2_factor: Optional[float] = Field(default=None, ge=0, le=1000)

    @field_validator('name', 'organization_name', 'city', 'latitude', 'longitude',
                     'budget', 'tariff_rate', 'export_tariff', 'co2_factor', mode='before')
    @classmethod
    def required_if_supplied(cls, value):
        if value is None:
            raise ValueError('Required field cannot be null')
        return value

class ProjectResponse(ProjectBase):
    id: str
    is_demo: str
    building_count: int = 0
    total_roof_area: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
