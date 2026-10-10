import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.building import Building
from app.models.solar import SolarAnalysis
from app.models.optimization import OptimizationRun
from app.schemas.optimization import (
    OptimizeRequest, BuildingAllocationItem, OptimizationRunResponse, BaselineComparison
)
from app.services.solar.nasa_power import fetch_solar_irradiance
from app.services.solar.solar_engine import (
    calculate_building_solar_potential, get_effective_shading_loss
)
from app.services.optimization.budget_solver import (
    evaluate_capacity_option, solve_multiple_choice_knapsack, generate_decision_explanations
)
from app.services.optimization.baseline_solver import run_baseline_first_feasible
from app.core.config import settings

logger = logging.getLogger(__name__)

async def run_project_optimization(
    project_id: str,
    request: OptimizeRequest,
    db: Session
) -> OptimizationRunResponse:
    """
    Executes the complete optimization pipeline:
    1. Pre-computes solar potential for all project buildings if not already present.
    2. Builds discrete capacity candidate options per building.
    3. Solves the Multiple-Choice Knapsack problem mathematically.
    4. Evaluates a fair greedy baseline under identical conditions.
    5. Formulates transparent explainability rationales.
    6. Persists and returns the optimization results.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project with ID '{project_id}' not found.")

    buildings = db.query(Building).filter(Building.project_id == project_id).all()
    if not buildings:
        raise ValueError("Project has no candidate buildings registered.")

    budget = request.budget_inr
    objective = request.objective or "MAXIMIZE_SAVINGS"
    step_kwp = max(0.2, min(5.0, request.capacity_step_kwp or 0.5))

    # Scenario parameters
    scenario = request.scenario_name or "Base Scenario"
    scenario_lower = scenario.lower()

    # Scenario multiplier adjustments
    pr_multiplier = request.performance_ratio_multiplier or 1.0
    cost_override = request.override_cost_per_kwp
    tariff_override = request.override_tariff_rate
    export_override = request.override_export_tariff

    if "conservative" in scenario_lower:
        pr_multiplier *= 0.90 # 10% lower solar efficiency
        cost_multiplier = 1.10 # 10% higher CAPEX
    elif "optimistic" in scenario_lower:
        pr_multiplier *= 1.05 # 5% higher solar efficiency
        cost_multiplier = 0.92 # 8% lower equipment cost
    else:
        cost_multiplier = 1.0

    # Ensure all buildings have solar analysis
    for b in buildings:
        if not b.solar_analysis:
            await calculate_building_solar_potential(b, project, db)

    # 2. Build candidate options for each building
    building_options_list = []
    building_options_map = {}
    building_meta = {}

    for b in buildings:
        usable_area = b.gross_roof_area * (b.usable_roof_percentage / 100.0)
        max_cap = round(usable_area / settings.DEFAULT_AREA_PER_KWP, 2)
        if b.max_eligible_kwp and b.max_eligible_kwp > 0:
            max_cap = min(max_cap, b.max_eligible_kwp)

        # Solar irradiance
        monthly_ghi_dict, _, _, _ = await fetch_solar_irradiance(b.latitude, b.longitude, db)

        shading_loss = get_effective_shading_loss(b.shading_category, b.custom_shading_loss)
        shading_factor = max(0.0, 1.0 - (shading_loss / 100.0))

        cost_per_kwp = cost_override if cost_override else (b.cost_per_kwp * cost_multiplier)
        tariff = tariff_override if tariff_override else (b.tariff_inr if b.tariff_inr else project.tariff_rate)
        export_tariff = export_override if export_override else project.export_tariff
        pr = settings.DEFAULT_PERFORMANCE_RATIO * pr_multiplier

        options = []
        # Option 0: 0 kWp
        options.append({
            "building_id": b.id,
            "capacity_kwp": 0.0,
            "cost_inr": 0.0,
            "annual_gen_kwh": 0.0,
            "onsite_kwh": 0.0,
            "export_kwh": 0.0,
            "savings_inr": 0.0,
        })

        curr_c = step_kwp
        while curr_c <= (max_cap + 0.01):
            eval_res = evaluate_capacity_option(
                capacity_kwp=curr_c,
                building=b,
                project=project,
                monthly_ghi=monthly_ghi_dict,
                shading_factor=shading_factor,
                pr=pr,
                tariff=tariff,
                export_tariff=export_tariff,
                cost_per_kwp=cost_per_kwp
            )
            eval_res["building_id"] = b.id
            options.append(eval_res)
            curr_c += step_kwp

        building_options_list.append(options)
        building_options_map[b.id] = options
        building_meta[b.id] = {
            "building": b,
            "max_cap": max_cap,
            "tariff": tariff,
            "cost_per_kwp": cost_per_kwp
        }

    # 3. Solve Multiple-Choice Knapsack
    chosen_solution, best_val = solve_multiple_choice_knapsack(
        building_options_list, budget, objective
    )

    chosen_by_building = {c["building_id"]: c for c in chosen_solution}

    # 4. Run Baseline Comparison
    (
        baseline_allocations,
        baseline_cost,
        baseline_savings,
        baseline_gen,
        baseline_cap
    ) = run_baseline_first_feasible(
        buildings, project, budget, building_options_map, objective
    )

    # 5. Build allocations, explainability & summaries
    total_allocated = sum(c["cost_inr"] for c in chosen_solution)
    remaining_budget = max(0.0, budget - total_allocated)
    total_capacity = sum(c["capacity_kwp"] for c in chosen_solution)
    total_generation = sum(c["annual_gen_kwh"] for c in chosen_solution)
    total_savings = sum(c["savings_inr"] for c in chosen_solution)
    total_onsite = sum(c["onsite_kwh"] for c in chosen_solution)
    total_export = sum(c["export_kwh"] for c in chosen_solution)
    overall_payback = round(total_allocated / total_savings, 2) if total_savings > 10.0 else None
    co2_factor = project.co2_factor if project.co2_factor > 0 else 0.716
    avoided_co2 = round(total_generation * co2_factor, 1)

    allocations_items: List[BuildingAllocationItem] = []
    explanations_dict = {}

    for b in buildings:
        meta = building_meta[b.id]
        opt = chosen_by_building.get(b.id, options[0])
        cap = opt["capacity_kwp"]
        max_cap = meta["max_cap"]
        is_sel = cap > 0.05
        cost = opt["cost_inr"]
        savings = opt["savings_inr"]
        payback = round(cost / savings, 2) if savings > 10.0 and cost > 0.0 else None

        reasons, shade_summary, demand_summary = generate_decision_explanations(
            building=b,
            opt=opt,
            max_cap=max_cap,
            objective=objective,
            budget=budget,
            total_cost=total_allocated,
            savings_roi_pct=(savings / max(1.0, cost)) * 100.0 if cost > 0 else 0.0
        )
        explanations_dict[b.id] = {
            "reasons": reasons,
            "shade_summary": shade_summary,
            "demand_summary": demand_summary
        }

        allocations_items.append(BuildingAllocationItem(
            building_id=b.id,
            building_name=b.name,
            category=b.category,
            recommended_capacity_kwp=cap,
            max_capacity_kwp=max_cap,
            capacity_utilization_pct=round((cap / max(0.1, max_cap)) * 100.0, 1),
            estimated_cost_inr=cost,
            expected_annual_generation_kwh=opt["annual_gen_kwh"],
            expected_annual_savings_inr=savings,
            expected_onsite_consumed_kwh=opt["onsite_kwh"],
            expected_exported_kwh=opt["export_kwh"],
            payback_years=payback,
            is_selected=is_sel,
            prioritization_score=round((savings / max(1.0, cost)) * 100.0, 2) if cost > 0 else 0.0,
            decision_reasons=reasons,
            shade_impact_summary=shade_summary,
            demand_support_summary=demand_summary
        ))

    # Baseline comparison metrics
    savings_lift_inr = round(total_savings - baseline_savings, 2)
    savings_lift_pct = round((savings_lift_inr / max(1.0, baseline_savings)) * 100.0, 1)

    baseline_comp = BaselineComparison(
        baseline_allocated_inr=baseline_cost,
        baseline_savings_inr=baseline_savings,
        baseline_generation_kwh=baseline_gen,
        baseline_capacity_kwp=baseline_cap,
        baseline_allocations=baseline_allocations,
        savings_lift_inr=savings_lift_inr,
        savings_lift_pct=savings_lift_pct,
        methodology_note=(
            "Baseline plan allocates capital using a standard naive greedy strategy (largest roof area first "
            "up to budget). The optimized plan evaluates multi-choice knapsack combinations considering shading, "
            "demand coincidence, and tariff value."
        )
    )

    # 6. Persist to DB
    run_record = OptimizationRun(
        project_id=project.id,
        budget_inr=budget,
        objective=objective,
        scenario_name=scenario,
        total_allocated_inr=round(total_allocated, 2),
        remaining_budget_inr=round(remaining_budget, 2),
        total_capacity_kwp=round(total_capacity, 2),
        total_annual_generation_kwh=round(total_generation, 1),
        total_annual_savings_inr=round(total_savings, 2),
        total_onsite_consumed_kwh=round(total_onsite, 1),
        total_exported_kwh=round(total_export, 1),
        overall_payback_years=overall_payback,
        avoided_co2_kg_annual=avoided_co2,
        baseline_allocated_inr=baseline_cost,
        baseline_savings_inr=baseline_savings,
        baseline_capacity_kwp=baseline_cap,
        baseline_generation_kwh=baseline_gen,
        savings_lift_pct=savings_lift_pct,
        allocations_json=[item.model_dump() for item in allocations_items],
        baseline_allocations_json=baseline_allocations,
        explanations_json=explanations_dict
    )
    db.add(run_record)
    db.commit()
    db.refresh(run_record)

    return OptimizationRunResponse(
        run_id=run_record.id,
        project_id=project.id,
        budget_inr=budget,
        total_allocated_inr=round(total_allocated, 2),
        remaining_budget_inr=round(remaining_budget, 2),
        total_capacity_kwp=round(total_capacity, 2),
        total_annual_generation_kwh=round(total_generation, 1),
        total_annual_savings_inr=round(total_savings, 2),
        total_onsite_consumed_kwh=round(total_onsite, 1),
        total_exported_kwh=round(total_export, 1),
        overall_payback_years=overall_payback,
        avoided_co2_kg_annual=avoided_co2,
        objective=objective,
        scenario_name=scenario,
        allocations=allocations_items,
        baseline_comparison=baseline_comp,
        solver_method="Multiple-Choice Knapsack Dynamic Programming (Exact Global Optimum)",
        created_at=run_record.created_at
    )
