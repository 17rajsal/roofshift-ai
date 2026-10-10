from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ReportGenerateRequest(BaseModel):
    include_scenarios: bool = True
    include_load_shifting: bool = True
    include_features: bool = True
    notes: Optional[str] = Field(default=None, max_length=2000)

class ReportResponse(BaseModel):
    report_id: str
    project_id: str
    project_name: str
    filename: str
    download_url: str
    file_size_bytes: int
    generated_at: datetime
