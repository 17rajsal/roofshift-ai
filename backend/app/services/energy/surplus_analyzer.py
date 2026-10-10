"""Project energy accounting derived from conserved monthly building balances."""
from typing import List
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.building import Building
from app.models.optimization import OptimizationRun
from app.schemas.energy import HourlyPoint, MonthlyTrendPoint, BuildingEnergyMetric, EnergyInsightsResponse
from app.services.energy.balance import (
    HOURLY_SOLAR_WEIGHTS, HOURLY_DEMAND_WEIGHTS, DAYS_IN_MONTH, MONTH_NAMES,
    monthly_balance, finite,
)
from app.services.solar.solar_engine import calculate_building_solar_potential


def format_hour_label(hour: float) -> str:
    minutes = round(float(hour) * 60)
    if minutes == 24 * 60:
        return "12:00 AM (+1 day)"
    minutes %= 24 * 60
    h, m = divmod(minutes, 60)
    return f"{h % 12 or 12:02d}:{m:02d} {'AM' if h < 12 else 'PM'}"


async def analyze_project_energy_surplus(project_id: str, db: Session) -> EnergyInsightsResponse:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")
    buildings = db.query(Building).filter(Building.project_id == project_id).order_by(Building.id).all()
    if not buildings:
        raise ValueError("No buildings found in project.")
    latest = db.query(OptimizationRun).filter(OptimizationRun.project_id == project_id).order_by(OptimizationRun.created_at.desc()).first()
    allocations = {a['building_id']: a for a in (latest.allocations_json or [])} if latest else {}
    totals = {k: 0.0 for k in ('capacity', 'generation', 'demand', 'onsite', 'export', 'cost', 'savings')}
    months = {k: [0.0] * 12 for k in ('generation', 'demand', 'onsite', 'export', 'grid')}
    hours = {k: [0.0] * 24 for k in ('solar', 'demand', 'onsite', 'export', 'grid')}
    metrics: List[BuildingEnergyMetric] = []
    monthly_surplus_hours = [[0.0] * 24 for _ in range(12)]
    co2 = finite(project.co2_factor, 'co2_factor')
    for b in buildings:
        analysis = b.solar_analysis
        if not analysis:
            analysis = await calculate_building_solar_potential(b, project, db)
        if latest:
            alloc = allocations.get(b.id, {})
            cap = alloc.get('recommended_capacity_kwp', 0.0)
            gen = alloc.get('expected_annual_generation_kwh', 0.0)
            cost = alloc.get('estimated_cost_inr', 0.0)
            savings = alloc.get('expected_annual_savings_inr', 0.0)
        else:
            cap, gen = analysis.max_pv_capacity_kwp, analysis.annual_generation_kwh
            cost, savings = analysis.installation_cost_inr, analysis.annual_savings_inr
        seasonal = analysis.monthly_generation_kwh
        shape_total = sum(seasonal)
        generation = [gen * v / shape_total for v in seasonal] if shape_total > 0 else [gen * d / 365 for d in DAYS_IN_MONTH]
        balance = monthly_balance(generation, b.monthly_consumption_kwh, b.daytime_consumption_pct)
        demand = b.monthly_consumption_kwh * 12
        onsite, surplus = sum(balance['onsite']), sum(balance['export'])
        for key, value in (('capacity', cap), ('generation', gen), ('demand', demand), ('onsite', onsite), ('export', surplus), ('cost', cost), ('savings', savings)):
            totals[key] += value
        for i in range(12):
            months['demand'][i] += b.monthly_consumption_kwh
            for key in ('generation', 'onsite', 'export', 'grid'):
                months[key][i] += balance[key][i]
            for h in range(24):
                monthly_surplus_hours[i][h] += balance['monthly_export_hourly'][i][h]
        for h in range(24):
            for key, source in (('solar', 'solar_hourly'), ('demand', 'demand_hourly'), ('onsite', 'onsite_hourly'), ('export', 'export_hourly'), ('grid', 'grid_hourly')):
                hours[key][h] += balance[source][h]
        metrics.append(BuildingEnergyMetric(
            building_id=b.id, building_name=b.name, category=b.category,
            allocated_capacity_kwp=cap, annual_generation_kwh=gen, annual_demand_kwh=demand,
            generation_to_demand_ratio_pct=100 * gen / demand if demand else 0,
            solar_fraction_pct=100 * onsite / demand if demand else 0,
            annual_savings_inr=savings, avoided_co2_kg=gen * co2,
        ))
    profile = [HourlyPoint(hour=h, time_label=format_hour_label(h), solar_generation_kw=hours['solar'][h],
                          electricity_demand_kw=hours['demand'][h], onsite_solar_used_kw=hours['onsite'][h],
                          grid_import_kw=hours['grid'][h], solar_surplus_kw=hours['export'][h]) for h in range(24)]
    trend = [MonthlyTrendPoint(month=name, solar_generation_kwh=months['generation'][i],
                              electricity_demand_kwh=months['demand'][i], onsite_solar_kwh=months['onsite'][i],
                              surplus_export_kwh=months['export'][i], grid_import_kwh=months['grid'][i]) for i, name in enumerate(MONTH_NAMES)]
    surplus_hours = [h for h in range(24) if hours['export'][h] > 1e-9]
    window = f"{format_hour_label(min(surplus_hours))} - {format_hour_label(max(surplus_hours) + 1)}" if surplus_hours else "No modeled solar surplus"
    return EnergyInsightsResponse(
        project_id=project.id, has_active_optimization=latest is not None,
        total_capacity_kwp=totals['capacity'], total_annual_generation_kwh=totals['generation'],
        total_annual_demand_kwh=totals['demand'], total_onsite_solar_kwh=totals['onsite'], total_surplus_kwh=totals['export'],
        total_grid_import_offset_kwh=totals['onsite'], grid_offset_pct=100 * totals['onsite'] / totals['demand'] if totals['demand'] else 0,
        total_installation_cost_inr=totals['cost'], total_annual_savings_inr=totals['savings'],
        simple_payback_years=totals['cost'] / totals['savings'] if totals['cost'] > 0 and totals['savings'] > 0 else None,
        avoided_co2_kg_annual=totals['generation'] * co2, peak_solar_window=window,
        hourly_profile=profile, monthly_trends=trend, building_comparisons=metrics,
        monthly_hourly_surplus_kw=monthly_surplus_hours,
        data_origin_notice=("Synthetic monthly representative-day profiles; no storage or inter-building netting. "
                            "Hourly flows are calendar-weighted means of monthly balances, not min(mean solar, mean demand). "
                            "Declared daytime consumption sets the 06:00-18:00 demand share. Re-run optimization after input changes."),
    )
