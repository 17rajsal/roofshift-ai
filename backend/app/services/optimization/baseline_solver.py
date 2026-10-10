from typing import List, Dict, Any, Tuple
from app.models.building import Building
from app.models.project import Project
from app.services.optimization.budget_solver import evaluate_capacity_option

def run_baseline_first_feasible(
    buildings: List[Building],
    project: Project,
    budget: float,
    building_options_map: Dict[str, List[Dict[str, Any]]],
    objective: str
) -> Tuple[List[Dict[str, Any]], float, float, float, float]:
    """
    Computes a realistic, fair baseline allocation:
    Allocates budget sequentially (first-fit / simple greedy by size)
    using the exact same building profiles and solar data.
    """
    remaining_budget = budget
    baseline_allocations = []
    total_cost = 0.0
    total_savings = 0.0
    total_gen = 0.0
    total_cap = 0.0

    # Sort buildings simply by gross roof area descending (common naive heuristic: "put panels on the biggest roof first")
    sorted_buildings = sorted(buildings, key=lambda b: b.gross_roof_area, reverse=True)

    for b in sorted_buildings:
        options = building_options_map.get(b.id, [])
        # Find maximum capacity option that fits within remaining_budget
        best_fit = None
        for opt in reversed(options):
            if opt["cost_inr"] <= remaining_budget:
                best_fit = opt
                break
        
        if not best_fit:
            # Zero option
            best_fit = options[0] if options else {"capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "annual_gen_kwh": 0.0}

        baseline_allocations.append({
            "building_id": b.id,
            "building_name": b.name,
            "capacity_kwp": best_fit["capacity_kwp"],
            "cost_inr": best_fit["cost_inr"],
            "savings_inr": best_fit["savings_inr"],
            "annual_gen_kwh": best_fit["annual_gen_kwh"]
        })

        remaining_budget -= best_fit["cost_inr"]
        total_cost += best_fit["cost_inr"]
        total_savings += best_fit["savings_inr"]
        total_gen += best_fit["annual_gen_kwh"]
        total_cap += best_fit["capacity_kwp"]

    return (
        baseline_allocations,
        round(total_cost, 2),
        round(total_savings, 2),
        round(total_gen, 1),
        round(total_cap, 2)
    )
