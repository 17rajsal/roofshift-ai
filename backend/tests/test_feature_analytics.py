"""Independent hand-calculated analytical feature regression and edge cases."""

import math
from datetime import datetime, timedelta, tzinfo

import pytest
from pydantic import ValidationError

from app.schemas.feature_analytics import (
    DemandAnalysisRequest, DemandInterval, DemandTariffPeriod,
    EnvironmentalImpactRequest, FinancialScenarioRequest, SolarLocationRequest,
    SolarPredictionRequest,
)
from app.services.features.analytics import (
    analyze_demand, calculate_environmental_impact, calculate_financial_scenario,
    find_solar_locations, predict_solar,
)


def site(site_id="a", **overrides):
    values = dict(site_id=site_id, name="Library", latitude=0, longitude=0,
                  roof_area_sqm=100, usable_roof_fraction=0.7,
                  shading_loss_pct=0, ghi_kwh_m2_day=5,
                  irradiance_source="Supplied metered irradiation", data_basis="measured")
    return {**values, **overrides}


def prediction(**overrides):
    values = dict(year=2024, capacity_kwp=10,
                  monthly_irradiance=[dict(month=month, ghi_kwh_m2_day=5) for month in range(1, 13)],
                  irradiance_source="Supplied monthly climate normals", data_basis="climatology")
    return SolarPredictionRequest(**{**values, **overrides})


def interval(start, end, **values):
    return dict(start=f"2026-10-05T{start}:00:00Z", end=f"2026-10-05T{end}:00:00Z", **values)


def finance(**overrides):
    values = dict(installation_cost_inr=100, first_year_generation_kwh=60,
                  onsite_consumption_fraction=1, import_tariff_inr_per_kwh=1,
                  lifetime_years=2, annual_degradation_fraction=0,
                  discount_rate_fraction=0, assumptions_source="User supplied test scenario")
    return FinancialScenarioRequest(**{**values, **overrides})


def test_location_rank_yield_constraints_and_provenance():
    result = find_solar_locations(SolarLocationRequest(
        candidates=[site("b"), site("a", shading_loss_pct=20), site("excluded", roof_area_sqm=10)],
        minimum_usable_area_sqm=50,
    ))
    assert [item.site_id for item in result.ranked_sites] == ["b", "a"]
    assert result.ranked_sites[0].screening_capacity_kwp == pytest.approx(10)
    assert result.ranked_sites[0].annual_generation_kwh == pytest.approx(14600)
    assert result.ranked_sites[1].annual_generation_kwh == pytest.approx(11680)
    assert result.ranked_sites[1].score_pct == pytest.approx(80)
    assert result.ranked_sites[0].irradiance_source == "Supplied metered irradiation"
    assert result.eligible_sites_count == 2
    assert result.excluded_sites[0].site_id == "excluded"


def test_location_radius_date_line_and_stable_ties():
    result = find_solar_locations(SolarLocationRequest(
        candidates=[site("near_b", longitude=-179.9), site("far", longitude=0), site("near_a", longitude=-179.9)],
        reference_latitude=0, reference_longitude=179.9, maximum_distance_km=30,
        max_results=1,
    ))
    assert result.eligible_sites_count == 2
    assert result.ranked_sites[0].site_id == "near_a"
    assert result.ranked_sites[0].distance_km == pytest.approx(22.239, abs=0.001)
    assert result.excluded_sites[0].site_id == "far"


def test_location_zero_output_and_no_eligible_are_serializable():
    zero = find_solar_locations(SolarLocationRequest(candidates=[site(ghi_kwh_m2_day=0)]))
    assert zero.ranked_sites[0].score_pct == 0
    none = find_solar_locations(SolarLocationRequest(candidates=[site(usable_roof_fraction=0)]))
    assert none.eligible_sites_count == 0
    assert none.ranked_sites == []
    assert none.model_dump_json()


@pytest.mark.parametrize("overrides", [
    dict(candidates=[site(), site()]), dict(reference_latitude=10), dict(maximum_distance_km=20),
])
def test_location_invalid_cross_fields(overrides):
    with pytest.raises(ValidationError):
        SolarLocationRequest(**{**dict(candidates=[site()]), **overrides})


def test_prediction_leap_year_physics_month_sum_and_bounds():
    result = predict_solar(prediction(uncertainty_fraction=0.2))
    assert result.annual_generation_kwh == pytest.approx(10 * 5 * 366 * 0.8)
    assert result.monthly_predictions[1].days == 29
    assert result.annual_generation_kwh == pytest.approx(sum(item.generation_kwh for item in result.monthly_predictions))
    assert result.annual_lower_generation_kwh == pytest.approx(result.annual_generation_kwh * 0.8)
    assert result.annual_upper_generation_kwh == pytest.approx(result.annual_generation_kwh * 1.2)
    assert result.range_basis == "assumption_based_sensitivity_range"


def test_prediction_temperature_shading_age_and_zero_capacity():
    monthly = [dict(month=month, ghi_kwh_m2_day=5, mean_cell_temperature_c=50) for month in range(1, 13)]
    result = predict_solar(prediction(year=2023, monthly_irradiance=monthly, shading_loss_pct=10,
                                     age_years=2, annual_degradation_fraction=0.01))
    assert result.annual_generation_kwh == pytest.approx(10 * 5 * 365 * 0.8 * 0.9 * 0.9 * 0.99 ** 2)
    zero = predict_solar(prediction(capacity_kwp=0))
    assert zero.annual_generation_kwh == 0
    assert zero.specific_yield_kwh_per_kwp == 0


def test_prediction_extreme_temperature_clips_at_zero():
    monthly = [dict(month=month, ghi_kwh_m2_day=5, mean_cell_temperature_c=120) for month in range(1, 13)]
    result = predict_solar(prediction(monthly_irradiance=monthly, temperature_coefficient_per_c=-0.02))
    assert result.annual_generation_kwh == 0
    assert all(item.temperature_multiplier == 0 for item in result.monthly_predictions)


@pytest.mark.parametrize("monthly", [
    [dict(month=1, ghi_kwh_m2_day=5)] * 12,
    [dict(month=month, ghi_kwh_m2_day=5) for month in range(1, 12)],
])
def test_prediction_requires_complete_unique_months(monthly):
    with pytest.raises(ValidationError):
        prediction(monthly_irradiance=monthly)


def test_irregular_demand_energy_power_load_factor_and_gap():
    result = analyze_demand(DemandAnalysisRequest(
        intervals=[dict(start="2026-10-05T03:00:00Z", end="2026-10-05T03:30:00Z", energy_kwh=2),
                   interval("00", "02", average_power_kw=2)],
        source="Measured interval file", base_tariff_inr_per_kwh=3,
    ))
    # 2 kW for 2 h, plus 2 kWh over 0.5 h = 6 kWh, peak 4 kW.
    assert result.total_energy_kwh == pytest.approx(6)
    assert result.observed_hours == pytest.approx(2.5)
    assert result.elapsed_hours == pytest.approx(3.5)
    assert result.coverage_fraction == pytest.approx(5 / 7)
    assert result.mean_observed_power_kw == pytest.approx(2.4)
    assert result.peak_interval_average_kw == pytest.approx(4)
    assert result.load_factor == pytest.approx(0.6)
    assert result.estimated_energy_cost_inr == pytest.approx(18)


def test_tariff_crossing_uses_supplied_fixed_offset():
    # 08:30Z-10:30Z is 14:00-16:00 at UTC+05:30. One hour has peak tariff.
    result = analyze_demand(DemandAnalysisRequest(
        intervals=[dict(start="2026-10-05T08:30:00Z", end="2026-10-05T10:30:00Z", energy_kwh=8)],
        source="Measured interval file", base_tariff_inr_per_kwh=2, tariff_utc_offset_minutes=330,
        tariff_periods=[dict(period_id="peak", weekdays=[0], start_hour=15, end_hour=17, rate_inr_per_kwh=5)],
    ))
    parts = {part.period_id: part for part in result.tariff_breakdown}
    assert parts["default"].energy_kwh == pytest.approx(4)
    assert parts["peak"].energy_kwh == pytest.approx(4)
    assert result.estimated_energy_cost_inr == pytest.approx(28)
    assert sum(part.energy_kwh for part in result.tariff_breakdown) == pytest.approx(result.total_energy_kwh)


def test_tariff_weekday_midnight_crossing_and_energy_conservation():
    result = analyze_demand(DemandAnalysisRequest(
        intervals=[dict(start="2026-10-05T23:30:00Z", end="2026-10-06T01:30:00Z", average_power_kw=3)],
        source="Measured interval file", base_tariff_inr_per_kwh=1,
        tariff_periods=[dict(period_id="monday", weekdays=[0], start_hour=23, end_hour=24, rate_inr_per_kwh=2),
                        dict(period_id="tuesday", weekdays=[1], start_hour=0, end_hour=1, rate_inr_per_kwh=4)],
    ))
    parts = {part.period_id: part for part in result.tariff_breakdown}
    assert parts["monday"].energy_kwh == pytest.approx(1.5)
    assert parts["tuesday"].energy_kwh == pytest.approx(3)
    assert parts["default"].energy_kwh == pytest.approx(1.5)
    assert result.estimated_energy_cost_inr == pytest.approx(16.5)
    assert sum(part.observed_hours for part in result.tariff_breakdown) == pytest.approx(2)


def test_zero_demand_has_zero_load_factor():
    result = analyze_demand(DemandAnalysisRequest(intervals=[interval("00", "01", energy_kwh=0)], source="Meter data"))
    assert result.total_energy_kwh == result.load_factor == result.peak_interval_average_kw == 0


def test_direct_python_same_timezone_fallback_uses_real_elapsed_time():
    # A same-tzinfo subtraction uses wall-clock hours without UTC normalization.
    # This supplied fallback clock changes offset from -04:00 to -05:00 at 02:00.
    class FallbackClock(tzinfo):
        def utcoffset(self, value):
            return timedelta(hours=-4 if value.hour < 2 else -5)

        def dst(self, value):
            return timedelta(0)

    clock = FallbackClock()
    start, end = datetime(2026, 11, 1, 0, tzinfo=clock), datetime(2026, 11, 1, 3, tzinfo=clock)
    assert (end - start).total_seconds() / 3600 == 3
    result = analyze_demand(DemandAnalysisRequest(
        intervals=[dict(start=start, end=end, average_power_kw=2)], source="DST meter interval",
    ))
    assert result.observed_hours == 4
    assert result.total_energy_kwh == 8


@pytest.mark.parametrize("record", [
    interval("00", "01"), interval("00", "01", energy_kwh=1, average_power_kw=1),
    interval("02", "01", energy_kwh=1), interval("01", "01", energy_kwh=1),
    dict(start="2026-10-05T00:00:00", end="2026-10-05T01:00:00", energy_kwh=1),
    dict(start="2026-10-05T00:00:00Z", end="2026-10-13T00:00:00Z", energy_kwh=1),
    dict(start=1791158400, end=1791162000, energy_kwh=1),
])
def test_demand_invalid_interval_rejected(record):
    with pytest.raises(ValidationError):
        DemandInterval(**record)


def test_demand_overlap_rejected_even_with_different_offsets():
    with pytest.raises(ValidationError, match="must not overlap"):
        DemandAnalysisRequest(intervals=[interval("00", "02", energy_kwh=1),
                                        dict(start="2026-10-05T06:30:00+05:30", end="2026-10-05T08:30:00+05:30", energy_kwh=1)],
                              source="Meter data")


def test_demand_history_bound_and_timezone_edge_dates_rejected():
    with pytest.raises(ValidationError, match="at most 366 days"):
        DemandAnalysisRequest(intervals=[interval("00", "01", energy_kwh=1),
                                        dict(start="2028-10-05T00:00:00Z", end="2028-10-05T01:00:00Z", energy_kwh=1)],
                              source="Meter data")
    with pytest.raises(ValidationError, match="years"):
        DemandInterval(start="0001-01-01T00:00:00+14:00", end="0001-01-01T01:00:00+14:00", energy_kwh=1)


def test_overlapping_tariffs_and_reserved_default_are_rejected():
    with pytest.raises(ValidationError, match="must not overlap"):
        DemandAnalysisRequest(intervals=[interval("00", "01", energy_kwh=1)], source="Meter data",
                              tariff_periods=[dict(period_id="one", weekdays=[0], start_hour=1, end_hour=5, rate_inr_per_kwh=1),
                                              dict(period_id="two", weekdays=[0], start_hour=4, end_hour=6, rate_inr_per_kwh=1)])
    with pytest.raises(ValidationError):
        DemandTariffPeriod(period_id="default", weekdays=[0], start_hour=0, end_hour=1, rate_inr_per_kwh=1)


def test_finance_hand_calculated_npv_irr_and_interpolated_payback():
    result = calculate_financial_scenario(finance(discount_rate_fraction=0.1))
    assert result.net_present_value_inr == pytest.approx(-100 + 60 / 1.1 + 60 / 1.1 ** 2)
    # 100(1+r)^2 - 60(1+r) - 60 = 0.
    expected_irr = ((60 + math.sqrt(60 ** 2 + 4 * 100 * 60)) / 200 - 1) * 100
    assert result.irr_pct == pytest.approx(expected_irr)
    assert result.irr_status == "unique"
    assert result.simple_payback_years == pytest.approx(1 + 40 / 60)
    assert result.discounted_payback_years == pytest.approx(1 + (100 - 60 / 1.1) / (60 / 1.1 ** 2))
    assert result.lifetime_net_cash_flow_inr == pytest.approx(20)


def test_finance_negative_irr_is_correct_and_no_payback():
    result = calculate_financial_scenario(finance(first_year_generation_kwh=20))
    assert result.irr_status == "unique"
    assert result.irr_pct < 0
    rate = result.irr_pct / 100
    assert -100 + 20 / (1 + rate) + 20 / (1 + rate) ** 2 == pytest.approx(0, abs=1e-10)
    assert result.simple_payback_years is None
    assert result.discounted_payback_years is None


def test_finance_degradation_escalation_om_expenses_and_salvage():
    result = calculate_financial_scenario(finance(
        first_year_generation_kwh=100, onsite_consumption_fraction=0.6,
        import_tariff_inr_per_kwh=2, export_tariff_inr_per_kwh=1,
        annual_degradation_fraction=0.1, tariff_escalation_fraction=0.1,
        annual_maintenance_inr=10, maintenance_escalation_fraction=0.2,
        future_expenses=[dict(year=2, cost_inr=7)], final_salvage_value_inr=5,
    ))
    first, second = result.annual_cash_flows
    assert first.generation_kwh == pytest.approx(100)
    assert first.net_cash_flow_inr == pytest.approx(150)
    assert second.generation_kwh == pytest.approx(90)
    assert second.avoided_import_cost_inr == pytest.approx(54 * 2 * 1.1)
    assert second.export_revenue_inr == pytest.approx(36 * 1.1)
    assert second.net_cash_flow_inr == pytest.approx(118.8 + 39.6 - 12 - 7 + 5)
    assert all(row.onsite_consumed_kwh + row.exported_kwh == pytest.approx(row.generation_kwh) for row in result.annual_cash_flows)


def test_finance_zero_savings_zero_capital_and_nonconventional_irr():
    zero = calculate_financial_scenario(finance(first_year_generation_kwh=0))
    assert zero.irr_pct is None and zero.irr_status == "no_positive_return"
    assert zero.simple_payback_years is None
    assert zero.net_present_value_inr == -100
    free = calculate_financial_scenario(finance(upfront_subsidy_inr=100))
    assert free.irr_pct is None and free.irr_status == "zero_initial_investment"
    assert free.simple_payback_years == 0
    unusual = calculate_financial_scenario(finance(lifetime_years=3, first_year_generation_kwh=200,
                                                 future_expenses=[dict(year=2, cost_inr=1000)]))
    assert unusual.irr_pct is None and unusual.irr_status == "non_conventional_cash_flows"
    assert unusual.simple_payback_years == pytest.approx(0.5)


def test_finance_irr_zero_exact_break_even():
    result = calculate_financial_scenario(finance(first_year_generation_kwh=50))
    assert result.irr_pct == pytest.approx(0, abs=1e-12)
    assert result.simple_payback_years == 2


def test_finance_extreme_valid_input_has_finite_json_response():
    result = calculate_financial_scenario(finance(installation_cost_inr=1e12, first_year_generation_kwh=1e9,
                                                 import_tariff_inr_per_kwh=10000, lifetime_years=50,
                                                 tariff_escalation_fraction=0.5))
    assert math.isfinite(result.net_present_value_inr)
    assert result.model_dump_json()


@pytest.mark.parametrize("overrides", [
    dict(upfront_subsidy_inr=101), dict(future_expenses=[dict(year=3, cost_inr=1)]),
    dict(lifetime_years=0), dict(onsite_consumption_fraction=1.1),
])
def test_finance_invalid_scenario_rejected(overrides):
    with pytest.raises(ValidationError):
        finance(**overrides)


def test_environment_lifetime_degradation_and_carbon_payback():
    result = calculate_environmental_impact(EnvironmentalImpactRequest(
        first_year_generation_kwh=100, displaced_emissions_kg_co2e_per_kwh=0.5,
        lifetime_years=3, annual_degradation_fraction=0.1, embodied_emissions_kg_co2e=70,
        emissions_factor_source="Supplied displacement factor",
    ))
    assert result.first_year_avoided_kg_co2e == pytest.approx(50)
    assert result.lifetime_generation_kwh == pytest.approx(271)
    assert result.lifetime_avoided_operational_kg_co2e == pytest.approx(135.5)
    assert result.lifetime_net_avoided_kg_co2e == pytest.approx(65.5)
    assert result.carbon_payback_years == pytest.approx(1 + 20 / 45)
    assert result.annual_impact[-1].cumulative_net_kg_co2e == pytest.approx(65.5)


def test_environment_zero_displacement_has_no_invented_carbon_benefit():
    result = calculate_environmental_impact(EnvironmentalImpactRequest(
        first_year_generation_kwh=100, displaced_emissions_kg_co2e_per_kwh=0,
        embodied_emissions_kg_co2e=10, emissions_factor_source="User zero-displacement scenario",
    ))
    assert result.lifetime_net_avoided_kg_co2e == -10
    assert result.carbon_payback_years is None


@pytest.mark.parametrize("bad", [float("nan"), float("inf"), float("-inf"), True, "100", -1])
def test_numeric_inputs_reject_nonfinite_coercion_and_negative_energy(bad):
    with pytest.raises(ValidationError):
        finance(first_year_generation_kwh=bad)
    with pytest.raises(ValidationError):
        DemandInterval(**interval("00", "01", energy_kwh=bad))
    with pytest.raises(ValidationError):
        EnvironmentalImpactRequest(first_year_generation_kwh=bad, displaced_emissions_kg_co2e_per_kwh=0.7,
                                   emissions_factor_source="User supplied factor")


def test_contracts_reject_unknown_fields():
    with pytest.raises(ValidationError):
        finance(fabricated_savings_inr=1000)


def test_provenance_cannot_be_whitespace_only():
    with pytest.raises(ValidationError):
        finance(assumptions_source="   ")
