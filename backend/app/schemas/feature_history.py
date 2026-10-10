from datetime import datetime
from typing import Any
from pydantic import BaseModel


class FeatureAssessmentResponse(BaseModel):
    assessment_id: str
    project_id: str
    feature_key: str
    schema_version: str
    created_at: datetime
    inputs: dict[str, Any]
    result: dict[str, Any]


class FeatureHistoryResponse(BaseModel):
    project_id: str
    assessments: list[FeatureAssessmentResponse]
