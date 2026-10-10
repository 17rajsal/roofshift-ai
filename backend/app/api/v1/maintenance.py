from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.project import Project
from app.models.building import Building
from app.models.maintenance import MaintenanceCase
from app.schemas.maintenance import (
    MaintenanceCaseCreate, MaintenanceCaseUpdate, MaintenanceCaseResponse
)

router = APIRouter()

@router.post("/projects/{project_id}/maintenance-cases", response_model=MaintenanceCaseResponse)
def create_maintenance_case(
    project_id: str,
    case_in: MaintenanceCaseCreate,
    db: Session = Depends(get_db)
):
    """Creates a new solar plant maintenance case or fault report."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if case_in.building_id:
        b = db.query(Building).filter(Building.id == case_in.building_id, Building.project_id == project_id).first()
        if not b:
            raise HTTPException(status_code=404, detail="Building not found in project")

    case_obj = MaintenanceCase(
        project_id=project_id,
        building_id=case_in.building_id,
        title=case_in.title,
        description=case_in.description,
        category=case_in.category,
        priority=case_in.priority,
        status="OPEN",
        estimated_loss_kwh_per_day=case_in.estimated_loss_kwh_per_day,
        assigned_to=case_in.assigned_to
    )
    db.add(case_obj)
    db.commit()
    db.refresh(case_obj)
    return case_obj

@router.get("/projects/{project_id}/maintenance-cases", response_model=List[MaintenanceCaseResponse])
def list_maintenance_cases(
    project_id: str,
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lists maintenance cases for an institutional solar project with optional filtering."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(MaintenanceCase).filter(MaintenanceCase.project_id == project_id)
    if status:
        query = query.filter(MaintenanceCase.status == status.upper())
    if priority:
        query = query.filter(MaintenanceCase.priority == priority.upper())

    return query.order_by(MaintenanceCase.created_at.desc()).all()

@router.patch("/maintenance-cases/{case_id}", response_model=MaintenanceCaseResponse)
def update_maintenance_case(
    case_id: str,
    case_update: MaintenanceCaseUpdate,
    db: Session = Depends(get_db)
):
    """Updates status, assignment, or notes of a maintenance case."""
    case_obj = db.query(MaintenanceCase).filter(MaintenanceCase.id == case_id).first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Maintenance case not found")

    update_data = case_update.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"]:
        new_status = update_data["status"].upper()
        case_obj.status = new_status
        if new_status == "RESOLVED" and not case_obj.resolved_at:
            case_obj.resolved_at = datetime.utcnow()
        elif new_status != "RESOLVED":
            case_obj.resolved_at = None

    if "priority" in update_data and update_data["priority"]:
        case_obj.priority = update_data["priority"].upper()
    if "title" in update_data and update_data["title"]:
        case_obj.title = update_data["title"]
    if "description" in update_data and update_data["description"]:
        case_obj.description = update_data["description"]
    if "estimated_loss_kwh_per_day" in update_data and update_data["estimated_loss_kwh_per_day"] is not None:
        case_obj.estimated_loss_kwh_per_day = update_data["estimated_loss_kwh_per_day"]
    if "assigned_to" in update_data:
        case_obj.assigned_to = update_data["assigned_to"]

    db.commit()
    db.refresh(case_obj)
    return case_obj

@router.delete("/maintenance-cases/{case_id}")
def delete_maintenance_case(
    case_id: str,
    db: Session = Depends(get_db)
):
    """Deletes a maintenance case."""
    case_obj = db.query(MaintenanceCase).filter(MaintenanceCase.id == case_id).first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Maintenance case not found")

    db.delete(case_obj)
    db.commit()
    return {"message": "Maintenance case deleted successfully"}
