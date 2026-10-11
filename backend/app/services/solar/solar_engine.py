from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from app.models.building import Building
from app.models.project import Project
from app.models.solar import SolarAnalysis
from app.core.config import settings
from app.services.solar.nasa_power import fetch_solar_irradiance, MONTH_KEYS
from app.services.energy.balance import finite, monthly_balance, generation_by_month, installation_cost as capital_charge

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
        return finite(custom_loss, "custom_shading_loss", 0, 100)
    return 5.0

async def calculate_building_solar_potential(
    building: Building,
    project: Project,
    db: Session,
    area_per_kwp: float = settings.DEFAULT_AREA_PER_KWP,
    performance_ratio: float = settings.DEFAULT_PERFORMANCE_RATIO,
    override_capacity_kwp: Optional[float] = None,
    cached_irradiance: Optional[Tuple[Dict[str, float], float, str, str]] = None,
    commit: bool = True
) -> SolarAnalysis:
    """
    Computes rooftop solar energy generation, daytime self-consumption,
    export surplus, economics, and environmental offset for a candidate building.
    """
    # 1. Fetch Location-specific GHI (Global Horizontal Irradiance)
    if cached_irradiance:
        monthly_ghi_dict, annual_ghi, irradiance_source, data_quality_label = cached_irradiance
    else:
        monthly_ghi_dict, annual_ghi, irradiance_source, data_quality_label = await fetch_solar_irradiance(
            building.latitude,
            building.longitude,
            db
        )

    # 2. Roof geometry and capacity
    roof = finite(building.gross_roof_area, "gross_roof_area", 0, 10_000_000)
    usable = finite(building.usable_roof_percentage, "usable_roof_percentage", 0, 100)
    if finite(area_per_kwp, "area_per_kwp") <= 0:
        raise ValueError("area_per_kwp must be positive")
    finite(performance_ratio, "performance_ratio", 0, 1)
    usable_area = roof * usable / 100
    max_pv_capacity = usable_area / area_per_kwp
    if building.max_eligible_kwp is not None:
        max_pv_capacity = min(max_pv_capacity, finite(building.max_eligible_kwp, "max_eligible_kwp"))

    active_capacity = max_pv_capacity
    if override_capacity_kwp is not None:
        active_capacity = finite(override_capacity_kwp, "override_capacity_kwp")
        if active_capacity > max_pv_capacity + 1e-9:
            raise ValueError("override_capacity_kwp exceeds eligible roof capacity")

    # 3. Shading derating
    shading_loss_pct = get_effective_shading_loss(building.shading_category, building.custom_shading_loss)
    shading_factor = max(0.0, 1.0 - (shading_loss_pct / 100.0))

    # 4. Monthly generation and energy balance
    monthly_gen_list = generation_by_month(active_capacity, monthly_ghi_dict, performance_ratio, shading_factor)
    balance = monthly_balance(monthly_gen_list, building.monthly_consumption_kwh, building.daytime_consumption_pct)
    annual_generation = sum(monthly_gen_list)
    annual_onsite_consumed = sum(balance["onsite"])
    annual_exported = sum(balance["export"])

    onsite_utilization_pct = round(annual_onsite_consumed / annual_generation * 100, 1) if annual_generation else 0.0
    specific_yield = round(annual_generation / active_capacity, 1) if active_capacity > 0 else 0.0

    # 5. Financial calculations
    tariff = finite(building.tariff_inr if building.tariff_inr is not None else project.tariff_rate, "tariff")
    export_tariff = finite(project.export_tariff, "export_tariff")
    cost_per_kwp = finite(building.cost_per_kwp, "cost_per_kwp")

    annual_savings = round((annual_onsite_consumed * tariff) + (annual_exported * export_tariff), 2)
    installation_cost = capital_charge(active_capacity, cost_per_kwp, building.fixed_cost or 0)

    payback_years = None
    if annual_savings > 0.0 and installation_cost > 0.0:
        payback_years = round(installation_cost / annual_savings, 2)

    # 6. Environmental impact
    co2_factor = finite(project.co2_factor, "co2_factor")
    avoided_co2 = round(annual_generation * co2_factor, 1)

    # 7. Update or create SolarAnalysis in DB
    # Capacity override is a scenario result; preserve the canonical full-roof
    # analysis so subsequent no-optimization insights cannot mislabel capacity.
    existing_analysis = db.query(SolarAnalysis).filter(SolarAnalysis.building_id == building.id).first() if override_capacity_kwp is None else None
    if not existing_analysis:
        existing_analysis = SolarAnalysis(building_id=building.id, id=str(uuid.uuid4()), created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        if override_capacity_kwp is None:
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
        " Onsite consumption uses synthetic hourly coincidence, without storage or inter-building netting."
        f" Evaluated capacity: {active_capacity:.6g} kWp; eligibility ceiling: {max_pv_capacity:.6g} kWp."
    )

    if override_capacity_kwp is None and commit:
        db.commit()
        db.refresh(existing_analysis)
    return existing_analysis
