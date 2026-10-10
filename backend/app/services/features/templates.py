"""User-editable starting inputs. Telemetry is never fabricated from planning data."""
import calendar
from datetime import datetime, timezone, timedelta
from app.models.building import Building
from app.models.optimization import OptimizationRun


def project_feature_templates(project, db):
    buildings = db.query(Building).filter(Building.project_id == project.id).all()
    analyses = [building.solar_analysis for building in buildings if building.solar_analysis]
    latest = db.query(OptimizationRun).filter(OptimizationRun.project_id == project.id).order_by(OptimizationRun.created_at.desc()).first()
    generation = latest.total_annual_generation_kwh if latest else sum(item.annual_generation_kwh for item in analyses)
    onsite = latest.total_onsite_consumed_kwh if latest else sum(item.annual_onsite_consumed_kwh for item in analyses)
    cost = latest.total_allocated_inr if latest else sum(item.installation_cost_inr for item in analyses)
    capacity = latest.total_capacity_kwp if latest else sum(item.max_pv_capacity_kwp for item in analyses)
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    basis = "Latest saved budget allocation" if latest else "Saved full-roof solar potential; not an installed system"
    candidates = []
    for building in buildings:
        analysis = building.solar_analysis
        if analysis:
            candidates.append(dict(site_id=building.id, name=building.name, latitude=building.latitude,
                                   longitude=building.longitude, roof_area_sqm=building.gross_roof_area,
                                   usable_roof_fraction=building.usable_roof_percentage / 100,
                                   shading_loss_pct=analysis.effective_shading_loss_pct,
                                   ghi_kwh_m2_day=analysis.ghi_annual_avg_kwh_m2_day,
                                   irradiance_source=analysis.irradiance_source, data_basis="climatology"))
    first = analyses[0] if analyses else None
    ghi = first.ghi_annual_avg_kwh_m2_day if first else None
    source = f"{first.irradiance_source}; annual-average GHI used uniformly across months" if first else "Enter location-specific irradiance source"
    return {"project_id": project.id, "features": [
        {"key": "solar-location-finder", "title": "Solar Location Finder", "notice": "Ranks supplied rooftop candidates by screening generation. It does not discover unsurveyed roofs or certify installability.",
         "request": {"candidates": candidates, "reference_latitude": project.latitude, "reference_longitude": project.longitude, "area_sqm_per_kwp": 8.0, "performance_ratio": 0.75}},
        {"key": "solar-prediction", "title": "Solar Prediction", "notice": f"{basis}. Replace the flat monthly irradiance assumption with actual monthly data. Sensitivity ranges are assumptions, not a weather forecast.",
         "request": {"year": now.year, "capacity_kwp": capacity, "monthly_irradiance": [{"month": month, "ghi_kwh_m2_day": ghi, "mean_cell_temperature_c": 25} for month in range(1, 13)], "irradiance_source": source, "data_basis": "user_assumption", "performance_ratio": 0.75, "shading_loss_pct": 0, "uncertainty_fraction": 0.15}},
        {"key": "panel-fault-detection", "title": "Panel Fault Detection", "notice": "Enter measured panel observations and comparable expected energy. Empty readings remain unknown. This checks telemetry symptoms; no image classifier is connected.",
         "request": {"readings": [{"panel_id": "Panel 1", "expected_energy_kwh": None, "actual_energy_kwh": None, "irradiance_w_m2": None, "voltage_v": None, "expected_voltage_v": None, "temperature_c": None, "sensor_status": "unknown"}]}},
        {"key": "performance-monitoring", "title": "Performance Monitoring", "notice": "Enter observed intervals and energy. There is no live meter connection. Missing readings remain unknown and coverage is reported.",
         "request": {"intervals": [{"panel_id": "Panel 1", "start_at": (now - timedelta(hours=1)).isoformat(), "end_at": now.isoformat(), "actual_energy_kwh": None, "expected_energy_kwh": None, "operating_status": "unknown"}]}},
        {"key": "demand-analysis", "title": "Electricity Demand Analysis", "notice": "Enter non-overlapping meter intervals. Interval-average power in kW is integrated over the exact duration; blank power must be filled before calculation.",
         "request": {"intervals": [{"start": (now - timedelta(hours=1)).isoformat(), "end": now.isoformat(), "average_power_kw": None}], "source": "User supplied meter intervals", "base_tariff_inr_per_kwh": project.tariff_rate, "tariff_utc_offset_minutes": 330}},
        {"key": "cost-savings", "title": "Cost & Savings Calculator", "notice": f"{basis}. Confirm capex, O&M, subsidy and tariff assumptions; this is an unlevered cash-flow scenario.",
         "request": {"installation_cost_inr": cost, "upfront_subsidy_inr": 0, "first_year_generation_kwh": generation, "onsite_consumption_fraction": min(1, onsite / generation) if generation else 0, "import_tariff_inr_per_kwh": project.tariff_rate, "export_tariff_inr_per_kwh": project.export_tariff, "annual_maintenance_inr": 0, "lifetime_years": 25, "annual_degradation_fraction": 0.005, "tariff_escalation_fraction": 0, "maintenance_escalation_fraction": 0, "discount_rate_fraction": 0.08, "assumptions_source": basis + "; project tariffs; user must supply actual O&M/subsidy"}},
        {"key": "environmental-impact", "title": "Environmental Impact Calculator", "notice": "The emission factor is a project assumption. Enter embodied emissions for a lifecycle comparison. Export displacement is an explicit simplifying assumption.",
         "request": {"first_year_generation_kwh": generation, "displaced_emissions_kg_co2e_per_kwh": project.co2_factor, "emissions_factor_source": "User-supplied project grid displacement factor", "lifetime_years": 25, "annual_degradation_fraction": 0.005, "embodied_emissions_kg_co2e": 0}},
        {"key": "maintenance-recommendations", "title": "Maintenance Recommendations", "notice": "Confirm the review date, manufacturer service intervals and known records. Missing service dates prompt record collection, not an invented overdue service.",
         "request": {"as_of_date": now.date().isoformat(), "panels": [{"panel_id": "Panel 1", "last_cleaned_at": None, "last_inspected_at": None, "soiling_loss_pct": None, "inverter_status": "unknown"}], "cleaning_interval_days": 90, "inspection_interval_days": 365, "soiling_loss_threshold_pct": 5}},
    ]}
