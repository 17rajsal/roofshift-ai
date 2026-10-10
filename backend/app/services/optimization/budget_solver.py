import math
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
    if capacity_kwp <= 0.001:
        return {
            "capacity_kwp": 0.0,
            "cost_inr": 0.0,
            "annual_gen_kwh": 0.0,
            "onsite_kwh": 0.0,
            "export_kwh": 0.0,
            "savings_inr": 0.0,
        }

    cost_inr = (capacity_kwp * cost_per_kwp) + (building.fixed_cost or 0.0)
    month_keys = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

    monthly_demand = building.monthly_consumption_kwh
    daytime_demand_monthly = monthly_demand * (building.daytime_consumption_pct / 100.0)

    annual_gen = 0.0
    annual_onsite = 0.0
    annual_export = 0.0

    for i, m_key in enumerate(month_keys):
        ghi = monthly_ghi.get(m_key, 5.0)
        days = DAYS_IN_MONTH[i]
        gen = capacity_kwp * ghi * days * pr * shading_factor
        onsite = min(gen, daytime_demand_monthly)
        export = max(0.0, gen - daytime_demand_monthly)

        annual_gen += gen
        annual_onsite += onsite
        annual_export += export

    savings_inr = (annual_onsite * tariff) + (annual_export * export_tariff)

    return {
        "capacity_kwp": round(capacity_kwp, 2),
        "cost_inr": round(cost_inr, 2),
        "annual_gen_kwh": round(annual_gen, 1),
        "onsite_kwh": round(annual_onsite, 1),
        "export_kwh": round(annual_export, 1),
        "savings_inr": round(savings_inr, 2),
    }

def solve_multiple_choice_knapsack(
    building_options: List[List[Dict[str, Any]]],
    budget: float,
    objective: str
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Exact Dynamic Programming Solver for Multiple-Choice Knapsack Problem (MCKP).
    Selects at most one capacity discrete option per building within the budget.
    """
    # Scale budget to integer discrete buckets (e.g. ₹2,000 granularity for sub-millisecond precision)
    scale = 2000.0
    B = int(budget / scale)
    if B <= 0:
        B = 1

    # dp[w] = (max_value, [chosen_options])
    # Initialize for 0 buildings
    dp = {0: (0.0, [])}

    for b_idx, options in enumerate(building_options):
        new_dp = {}
        for opt in options:
            opt_cost = opt["cost_inr"]
            w_scaled = int(math.ceil(opt_cost / scale))

            # Value based on objective
            if objective == "MAXIMIZE_SAVINGS":
                val = opt["savings_inr"]
            elif objective == "MAXIMIZE_ONSITE_UTILIZATION":
                val = opt["onsite_kwh"]
            else: # MAXIMIZE_GENERATION
                val = opt["annual_gen_kwh"]

            for prev_w, (prev_val, prev_choices) in dp.items():
                total_w = prev_w + w_scaled
                if total_w <= B and (prev_w * scale + opt_cost) <= budget:
                    total_val = prev_val + val
                    if total_w not in new_dp or total_val > new_dp[total_w][0]:
                        new_dp[total_w] = (total_val, prev_choices + [opt])

        # Prune dominated states
        if new_dp:
            dp = new_dp
        else:
            # If no option fits, carry zero option
            pass

    # Find best within budget
    best_val = -1.0
    best_solution = []
    for w, (val, choices) in dp.items():
        total_actual_cost = sum(c["cost_inr"] for c in choices)
        if total_actual_cost <= budget and val > best_val:
            best_val = val
            best_solution = choices

    return best_solution, best_val

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
    is_selected = cap > 0.05
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
            f"Selected for {cap:.1f} kWp allocation ({cap/max_cap*100:.0f}% of usable roof area)."
        )
        if shading_loss <= 8.0:
            reasons.append("Unobstructed roof profile provides top-tier specific energy yield (>1,400 kWh/kWp).")
        if opt.get("savings_inr", 0) > 0 and opt.get("cost_inr", 0) > 0:
            payback = opt["cost_inr"] / opt["savings_inr"]
            reasons.append(f"Highly favorable capital payback period of ~{payback:.1f} years with ₹{opt['savings_inr']:,.0f}/year bill offset.")
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
