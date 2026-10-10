import math
from decimal import Decimal
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.building import Building
from app.models.project import Project
from app.models.solar import SolarAnalysis
from app.models.optimization import OptimizationRun
from app.schemas.optimization import (
    OptimizeRequest, BuildingAllocationItem, OptimizationRunResponse, BaselineComparison
)
from app.services.solar.solar_engine import calculate_building_solar_potential, get_effective_shading_loss, DAYS_IN_MONTH
from app.core.config import settings
from app.services.energy.balance import finite, monthly_balance, generation_by_month, installation_cost

MAX_SOLVER_OPTIONS = 50_000
MAX_FRONTIER_STATES = 50_000
MAX_SOLVER_TRANSITIONS = 5_000_000

def evaluate_capacity_option(
    capacity_kwp: float,
    building: Building,
    project: Project,
    monthly_ghi: Dict[str, float],
    shading_factor: float,
    pr: float,
    tariff: float,
    export_tariff: float,
    cost_per_kwp: float
) -> Dict[str, float]:
    """Calculates generation, onsite consumption, export, cost, and savings for a specific capacity choice."""
    capacity_kwp = finite(capacity_kwp, "capacity_kwp")
    cost_per_kwp = finite(cost_per_kwp, "cost_per_kwp")
    tariff, export_tariff = finite(tariff, "tariff"), finite(export_tariff, "export_tariff")
    if capacity_kwp == 0:
        return {
            "capacity_kwp": 0.0,
            "cost_inr": 0.0,
            "annual_gen_kwh": 0.0,
            "onsite_kwh": 0.0,
            "export_kwh": 0.0,
            "savings_inr": 0.0,
        }

    cost_inr = installation_cost(capacity_kwp, cost_per_kwp, building.fixed_cost or 0)
    monthly = generation_by_month(capacity_kwp, monthly_ghi, pr, shading_factor)
    balance = monthly_balance(monthly, building.monthly_consumption_kwh, building.daytime_consumption_pct)
    annual_gen, annual_onsite, annual_export = sum(monthly), sum(balance["onsite"]), sum(balance["export"])

    savings_inr = (annual_onsite * tariff) + (annual_export * export_tariff)

    return {
        "capacity_kwp": capacity_kwp,
        "cost_inr": cost_inr,
        "annual_gen_kwh": annual_gen,
        "onsite_kwh": annual_onsite,
        "export_kwh": annual_export,
        "savings_inr": savings_inr,
    }

def solve_multiple_choice_knapsack(
    building_options: List[List[Dict[str, Any]]],
    budget: float,
    objective: str
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Exact Pareto-frontier DP over the supplied discrete choices.
    Monetary comparison uses Decimal strings, without cost buckets. Ties choose
    the cheaper plan deterministically. Each group requires a feasible option,
    normally the zero-installation option; infeasibility is an error.
    """
    keys = {"MAXIMIZE_SAVINGS": "savings_inr", "MAXIMIZE_GENERATION": "annual_gen_kwh",
            "MAXIMIZE_ONSITE_UTILIZATION": "onsite_kwh", "MAXIMIZE_SELF_CONSUMPTION": "onsite_kwh"}
    if objective not in keys:
        raise ValueError("Unknown optimization objective")
    finite(budget, "budget")
    limit = Decimal(str(budget))
    if sum(len(group) for group in building_options) > MAX_SOLVER_OPTIONS:
        raise ValueError("Exact optimizer option limit exceeded; increase capacity step or reduce project size")
    key = keys[objective]
    dp = {Decimal(0): (Decimal(0), [])}
    transitions = 0
    for options in building_options:
        if not options:
            raise ValueError("Each building must have at least one capacity option")
        parsed = []
        for opt in options:
            finite(opt["cost_inr"], "option cost")
            finite(opt[key], "option objective")
            parsed.append((Decimal(str(opt["cost_inr"])), Decimal(str(opt[key])), opt))
        new_dp = {}
        for prev_cost, (prev_value, choices) in dp.items():
            for cost, value, opt in parsed:
                transitions += 1
                if transitions > MAX_SOLVER_TRANSITIONS:
                    raise ValueError("Exact optimizer transition limit exceeded; increase capacity step or reduce project size")
                total_cost, total_value = prev_cost + cost, prev_value + value
                if total_cost <= limit and (total_cost not in new_dp or total_value > new_dp[total_cost][0]):
                    new_dp[total_cost] = (total_value, choices + [opt])
                    if len(new_dp) > MAX_FRONTIER_STATES:
                        raise ValueError("Exact optimizer state limit exceeded; increase capacity step or reduce project size")
        if not new_dp:
            raise ValueError("No feasible capacity plan within budget")
        dp, best = {}, None
        for cost in sorted(new_dp):
            value, choices = new_dp[cost]
            if best is None or value > best:
                dp[cost], best = (value, choices), value
    value, choices = max(dp.values(), key=lambda state: state[0])
    return choices, float(value)

def generate_decision_explanations(
    building: Building,
    opt: Dict[str, Any],
    max_cap: float,
    objective: str,
    budget: float,
    total_cost: float,
    savings_roi_pct: float
) -> Tuple[List[str], str, str]:
    """Generates rigorous, calculation-grounded explainable rationales for building recommendation."""
    cap = opt["capacity_kwp"]
    is_selected = cap > 0
    reasons = []

    # Shading rationale
    shading_loss = get_effective_shading_loss(building.shading_category, building.custom_shading_loss)
    if shading_loss <= 5.0:
        shade_summary = f"Optimal solar exposure ({shading_loss}% minimal shading loss), delivering peak specific energy yield."
    elif shading_loss <= 15.0:
        shade_summary = f"Moderate shading ({shading_loss}% derating factor), good yield with slightly attenuated morning/evening solar."
    else:
        shade_summary = f"Severe shading impact ({shading_loss}% derating factor), causing ~{shading_loss}% lower generation efficiency per installed kWp."

    # Demand support rationale
    annual_cons = building.monthly_consumption_kwh * 12.0
    daytime_pct = building.daytime_consumption_pct
    onsite_kwh = opt.get("onsite_kwh", 0.0)
    gen_kwh = opt.get("annual_gen_kwh", 0.0)
    
    if gen_kwh > 0:
        self_cons_pct = (onsite_kwh / gen_kwh) * 100.0
        demand_summary = (
            f"On-site load absorbs {self_cons_pct:.1f}% of generation directly during daytime operating hours "
            f"({daytime_pct}% daytime share of {building.monthly_consumption_kwh:,.0f} kWh/month)."
        )
    else:
        demand_summary = f"Building has strong baseline demand ({building.monthly_consumption_kwh:,.0f} kWh/month, {daytime_pct}% daytime)."

    # Solver Decision Rationale
    if is_selected:
        reasons.append(
            f"Selected for {cap:.1f} kWp allocation ({cap/max(max_cap, 1e-12)*100:.0f}% of eligible capacity)."
        )
        if gen_kwh > 0:
            reasons.append(f"Calculated specific energy yield is {gen_kwh / cap:,.0f} kWh/kWp/year.")
        if opt.get("savings_inr", 0) > 0 and opt.get("cost_inr", 0) > 0:
            payback = opt["cost_inr"] / opt["savings_inr"]
            reasons.append(f"Simple capital payback is ~{payback:.1f} years with ₹{opt['savings_inr']:,.0f}/year energy value.")
        if opt.get("onsite_kwh", 0) >= opt.get("annual_gen_kwh", 0) * 0.75:
            reasons.append("Strong coincidence between daytime campus operations and peak PV production minimizes low-value grid export.")
    else:
        if shading_loss >= 25.0:
            reasons.append(f"Deprioritized due to severe shading ({shading_loss}%), which reduces capital efficiency relative to unshaded roofs.")
        elif (budget - total_cost) < (building.cost_per_kwp * 2.0):
            reasons.append("Excluded because available project budget was exhausted by higher-yielding candidate buildings.")
        elif opt.get("savings_inr", 0) / max(1.0, building.cost_per_kwp) < 0.10:
            reasons.append("Lower economic return per invested rupee compared to prioritized campus rooftops.")
        else:
            reasons.append("Rooftop remains viable for secondary phase when additional capital expenditure becomes available.")

    return reasons, shade_summary, demand_summary
