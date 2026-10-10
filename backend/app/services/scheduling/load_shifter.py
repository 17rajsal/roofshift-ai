from typing import List, Dict, Any, Tuple
import copy
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.building import Building
from app.models.scheduling import EnergyActivity, SchedulingResult
from app.schemas.scheduling import (
    ShiftRecommendation, HourlyProfileComparison, SchedulingOptimizationResponse
)
from app.services.energy.surplus_analyzer import (
    analyze_project_energy_surplus, format_hour_label, HOURLY_SOLAR_WEIGHTS, HOURLY_DEMAND_WEIGHTS
)

def find_best_operating_window(
    act: EnergyActivity,
    available_surplus: List[float],
    solar_gen: List[float]
) -> Tuple[int, float, float]:
    """
    Finds the start hour within [earliest_hour, latest_hour - duration]
    that maximizes absorption of surplus solar power without exceeding availability.
    """
    duration = int(round(act.duration_hours))
    if duration < 1:
        duration = 1

    max_start = min(23 - duration, act.latest_hour - duration)
    min_start = max(0, act.earliest_hour)

    if min_start > max_start:
        min_start = act.earliest_hour
        max_start = min_start

    best_start = act.preferred_hour
    best_absorbed = -1.0
    power_kw = act.power_kw

    for start_h in range(min_start, max_start + 1):
        window_absorbed = 0.0
        for h in range(start_h, start_h + duration):
            surplus_h = available_surplus[h] if h < 24 else 0.0
            # How much of the load can be absorbed by solar surplus at this hour
            absorbed_h = min(power_kw, surplus_h)
            # If no surplus, check if there is high solar generation
            if absorbed_h <= 0.0:
                solar_h = solar_gen[h] if h < 24 else 0.0
                absorbed_h = min(power_kw * 0.5, solar_h)
            window_absorbed += absorbed_h

        if window_absorbed > best_absorbed:
            best_absorbed = window_absorbed
            best_start = start_h

    total_window_surplus = sum(available_surplus[h] for h in range(best_start, min(24, best_start + duration)))
    return best_start, best_absorbed, total_window_surplus

async def optimize_energy_scheduling(
    project_id: str,
    db: Session
) -> SchedulingOptimizationResponse:
    """
    Analyzes shiftable campus loads (EV charging, water pumping, etc.)
    against the diurnal solar surplus curve and recommends optimal operating hours.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")

    activities = db.query(EnergyActivity).filter(EnergyActivity.project_id == project_id).all()
    energy_insights = await analyze_project_energy_surplus(project_id, db)

    # Base daily solar and demand
    solar_hourly = [p.solar_generation_kw for p in energy_insights.hourly_profile]
    baseline_load = [p.electricity_demand_kw for p in energy_insights.hourly_profile]
    
    surplus_pool = [max(0.0, s - d) for s, d in zip(solar_hourly, baseline_load)]
    shifted_load = copy.deepcopy(baseline_load)

    recommendations: List[ShiftRecommendation] = []
    daily_gain_kwh = 0.0
    annual_gain_inr = 0.0

    shiftable_count = 0

    tariff = project.tariff_rate
    export_tariff = project.export_tariff
    # Margin between grid purchase avoidance and lost export value
    value_per_shifted_kwh = max(1.0, tariff - export_tariff)

    buildings_map = {b.id: b.name for b in db.query(Building).filter(Building.project_id == project_id).all()}

    for act in activities:
        if not act.is_shiftable:
            continue
        shiftable_count += 1

        b_name = buildings_map.get(act.building_id, "Campus Central Facility") if act.building_id else "Campus Central Facility"
        duration_int = int(round(act.duration_hours))
        orig_start = act.preferred_hour
        orig_end = min(24, orig_start + duration_int)
        orig_window = f"{format_hour_label(orig_start)} - {format_hour_label(orig_end)}"

        best_start, absorbed_kw, window_surplus = find_best_operating_window(act, surplus_pool, solar_hourly)
        rec_end = min(24, best_start + duration_int)
        rec_window = f"{format_hour_label(best_start)} - {format_hour_label(rec_end)}"

        energy_per_session = round(act.power_kw * act.duration_hours, 1)

        # Remove from orig window in shifted_load, add to rec window
        for h in range(orig_start, orig_end):
            if h < 24:
                shifted_load[h] = max(0.0, shifted_load[h] - act.power_kw)
        for h in range(best_start, rec_end):
            if h < 24:
                shifted_load[h] += act.power_kw
                # Decrement surplus pool so subsequent activities cannot double-count
                surplus_pool[h] = max(0.0, surplus_pool[h] - act.power_kw)

        act_daily_gain = round(absorbed_kw, 1)
        daily_gain_kwh += act_daily_gain

        # Annualize: days_per_week * 52 weeks
        annual_sessions = act.days_per_week * 52
        act_annual_kwh = act_daily_gain * annual_sessions
        act_annual_savings = round(act_annual_kwh * value_per_shifted_kwh, 2)
        annual_gain_inr += act_annual_savings

        reason_text = (
            f"Moving operations from {orig_window} to solar-rich window {rec_window} aligns {act.power_kw:.0f} kW "
            f"load with peak on-site rooftop generation, absorbing ~{act_daily_gain:.1f} kWh of solar power "
            f"that would otherwise either be curtailed or exported at a low feed-in tariff."
        )

        notes_text = (
            f"Verify facility constraints before shifting: ensure equipment interlocks, operator staffing, "
            f"and storage capacity permit operation between {rec_window}."
        )

        recommendations.append(ShiftRecommendation(
            activity_id=act.id,
            activity_name=act.name,
            building_name=b_name,
            original_window=orig_window,
            recommended_window=rec_window,
            recommended_start_hour=best_start,
            duration_hours=act.duration_hours,
            power_kw=act.power_kw,
            energy_kwh_per_session=energy_per_session,
            available_surplus_in_window_kwh=round(window_surplus, 1),
            additional_solar_absorbed_kwh=act_daily_gain,
            estimated_annual_savings_inr=act_annual_savings,
            reason=reason_text,
            practical_notes=notes_text
        ))

    # Calculate hourly comparison
    hourly_comp: List[HourlyProfileComparison] = []
    surplus_before_total = 0.0
    surplus_after_total = 0.0

    for h in range(24):
        s_kw = solar_hourly[h]
        b_kw = baseline_load[h]
        sh_kw = shifted_load[h]
        surplus_before = max(0.0, s_kw - b_kw)
        surplus_after = max(0.0, s_kw - sh_kw)
        surplus_before_total += surplus_before
        surplus_after_total += surplus_after

        hourly_comp.append(HourlyProfileComparison(
            hour=h,
            time_label=format_hour_label(h),
            solar_generation_kw=round(s_kw, 2),
            baseline_load_kw=round(b_kw, 2),
            shifted_load_kw=round(sh_kw, 2),
            surplus_before_kw=round(surplus_before, 2),
            surplus_after_kw=round(surplus_after, 2)
        ))

    annual_gain_kwh = daily_gain_kwh * 260.0 # ~260 campus operating days
    co2_gain = round(annual_gain_kwh * project.co2_factor, 1)

    return SchedulingOptimizationResponse(
        project_id=project.id,
        activities_analyzed=len(activities),
        shiftable_activities_count=shiftable_count,
        recommendations=recommendations,
        hourly_comparison=hourly_comp,
        daily_surplus_before_kwh=round(surplus_before_total, 1),
        daily_surplus_after_kwh=round(surplus_after_total, 1),
        daily_solar_absorption_gain_kwh=round(daily_gain_kwh, 1),
        annual_solar_absorption_gain_kwh=round(annual_gain_kwh, 1),
        annual_financial_gain_inr=round(annual_gain_inr, 2),
        co2_reduction_gain_kg=co2_gain,
        disclaimer=(
            "Recommendations indicate theoretical thermodynamic and economic load alignment. "
            "Implementation requires operational consent and suitable electrical distribution infrastructure."
        )
    )
