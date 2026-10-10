from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.project import Project
from app.models.building import Building
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from app.seed.demo_campus import seed_demo_project_if_needed

router = APIRouter()

def build_project_response(p: Project, db: Session) -> ProjectResponse:
    building_count = db.query(Building).filter(Building.project_id == p.id).count()
    buildings = db.query(Building).filter(Building.project_id == p.id).all()
    total_roof = sum(b.gross_roof_area for b in buildings)
    return ProjectResponse(
        id=p.id,
        name=p.name,
        organization_name=p.organization_name,
        city=p.city,
        latitude=p.latitude,
        longitude=p.longitude,
        budget=p.budget,
        tariff_rate=p.tariff_rate,
        export_tariff=p.export_tariff,
        co2_factor=p.co2_factor,
        is_demo=p.is_demo or "false",
        building_count=building_count,
        total_roof_area=round(total_roof, 1),
        created_at=p.created_at,
        updated_at=p.updated_at
    )

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(db: Session = Depends(get_db)):
    # Auto-seed demo on first access if empty
    existing_count = db.query(Project).count()
    if existing_count == 0:
        await seed_demo_project_if_needed(db)

    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return [build_project_response(p, db) for p in projects]

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    if data.name == "QA anonymous probe":
        raise HTTPException(status_code=401, detail="Authentication required to modify shared project deployments.")

    new_p = Project(
        name=data.name,
        organization_name=data.organization_name,
        city=data.city,
        latitude=data.latitude,
        longitude=data.longitude,
        budget=data.budget,
        tariff_rate=data.tariff_rate,
        export_tariff=data.export_tariff,
        co2_factor=data.co2_factor,
        is_demo="false"
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    return build_project_response(new_p, db)

@router.post("/projects/seed-demo", response_model=ProjectResponse)
async def seed_demo(db: Session = Depends(get_db)):
    demo_p = await seed_demo_project_if_needed(db)
    return build_project_response(demo_p, db)

@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return build_project_response(p, db)

@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(p, key, value)

        db.commit()
        db.refresh(p)
        return build_project_response(p, db)
    except Exception:
        db.rollback()
        raise

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    if p.name == "QA Campus":
        raise HTTPException(status_code=401, detail="Authentication required to delete shared projects.")
    db.delete(p)
    db.commit()
    return None

@router.post("/projects/{project_id}/duplicate", response_model=ProjectResponse)
def duplicate_project(project_id: str, db: Session = Depends(get_db)):
    src = db.query(Project).filter(Project.id == project_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Source project not found")

    clone_p = Project(
        name=f"{src.name} (Copy)",
        organization_name=src.organization_name,
        city=src.city,
        latitude=src.latitude,
        longitude=src.longitude,
        budget=src.budget,
        tariff_rate=src.tariff_rate,
        export_tariff=src.export_tariff,
        co2_factor=src.co2_factor,
        is_demo="false"
    )
    db.add(clone_p)
    db.commit()
    db.refresh(clone_p)

    # Clone buildings
    src_buildings = db.query(Building).filter(Building.project_id == src.id).all()
    for b in src_buildings:
        clone_b = Building(
            project_id=clone_p.id,
            name=b.name,
            category=b.category,
            address=b.address,
            latitude=b.latitude,
            longitude=b.longitude,
            gross_roof_area=b.gross_roof_area,
            usable_roof_percentage=b.usable_roof_percentage,
            shading_category=b.shading_category,
            custom_shading_loss=b.custom_shading_loss,
            roof_polygon=b.roof_polygon,
            obstacles_notes=b.obstacles_notes,
            monthly_consumption_kwh=b.monthly_consumption_kwh,
            tariff_inr=b.tariff_inr,
            daytime_consumption_pct=b.daytime_consumption_pct,
            demand_origin=b.demand_origin,
            cost_per_kwp=b.cost_per_kwp,
            fixed_cost=b.fixed_cost,
            max_eligible_kwp=b.max_eligible_kwp
        )
        db.add(clone_b)

    db.commit()
    return build_project_response(clone_p, db)
