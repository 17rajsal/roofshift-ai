from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.building import Building
from app.models.optimization import OptimizationRun
from app.models.scheduling import EnergyActivity
from app.services.solar.solar_engine import get_effective_shading_loss

def generate_smart_recommendations(project_id: str, db: Session) -> List[Dict[str, Any]]:
    """
    Synthesizes rule-based, deterministic, explainable recommendations
    grounded strictly in physical roof data, optimizer solver outputs, and load balance.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return []

    buildings = db.query(Building).filter(Building.project_id == project_id).all()
    latest_run = db.query(OptimizationRun).filter(
        OptimizationRun.project_id == project_id
    ).order_by(OptimizationRun.created_at.desc()).first()

    activities = db.query(EnergyActivity).filter(EnergyActivity.project_id == project_id).all()

    recommendations = []

    # 1. Installation & Priority Rooftop Recommendation
    if latest_run and latest_run.allocations_json:
        allocations = latest_run.allocations_json
        selected_allocs = [a for a in allocations if a.get("is_selected", False)]
        unselected_allocs = [a for a in allocations if not a.get("is_selected", False)]

        if selected_allocs:
            # Find highest yielding building
            top_b = max(selected_allocs, key=lambda x: x.get("expected_annual_savings_inr", 0))
            recommendations.append({
                "id": "rec-install-1",
                "category": "Installation Priority",
                "priority": "High",
                "target": top_b.get("building_name", "Primary Building"),
                "title": f"Prioritize Phase 1 Installation on {top_b.get('building_name')}",
                "why_it_matters": (
                    f"{top_b.get('building_name')} offers the highest economic return in the portfolio, "
                    f"delivering ₹{top_b.get('expected_annual_savings_inr', 0):,.0f}/year in bill savings "
                    f"with ~{top_b.get('recommended_capacity_kwp', 0):.1f} kWp capacity."
                ),
                "supporting_calculation": (
                    f"Capital cost: ₹{top_b.get('estimated_cost_inr', 0):,.0f} | Payback: ~{top_b.get('payback_years', 4.5)} yrs | "
                    f"Energy: {top_b.get('expected_annual_generation_kwh', 0):,.0f} kWh/yr"
                ),
                "expected_benefit": f"₹{top_b.get('expected_annual_savings_inr', 0):,.0f} annual grid savings",
                "confidence_label": "Modeled Optimization Output",
                "suggested_next_action": "Initiate structural engineering survey and DISCOM net-metering application for this rooftop."
            })

        if unselected_allocs:
            # Highlight reasons for excluded roofs
            excluded_b = unselected_allocs[0]
            recommendations.append({
                "id": "rec-install-2",
                "category": "Phased Planning",
                "priority": "Medium",
                "target": excluded_b.get("building_name", "Excluded Rooftop"),
                "title": f"Defer Installation on {excluded_b.get('building_name')} to Phase 2",
                "why_it_matters": (
                    f"Under the ₹{project.budget:,.0f} budget cap, allocating capital to other campus roofs yields higher "
                    f"collective energy output and shorter capital recovery periods."
                ),
                "supporting_calculation": (
                    f"Shade impact: {excluded_b.get('shade_impact_summary', 'Moderate shading')} | "
                    f"Available unallocated budget: ₹{latest_run.remaining_budget_inr:,.0f}"
                ),
                "expected_benefit": "Preserves capital for highest-ROI rooftops in Phase 1",
                "confidence_label": "Knapsack Constraint Output",
                "suggested_next_action": "Re-evaluate if additional budget becomes available or when panel costs decline."
            })

    # 2. Financial & Budget Recommendations
    if latest_run:
        if latest_run.remaining_budget_inr > 25000:
            recommendations.append({
                "id": "rec-fin-1",
                "category": "Financial Allocation",
                "priority": "Medium",
                "target": "Campus-Wide Budget",
                "title": f"Reallocate Remaining ₹{latest_run.remaining_budget_inr:,.0f} Contingency",
                "why_it_matters": (
                    f"₹{latest_run.remaining_budget_inr:,.0f} remains unallocated due to incremental sizing constraints. "
                    "This buffer can be allocated toward lightning protection, net-metering bi-directional meters, or monitoring."
                ),
                "supporting_calculation": f"Total Budget: ₹{latest_run.budget_inr:,.0f} | Total Allocated: ₹{latest_run.total_allocated_inr:,.0f}",
                "expected_benefit": "Covers BOP (Balance of Plant) and statutory DISCOM inspection fees",
                "confidence_label": "Budget Calculation",
                "suggested_next_action": "Budget the remaining reserve for DISCOM interconnection fees and grid synchronization."
            })

        if latest_run.savings_lift_pct > 0.0:
            recommendations.append({
                "id": "rec-fin-2",
                "category": "Optimization Advantage",
                "priority": "High",
                "target": "Portfolio Investment",
                "title": f"Optimization Strategy Delivers +{latest_run.savings_lift_pct:.1f}% Higher Savings vs Naive Baseline",
                "why_it_matters": (
                    f"By allocating funds based on shade losses and daytime demand matching rather than naive roof-area sorting, "
                    f"the optimized portfolio yields an extra ₹{latest_run.total_annual_savings_inr - latest_run.baseline_savings_inr:,.0f}/year."
                ),
                "supporting_calculation": f"Optimized: ₹{latest_run.total_annual_savings_inr:,.0f}/yr vs Naive Baseline: ₹{latest_run.baseline_savings_inr:,.0f}/yr",
                "expected_benefit": f"+₹{latest_run.total_annual_savings_inr - latest_run.baseline_savings_inr:,.0f} incremental cash flow",
                "confidence_label": "Mathematical Baseline Benchmark",
                "suggested_next_action": "Present comparative baseline to institution finance committee for capex approval."
            })

    # 3. Solar Performance & Shading Recommendations
    high_shade_buildings = [b for b in buildings if get_effective_shading_loss(b.shading_category, b.custom_shading_loss) >= 20.0]
    for b in high_shade_buildings:
        loss = get_effective_shading_loss(b.shading_category, b.custom_shading_loss)
        recommendations.append({
            "id": f"rec-shade-{b.id}",
            "category": "Solar Performance",
            "priority": "Medium",
            "target": b.name,
            "title": f"Mitigate Shading Losses on {b.name}",
            "why_it_matters": (
                f"{b.name} has a {loss:.0f}% shading derating due to parapets, water tanks, or nearby structures. "
                "Conventional string inverters would suffer disproportionate generation collapse."
            ),
            "supporting_calculation": f"Estimated efficiency penalty: ~{loss:.0f}% loss on specific energy yield",
            "expected_benefit": "Prevents hot-spot cell degradation and optimizes localized generation",
            "confidence_label": "User Input Shading Assessment",
            "suggested_next_action": "Evaluate microinverters or DC power optimizers if installing PV modules on this roof."
        })

    # 4. Energy Scheduling Recommendations
    if activities:
        recommendations.append({
            "id": "rec-sched-1",
            "category": "Energy Scheduling",
            "priority": "High",
            "target": "Campus Utilities",
            "title": "Shift Heavy Electrical Activities into 10:00 AM - 03:00 PM Window",
            "why_it_matters": (
                "Running water pumps, EV charging stations, and flexible campus loads during midday directly consumes "
                "solar electricity on-site at full grid displacement value rather than exporting at discounted net-metering rates."
            ),
            "supporting_calculation": f"{len(activities)} activities modeled | Maximizes absorption of midday solar generation peak",
            "expected_benefit": "Avoids grid peak charges and maximizes self-consumption fraction",
            "confidence_label": "Diurnal Load-Solar Model",
            "suggested_next_action": "Adopt timer-based or operational schedules for utility pumps and EV charging infrastructure."
        })

    # 5. Risk & Technical Disclosures
    recommendations.append({
        "id": "rec-risk-1",
        "category": "Technical & Regulatory Risk",
        "priority": "Info",
        "target": "Regulatory & Grid Interconnection",
        "title": "Verify DISCOM Rooftop Solar Capacity Sanctions & Net-Metering Policy",
        "why_it_matters": (
            "Distribution licensees (DISCOMs) typically cap rooftop solar interconnection at 80% to 100% "
            "of the sanctioned contractual maximum demand or distribution transformer capacity."
        ),
        "supporting_calculation": f"Modeled campus solar capacity: ~{latest_run.total_capacity_kwp if latest_run else 50.0:.1f} kWp",
        "expected_benefit": "Ensures statutory compliance and avoids export tripping penalties",
        "confidence_label": "Regulatory Advisory",
        "suggested_next_action": "Check institutional sanction letter with local DISCOM (e.g. BSES/TPDDL in Delhi) for transformer loading limits."
    })

    return recommendations
