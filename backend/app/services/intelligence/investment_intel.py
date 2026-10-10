"""
Component B — Investment Intelligence
Solves the Multiple-Choice Knapsack budget allocation problem using
Google OR-Tools and exact Dynamic Programming.
Zero Bedrock / Zero Generative AI.
"""
from typing import List, Dict, Any, Tuple
import logging
from app.services.optimization.budget_solver import (
    solve_multiple_choice_knapsack as dp_knapsack_solve,
    evaluate_capacity_option
)

logger = logging.getLogger(__name__)

def solve_with_ortools_knapsack(
    building_options: List[List[Dict[str, Any]]],
    budget: float,
    objective: str
) -> Tuple[List[Dict[str, Any]], float, str]:
    """
    Attempts to solve with Google OR-Tools; falls back seamlessly to exact dynamic programming.
    """
    try:
        from ortools.sat.python import cp_model
        model = cp_model.CpModel()

        # Decision variables: x[b][opt] in {0, 1}
        x = {}
        cost_terms = []
        obj_terms = []

        # Scale units to integer (e.g. INR in thousands or integer rupees)
        scale_cost = 1000 # Cost scaled to thousands of INR

        for b_idx, options in enumerate(building_options):
            b_vars = []
            for o_idx, opt in enumerate(options):
                var = model.NewBoolVar(f"b_{b_idx}_opt_{o_idx}")
                x[(b_idx, o_idx)] = var
                b_vars.append(var)

                cost_int = int(opt["cost_inr"] / scale_cost)
                cost_terms.append(cost_int * var)

                if objective == "MAXIMIZE_SAVINGS":
                    val_int = int(opt["savings_inr"])
                elif objective == "MAXIMIZE_ONSITE_UTILIZATION":
                    val_int = int(opt["onsite_kwh"])
                else: # MAXIMIZE_GENERATION
                    val_int = int(opt["annual_gen_kwh"])

                obj_terms.append(val_int * var)

            # At most one capacity option selected per building
            model.Add(sum(b_vars) <= 1)

        # Budget constraint
        max_cost_scaled = int(budget / scale_cost)
        model.Add(sum(cost_terms) <= max_cost_scaled)

        # Objective
        model.Maximize(sum(obj_terms))

        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 2.0
        status = solver.Solve(model)

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            chosen = []
            total_val = solver.ObjectiveValue()
            for b_idx, options in enumerate(building_options):
                for o_idx, opt in enumerate(options):
                    if solver.Value(x[(b_idx, o_idx)]) == 1:
                        chosen.append(opt)
            return chosen, total_val, "Google OR-Tools CP-SAT Solver"
    except Exception as e:
        logger.warning(f"OR-Tools CP-SAT solver fell back to exact DP: {str(e)}")

    # Fallback to exact dynamic programming solver
    chosen, val = dp_knapsack_solve(building_options, budget, objective)
    return chosen, val, "Multiple-Choice Knapsack Dynamic Programming (Exact Global Optimum)"
