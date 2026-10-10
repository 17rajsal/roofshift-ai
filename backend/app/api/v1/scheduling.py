from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.project import Project
from app.models.scheduling import EnergyActivity
from app.schemas.scheduling import (
    EnergyActivityCreate, EnergyActivityResponse, SchedulingOptimizationResponse
)
from app.services.scheduling.load_shifter import optimize_energy_scheduling

router = APIRouter()

@router.get("/projects/{project_id}/activities", response_model=List[EnergyActivityResponse])
def list_activities(project_id: str, db: Session = Depends(get_db)):
    return db.query(EnergyActivity).filter(EnergyActivity.project_id == project_id).all()

@router.post("/projects/{project_id}/activities", response_model=EnergyActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(project_id: str, data: EnergyActivityCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    act = EnergyActivity(
        project_id=project_id,
        building_id=data.building_id,
        name=data.name,
        power_kw=data.power_kw,
        duration_hours=data.duration_hours,
        earliest_hour=data.earliest_hour,
        latest_hour=data.latest_hour,
        preferred_hour=data.preferred_hour,
        days_per_week=data.days_per_week,
        is_shiftable=data.is_shiftable
    )
    db.add(act)
    db.commit()
    db.refresh(act)
    return act

@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: str, db: Session = Depends(get_db)):
    act = db.query(EnergyActivity).filter(EnergyActivity.id == activity_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity not found")
    db.delete(act)
    db.commit()
    return None

@router.post("/projects/{project_id}/schedule-optimize", response_model=SchedulingOptimizationResponse)
async def run_schedule_optimization(project_id: str, db: Session = Depends(get_db)):
    try:
        return await optimize_energy_scheduling(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scheduling optimization error: {str(e)}")
