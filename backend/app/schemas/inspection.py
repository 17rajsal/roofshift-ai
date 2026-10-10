from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class PanelInspectionResponse(BaseModel):
    id: str
    building_id: str
    filename: str
    image_url: str
    defect_type: str
    severity: str
    confidence_score: float
    temperature_delta_c: Optional[float] = None
    estimated_power_loss_pct: float
    recommended_action: str
    model_provenance: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DefectSummaryResponse(BaseModel):
    total_inspections: int
    defects_detected: int
    healthy_panels: int
    critical_alerts: int
    total_estimated_power_loss_pct: float
    inspections: List[PanelInspectionResponse]
