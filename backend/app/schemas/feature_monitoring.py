"""Validated, unit-explicit contracts for telemetry diagnostics and maintenance."""

from datetime import date, datetime, timezone
from typing import Literal, get_args

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MonitoringSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, str_strip_whitespace=True)

    @field_validator("*", mode="before")
    @classmethod
    def numbers_require_numeric_json_values(cls, value, info):
        annotation = cls.model_fields[info.field_name].annotation
        alternatives = get_args(annotation) or (annotation,)
        if value is not None and float in alternatives and type(value) not in (int, float):
            raise ValueError("numeric fields require numbers, not booleans or text")
        if value is not None and int in alternatives and type(value) is not int:
            raise ValueError("integer fields require integer numbers, not booleans or text")
        return value


Severity = Literal["critical", "high", "medium", "low"]
FaultCode = Literal["sensor_offline", "zero_output", "low_output", "overheating", "low_voltage"]


class PanelReading(MonitoringSchema):
    panel_id: str = Field(min_length=1, max_length=150)
    expected_energy_kwh: float | None = Field(default=None, ge=0, le=1e9)
    actual_energy_kwh: float | None = Field(default=None, ge=0, le=1e9)
    irradiance_w_m2: float | None = Field(default=None, ge=0, le=1500)
    voltage_v: float | None = Field(default=None, ge=0, le=3000)
    expected_voltage_v: float | None = Field(default=None, ge=0.001, le=3000)
    temperature_c: float | None = Field(default=None, ge=-80, le=150)
    sensor_status: Literal["online", "offline", "unknown"] = "unknown"


class PanelFaultDetectionRequest(MonitoringSchema):
    readings: list[PanelReading] = Field(min_length=1, max_length=5000)
    low_output_ratio: float = Field(default=0.8, gt=0, lt=1)
    low_voltage_ratio: float = Field(default=0.9, gt=0, lt=1)
    overheating_threshold_c: float = Field(default=75, ge=30, le=120)
    daylight_irradiance_threshold_w_m2: float = Field(default=200, ge=0, le=1000)
    minimum_expected_energy_kwh: float = Field(default=0.05, ge=0.000001, le=1000)
    zero_output_tolerance_kwh: float = Field(default=0.001, ge=0, le=1)

    @model_validator(mode="after")
    def validate_readings(self):
        if len({reading.panel_id for reading in self.readings}) != len(self.readings):
            raise ValueError("readings must contain one observation per panel_id")
        if self.zero_output_tolerance_kwh >= self.minimum_expected_energy_kwh:
            raise ValueError("zero output tolerance must be below minimum expected energy")
        return self


class PanelFault(MonitoringSchema):
    code: FaultCode
    severity: Severity
    evidence: list[str]


class PanelFaultFinding(MonitoringSchema):
    panel_id: str
    assessment: Literal["normal", "attention", "insufficient_data"]
    energy_ratio: float | None = None
    faults: list[PanelFault] = Field(default_factory=list)
    evaluated_checks: list[str] = Field(default_factory=list)
    missing_checks: list[str] = Field(default_factory=list)


class PanelFaultDetectionResponse(MonitoringSchema):
    findings: list[PanelFaultFinding]
    panels_evaluated: int
    panels_with_alerts: int
    panels_with_insufficient_data: int
    provenance: Literal["deterministic_telemetry_rules"] = "deterministic_telemetry_rules"
    image_analysis_supported: Literal[False] = False
    methodology: str = (
        "Rules compare supplied telemetry with supplied expectations. Alerts identify "
        "observed symptoms; physical causes are unconfirmed. Offline sensor values are not evaluated. "
        "Image classification is unavailable in this delivery."
    )


class PerformanceInterval(MonitoringSchema):
    panel_id: str = Field(min_length=1, max_length=150)
    start_at: datetime
    end_at: datetime
    actual_energy_kwh: float | None = Field(default=None, ge=0, le=1e9)
    expected_energy_kwh: float | None = Field(default=None, ge=0, le=1e9)
    operating_status: Literal["online", "offline", "unknown"] = "unknown"

    @field_validator("start_at", "end_at")
    @classmethod
    def timezone_required(cls, value: datetime):
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("interval timestamps require a UTC offset")
        try:
            return value.astimezone(timezone.utc)
        except (OverflowError, ValueError) as error:
            raise ValueError("interval timestamp is outside the supported UTC range") from error

    @model_validator(mode="after")
    def positive_duration(self):
        duration = (self.end_at - self.start_at).total_seconds()
        if duration <= 0 or duration > 31 * 24 * 3600:
            raise ValueError("interval duration must be positive and no longer than 31 days")
        return self


class PerformanceMonitoringRequest(MonitoringSchema):
    intervals: list[PerformanceInterval] = Field(min_length=1, max_length=10000)
    low_performance_ratio: float = Field(default=0.8, gt=0, lt=1)
    minimum_expected_energy_kwh: float = Field(default=0.05, ge=0.000001, le=1000)
    minimum_availability_pct: float = Field(default=95, ge=0, le=100)

    @model_validator(mode="after")
    def reject_overlapping_intervals(self):
        previous_end = {}
        for item in sorted(self.intervals, key=lambda entry: (entry.panel_id, entry.start_at)):
            if item.panel_id in previous_end and item.start_at < previous_end[item.panel_id]:
                raise ValueError(f"overlapping intervals for panel {item.panel_id}")
            previous_end[item.panel_id] = item.end_at
        return self


class PerformanceAlert(MonitoringSchema):
    panel_id: str
    code: Literal["low_performance", "low_availability", "missing_energy", "missing_status"]
    severity: Severity
    evidence: list[str]


class PerformanceSummary(MonitoringSchema):
    panel_id: str | None = None
    interval_count: int
    total_actual_energy_kwh: float
    total_expected_energy_kwh: float
    actual_energy_known_intervals: int
    expected_energy_known_intervals: int
    paired_intervals: int
    paired_actual_energy_kwh: float
    paired_expected_energy_kwh: float
    energy_performance_ratio: float | None
    monitored_panel_hours: float
    online_panel_hours: float
    offline_panel_hours: float
    unknown_status_panel_hours: float
    availability_pct: float | None
    status_coverage_pct: float
    energy_coverage_pct: float


class PerformanceMonitoringResponse(MonitoringSchema):
    summary: PerformanceSummary
    panels: list[PerformanceSummary]
    alerts: list[PerformanceAlert]
    provenance: Literal["supplied_interval_telemetry"] = "supplied_interval_telemetry"
    methodology: str = (
        "Known energy is summed without imputing missing readings. Energy performance is actual / "
        "expected for matched intervals with positive expected energy, subject to the minimum "
        "expected-energy threshold. It is not the irradiance-normalized PV performance ratio. "
        "Availability is online hours / known-status hours; unknown status is excluded and coverage "
        "is reported. Hours are panel-hours, not wall-clock system uptime."
    )


class MaintenancePanel(MonitoringSchema):
    panel_id: str = Field(min_length=1, max_length=150)
    last_cleaned_at: date | None = Field(default=None, ge=date(1900, 1, 1), le=date(9990, 12, 31))
    last_inspected_at: date | None = Field(default=None, ge=date(1900, 1, 1), le=date(9990, 12, 31))
    soiling_loss_pct: float | None = Field(default=None, ge=0, le=100)
    inverter_status: Literal["normal", "fault", "offline", "unknown"] = "unknown"


class MaintenanceRecommendationsRequest(MonitoringSchema):
    as_of_date: date = Field(ge=date(1900, 1, 1), le=date(9990, 12, 31))
    panels: list[MaintenancePanel] = Field(min_length=1, max_length=5000)
    fault_detection: PanelFaultDetectionResponse | None = None
    performance: PerformanceMonitoringResponse | None = None
    cleaning_interval_days: int = Field(default=90, ge=7, le=730)
    inspection_interval_days: int = Field(default=365, ge=7, le=1460)
    soiling_loss_threshold_pct: float = Field(default=5, gt=0, le=100)

    @model_validator(mode="after")
    def validate_references_and_dates(self):
        panel_ids = {panel.panel_id for panel in self.panels}
        if len(panel_ids) != len(self.panels):
            raise ValueError("panels must have unique panel_id values")
        for panel in self.panels:
            if any(value and value > self.as_of_date for value in (panel.last_cleaned_at, panel.last_inspected_at)):
                raise ValueError("maintenance dates cannot be later than as_of_date")
        if self.fault_detection:
            ids = [finding.panel_id for finding in self.fault_detection.findings]
            if len(set(ids)) != len(ids) or not set(ids).issubset(panel_ids):
                raise ValueError("fault findings must reference unique known panels")
        if self.performance:
            ids = [panel.panel_id for panel in self.performance.panels]
            if len(set(ids)) != len(ids) or not set(ids).issubset(panel_ids):
                raise ValueError("performance summaries must reference unique known panels")
            if not {alert.panel_id for alert in self.performance.alerts}.issubset(panel_ids):
                raise ValueError("performance alerts must reference known panels")
        return self


class MaintenanceRecommendation(MonitoringSchema):
    panel_id: str
    action_code: Literal[
        "inspect_inverter", "inspect_thermal_issue", "investigate_generation",
        "investigate_voltage", "restore_monitoring", "clean_panels",
        "scheduled_inspection", "review_performance", "record_maintenance_history",
    ]
    priority: Severity
    action: str
    evidence: list[str]
    due_date: date
    overdue_days: int = Field(ge=0)


class MaintenanceRecommendationsResponse(MonitoringSchema):
    as_of_date: date
    recommendations: list[MaintenanceRecommendation]
    panels_evaluated: int
    provenance: Literal["deterministic_maintenance_rules"] = "deterministic_maintenance_rules"
    methodology: str = (
        "Priorities derive from supplied fault findings, performance alerts, inverter status, "
        "measured/estimated soiling loss and dated service records. Default service intervals are "
        "configurable planning assumptions, not manufacturer requirements. Missing dates prompt "
        "record collection rather than an assumed overdue service."
    )
