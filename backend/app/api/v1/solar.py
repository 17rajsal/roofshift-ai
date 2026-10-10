from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.building import Building
from app.models.project import Project
from app.models.solar import SolarAnalysis
from app.schemas.solar import SolarAnalysisResponse, MonthlySolarItem
from app.services.solar.solar_engine import calculate_building_solar_potential, MONTH_NAMES, DAYS_IN_MONTH
from app.services.solar.nasa_power import fetch_solar_irradiance, MONTH_KEYS
from app.services.energy.balance import monthly_balance

router = APIRouter()

@router.get("/buildings/{building_id}/solar-analysis", response_model=SolarAnalysisResponse)
async def get_solar_analysis(building_id: str, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")

    project = db.query(Project).filter(Project.id == b.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Associated project not found")

    sa = b.solar_analysis
    if not sa:
        sa = await calculate_building_solar_potential(b, project, db)

    # Monthly breakdown items
    monthly_ghi, _, _, _ = await fetch_solar_irradiance(b.latitude, b.longitude, db)
    monthly_gen_list = sa.monthly_generation_kwh or []
    monthly_demand = b.monthly_consumption_kwh
    balance = monthly_balance(monthly_gen_list, monthly_demand, b.daytime_consumption_pct)

    items = []
    for i, m_name in enumerate(MONTH_NAMES):
        m_key = MONTH_KEYS[i]
        ghi = monthly_ghi.get(m_key, 5.0)
        gen = monthly_gen_list[i] if i < len(monthly_gen_list) else 0.0
        onsite = balance["onsite"][i]
        export = balance["export"][i]

        items.append(MonthlySolarItem(
            month=m_name,
            month_index=i + 1,
            ghi_kwh_m2_day=ghi,
            generation_kwh=gen,
            consumption_kwh=monthly_demand,
            onsite_used_kwh=onsite,
            export_kwh=export
        ))

    return SolarAnalysisResponse(
        building_id=b.id,
        building_name=b.name,
        gross_roof_area_sqm=b.gross_roof_area,
        usable_roof_area_sqm=sa.usable_roof_area_sqm,
        max_pv_capacity_kwp=sa.max_pv_capacity_kwp,
        annual_generation_kwh=sa.annual_generation_kwh,
        monthly_breakdown=items,
        specific_yield_kwh_per_kwp=sa.specific_yield_kwh_per_kwp,
        performance_ratio=sa.performance_ratio,
        effective_shading_loss_pct=sa.effective_shading_loss_pct,
        annual_consumption_kwh=sa.annual_consumption_kwh,
        annual_onsite_consumed_kwh=sa.annual_onsite_consumed_kwh,
        annual_exported_kwh=sa.annual_exported_kwh,
        onsite_utilization_pct=sa.onsite_utilization_pct,
        installation_cost_inr=sa.installation_cost_inr,
        annual_savings_inr=sa.annual_savings_inr,
        simple_payback_years=sa.simple_payback_years,
        avoided_co2_kg_annual=sa.avoided_co2_kg_annual,
        ghi_annual_avg_kwh_m2_day=sa.ghi_annual_avg_kwh_m2_day,
        irradiance_source=sa.irradiance_source,
        data_quality_label=sa.data_quality_label,
        calculation_notes=sa.calculation_notes,
        last_updated=sa.updated_at
    )

@router.post("/buildings/{building_id}/solar-analysis", response_model=SolarAnalysisResponse)
async def trigger_solar_analysis(building_id: str, db: Session = Depends(get_db)):
    b = db.query(Building).filter(Building.id == building_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")

    project = db.query(Project).filter(Project.id == b.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Associated project not found")

    await calculate_building_solar_potential(b, project, db)
    return await get_solar_analysis(building_id, db)
