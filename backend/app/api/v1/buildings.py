from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.project import Project
from app.models.building import Building
from app.models.solar import SolarAnalysis
from app.schemas.building import BuildingCreate, BuildingUpdate, BuildingResponse, SolarAnalysisSummary
from app.services.solar.solar_engine import calculate_building_solar_potential

router = APIRouter()

def build_building_response(b: Building) -> BuildingResponse:
    usable_area = round(b.gross_roof_area * (b.usable_roof_percentage / 100.0), 2)
    solar_summary = None
    if b.solar_analysis:
        sa = b.solar_analysis
        solar_summary = SolarAnalysisSummary(
            id=sa.id,
            usable_roof_area_sqm=sa.usable_roof_area_sqm,
            max_pv_capacity_kwp=sa.max_pv_capacity_kwp,
            annual_generation_kwh=sa.annual_generation_kwh,
            monthly_generation_kwh=sa.monthly_generation_kwh or [],
            specific_yield_kwh_per_kwp=sa.specific_yield_kwh_per_kwp,
            performance_ratio=sa.performance_ratio,
            effective_shading_loss_pct=sa.effective_shading_loss_pct,
            annual_consumption_kwh=sa.annual_consumption_kwh,
            annual_onsite_consumed_kwh=sa.annual_onsite_consumed_kwh,
            annual_exported_kwh=sa.annual_exported_kwh,
            onsite_utilization_pct=sa.onsite_utilization_pct,
            annual_savings_inr=sa.annual_savings_inr,
            installation_cost_inr=sa.installation_cost_inr,
            simple_payback_years=sa.simple_payback_years,
            avoided_co2_kg_annual=sa.avoided_co2_kg_annual,
            ghi_annual_avg_kwh_m2_day=sa.ghi_annual_avg_kwh_m2_day,
            irradiance_source=sa.irradiance_source,
            data_quality_label=sa.data_quality_label,
            updated_at=sa.updated_at
        )

    return BuildingResponse(
        id=b.id,
        project_id=b.project_id,
        name=b.name,
        category=b.category,
        address=b.address,
        latitude=b.latitude,
        longitude=b.longitude,
        gross_roof_area=b.gross_roof_area,
        usable_roof_percentage=b.usable_roof_percentage,
        usable_roof_area=usable_area,
        shading_category=b.shading_category,
        custom_shading_loss=b.custom_shading_loss,
        roof_polygon=b.roof_polygon,
        obstacles_notes=b.obstacles_notes,
        monthly_consumption_kwh=b.monthly_consumption_kwh,
        tariff_inr=b.tariff_inr,
        daytime_consumption_pct=b.daytime_consumption_pct,
        demand_origin=b.demand_origin or "Estimated profile",
        cost_per_kwp=b.cost_per_kwp,
        fixed_cost=b.fixed_cost,
        max_eligible_kwp=b.max_eligible_kwp,
        solar_analysis=solar_summary,
        created_at=b.created_at,
        updated_at=b.updated_at
    )

@router.get("/projects/{project_id}/buildings", response_model=List[BuildingResponse])
def list_buildings(project_id: str, db: Session = Depends(get_db)):
    buildings = db.query(Building).filter(Building.project_id == project_id).all()
    return [build_building_response(b) for b in buildings]

@router.post("/projects/{project_id}/buildings", response_model=BuildingResponse, status_code=status.HTTP_201_CREATED)
async def create_building(project_id: str, data: BuildingCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_b = Building(
        project_id=project_id,
        name=data.name,
        category=data.category,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        gross_roof_area=data.gross_roof_area,
        usable_roof_percentage=data.usable_roof_percentage,
        shading_category=data.shading_category,
        custom_shading_loss=data.custom_shading_loss,
        roof_polygon=data.roof_polygon,
        obstacles_notes=data.obstacles_notes,
        monthly_consumption_kwh=data.monthly_consumption_kwh,
        tariff_inr=data.tariff_inr,
        daytime_consumption_pct=data.daytime_consumption_pct,
        demand_origin=data.demand_origin,
        cost_per_kwp=data.cost_per_kwp,
        fixed_cost=data.fixed_cost,
        max_eligible_kwp=data.max_eligible_kwp
    )
    db.add(new_b)
    db.commit()
    db.refresh(new_b)

    # Immediately calculate initial solar potential
    await calculate_building_solar_potential(new_b, project, db)
    db.refresh(new_b)

    return build_building_response(new_b)

@router.get("/buildings/{building_id}", response_model=BuildingResponse)
def get_building(building_id: str, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    return build_building_response(b)

@router.patch("/buildings/{building_id}", response_model=BuildingResponse)
async def update_building(building_id: str, data: BuildingUpdate, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")

    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(b, key, value)

    db.commit()
    db.refresh(b)

    # Re-calculate solar potential
    project = db.query(Project).filter(Project.id == b.project_id).first()
    if project:
        await calculate_building_solar_potential(b, project, db)
        db.refresh(b)

    return build_building_response(b)

@router.delete("/buildings/{building_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_building(building_id: str, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")
    db.delete(b)
    db.commit()
    return None

@router.post("/buildings/{building_id}/duplicate", response_model=BuildingResponse)
async def duplicate_building(building_id: str, db: Session = Depends(get_db)):
    src = db.query(Building).filter(Building.id == building_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Building not found")

    project = db.query(Project).filter(Project.id == src.project_id).first()

    clone_b = Building(
        project_id=src.project_id,
        name=f"{src.name} (Copy)",
        category=src.category,
        address=src.address,
        latitude=src.latitude + 0.0003, # slight offset on map
        longitude=src.longitude + 0.0003,
        gross_roof_area=src.gross_roof_area,
        usable_roof_percentage=src.usable_roof_percentage,
        shading_category=src.shading_category,
        custom_shading_loss=src.custom_shading_loss,
        roof_polygon=src.roof_polygon,
        obstacles_notes=src.obstacles_notes,
        monthly_consumption_kwh=src.monthly_consumption_kwh,
        tariff_inr=src.tariff_inr,
        daytime_consumption_pct=src.daytime_consumption_pct,
        demand_origin=src.demand_origin,
        cost_per_kwp=src.cost_per_kwp,
        fixed_cost=src.fixed_cost,
        max_eligible_kwp=src.max_eligible_kwp
    )
    db.add(clone_b)
    db.commit()
    db.refresh(clone_b)

    if project:
        await calculate_building_solar_potential(clone_b, project, db)
        db.refresh(clone_b)

    return build_building_response(clone_b)
