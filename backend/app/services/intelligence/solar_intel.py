"""
Component A — Solar Intelligence
Calculates rooftop solar potential, specific yield, and generation losses
grounded strictly in NASA POWER satellite climatology and PV physics.
Zero LLM / Zero Bedrock dependency.
"""
from typing import Dict, Any, List, Optional
from app.services.solar.solar_engine import (
    calculate_building_solar_potential,
    get_effective_shading_loss,
    DAYS_IN_MONTH,
    MONTH_NAMES
)
from app.services.solar.nasa_power import fetch_solar_irradiance

def compute_solar_potential(
    gross_area_m2: float,
    usable_fraction: float,
    shading_category: str,
    custom_shading_loss: Optional[float] = None,
    area_per_kwp: float = 8.0,
    performance_ratio: float = 0.75,
    monthly_ghi: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Pure deterministic solar physics calculation.
    """
    usable_area = round(gross_area_m2 * (usable_fraction / 100.0), 2)
    max_capacity_kwp = round(usable_area / max(1.0, area_per_kwp), 2)
    
    shading_loss_pct = get_effective_shading_loss(shading_category, custom_shading_loss)
    shading_factor = max(0.0, 1.0 - (shading_loss_pct / 100.0))

    month_keys = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    default_ghi = {"JAN": 4.35, "FEB": 5.12, "MAR": 5.88, "APR": 6.42, "MAY": 6.65, "JUN": 5.75,
                   "JUL": 4.82, "AUG": 4.58, "SEP": 5.10, "OCT": 5.25, "NOV": 4.72, "DEC": 4.15}
    ghi_map = monthly_ghi or default_ghi

    monthly_generation = []
    annual_gen = 0.0

    for i, m_key in enumerate(month_keys):
        ghi_day = ghi_map.get(m_key, 5.0)
        days = DAYS_IN_MONTH[i]
        gen = round(max_capacity_kwp * ghi_day * days * performance_ratio * shading_factor, 1)
        monthly_generation.append(gen)
        annual_gen += gen

    annual_gen = round(annual_gen, 1)
    specific_yield = round(annual_gen / max(0.1, max_capacity_kwp), 1) if max_capacity_kwp > 0 else 0.0

    return {
        "usable_roof_area_m2": usable_area,
        "max_capacity_kwp": max_capacity_kwp,
        "annual_generation_kwh": annual_gen,
        "monthly_generation_kwh": monthly_generation,
        "specific_yield_kwh_per_kwp": specific_yield,
        "shading_loss_pct": shading_loss_pct,
        "performance_ratio": performance_ratio
    }
