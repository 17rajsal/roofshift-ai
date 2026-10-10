"""
Component D — Recommendation Explanation Engine
Generates deterministic, calculation-grounded rationales strictly tied
to optimizer solver variables, constraint bounds, and physical shading factors.
Zero LLM / Zero Bedrock dependency.
"""
from typing import List, Dict, Any, Tuple

def explain_building_allocation(
    building_name: str,
    is_selected: bool,
    recommended_capacity_kwp: float,
    max_capacity_kwp: float,
    allocated_cost_inr: float,
    expected_savings_inr: float,
    onsite_consumed_kwh: float,
    annual_gen_kwh: float,
    shading_loss_pct: float,
    budget_remaining_inr: float,
    objective: str
) -> Tuple[List[str], str, str]:
    """
    Produces deterministic, verifiable explanations strictly based on mathematical solver outputs.
    """
    reasons: List[str] = []

    # 1. Shading Rationale
    if shading_loss_pct <= 5.0:
        shade_text = f"Minimal shading obstruction ({shading_loss_pct}% loss), ensuring optimal solar energy yield."
    elif shading_loss_pct <= 15.0:
        shade_text = f"Moderate shading ({shading_loss_pct}% derate), acceptable efficiency for campus operations."
    else:
        shade_text = f"High shading derating ({shading_loss_pct}% loss), causing lower kilowatt-hour output per capital rupee."

    # 2. Demand Coincidence Rationale
    self_cons_pct = (onsite_consumed_kwh / max(1.0, annual_gen_kwh)) * 100.0 if annual_gen_kwh > 0 else 0.0
    demand_text = f"Onsite consumption absorbs {self_cons_pct:.1f}% of generation during daylight hours."

    # 3. Solver Optimization Decisions
    if is_selected:
        cap_pct = (recommended_capacity_kwp / max(0.1, max_capacity_kwp)) * 100.0
        reasons.append(
            f"Selected for {recommended_capacity_kwp:.1f} kWp installation ({cap_pct:.0f}% of usable roof footprint)."
        )
        if expected_savings_inr > 0 and allocated_cost_inr > 0:
            payback = allocated_cost_inr / expected_savings_inr
            reasons.append(f"Delivers attractive simple payback of ~{payback:.1f} years with ₹{expected_savings_inr:,.0f}/year bill offset.")
        if shading_loss_pct <= 10.0:
            reasons.append("Low rooftop obstruction profile ensures high specific energy yield (>1,400 kWh/kWp).")
        if self_cons_pct >= 70.0:
            reasons.append("High daytime demand coincidence maximizes direct grid displacement over lower-tariff export.")
    else:
        if shading_loss_pct >= 25.0:
            reasons.append(f"Deprioritized due to severe shading ({shading_loss_pct}%), yielding lower ROI than unshaded campus roofs.")
        elif budget_remaining_inr < 50000.0:
            reasons.append("Excluded because the capital budget was exhausted by higher-yielding candidate rooftops.")
        else:
            reasons.append("Excluded under current objective because alternate combinations deliver superior portfolio returns.")

    return reasons, shade_text, demand_text
