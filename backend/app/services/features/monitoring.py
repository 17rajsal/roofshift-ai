"""Pure, auditable telemetry engines; no external data or image classifier is implied."""

from collections import defaultdict
from datetime import timedelta
from math import fsum

from app.schemas.feature_monitoring import (
    MaintenanceRecommendation, MaintenanceRecommendationsRequest,
    MaintenanceRecommendationsResponse, PanelFault, PanelFaultDetectionRequest,
    PanelFaultDetectionResponse, PanelFaultFinding, PerformanceAlert,
    PerformanceInterval, PerformanceMonitoringRequest, PerformanceMonitoringResponse,
    PerformanceSummary,
)


def detect_panel_faults(request: PanelFaultDetectionRequest) -> PanelFaultDetectionResponse:
    """Compare interval energy and operating telemetry with explicit supplied baselines."""
    findings = []
    for reading in request.readings:
        faults, evaluated, missing = [], [], []
        ratio = None
        if reading.sensor_status == "offline":
            faults.append(PanelFault(code="sensor_offline", severity="medium", evidence=[
                "Sensor status is offline; supplied energy, voltage and temperature values were not evaluated.",
            ]))
            missing.extend(["energy", "voltage", "temperature"])
        else:
            daylight = (
                reading.irradiance_w_m2 is not None
                and reading.irradiance_w_m2 >= request.daylight_irradiance_threshold_w_m2
            )
            if (
                reading.expected_energy_kwh is not None
                and reading.expected_energy_kwh >= request.minimum_expected_energy_kwh
                and reading.actual_energy_kwh is not None
            ):
                ratio = reading.actual_energy_kwh / reading.expected_energy_kwh
                evaluated.append("energy")
                evidence = [
                    f"Measured energy {reading.actual_energy_kwh:g} kWh; expected energy {reading.expected_energy_kwh:g} kWh.",
                    f"Actual/expected energy ratio {ratio:.4f}; low-output threshold {request.low_output_ratio:g}.",
                ]
                if reading.actual_energy_kwh <= request.zero_output_tolerance_kwh and daylight:
                    evidence.append(
                        f"Irradiance {reading.irradiance_w_m2:g} W/m² meets daylight threshold "
                        f"{request.daylight_irradiance_threshold_w_m2:g} W/m²."
                    )
                    faults.append(PanelFault(code="zero_output", severity="high", evidence=evidence))
                elif ratio < request.low_output_ratio:
                    faults.append(PanelFault(code="low_output", severity="medium", evidence=evidence))
            else:
                missing.append("energy: measured energy and a meaningful positive expectation are required")

            if reading.temperature_c is not None:
                evaluated.append("temperature")
                if reading.temperature_c >= request.overheating_threshold_c:
                    faults.append(PanelFault(code="overheating", severity="high", evidence=[
                        f"Measured temperature {reading.temperature_c:g} °C meets or exceeds "
                        f"configured threshold {request.overheating_threshold_c:g} °C.",
                    ]))
            else:
                missing.append("temperature: temperature reading is missing")

            if daylight and reading.voltage_v is not None and reading.expected_voltage_v is not None:
                evaluated.append("voltage")
                voltage_ratio = reading.voltage_v / reading.expected_voltage_v
                if voltage_ratio < request.low_voltage_ratio:
                    faults.append(PanelFault(code="low_voltage", severity="medium", evidence=[
                        f"Measured voltage {reading.voltage_v:g} V; expected voltage {reading.expected_voltage_v:g} V.",
                        f"Voltage ratio {voltage_ratio:.4f} is below threshold {request.low_voltage_ratio:g} in daylight.",
                    ]))
            else:
                missing.append("voltage: voltage, expected voltage and daylight irradiance are required")

        assessment = "attention" if faults else ("normal" if evaluated else "insufficient_data")
        findings.append(PanelFaultFinding(
            panel_id=reading.panel_id, assessment=assessment, energy_ratio=ratio,
            faults=faults, evaluated_checks=evaluated, missing_checks=missing,
        ))
    return PanelFaultDetectionResponse(
        findings=findings, panels_evaluated=len(findings),
        panels_with_alerts=sum(bool(finding.faults) for finding in findings),
        panels_with_insufficient_data=sum(finding.assessment == "insufficient_data" for finding in findings),
    )


def _summarize_intervals(
    intervals: list[PerformanceInterval], minimum_expected_kwh: float, panel_id: str | None = None,
) -> PerformanceSummary:
    durations = [(item.end_at - item.start_at).total_seconds() / 3600 for item in intervals]
    total_hours = fsum(durations)
    online_hours = fsum(hours for item, hours in zip(intervals, durations) if item.operating_status == "online")
    offline_hours = fsum(hours for item, hours in zip(intervals, durations) if item.operating_status == "offline")
    unknown_hours = fsum(hours for item, hours in zip(intervals, durations) if item.operating_status == "unknown")
    known_hours = online_hours + offline_hours
    energy_pairs = [item for item in intervals if item.actual_energy_kwh is not None and item.expected_energy_kwh is not None]
    positive_pairs = [item for item in energy_pairs if item.expected_energy_kwh > 0]
    paired_actual = fsum(item.actual_energy_kwh for item in positive_pairs)
    paired_expected = fsum(item.expected_energy_kwh for item in positive_pairs)
    return PerformanceSummary(
        panel_id=panel_id, interval_count=len(intervals),
        total_actual_energy_kwh=fsum(item.actual_energy_kwh for item in intervals if item.actual_energy_kwh is not None),
        total_expected_energy_kwh=fsum(item.expected_energy_kwh for item in intervals if item.expected_energy_kwh is not None),
        actual_energy_known_intervals=sum(item.actual_energy_kwh is not None for item in intervals),
        expected_energy_known_intervals=sum(item.expected_energy_kwh is not None for item in intervals),
        paired_intervals=len(positive_pairs), paired_actual_energy_kwh=paired_actual,
        paired_expected_energy_kwh=paired_expected,
        energy_performance_ratio=paired_actual / paired_expected if paired_expected >= minimum_expected_kwh else None,
        monitored_panel_hours=total_hours, online_panel_hours=online_hours,
        offline_panel_hours=offline_hours, unknown_status_panel_hours=unknown_hours,
        availability_pct=100 * online_hours / known_hours if known_hours else None,
        status_coverage_pct=100 * known_hours / total_hours,
        energy_coverage_pct=100 * len(energy_pairs) / len(intervals),
    )


def monitor_performance(request: PerformanceMonitoringRequest) -> PerformanceMonitoringResponse:
    """Aggregate supplied intervals without interpreting missing values as zero."""
    grouped = defaultdict(list)
    for item in request.intervals:
        grouped[item.panel_id].append(item)
    panels, alerts = [], []
    for panel_id in sorted(grouped):
        panel = _summarize_intervals(grouped[panel_id], request.minimum_expected_energy_kwh, panel_id)
        panels.append(panel)
        if panel.energy_performance_ratio is not None and panel.energy_performance_ratio < request.low_performance_ratio:
            alerts.append(PerformanceAlert(panel_id=panel_id, code="low_performance", severity="medium", evidence=[
                f"Matched energy {panel.paired_actual_energy_kwh:g} / {panel.paired_expected_energy_kwh:g} kWh "
                f"gives ratio {panel.energy_performance_ratio:.4f}, below {request.low_performance_ratio:g}.",
            ]))
        if panel.availability_pct is not None and panel.availability_pct < request.minimum_availability_pct:
            alerts.append(PerformanceAlert(panel_id=panel_id, code="low_availability", severity="high", evidence=[
                f"Online {panel.online_panel_hours:g} h of "
                f"{panel.online_panel_hours + panel.offline_panel_hours:g} known-status panel-hours; "
                f"availability {panel.availability_pct:.2f}% is below {request.minimum_availability_pct:g}%.",
            ]))
        if panel.energy_coverage_pct < 100:
            alerts.append(PerformanceAlert(panel_id=panel_id, code="missing_energy", severity="low", evidence=[
                f"Both actual and expected energy are known for {panel.energy_coverage_pct:.2f}% of intervals.",
            ]))
        if panel.status_coverage_pct < 100:
            alerts.append(PerformanceAlert(panel_id=panel_id, code="missing_status", severity="low", evidence=[
                f"Operating status is known for {panel.status_coverage_pct:.2f}% of monitored panel-hours.",
            ]))
    return PerformanceMonitoringResponse(
        summary=_summarize_intervals(request.intervals, request.minimum_expected_energy_kwh),
        panels=panels, alerts=alerts,
    )


def recommend_maintenance(request: MaintenanceRecommendationsRequest) -> MaintenanceRecommendationsResponse:
    """Produce dated tasks from telemetry symptoms and explicit maintenance records."""
    recommendations = []
    fault_map = {item.panel_id: item for item in request.fault_detection.findings} if request.fault_detection else {}
    alert_map = defaultdict(list)
    if request.performance:
        for alert in request.performance.alerts:
            alert_map[alert.panel_id].append(alert)

    for panel in request.panels:
        tasks = {}

        def add_task(code, priority, action, evidence, due_date=None):
            due = due_date or request.as_of_date
            if code in tasks:
                tasks[code].evidence.extend(evidence)
                if _PRIORITY[priority] < _PRIORITY[tasks[code].priority]:
                    tasks[code].priority = priority
                tasks[code].due_date = min(tasks[code].due_date, due)
                tasks[code].overdue_days = max(0, (request.as_of_date - tasks[code].due_date).days)
                return
            tasks[code] = MaintenanceRecommendation(
                panel_id=panel.panel_id, action_code=code, priority=priority,
                action=action, evidence=evidence, due_date=due,
                overdue_days=max(0, (request.as_of_date - due).days),
            )

        if panel.inverter_status in ("fault", "offline"):
            add_task("inspect_inverter", "high", "Inspect the inverter and its recorded fault/connection state.", [
                f"Supplied inverter status: {panel.inverter_status}.",
            ])

        finding = fault_map.get(panel.panel_id)
        for fault in finding.faults if finding else []:
            if fault.code == "overheating":
                add_task("inspect_thermal_issue", "high", "Inspect the measured hot panel and verify temperature and airflow.", fault.evidence)
            elif fault.code in ("zero_output", "low_output"):
                add_task("investigate_generation", fault.severity, "Investigate panel/string generation against the supplied expectation.", fault.evidence)
            elif fault.code == "low_voltage":
                add_task("investigate_voltage", fault.severity, "Inspect panel/string voltage and electrical connections.", fault.evidence)
            elif fault.code == "sensor_offline":
                add_task("restore_monitoring", "medium", "Restore telemetry collection and verify sensor timestamps and connectivity.", fault.evidence)

        for alert in alert_map[panel.panel_id]:
            if alert.code == "low_availability":
                add_task("inspect_inverter", "high", "Inspect the inverter and its recorded fault/connection state.", alert.evidence)
            elif alert.code == "low_performance":
                if "investigate_generation" in tasks:
                    tasks["investigate_generation"].evidence.extend(alert.evidence)
                else:
                    add_task("review_performance", "medium", "Review generation, supplied forecast and shading/soiling conditions.", alert.evidence)
            else:
                add_task("restore_monitoring", "low", "Restore telemetry collection and verify sensor timestamps and connectivity.", alert.evidence)

        cleaning_due = panel.last_cleaned_at + timedelta(days=request.cleaning_interval_days) if panel.last_cleaned_at else None
        if panel.soiling_loss_pct is not None and panel.soiling_loss_pct >= request.soiling_loss_threshold_pct:
            add_task("clean_panels", "medium", "Schedule cleaning and measure generation before and after service.", [
                f"Supplied soiling loss {panel.soiling_loss_pct:g}% meets threshold {request.soiling_loss_threshold_pct:g}%.",
            ])
        if cleaning_due is not None and cleaning_due <= request.as_of_date:
            add_task("clean_panels", "medium", "Schedule cleaning and measure generation before and after service.", [
                f"Last cleaned {panel.last_cleaned_at.isoformat()}; configured interval {request.cleaning_interval_days} days.",
            ], cleaning_due)

        inspection_due = panel.last_inspected_at + timedelta(days=request.inspection_interval_days) if panel.last_inspected_at else None
        if inspection_due is not None and inspection_due <= request.as_of_date:
            add_task("scheduled_inspection", "medium", "Schedule the periodic panel, mounting and connection inspection.", [
                f"Last inspected {panel.last_inspected_at.isoformat()}; configured interval {request.inspection_interval_days} days.",
            ], inspection_due)
        absent_dates = [name for name, value in (("cleaning", panel.last_cleaned_at), ("inspection", panel.last_inspected_at)) if value is None]
        if absent_dates:
            add_task("record_maintenance_history", "low", "Record confirmed service dates to establish the maintenance schedule.", [
                f"Missing service dates: {', '.join(absent_dates)}; overdue service cannot be inferred.",
            ])
        recommendations.extend(tasks.values())

    recommendations.sort(key=lambda item: (_PRIORITY[item.priority], item.due_date, item.panel_id, item.action_code))
    return MaintenanceRecommendationsResponse(
        as_of_date=request.as_of_date, recommendations=recommendations, panels_evaluated=len(request.panels),
    )


_PRIORITY = {"critical": 0, "high": 1, "medium": 2, "low": 3}
