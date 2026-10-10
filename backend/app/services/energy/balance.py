"""Pure, conserved energy estimates for one representative day per month.

One-hour bins contain kWh; their numeric values also equal mean kW in that
bin. Profiles are assumptions, not measured intraday irradiance or meters.
"""
import math
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation

DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_KEYS = [m.upper() for m in MONTH_NAMES]

_SOLAR = [0, 0, 0, 0, 0, 0, .015, .045, .085, .125, .160, .170,
          .165, .125, .075, .030, .005, 0, 0, 0, 0, 0, 0, 0]
_DEMAND = [.025, .025, .025, .025, .025, .030, .035, .045, .065, .075,
           .080, .080, .075, .070, .070, .065, .055, .045, .045, .050,
           .055, .050, .035, .030]
HOURLY_SOLAR_WEIGHTS = [v / sum(_SOLAR) for v in _SOLAR]
HOURLY_DEMAND_WEIGHTS = [v / sum(_DEMAND) for v in _DEMAND]


def finite(value, name, minimum=0.0, maximum=None):
    value = float(value)
    if not math.isfinite(value) or value < minimum or (maximum is not None and value > maximum):
        raise ValueError(f"{name} must be finite and between {minimum} and {maximum or 'infinity'}")
    return value


def installation_cost(capacity, cost_per_kwp, fixed_cost):
    """INR capital charges rounded once to paise, Decimal round-half-up."""
    capacity = finite(capacity, "capacity_kwp")
    cost_per_kwp, fixed_cost = finite(cost_per_kwp, "cost_per_kwp"), finite(fixed_cost, "fixed_cost")
    if capacity == 0:
        return 0.0
    try:
        amount = Decimal(str(capacity)) * Decimal(str(cost_per_kwp)) + Decimal(str(fixed_cost))
        return finite(float(amount.quantize(Decimal(".01"), rounding=ROUND_HALF_UP)), "installation_cost")
    except InvalidOperation as exc:
        raise ValueError("Installation charge exceeds supported decimal precision") from exc


def demand_weights(daytime_pct):
    """Allocate the declared daytime share to 06:00-18:00, exactly."""
    share = finite(daytime_pct, "daytime_consumption_pct", 0, 100) / 100
    day_sum = sum(_DEMAND[6:18])
    night_sum = sum(_DEMAND[:6] + _DEMAND[18:])
    return [v * (share / day_sum if 6 <= h < 18 else (1 - share) / night_sum)
            for h, v in enumerate(_DEMAND)]


def monthly_balance(monthly_generation, monthly_demand, daytime_pct):
    """Return generation, onsite, export and grid arrays, plus annual mean day.

    Demand is the same bill kWh in each month; generation follows actual
    monthly GHI and calendar days. Buildings are balanced independently
    because no shared electrical bus or inter-building netting is declared.
    """
    if len(monthly_generation) != 12:
        raise ValueError("monthly_generation must have exactly 12 values")
    monthly_demand = finite(monthly_demand, "monthly_consumption_kwh")
    weights = demand_weights(daytime_pct)
    generation = [finite(v, "monthly_generation") for v in monthly_generation]
    onsite, export, grid = [], [], []
    solar_day, demand_day = [0.0] * 24, [0.0] * 24
    onsite_day, export_day, grid_day = [0.0] * 24, [0.0] * 24, [0.0] * 24
    monthly_export_hourly = []
    for days, gen in zip(DAYS_IN_MONTH, generation):
        solar = [gen / days * w for w in HOURLY_SOLAR_WEIGHTS]
        load = [monthly_demand / days * w for w in weights]
        consumed = min(gen, monthly_demand, max(0, sum(min(s, d) for s, d in zip(solar, load)) * days))
        onsite.append(consumed)
        export.append(gen - consumed)
        grid.append(monthly_demand - consumed)
        monthly_export_hourly.append([max(0, s - d) for s, d in zip(solar, load)])
        for h in range(24):
            solar_day[h] += solar[h] * days / 365
            demand_day[h] += load[h] * days / 365
            used = min(solar[h], load[h])
            onsite_day[h] += used * days / 365
            export_day[h] += (solar[h] - used) * days / 365
            grid_day[h] += (load[h] - used) * days / 365
    return {"generation": generation, "onsite": onsite, "export": export,
            "grid": grid, "solar_hourly": solar_day, "demand_hourly": demand_day,
            "onsite_hourly": onsite_day, "export_hourly": export_day,
            "grid_hourly": grid_day, "monthly_export_hourly": monthly_export_hourly}


def generation_by_month(capacity, monthly_ghi, performance_ratio, shading_factor):
    capacity = finite(capacity, "capacity_kwp")
    pr = finite(performance_ratio, "performance_ratio", 0, 1)
    shade = finite(shading_factor, "shading_factor", 0, 1)
    if any(m not in monthly_ghi for m in MONTH_KEYS):
        raise ValueError("monthly_ghi must include all twelve months")
    return [capacity * finite(monthly_ghi[m], f"GHI {m}", 0, 15) * d * pr * shade
            for m, d in zip(MONTH_KEYS, DAYS_IN_MONTH)]
