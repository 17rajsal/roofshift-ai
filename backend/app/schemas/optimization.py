from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

class OptimizeRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    budget_inr: float = Field(..., gt=0.0, le=1_000_000_000_000_000)
    objective: Literal["MAXIMIZE_SAVINGS", "MAXIMIZE_ONSITE_UTILIZATION", "MAXIMIZE_GENERATION", "MAXIMIZE_SELF_CONSUMPTION"] = "MAXIMIZE_SAVINGS"
    scenario_name: str = Field(default="Base Scenario") # Base Scenario, Conservative Scenario, Optimistic Scenario
    capacity_step_kwp: float = Field(default=0.5, ge=0.1, le=5.0)
    override_cost_per_kwp: Optional[float] = Field(default=None, gt=0, le=1_000_000_000)
    override_tariff_rate: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    override_export_tariff: Optional[float] = Field(default=None, ge=0, le=1_000_000)
    performance_ratio_multiplier: Optional[float] = Field(default=1.0, ge=0, le=4/3)

    @model_validator(mode="after")
    def physical_performance_ratio(self):
        multiplier = self.performance_ratio_multiplier if self.performance_ratio_multiplier is not None else 1
        scenario = self.scenario_name.lower()
        factor = .90 if "conservative" in scenario else 1.05 if "optimistic" in scenario else 1
        if .75 * multiplier * factor > 1:
            raise ValueError("Effective performance ratio cannot exceed one")
        return self

class BuildingAllocationItem(BaseModel):
    building_id: str
    building_name: str
    category: str
    recommended_capacity_kwp: float
    max_capacity_kwp: float
    capacity_utilization_pct: float
    estimated_cost_inr: float
    expected_annual_generation_kwh: float
    expected_annual_savings_inr: float
    expected_onsite_consumed_kwh: float
    expected_exported_kwh: float
    payback_years: Optional[float]
    is_selected: bool
    prioritization_score: float
    decision_reasons: List[str]
    shade_impact_summary: str
    demand_support_summary: str

class BaselineComparison(BaseModel):
    baseline_allocated_inr: float
    baseline_savings_inr: float
    baseline_generation_kwh: float
    baseline_capacity_kwp: float
    baseline_allocations: List[Dict[str, Any]]
    savings_lift_inr: float
    savings_lift_pct: float
    methodology_note: str

class OptimizationRunResponse(BaseModel):
    run_id: str
    project_id: str
    budget_inr: float
    total_allocated_inr: float
    remaining_budget_inr: float
    total_capacity_kwp: float
    total_annual_generation_kwh: float
    total_annual_savings_inr: float
    total_onsite_consumed_kwh: float
    total_exported_kwh: float
    overall_payback_years: Optional[float]
    avoided_co2_kg_annual: float
    objective: str
    scenario_name: str
    allocations: List[BuildingAllocationItem]
    baseline_comparison: BaselineComparison
    solver_method: str
    created_at: datetime
