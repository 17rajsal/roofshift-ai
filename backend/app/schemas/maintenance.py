from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class MaintenanceCaseCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    category: str = Field(default="PANEL_SOILING")
    priority: str = Field(default="MEDIUM")
    building_id: Optional[str] = None
    estimated_loss_kwh_per_day: float = Field(default=0.0, ge=0.0)
    assigned_to: Optional[str] = None

class MaintenanceCaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    estimated_loss_kwh_per_day: Optional[float] = None
    assigned_to: Optional[str] = None

class MaintenanceCaseResponse(BaseModel):
    id: str
    project_id: str
    building_id: Optional[str] = None
    title: str
    description: str
    category: str
    priority: str
    status: str
    estimated_loss_kwh_per_day: float
    assigned_to: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
