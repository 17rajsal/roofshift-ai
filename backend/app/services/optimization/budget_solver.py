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

from decimal import Decimal
from itertools import product

def solve_multiple_choice_knapsack(
    building_options: List[List[Dict[str, Any]]],
    budget: float,
    objective: str
) -> Tuple[List[Dict[str, Any]], float]:
    """
    Exact Solver for Multiple-Choice Knapsack Problem (MCKP).
    Selects exactly one discrete option per building group within the budget constraint.
    Guarantees mathematical optimality without artificial bucket rounding.
    """
    if not building_options:
        return [], 0.0

    # Determine objective attribute key
    val_key = "savings_inr"
    if objective == "MAXIMIZE_GENERATION":
        val_key = "annual_gen_kwh"
    elif objective in ("MAXIMIZE_ONSITE_UTILIZATION", "MAXIMIZE_SELF_CONSUMPTION"):
        val_key = "onsite_kwh"

    budget_dec = Decimal(str(budget))
    if budget_dec < Decimal("0"):
        return [grp[0] for grp in building_options], 0.0

    # Check total combination space for exhaustive oracle evaluation
    total_combinations = 1
    for grp in building_options:
        total_combinations *= max(1, len(grp))
        if total_combinations > 50000:
            break

    if total_combinations <= 50000:
        best_val = -1.0
        best_choice = None
        for choice in product(*building_options):
            cost_sum = sum(Decimal(str(c["cost_inr"])) for c in choice)
            if cost_sum <= budget_dec:
                val_sum = sum(c[val_key] for c in choice)
                if val_sum > best_val:
                    best_val = val_sum
                    best_choice = list(choice)
        if best_choice is not None and best_val >= 0.0:
            return best_choice, float(best_val)
        return [grp[0] for grp in building_options], 0.0

    # Pareto-frontier dynamic programming for larger inputs
    # dp state: cost_decimal -> (value, choices_list)
    dp = {Decimal("0"): (0.0, [])}
    for grp in building_options:
        new_dp = {}
        for opt in grp:
            opt_c = Decimal(str(opt["cost_inr"]))
            opt_v = float(opt[val_key])
            for prev_c, (prev_v, prev_choices) in dp.items():
                tot_c = prev_c + opt_c
                if tot_c <= budget_dec:
                    tot_v = prev_v + opt_v
                    if tot_c not in new_dp or tot_v > new_dp[tot_c][0]:
                        new_dp[tot_c] = (tot_v, prev_choices + [opt])

        if not new_dp:
            return [grp[0] for grp in building_options], 0.0

        # Pareto pruning: as cost increases, value must strictly increase
        sorted_costs = sorted(new_dp.keys())
        pruned = {}
        best_v = -1.0
        for c in sorted_costs:
            v, choices = new_dp[c]
            if v > best_v:
                best_v = v
                pruned[c] = (v, choices)
        dp = pruned

    best_c = max(dp.keys(), key=lambda c: dp[c][0]) if dp else Decimal("0")
    val, choices = dp.get(best_c, (0.0, [grp[0] for grp in building_options]))
    return choices, float(val)

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
    cap = opt.get("capacity_kwp", 0.0)
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

    # Solver Decision Rationale (QA-08: verify calculated yield before asserting >1400 kWh/kWp)
    if is_selected:
        reasons.append(
            f"Selected for {cap:.1f} kWp allocation ({cap/max(0.1, max_cap)*100:.0f}% of usable roof area)."
        )
        calculated_specific_yield = (gen_kwh / max(0.001, cap)) if cap > 0 else 0.0
        if calculated_specific_yield >= 1400.0 and shading_loss <= 8.0:
            reasons.append(f"Unobstructed roof profile provides top-tier specific energy yield ({calculated_specific_yield:.0f} kWh/kWp).")
        elif calculated_specific_yield > 0:
            reasons.append(f"Estimated specific energy yield of {calculated_specific_yield:.0f} kWh/kWp.")

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
