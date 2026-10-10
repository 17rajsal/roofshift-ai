"""Compatibility interface for the authoritative exact investment solver."""
from typing import List, Dict, Any, Tuple
from app.services.optimization.budget_solver import (
    solve_multiple_choice_knapsack as dp_knapsack_solve,
    evaluate_capacity_option,
)


def solve_with_ortools_knapsack(
    building_options: List[List[Dict[str, Any]]], budget: float, objective: str
) -> Tuple[List[Dict[str, Any]], float, str]:
    """Use the verified solver without optional OR-Tools currency truncation.

    Kept under its existing name to preserve callers. The former CP-SAT path
    truncated cost in INR1,000 units and did not prove optimality after a timeout.
    """
    chosen, value = dp_knapsack_solve(building_options, budget, objective)
    return chosen, value, "Exact Pareto-frontier Multiple-Choice Knapsack"
