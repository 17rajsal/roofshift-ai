"""Additive versioned, project-scoped contracts for the eight feature engines."""
from datetime import datetime, timezone
from typing import Literal, get_args
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.project import Project
from app.models.feature import FeatureAssessment
from app.schemas.feature_history import FeatureAssessmentResponse, FeatureHistoryResponse
from app.schemas.feature_analytics import (
    SolarLocationRequest, SolarLocationResponse, SolarPredictionRequest, SolarPredictionResponse,
    DemandAnalysisRequest, DemandAnalysisResponse, FinancialScenarioRequest, FinancialScenarioResponse,
    EnvironmentalImpactRequest, EnvironmentalImpactResponse,
)
from app.schemas.feature_monitoring import (
    PanelFaultDetectionRequest, PanelFaultDetectionResponse,
    PerformanceMonitoringRequest, PerformanceMonitoringResponse,
    MaintenanceRecommendationsRequest, MaintenanceRecommendationsResponse,
)
from app.services.features.analytics import (
    find_solar_locations, predict_solar, analyze_demand,
    calculate_financial_scenario, calculate_environmental_impact,
)
from app.services.features.monitoring import detect_panel_faults, monitor_performance, recommend_maintenance
from app.services.features.templates import project_feature_templates

router = APIRouter()
FeatureKey = Literal["solar-location-finder", "solar-prediction", "demand-analysis", "cost-savings", "environmental-impact", "panel-fault-detection", "performance-monitoring", "maintenance-recommendations"]


def require_project(project_id, db):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _assessment_response(item):
    return FeatureAssessmentResponse(
        assessment_id=item.id, project_id=item.project_id, feature_key=item.feature_key,
        schema_version=item.schema_version,
        created_at=item.created_at.replace(tzinfo=timezone.utc),
        inputs=item.inputs_json, result=item.result_json,
    )


@router.get("/projects/{project_id}/features/history", response_model=FeatureHistoryResponse)
def assessment_history(project_id: str, feature_key: FeatureKey | None = None,
                       limit: int = Query(100, ge=1, le=100), db: Session = Depends(get_db)):
    require_project(project_id, db)
    query = db.query(FeatureAssessment).filter(FeatureAssessment.project_id == project_id)
    if feature_key:
        query = query.filter(FeatureAssessment.feature_key == feature_key)
    items = query.order_by(FeatureAssessment.created_at.desc(), FeatureAssessment.id.desc()).limit(limit).all()
    return FeatureHistoryResponse(project_id=project_id, assessments=[_assessment_response(item) for item in items])


@router.get("/projects/{project_id}/features/templates")
def assessment_templates(project_id: str, db: Session = Depends(get_db)):
    return project_feature_templates(require_project(project_id, db), db)


@router.get("/projects/{project_id}/features/latest", response_model=FeatureHistoryResponse)
def latest_assessments(project_id: str, db: Session = Depends(get_db)):
    require_project(project_id, db)
    items = []
    for key in get_args(FeatureKey):
        item = db.query(FeatureAssessment).filter(FeatureAssessment.project_id == project_id, FeatureAssessment.feature_key == key).order_by(FeatureAssessment.created_at.desc(), FeatureAssessment.id.desc()).first()
        if item is not None:
            items.append(_assessment_response(item))
    return FeatureHistoryResponse(project_id=project_id, assessments=items)


def _feature_endpoint(key, request_model, response_model, calculate):
    # The concrete annotation exposes each Pydantic request in OpenAPI/422 validation.
    def handler(project_id: str, body: request_model, response: Response, db: Session = Depends(get_db)):
        require_project(project_id, db)
        try:
            result = calculate(body)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        item = FeatureAssessment(project_id=project_id, feature_key=key,
                                 inputs_json=body.model_dump(mode="json"), result_json=result.model_dump(mode="json"))
        db.add(item)
        db.commit()
        db.refresh(item)
        response.headers["X-Assessment-ID"] = item.id
        return result
    handler.__name__ = key.replace("-", "_")
    router.add_api_route(f"/projects/{{project_id}}/features/{key}", handler,
                         methods=["POST"], response_model=response_model,
                         summary=key.replace("-", " ").title())


for _key, _request, _response, _calculate in [
    ("solar-location-finder", SolarLocationRequest, SolarLocationResponse, find_solar_locations),
    ("solar-prediction", SolarPredictionRequest, SolarPredictionResponse, predict_solar),
    ("demand-analysis", DemandAnalysisRequest, DemandAnalysisResponse, analyze_demand),
    ("cost-savings", FinancialScenarioRequest, FinancialScenarioResponse, calculate_financial_scenario),
    ("environmental-impact", EnvironmentalImpactRequest, EnvironmentalImpactResponse, calculate_environmental_impact),
    ("panel-fault-detection", PanelFaultDetectionRequest, PanelFaultDetectionResponse, detect_panel_faults),
    ("performance-monitoring", PerformanceMonitoringRequest, PerformanceMonitoringResponse, monitor_performance),
    ("maintenance-recommendations", MaintenanceRecommendationsRequest, MaintenanceRecommendationsResponse, recommend_maintenance),
]:
    _feature_endpoint(_key, _request, _response, _calculate)
