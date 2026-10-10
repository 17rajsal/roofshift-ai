from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class SolarMonitoringResponse(BaseModel):
    id: str
    project_id: str
    building_id: Optional[str] = None
    filename: str
    record_count: int
    total_measured_generation_kwh: float
    expected_generation_kwh: float
    performance_ratio_actual: float
    expected_performance_ratio: float
    generation_delta_pct: float
    degradation_annual_pct: float
    underperformance_flag: bool
    diagnostic_summary: str
    data_mode: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
