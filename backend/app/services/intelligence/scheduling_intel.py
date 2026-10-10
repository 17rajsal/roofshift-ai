"""
Component C — Energy Scheduling Intelligence
Finds optimal daylight time windows for flexible campus electrical loads
to absorb peak solar surplus without double counting.
Zero Bedrock / Zero Generative AI.
"""
from typing import List, Dict, Any, Tuple
from app.services.scheduling.load_shifter import find_best_operating_window, optimize_energy_scheduling

def calculate_activity_shift_benefit(
    power_kw: float,
    duration_hours: float,
    earliest_hour: int,
    latest_hour: int,
    preferred_hour: int,
    available_surplus: List[float],
    solar_gen: List[float],
    tariff_inr: float,
    export_tariff_inr: float
) -> Dict[str, Any]:
    """
    Evaluates shifting a flexible equipment schedule to overlap with available solar surplus.
    """
    duration = int(round(duration_hours))
    if duration < 1:
        duration = 1

    max_start = min(23 - duration, latest_hour - duration)
    min_start = max(0, earliest_hour)
    if min_start > max_start:
        min_start = earliest_hour
        max_start = min_start

    best_start = preferred_hour
    best_absorbed = 0.0

    for start_h in range(min_start, max_start + 1):
        window_absorbed = 0.0
        for h in range(start_h, start_h + duration):
            surplus_h = available_surplus[h] if h < 24 else 0.0
            absorbed_h = min(power_kw, surplus_h)
            window_absorbed += absorbed_h

        if window_absorbed > best_absorbed:
            best_absorbed = window_absorbed
            best_start = start_h

    # Value: grid avoidance (tariff) minus lost export credit
    marginal_value = max(1.0, tariff_inr - export_tariff_inr)
    annual_gain_inr = best_absorbed * 260.0 * marginal_value # 260 operating days

    return {
        "original_start": preferred_hour,
        "recommended_start": best_start,
        "duration_hours": duration,
        "daily_solar_absorbed_kwh": round(best_absorbed, 1),
        "annual_financial_gain_inr": round(annual_gain_inr, 2)
    }
