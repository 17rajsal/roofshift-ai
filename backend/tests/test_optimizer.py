import pytest
from app.services.optimization.budget_solver import solve_multiple_choice_knapsack

def test_knapsack_respects_budget_constraint():
    # 3 buildings, multiple discrete options each
    building_options = [
        [
            {"building_id": "b1", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b1", "capacity_kwp": 5.0, "cost_inr": 250000.0, "savings_inr": 50000.0, "onsite_kwh": 6000.0, "annual_gen_kwh": 7000.0},
            {"building_id": "b1", "capacity_kwp": 10.0, "cost_inr": 500000.0, "savings_inr": 95000.0, "onsite_kwh": 11000.0, "annual_gen_kwh": 14000.0},
        ],
        [
            {"building_id": "b2", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b2", "capacity_kwp": 5.0, "cost_inr": 250000.0, "savings_inr": 55000.0, "onsite_kwh": 6500.0, "annual_gen_kwh": 7200.0},
            {"building_id": "b2", "capacity_kwp": 10.0, "cost_inr": 500000.0, "savings_inr": 102000.0, "onsite_kwh": 12000.0, "annual_gen_kwh": 14400.0},
        ],
        [
            {"building_id": "b3", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b3", "capacity_kwp": 8.0, "cost_inr": 400000.0, "savings_inr": 60000.0, "onsite_kwh": 7000.0, "annual_gen_kwh": 9000.0},
        ]
    ]

    budget = 600000.0 # 6 Lakhs
    chosen, val = solve_multiple_choice_knapsack(building_options, budget, "MAXIMIZE_SAVINGS")

    total_cost = sum(c["cost_inr"] for c in chosen)
    assert total_cost <= budget, f"Knapsack violated budget: {total_cost} > {budget}"
    assert len(chosen) <= 3
    # Solved optimally: b2 (10 kWp @ 500k = 102k savings) or (b1 5kW + b2 5kW @ 500k = 105k savings!)
    assert val >= 100000.0

def test_knapsack_zero_budget():
    building_options = [
        [
            {"building_id": "b1", "capacity_kwp": 0.0, "cost_inr": 0.0, "savings_inr": 0.0, "onsite_kwh": 0.0, "annual_gen_kwh": 0.0},
            {"building_id": "b1", "capacity_kwp": 5.0, "cost_inr": 250000.0, "savings_inr": 50000.0, "onsite_kwh": 6000.0, "annual_gen_kwh": 7000.0},
        ]
    ]
    chosen, val = solve_multiple_choice_knapsack(building_options, 10000.0, "MAXIMIZE_SAVINGS")
    total_cost = sum(c["cost_inr"] for c in chosen)
    assert total_cost == 0.0
    assert val == 0.0
