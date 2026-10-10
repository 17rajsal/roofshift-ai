from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    organization_name: str = Field(default="Campus / Organization")
    city: str = Field(default="New Delhi")
    latitude: float = Field(default=28.6139, ge=-90.0, le=90.0)
    longitude: float = Field(default=77.2090, ge=-180.0, le=180.0)
    budget: float = Field(default=1000000.0, ge=1000.0) # INR
    tariff_rate: float = Field(default=8.5, gt=0.0) # INR / kWh
    export_tariff: float = Field(default=3.5, ge=0.0) # INR / kWh
    co2_factor: float = Field(default=0.716, ge=0.0)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    organization_name: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    budget: Optional[float] = None
    tariff_rate: Optional[float] = None
    export_tariff: Optional[float] = None
    co2_factor: Optional[float] = None

class ProjectResponse(ProjectBase):
    id: str
    is_demo: str
    building_count: int = 0
    total_roof_area: float = 0.0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
