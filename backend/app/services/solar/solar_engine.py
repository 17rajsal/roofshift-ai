from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.building import Building
from app.models.project import Project
from app.models.solar import SolarAnalysis
from app.core.config import settings
from app.services.solar.nasa_power import fetch_solar_irradiance, MONTH_KEYS

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

def get_effective_shading_loss(shading_category: str, custom_loss: Optional[float] = None) -> float:
    """Returns shading loss percentage."""
    cat = (shading_category or "").strip().lower()
    if cat == "low":
        return 5.0
    elif cat == "medium":
        return 15.0
    elif cat == "high":
        return 30.0
    elif cat == "custom" and custom_loss is not None:
        return float(custom_loss)
    return 5.0

async def calculate_building_solar_potential(
    building: Building,
    project: Project,
    db: Session,
    area_per_kwp: float = settings.DEFAULT_AREA_PER_KWP,
    performance_ratio: float = settings.DEFAULT_PERFORMANCE_RATIO,
    override_capacity_kwp: Optional[float] = None
) -> SolarAnalysis:
    """
    Computes rooftop solar energy generation, daytime self-consumption,
    export surplus, economics, and environmental offset for a candidate building.
    """
    # 1. Fetch Location-specific GHI (Global Horizontal Irradiance)
    monthly_ghi_dict, annual_ghi, irradiance_source, data_quality_label = await fetch_solar_irradiance(
        building.latitude,
        building.longitude,
        db
    )

    # 2. Roof geometry and capacity
    usable_area = round(building.gross_roof_area * (building.usable_roof_percentage / 100.0), 2)
    max_pv_capacity = round(usable_area / max(1.0, area_per_kwp), 2)
    if building.max_eligible_kwp and building.max_eligible_kwp > 0:
        max_pv_capacity = min(max_pv_capacity, building.max_eligible_kwp)

    active_capacity = override_capacity_kwp if override_capacity_kwp is not None else max_pv_capacity
    active_capacity = max(0.0, active_capacity)

    # 3. Shading derating
    shading_loss_pct = get_effective_shading_loss(building.shading_category, building.custom_shading_loss)
    shading_factor = max(0.0, 1.0 - (shading_loss_pct / 100.0))

    # 4. Monthly generation and energy balance
    monthly_gen_list = []
    annual_generation = 0.0
    annual_onsite_consumed = 0.0
    annual_exported = 0.0

    monthly_demand = building.monthly_consumption_kwh
    daytime_demand_monthly = monthly_demand * (building.daytime_consumption_pct / 100.0)

    for i, month_key in enumerate(MONTH_KEYS):
        ghi_day = monthly_ghi_dict.get(month_key, 5.0)
        days = DAYS_IN_MONTH[i]
        
        # Generation = kWp * (kWh/m^2/day) * days * PR * (1 - shade)
        month_gen = round(active_capacity * ghi_day * days * performance_ratio * shading_factor, 1)
        monthly_gen_list.append(month_gen)
        annual_generation += month_gen

        # Energy balance for month
        onsite = min(month_gen, daytime_demand_monthly)
        export = max(0.0, month_gen - daytime_demand_monthly)
        annual_onsite_consumed += onsite
        annual_exported += export

    annual_generation = round(annual_generation, 1)
    annual_onsite_consumed = round(annual_onsite_consumed, 1)
    annual_exported = round(annual_exported, 1)

    onsite_utilization_pct = round((annual_onsite_consumed / max(1.0, annual_generation)) * 100.0, 1)
    specific_yield = round(annual_generation / max(0.1, active_capacity), 1) if active_capacity > 0 else 0.0

    # 5. Financial calculations
    tariff = building.tariff_inr if building.tariff_inr is not None else project.tariff_rate
    export_tariff = project.export_tariff
    cost_per_kwp = building.cost_per_kwp if building.cost_per_kwp > 0 else settings.DEFAULT_COST_PER_KWP

    annual_savings = round((annual_onsite_consumed * tariff) + (annual_exported * export_tariff), 2)
    installation_cost = round((active_capacity * cost_per_kwp) + (building.fixed_cost or 0.0), 2)

    payback_years = None
    if annual_savings > 100.0 and installation_cost > 0.0:
        payback_years = round(installation_cost / annual_savings, 2)

    # 6. Environmental impact
    co2_factor = project.co2_factor if project.co2_factor > 0 else settings.DEFAULT_GRID_EMISSIONS_FACTOR_KG_CO2_PER_KWH
    avoided_co2 = round(annual_generation * co2_factor, 1)

    # 7. Update or create SolarAnalysis in DB
    existing_analysis = db.query(SolarAnalysis).filter(SolarAnalysis.building_id == building.id).first()
    if not existing_analysis:
        existing_analysis = SolarAnalysis(building_id=building.id)
        db.add(existing_analysis)

    existing_analysis.usable_roof_area_sqm = usable_area
    existing_analysis.max_pv_capacity_kwp = max_pv_capacity
    existing_analysis.annual_generation_kwh = annual_generation
    existing_analysis.monthly_generation_kwh = monthly_gen_list
    existing_analysis.specific_yield_kwh_per_kwp = specific_yield
    existing_analysis.performance_ratio = performance_ratio
    existing_analysis.effective_shading_loss_pct = shading_loss_pct
    existing_analysis.annual_consumption_kwh = round(building.monthly_consumption_kwh * 12.0, 1)
    existing_analysis.annual_onsite_consumed_kwh = annual_onsite_consumed
    existing_analysis.annual_exported_kwh = annual_exported
    existing_analysis.onsite_utilization_pct = onsite_utilization_pct
    existing_analysis.annual_savings_inr = annual_savings
    existing_analysis.installation_cost_inr = installation_cost
    existing_analysis.simple_payback_years = payback_years
    existing_analysis.avoided_co2_kg_annual = avoided_co2
    existing_analysis.ghi_annual_avg_kwh_m2_day = annual_ghi
    existing_analysis.irradiance_source = irradiance_source
    existing_analysis.data_quality_label = data_quality_label
    existing_analysis.calculation_notes = (
        f"Simulated with {performance_ratio*100:.0f}% PR, {shading_loss_pct:.1f}% shading loss, "
        f"and ₹{cost_per_kwp:,.0f}/kWp capital expenditure."
    )

    db.commit()
    db.refresh(existing_analysis)
    return existing_analysis
