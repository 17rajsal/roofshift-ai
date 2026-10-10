from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.project import Project
from app.models.optimization import OptimizationRun
from app.schemas.optimization import OptimizeRequest, OptimizationRunResponse
from app.services.optimization.optimizer_service import run_project_optimization

router = APIRouter()

@router.post("/projects/{project_id}/optimize", response_model=OptimizationRunResponse)
async def optimize_project_budget(
    project_id: str,
    request: OptimizeRequest,
    db: Session = Depends(get_db)
):
    try:
        return await run_project_optimization(project_id, request, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization solver error: {str(e)}")

@router.get("/projects/{project_id}/optimizations", response_model=List[OptimizationRunResponse])
def list_optimization_runs(project_id: str, db: Session = Depends(get_db)):
    runs = db.query(OptimizationRun).filter(
        OptimizationRun.project_id == project_id
    ).order_by(OptimizationRun.created_at.desc()).all()

    results = []
    for r in runs:
        results.append(OptimizationRunResponse(
            run_id=r.id,
            project_id=r.project_id,
            budget_inr=r.budget_inr,
            total_allocated_inr=r.total_allocated_inr,
            remaining_budget_inr=r.remaining_budget_inr,
            total_capacity_kwp=r.total_capacity_kwp,
            total_annual_generation_kwh=r.total_annual_generation_kwh,
            total_annual_savings_inr=r.total_annual_savings_inr,
            total_onsite_consumed_kwh=r.total_onsite_consumed_kwh,
            total_exported_kwh=r.total_exported_kwh,
            overall_payback_years=r.overall_payback_years,
            avoided_co2_kg_annual=r.avoided_co2_kg_annual,
            objective=r.objective,
            scenario_name=r.scenario_name,
            allocations=r.allocations_json or [],
            baseline_comparison={
                "baseline_allocated_inr": r.baseline_allocated_inr,
                "baseline_savings_inr": r.baseline_savings_inr,
                "baseline_generation_kwh": r.baseline_generation_kwh,
                "baseline_capacity_kwp": r.baseline_capacity_kwp,
                "baseline_allocations": r.baseline_allocations_json or [],
                "savings_lift_inr": round(r.total_annual_savings_inr - r.baseline_savings_inr, 2),
                "savings_lift_pct": r.savings_lift_pct,
                "methodology_note": "Evaluated against first-fit greedy allocation under identical constraints."
            },
            solver_method="Recorded optimization; recompute to apply the current exact discrete solver",
            created_at=r.created_at
        ))
    return results
