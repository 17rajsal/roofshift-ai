"""Numerical and missing-data acceptance tests for telemetry and maintenance engines."""

from datetime import date, datetime, timedelta, timezone
import json

import pytest
from pydantic import ValidationError

from app.schemas.feature_monitoring import (
    MaintenanceRecommendationsRequest, PanelFaultDetectionRequest,
    PerformanceMonitoringRequest,
)
from app.services.features.monitoring import (
    detect_panel_faults, monitor_performance, recommend_maintenance,
)


START = datetime(2026, 10, 10, 0, tzinfo=timezone.utc)


def interval(panel_id="a", hour=0, duration=1, actual=8, expected=10, status="online"):
    return dict(
        panel_id=panel_id, start_at=START + timedelta(hours=hour),
        end_at=START + timedelta(hours=hour + duration),
        actual_energy_kwh=actual, expected_energy_kwh=expected, operating_status=status,
    )


def fault_result(**kwargs):
    return detect_panel_faults(PanelFaultDetectionRequest(readings=[dict(panel_id="a", **kwargs)]))


def test_normal_panel_and_ratio_threshold_do_not_raise_alert():
    result = fault_result(
        expected_energy_kwh=10, actual_energy_kwh=8, irradiance_w_m2=800,
        temperature_c=74.9, voltage_v=36, expected_voltage_v=40, sensor_status="online",
    )
    finding = result.findings[0]
    assert finding.energy_ratio == pytest.approx(0.8)
    assert finding.assessment == "normal"
    assert finding.faults == []
    assert set(finding.evaluated_checks) == {"energy", "temperature", "voltage"}
    assert result.image_analysis_supported is False
    assert result.provenance == "deterministic_telemetry_rules"


def test_multiple_symptoms_are_supported_without_guessing_physical_cause():
    result = fault_result(
        expected_energy_kwh=1, actual_energy_kwh=0, irradiance_w_m2=200,
        temperature_c=75, voltage_v=0, expected_voltage_v=40,
    )
    finding = result.findings[0]
    assert {fault.code for fault in finding.faults} == {"zero_output", "overheating", "low_voltage"}
    assert result.panels_with_alerts == 1
    assert all(fault.evidence for fault in finding.faults)


def test_zero_energy_at_night_is_not_a_panel_fault():
    result = fault_result(expected_energy_kwh=0, actual_energy_kwh=0, irradiance_w_m2=0, voltage_v=0, expected_voltage_v=40)
    assert result.findings[0].faults == []
    assert result.findings[0].energy_ratio is None
    assert result.findings[0].assessment == "insufficient_data"


def test_zero_output_requires_daylight_evidence_otherwise_only_discrepancy():
    finding = fault_result(expected_energy_kwh=1, actual_energy_kwh=0).findings[0]
    assert [fault.code for fault in finding.faults] == ["low_output"]


def test_offline_sensor_is_not_misclassified_as_physical_panel_fault():
    finding = fault_result(
        expected_energy_kwh=10, actual_energy_kwh=0, irradiance_w_m2=900,
        temperature_c=90, sensor_status="offline",
    ).findings[0]
    assert [fault.code for fault in finding.faults] == ["sensor_offline"]
    assert finding.energy_ratio is None
    assert finding.evaluated_checks == []


def test_missing_observations_remain_unknown_and_panels_are_independent():
    result = detect_panel_faults(PanelFaultDetectionRequest(readings=[
        {"panel_id": "unknown"}, {"panel_id": "normal", "expected_energy_kwh": 1, "actual_energy_kwh": 1},
        {"panel_id": "poor", "expected_energy_kwh": 1, "actual_energy_kwh": 0.79},
    ]))
    assert result.panels_evaluated == 3
    assert result.panels_with_insufficient_data == 1
    assert result.panels_with_alerts == 1


@pytest.mark.parametrize("field,value", [
    ("actual_energy_kwh", -1), ("actual_energy_kwh", float("nan")),
    ("irradiance_w_m2", float("inf")), ("expected_voltage_v", 0),
    ("temperature_c", 151), ("panel_id", " "),
    ("actual_energy_kwh", True), ("expected_energy_kwh", "1"),
])
def test_invalid_fault_telemetry_is_rejected(field, value):
    with pytest.raises(ValidationError):
        PanelFaultDetectionRequest(readings=[{"panel_id": "a", field: value}])


def test_duplicate_panels_and_incompatible_tolerances_are_rejected():
    with pytest.raises(ValidationError):
        PanelFaultDetectionRequest(readings=[{"panel_id": "a"}, {"panel_id": "a"}])
    with pytest.raises(ValidationError):
        PanelFaultDetectionRequest(readings=[{"panel_id": "a"}], zero_output_tolerance_kwh=0.05)


def test_extreme_ratio_controls_are_bounded_and_valid_extremes_remain_finite():
    with pytest.raises(ValidationError):
        PanelFaultDetectionRequest(readings=[{"panel_id": "a"}], minimum_expected_energy_kwh=1e-323, zero_output_tolerance_kwh=0)
    with pytest.raises(ValidationError):
        PerformanceMonitoringRequest(intervals=[interval()], minimum_expected_energy_kwh=1e-323)
    with pytest.raises(ValidationError):
        PanelFaultDetectionRequest(readings=[{"panel_id": "a", "expected_voltage_v": 1e-323}])
    fault = detect_panel_faults(PanelFaultDetectionRequest(readings=[dict(
        panel_id="a", actual_energy_kwh=1e9, expected_energy_kwh=1e-6,
        voltage_v=3000, expected_voltage_v=0.001, irradiance_w_m2=800,
    )], minimum_expected_energy_kwh=1e-6, zero_output_tolerance_kwh=0))
    assert fault.findings[0].energy_ratio == pytest.approx(1e15)
    json.dumps(fault.model_dump(mode="json"), allow_nan=False)
    performance = monitor_performance(PerformanceMonitoringRequest(
        intervals=[interval(actual=1e9, expected=1e-6)], minimum_expected_energy_kwh=1e-6,
    ))
    assert performance.summary.energy_performance_ratio == pytest.approx(1e15)
    json.dumps(performance.model_dump(mode="json"), allow_nan=False)


def test_performance_is_expected_energy_weighted_and_availability_time_weighted():
    result = monitor_performance(PerformanceMonitoringRequest(intervals=[
        interval("a", actual=8, expected=10),
        interval("a", hour=1, duration=3, actual=2, expected=10, status="offline"),
        interval("b", duration=2, actual=80, expected=100),
    ]))
    assert result.summary.total_actual_energy_kwh == 90
    assert result.summary.total_expected_energy_kwh == 120
    assert result.summary.energy_performance_ratio == pytest.approx(0.75)
    assert result.summary.monitored_panel_hours == 6
    assert result.summary.availability_pct == pytest.approx(50)
    assert result.panels[0].energy_performance_ratio == pytest.approx(0.5)
    assert result.panels[0].availability_pct == pytest.approx(25)
    assert {alert.code for alert in result.alerts if alert.panel_id == "a"} == {"low_performance", "low_availability"}
    assert not any(alert.panel_id == "b" for alert in result.alerts)


def test_missing_energy_is_excluded_from_ratio_not_imputed_as_zero():
    result = monitor_performance(PerformanceMonitoringRequest(intervals=[
        interval(actual=10, expected=10),
        interval(hour=1, actual=None, expected=100, status="unknown"),
        interval(hour=2, actual=50, expected=None, status="unknown"),
    ]))
    assert result.summary.total_expected_energy_kwh == 110
    assert result.summary.total_actual_energy_kwh == 60
    assert result.summary.paired_expected_energy_kwh == 10
    assert result.summary.paired_actual_energy_kwh == 10
    assert result.summary.energy_performance_ratio == 1
    assert result.summary.availability_pct == 100
    assert result.summary.status_coverage_pct == pytest.approx(100 / 3)
    assert result.summary.energy_coverage_pct == pytest.approx(100 / 3)
    assert {alert.code for alert in result.alerts} == {"missing_energy", "missing_status"}


def test_night_and_unknown_status_have_null_ratios_and_no_false_availability():
    result = monitor_performance(PerformanceMonitoringRequest(intervals=[interval(actual=0, expected=0, status="unknown")]))
    assert result.summary.energy_performance_ratio is None
    assert result.summary.availability_pct is None
    assert result.summary.energy_coverage_pct == 100
    assert result.summary.status_coverage_pct == 0
    assert [alert.code for alert in result.alerts] == ["missing_status"]
    json.dumps(result.model_dump(mode="json"), allow_nan=False)


def test_performance_zero_output_and_zero_availability_are_finite():
    result = monitor_performance(PerformanceMonitoringRequest(intervals=[interval(actual=0, expected=1, status="offline")]))
    assert result.summary.energy_performance_ratio == 0
    assert result.summary.availability_pct == 0
    assert {alert.code for alert in result.alerts} == {"low_performance", "low_availability"}


def test_low_expected_energy_is_not_used_for_unstable_ratios():
    result = monitor_performance(PerformanceMonitoringRequest(intervals=[interval(actual=1, expected=0.001)]))
    assert result.summary.energy_performance_ratio is None
    assert not result.alerts


def test_touching_intervals_and_same_time_different_panels_are_allowed():
    request = PerformanceMonitoringRequest(intervals=[interval(hour=1), interval(), interval("b")])
    assert monitor_performance(request).summary.interval_count == 3


@pytest.mark.parametrize("intervals", [
    [interval(), interval(hour=0.5)], [interval(duration=0)], [interval(duration=31 * 24 + 1)],
    [dict(interval(), start_at=START.replace(tzinfo=None))],
    [dict(interval(), actual_energy_kwh=float("inf"))],
    [dict(interval(), expected_energy_kwh=-1)],
    [dict(interval(), actual_energy_kwh=False)],
    [dict(interval(), expected_energy_kwh="10")],
])
def test_invalid_monitoring_intervals_are_rejected(intervals):
    with pytest.raises(ValidationError):
        PerformanceMonitoringRequest(intervals=intervals)


def test_offsets_are_normalized_before_overlap_validation():
    first = interval()
    second = interval(hour=1)
    second["start_at"] = "2026-10-10T06:30:00+05:30"
    second["end_at"] = "2026-10-10T07:30:00+05:30"
    request = PerformanceMonitoringRequest(intervals=[first, second])
    assert request.intervals[1].start_at == START + timedelta(hours=1)


def test_maintenance_combines_dated_soiling_fault_and_performance_evidence():
    faults = fault_result(expected_energy_kwh=1, actual_energy_kwh=0, irradiance_w_m2=800, temperature_c=80)
    performance = monitor_performance(PerformanceMonitoringRequest(intervals=[interval(actual=0, expected=1, status="offline")]))
    request = MaintenanceRecommendationsRequest(
        as_of_date="2026-10-10", panels=[dict(
            panel_id="a", last_cleaned_at="2026-06-01", last_inspected_at="2025-01-01",
            soiling_loss_pct=7, inverter_status="fault",
        )], fault_detection=faults, performance=performance,
    )
    result = recommend_maintenance(request)
    by_code = {task.action_code: task for task in result.recommendations}
    assert set(by_code) == {"inspect_inverter", "inspect_thermal_issue", "investigate_generation", "clean_panels", "scheduled_inspection"}
    assert result.recommendations[0].priority == "high"
    assert len(by_code["clean_panels"].evidence) == 2
    assert by_code["clean_panels"].due_date == date(2026, 8, 30)
    assert by_code["clean_panels"].overdue_days == 41
    assert len(by_code["investigate_generation"].evidence) >= 3
    assert "review_performance" not in by_code


def test_missing_maintenance_history_does_not_invent_an_overdue_service():
    result = recommend_maintenance(MaintenanceRecommendationsRequest(as_of_date="2026-10-10", panels=[{"panel_id": "a"}]))
    assert len(result.recommendations) == 1
    assert result.recommendations[0].action_code == "record_maintenance_history"
    assert result.recommendations[0].overdue_days == 0


def test_recent_healthy_service_produces_no_tasks():
    result = recommend_maintenance(MaintenanceRecommendationsRequest(as_of_date="2026-10-10", panels=[dict(
        panel_id="a", last_cleaned_at="2026-10-01", last_inspected_at="2026-10-01",
        soiling_loss_pct=0, inverter_status="normal",
    )]))
    assert result.recommendations == []


def test_cleaning_threshold_and_due_date_are_inclusive():
    result = recommend_maintenance(MaintenanceRecommendationsRequest(as_of_date="2026-10-10", panels=[dict(
        panel_id="a", last_cleaned_at="2026-07-12", last_inspected_at="2026-10-01", soiling_loss_pct=5,
    )]))
    assert result.recommendations[0].action_code == "clean_panels"
    assert result.recommendations[0].overdue_days == 0
    assert len(result.recommendations[0].evidence) == 2


@pytest.mark.parametrize("panels", [
    [{"panel_id": "a", "last_cleaned_at": "2026-10-11"}],
    [{"panel_id": "a", "soiling_loss_pct": float("nan")}],
    [{"panel_id": "a", "soiling_loss_pct": True}],
    [{"panel_id": "a", "soiling_loss_pct": "10"}],
    [{"panel_id": "a"}, {"panel_id": "a"}],
])
def test_invalid_maintenance_data_is_rejected(panels):
    with pytest.raises(ValidationError):
        MaintenanceRecommendationsRequest(as_of_date="2026-10-10", panels=panels)


def test_maintenance_requires_diagnostic_panel_references_to_match():
    with pytest.raises(ValidationError):
        MaintenanceRecommendationsRequest(as_of_date="2026-10-10", panels=[{"panel_id": "b"}], fault_detection=fault_result())


@pytest.mark.parametrize("interval_days", [True, "90", 90.0])
def test_integer_configuration_does_not_coerce_text_or_booleans(interval_days):
    with pytest.raises(ValidationError):
        MaintenanceRecommendationsRequest(as_of_date="2026-10-10", panels=[{"panel_id": "a"}], cleaning_interval_days=interval_days)


def test_deterministic_order_and_no_input_mutation():
    request = MaintenanceRecommendationsRequest(as_of_date="2026-10-10", panels=[
        {"panel_id": "z", "inverter_status": "offline"}, {"panel_id": "a", "inverter_status": "fault"},
    ])
    before = request.model_dump()
    first = recommend_maintenance(request)
    second = recommend_maintenance(request)
    assert first == second
    assert request.model_dump() == before
    assert [task.panel_id for task in first.recommendations[:2]] == ["a", "z"]
