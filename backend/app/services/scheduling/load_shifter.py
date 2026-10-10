"""Feasible greedy load shifting with conserved one-hour energy bins."""
import math
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.building import Building
from app.models.scheduling import EnergyActivity
from app.schemas.scheduling import ShiftRecommendation, HourlyProfileComparison, SchedulingOptimizationResponse
from app.services.energy.surplus_analyzer import analyze_project_energy_surplus, format_hour_label
from app.services.energy.balance import finite, DAYS_IN_MONTH


def activity_profile(start: float, duration: float, power: float) -> List[float]:
    """Exact kWh in each bin, preserving fractional durations; no midnight wrap."""
    start = finite(start, 'start', 0, 24)
    duration = finite(duration, 'duration', 0, 24)
    power = finite(power, 'power', 0, 1_000_000)
    if start + duration > 24 + 1e-9:
        raise ValueError('Activity must finish by 24:00')
    return [power * max(0, min(h + 1, start + duration) - max(h, start)) for h in range(24)]


def feasible_starts(act):
    duration = finite(act.duration_hours, 'duration_hours', .5, 12)
    earliest = int(act.earliest_hour)
    latest = int(act.latest_hour)
    if earliest < 0 or latest > 24 or latest - earliest < duration:
        raise ValueError(f'Activity {getattr(act, "name", "")} has no feasible operating window')
    return list(range(earliest, math.floor(latest - duration) + 1))


def find_best_operating_window(act: EnergyActivity, available_surplus: List[float], solar_gen: List[float]) -> Tuple[int, float, float]:
    """Choose integer start maximizing genuine surplus absorption (kWh/session).

    Solar generation is accepted for interface compatibility but never counted
    as surplus already used by another load. Ties preserve the preferred hour.
    """
    if len(available_surplus) != 24 or len(solar_gen) != 24:
        raise ValueError('Profiles must contain 24 hourly bins')
    available = [finite(v, 'surplus') for v in available_surplus]
    candidates = feasible_starts(act)
    def evaluate(start):
        profile = activity_profile(start, act.duration_hours, act.power_kw)
        absorbed = sum(min(act.power_kw, headroom) * load / act.power_kw for load, headroom in zip(profile, available))
        return absorbed, -abs(start - act.preferred_hour), -start
    best = max(candidates, key=evaluate)
    profile = activity_profile(best, act.duration_hours, act.power_kw)
    available_in_window = sum(s * (v / act.power_kw) for s, v in zip(available, profile))
    return best, evaluate(best)[0], available_in_window


def export_profile(schedules, available, window=None):
    """Integrate exact partial-hour overlap, with constant power inside bins."""
    breaks = set(range(25)) | {float(s[0]) for s in schedules.values()} | {float(s[0] + s[1]) for s in schedules.values()}
    if window is not None:
        breaks.update(window)
    points = sorted(breaks)
    export = [0.0] * 24
    for start, end in zip(points, points[1:]):
        if start < 0 or end > 24:
            raise ValueError('Schedule extends outside the modeled day')
        hour = min(23, int(start))
        if window is not None and not window[0] <= start < window[1]:
            continue
        power = sum(s[2] for s in schedules.values() if s[0] <= start < s[0] + s[1])
        export[hour] += max(0, available[hour] - power) * (end - start)
    return export


def calendar_export_profile(schedules, monthly_available, frequencies, window=None, operating_activity=None):
    """Average conserved full-power flows after clipping for each month/day.

    Activity days are explicitly Monday through the first N weekdays. For a
    window belonging to one activity, evaluate only its operating weekdays;
    this returns conditional per-session headroom instead of weekly dilution.
    """
    mean = [0.0] * 24
    for month, available in enumerate(monthly_available):
        for weekday in range(7):
            if operating_activity is not None and weekday >= frequencies[operating_activity]:
                continue
            active = {key: value for key, value in schedules.items() if weekday < frequencies[key]}
            profile = export_profile(active, available, window)
            divisor = frequencies[operating_activity] if operating_activity is not None else 7
            weight = DAYS_IN_MONTH[month] / (365 * divisor)
            for h in range(24):
                mean[h] += profile[h] * weight
    return mean


async def optimize_energy_scheduling(project_id: str, db: Session) -> SchedulingOptimizationResponse:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError('Project not found.')
    activities = db.query(EnergyActivity).filter(EnergyActivity.project_id == project_id).order_by(EnergyActivity.id).all()
    insights = await analyze_project_energy_surplus(project_id, db)
    fixed_load = [p.electricity_demand_kw for p in insights.hourly_profile]
    solar = [p.solar_generation_kw for p in insights.hourly_profile]
    # Mean exported energy, already accounting for building-specific monthly
    # coincidence, is the only headroom available to registered activities.
    fixed_export = [p.solar_surplus_kw for p in insights.hourly_profile]
    monthly_export = insights.monthly_hourly_surplus_kw
    if len(monthly_export) != 12 or any(len(row) != 24 for row in monthly_export):
        raise ValueError('Scheduling requires twelve conserved monthly hourly surplus profiles')
    profiles = {}
    schedules = {}
    duty = {}
    frequencies = {}
    for act in activities:
        duty[act.id] = finite(act.days_per_week, 'days_per_week', 1, 7) / 7
        frequencies[act.id] = act.days_per_week
        profiles[act.id] = [v * duty[act.id] for v in activity_profile(act.preferred_hour, act.duration_hours, act.power_kw)]
        schedules[act.id] = (act.preferred_hour, act.duration_hours, act.power_kw)
        if act.is_shiftable:
            feasible_starts(act)
    operation_load = [sum(p[h] for p in profiles.values()) for h in range(24)]
    baseline = [b + a for b, a in zip(fixed_load, operation_load)]
    shifted = baseline.copy()
    def total_export(plan):
        return sum(calendar_export_profile(plan, monthly_export, frequencies))
    original_export = calendar_export_profile(schedules, monthly_export, frequencies)
    before = sum(original_export)
    recommendations = []
    names = {b.id: b.name for b in db.query(Building).filter(Building.project_id == project_id).all()}
    margin = finite(project.tariff_rate, 'tariff') - finite(project.export_tariff, 'export_tariff')
    for act in activities:
        if not act.is_shiftable:
            continue
        original = profiles[act.id]
        remaining = [max(0, a - b) for a, b in zip(operation_load, original)]
        candidates = feasible_starts(act)
        old_export = total_export(schedules)
        remaining_plan = {key: value for key, value in schedules.items() if key != act.id}
        def candidate(start):
            plan = {**remaining_plan, act.id: (start, act.duration_hours, act.power_kw)}
            gain = old_export - total_export(plan)
            return gain, -abs(start - act.preferred_hour), -start
        # No positive tariff margin: retain a legal original schedule rather
        # than inventing financial gain or forcing a solar shift.
        if margin <= 0 and act.preferred_hour in candidates:
            best = act.preferred_hour
        elif margin < 0:
            best = max(candidates, key=lambda start: (-candidate(start)[0], *candidate(start)[1:]))
        elif margin == 0:
            best = min(candidates, key=lambda start: (abs(start - act.preferred_hour), start))
        else:
            best = max(candidates, key=candidate)
        new = [v * duty[act.id] for v in activity_profile(best, act.duration_hours, act.power_kw)]
        operation_load = [a + b for a, b in zip(remaining, new)]
        profiles[act.id] = new
        schedules[act.id] = (best, act.duration_hours, act.power_kw)
        shifted = [b + a for b, a in zip(fixed_load, operation_load)]
        daily_gain = old_export - total_export(schedules)
        per_session_gain = daily_gain / duty[act.id]
        # Stationary seven-day frequency over a 365-day non-leap model year.
        annual_gain = daily_gain * 365
        saving = annual_gain * margin
        window_surplus = sum(calendar_export_profile(remaining_plan, monthly_export, frequencies,
                             (best, best + act.duration_hours), operating_activity=act.id))
        original_window = f'{format_hour_label(act.preferred_hour)} - {format_hour_label(act.preferred_hour + act.duration_hours)}'
        recommended_window = f'{format_hour_label(best)} - {format_hour_label(best + act.duration_hours)}'
        recommendations.append(ShiftRecommendation(
            activity_id=act.id, activity_name=act.name,
            building_name=names.get(act.building_id, 'Campus Central Facility'),
            original_window=original_window, recommended_window=recommended_window,
            recommended_start_hour=best, duration_hours=act.duration_hours, power_kw=act.power_kw,
            energy_kwh_per_session=act.power_kw * act.duration_hours,
            available_surplus_in_window_kwh=window_surplus,
            additional_solar_absorbed_kwh=per_session_gain, estimated_annual_savings_inr=saving,
            reason=(f'Conserved before/after comparison estimates {per_session_gain:.2f} kWh additional onsite solar per session. '
                    f'Annual value uses {act.days_per_week} days/week and actual tariff minus export tariff ({margin:.2f} INR/kWh).'),
            practical_notes='Registered activities are additional loads above declared building baseload. Confirm staffing, electrical connectivity and equipment constraints before shifting.',
        ))
    final_export = calendar_export_profile(schedules, monthly_export, frequencies)
    after = sum(final_export)
    daily_gain = before - after
    annual_gain = daily_gain * 365
    comparison = [HourlyProfileComparison(
        hour=h, time_label=format_hour_label(h), solar_generation_kw=solar[h], baseline_load_kw=baseline[h],
        shifted_load_kw=shifted[h],
        surplus_before_kw=original_export[h],
        surplus_after_kw=final_export[h],
    ) for h in range(24)]
    return SchedulingOptimizationResponse(
        project_id=project.id, activities_analyzed=len(activities),
        shiftable_activities_count=sum(bool(a.is_shiftable) for a in activities),
        recommendations=recommendations, hourly_comparison=comparison,
        daily_surplus_before_kwh=before, daily_surplus_after_kwh=after,
        daily_solar_absorption_gain_kwh=daily_gain, annual_solar_absorption_gain_kwh=annual_gain,
        annual_financial_gain_inr=annual_gain * margin,
        # Exports already earn avoided CO2 in solar/energy accounting. Moving
        # unchanged PV generation onsite does not add system-wide avoidance.
        co2_reduction_gain_kg=0.0,
        disclaimer=('Feasible sequential greedy scheduling, not a joint global optimum. Exact fractional session energy; '
                    'profiles use each monthly representative day and full equipment power on Monday through the first N operating weekdays. '
                    'Annualization uses a stationary seven-day pattern over 365 days, not a dated operational calendar. '
                    'Additional avoided CO2 is zero because exported PV was already credited and total PV generation is unchanged. '
                    'Activities are additional loads above building baseload; do not register load already included there. '
                    'Shared campus electrical access to exported PV is assumed for shifting; no storage modeled.'),
    )
