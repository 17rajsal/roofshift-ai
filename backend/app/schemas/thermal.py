from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ThermalObservationItem(BaseModel):
    panel_id: str = Field(..., description="Unique module or string identifier, e.g. A-07")
    surface_temp_c: float = Field(..., ge=-20.0, le=120.0, description="Measured or modeled surface temperature in °C")
    baseline_temp_c: Optional[float] = Field(default=42.0, ge=-20.0, le=100.0, description="Nominal baseline operating temperature in °C")
    ambient_temp_c: Optional[float] = Field(default=33.5, ge=-30.0, le=60.0, description="Ambient air temperature in °C")
    irradiance_wm2: Optional[float] = Field(default=850.0, ge=0.0, le=1500.0, description="Plane of array irradiance in W/m²")
    timestamp: Optional[datetime] = None
    notes: Optional[str] = None

class ThermalBatchIngestRequest(BaseModel):
    dataset_name: str = Field(..., min_length=2, max_length=120)
    building_id: Optional[str] = None
    provenance: str = Field(default="MEASURED", description="MEASURED | ESTIMATED | SAMPLE")
    observations: List[ThermalObservationItem] = Field(..., min_length=1)

class ThermalObservationAnalysis(BaseModel):
    id: str
    panel_id: str
    surface_temp_c: float
    baseline_temp_c: float
    delta_temp_c: float
    diagnostic_status: str  # NORMAL, REVIEW, ELEVATED, CRITICAL
    severity: str           # NONE, LOW, MEDIUM, HIGH, CRITICAL
    suspected_cause: str
    confidence_score: float
    estimated_power_loss_pct: float
    recommended_action: str
    provenance: str
    observed_at: datetime
    building_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ThermalSummaryResponse(BaseModel):
    project_id: str
    total_monitored_strings: int
    avg_temperature_c: float
    max_temperature_c: float
    anomalies_count: int
    critical_count: int
    elevated_count: int
    review_count: int
    normal_count: int
    fleet_power_loss_pct: float
    provenance: str
    methodology: str
    observations: List[ThermalObservationAnalysis]

class ThermalCreateMaintenanceRequest(BaseModel):
    panel_id: str
    building_id: Optional[str] = None
    surface_temp_c: float
    delta_temp_c: float
    suspected_cause: str
    priority: Optional[str] = "HIGH"
    notes: Optional[str] = None
