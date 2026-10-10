"""Version 1 request/response contracts for the independent analytical features.

All energy values are kWh, power is kW/kWp, currency is INR, and ratios are
fractions unless the field name ends in ``_pct``. No external datasets or tariffs
are silently substituted. Numeric input rejects strings, booleans and NaN/Inf.
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]
Nonnegative = Annotated[float, Field(strict=True, ge=0, allow_inf_nan=False)]
Energy = Annotated[float, Field(strict=True, ge=0, le=1e9, allow_inf_nan=False)]
Money = Annotated[float, Field(strict=True, ge=0, le=1e12, allow_inf_nan=False)]
Fraction = Annotated[float, Field(strict=True, ge=0, le=1, allow_inf_nan=False)]
Percent = Annotated[float, Field(strict=True, ge=0, le=100, allow_inf_nan=False)]
Rate = Annotated[float, Field(strict=True, ge=0, le=10000, allow_inf_nan=False)]
Degradation = Annotated[float, Field(strict=True, ge=0, le=0.1, allow_inf_nan=False)]


class AnalyticsModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, str_strip_whitespace=True)


class SolarSiteCandidate(AnalyticsModel):
    site_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=150)
    latitude: Annotated[float, Field(strict=True, ge=-90, le=90)]
    longitude: Annotated[float, Field(strict=True, ge=-180, le=180)]
    roof_area_sqm: Annotated[float, Field(strict=True, gt=0, le=1e8)]
    usable_roof_fraction: Fraction = 0.8
    shading_loss_pct: Percent = 0
    ghi_kwh_m2_day: Annotated[float, Field(strict=True, ge=0, le=15)]
    irradiance_source: str = Field(min_length=3, max_length=500)
    data_basis: Literal["measured", "climatology", "user_assumption"]


class SolarLocationRequest(AnalyticsModel):
    candidates: list[SolarSiteCandidate] = Field(min_length=1, max_length=250)
    minimum_usable_area_sqm: Annotated[float, Field(strict=True, ge=0, le=1e8)] = 0
    minimum_ghi_kwh_m2_day: Annotated[float, Field(strict=True, ge=0, le=15)] = 0
    maximum_shading_loss_pct: Percent = 100
    area_sqm_per_kwp: Annotated[float, Field(strict=True, ge=1, le=100)] = 7
    performance_ratio: Annotated[float, Field(strict=True, gt=0, le=1)] = 0.8
    reference_latitude: Annotated[float, Field(strict=True, ge=-90, le=90)] | None = None
    reference_longitude: Annotated[float, Field(strict=True, ge=-180, le=180)] | None = None
    maximum_distance_km: Annotated[float, Field(strict=True, gt=0, le=20040)] | None = None
    max_results: Annotated[int, Field(strict=True, ge=1, le=250)] = 20

    @model_validator(mode="after")
    def validate_candidates(self):
        if len({candidate.site_id for candidate in self.candidates}) != len(self.candidates):
            raise ValueError("candidate site_id values must be unique")
        if (self.reference_latitude is None) != (self.reference_longitude is None):
            raise ValueError("both reference coordinates are required together")
        if self.maximum_distance_km is not None and self.reference_latitude is None:
            raise ValueError("a distance constraint requires reference coordinates")
        return self


class RankedSolarSite(AnalyticsModel):
    rank: int
    site_id: str
    name: str
    latitude: Number
    longitude: Number
    usable_roof_area_sqm: Nonnegative
    screening_capacity_kwp: Nonnegative
    annual_generation_kwh: Nonnegative
    annual_specific_yield_kwh_per_kwp: Nonnegative
    score_pct: Percent
    distance_km: Nonnegative | None
    irradiance_source: str
    data_basis: str


class ExcludedSolarSite(AnalyticsModel):
    site_id: str
    reasons: list[str]


class SolarLocationResponse(AnalyticsModel):
    contract_version: Literal["1.0"] = "1.0"
    ranking_metric: Literal["annual_generation_kwh"] = "annual_generation_kwh"
    ranked_sites: list[RankedSolarSite]
    excluded_sites: list[ExcludedSolarSite]
    eligible_sites_count: int
    assumptions: list[str]


class MonthlyIrradiance(AnalyticsModel):
    month: Annotated[int, Field(strict=True, ge=1, le=12)]
    ghi_kwh_m2_day: Annotated[float, Field(strict=True, ge=0, le=15)]
    mean_cell_temperature_c: Annotated[float, Field(strict=True, ge=-50, le=120)] = 25


class SolarPredictionRequest(AnalyticsModel):
    year: Annotated[int, Field(strict=True, ge=1, le=9998)]
    capacity_kwp: Annotated[float, Field(strict=True, ge=0, le=1e6)]
    monthly_irradiance: list[MonthlyIrradiance] = Field(min_length=12, max_length=12)
    irradiance_source: str = Field(min_length=3, max_length=500)
    data_basis: Literal["measured", "climatology", "forecast", "user_assumption"]
    plane_of_array_multiplier: Annotated[float, Field(strict=True, gt=0, le=3)] = 1
    performance_ratio: Annotated[float, Field(strict=True, gt=0, le=1)] = 0.8
    shading_loss_pct: Percent = 0
    temperature_coefficient_per_c: Annotated[float, Field(strict=True, ge=-0.02, le=0)] = -0.004
    age_years: Annotated[int, Field(strict=True, ge=0, le=100)] = 0
    annual_degradation_fraction: Degradation = 0.005
    uncertainty_fraction: Fraction = 0.15

    @model_validator(mode="after")
    def validate_months(self):
        if {item.month for item in self.monthly_irradiance} != set(range(1, 13)):
            raise ValueError("monthly_irradiance must contain each month exactly once")
        return self


class MonthlySolarPrediction(AnalyticsModel):
    month: int
    days: int
    ghi_kwh_m2_day: Nonnegative
    temperature_multiplier: Nonnegative
    generation_kwh: Nonnegative
    lower_generation_kwh: Nonnegative
    upper_generation_kwh: Nonnegative


class SolarPredictionResponse(AnalyticsModel):
    contract_version: Literal["1.0"] = "1.0"
    year: int
    annual_generation_kwh: Nonnegative
    annual_lower_generation_kwh: Nonnegative
    annual_upper_generation_kwh: Nonnegative
    specific_yield_kwh_per_kwp: Nonnegative
    monthly_predictions: list[MonthlySolarPrediction]
    irradiance_source: str
    data_basis: str
    range_basis: Literal["assumption_based_sensitivity_range"] = "assumption_based_sensitivity_range"
    assumptions: list[str]


class DemandInterval(AnalyticsModel):
    start: datetime
    end: datetime
    energy_kwh: Energy | None = None
    average_power_kw: Annotated[float, Field(strict=True, ge=0, le=1e6)] | None = None

    @field_validator("start", "end", mode="before")
    @classmethod
    def require_datetime_or_iso_text(cls, value):
        if not isinstance(value, (datetime, str)):
            raise ValueError("timestamps must be ISO-8601 text or datetime values")
        return value

    @model_validator(mode="after")
    def validate_interval(self):
        if self.start.utcoffset() is None or self.end.utcoffset() is None:
            raise ValueError("interval timestamps must include a timezone offset")
        if not (2 <= self.start.year <= 9998 and 2 <= self.end.year <= 9998):
            raise ValueError("interval years must lie between 2 and 9998")
        self.start = self.start.astimezone(timezone.utc)
        self.end = self.end.astimezone(timezone.utc)
        duration = self.end - self.start
        if duration <= timedelta(0) or duration > timedelta(days=7):
            raise ValueError("each interval must have positive duration of at most seven days")
        if (self.energy_kwh is None) == (self.average_power_kw is None):
            raise ValueError("provide exactly one of energy_kwh or average_power_kw")
        return self


class DemandTariffPeriod(AnalyticsModel):
    period_id: str = Field(min_length=1, max_length=100)
    weekdays: list[Annotated[int, Field(strict=True, ge=0, le=6)]] = Field(min_length=1, max_length=7)
    start_hour: Annotated[int, Field(strict=True, ge=0, le=23)]
    end_hour: Annotated[int, Field(strict=True, ge=1, le=24)]
    rate_inr_per_kwh: Rate

    @model_validator(mode="after")
    def validate_window(self):
        if self.end_hour <= self.start_hour:
            raise ValueError("tariff end_hour must exceed start_hour; split overnight windows")
        if len(set(self.weekdays)) != len(self.weekdays):
            raise ValueError("tariff weekdays must be unique")
        if self.period_id == "default":
            raise ValueError("period_id 'default' is reserved for the base tariff")
        return self


class DemandAnalysisRequest(AnalyticsModel):
    intervals: list[DemandInterval] = Field(min_length=1, max_length=10000)
    source: str = Field(min_length=3, max_length=500)
    base_tariff_inr_per_kwh: Rate = 0
    tariff_periods: list[DemandTariffPeriod] = Field(default_factory=list, max_length=50)
    tariff_utc_offset_minutes: Annotated[int, Field(strict=True, ge=-840, le=840)] = 0

    @model_validator(mode="after")
    def validate_records(self):
        ordered = sorted(self.intervals, key=lambda record: record.start)
        if any(right.start < left.end for left, right in zip(ordered, ordered[1:])):
            raise ValueError("demand intervals must not overlap")
        if ordered and ordered[-1].end - ordered[0].start > timedelta(days=366):
            raise ValueError("a demand assessment must span at most 366 days; analyze longer histories separately")
        if len({period.period_id for period in self.tariff_periods}) != len(self.tariff_periods):
            raise ValueError("tariff period_id values must be unique")
        for index, first in enumerate(self.tariff_periods):
            for second in self.tariff_periods[index + 1:]:
                if set(first.weekdays) & set(second.weekdays) and max(first.start_hour, second.start_hour) < min(first.end_hour, second.end_hour):
                    raise ValueError("tariff periods must not overlap on a shared weekday")
        return self


class DemandTariffSummary(AnalyticsModel):
    period_id: str
    energy_kwh: Nonnegative
    observed_hours: Nonnegative
    rate_inr_per_kwh: Nonnegative
    cost_inr: Nonnegative


class DemandAnalysisResponse(AnalyticsModel):
    contract_version: Literal["1.0"] = "1.0"
    source: str
    interval_count: int
    observation_start: datetime
    observation_end: datetime
    observed_hours: Nonnegative
    elapsed_hours: Nonnegative
    coverage_fraction: Fraction
    total_energy_kwh: Nonnegative
    mean_observed_power_kw: Nonnegative
    peak_interval_average_kw: Nonnegative
    peak_interval_start: datetime
    load_factor: Fraction
    estimated_energy_cost_inr: Nonnegative
    tariff_breakdown: list[DemandTariffSummary]
    assumptions: list[str]


class FutureExpense(AnalyticsModel):
    year: Annotated[int, Field(strict=True, ge=1, le=50)]
    cost_inr: Money
    description: str = Field(default="Replacement or other expense", min_length=1, max_length=200)


class FinancialScenarioRequest(AnalyticsModel):
    installation_cost_inr: Money
    upfront_subsidy_inr: Money = 0
    first_year_generation_kwh: Energy
    onsite_consumption_fraction: Fraction
    import_tariff_inr_per_kwh: Rate
    export_tariff_inr_per_kwh: Rate = 0
    annual_maintenance_inr: Money = 0
    lifetime_years: Annotated[int, Field(strict=True, ge=1, le=50)] = 25
    annual_degradation_fraction: Degradation = 0.005
    tariff_escalation_fraction: Annotated[float, Field(strict=True, ge=-0.5, le=0.5)] = 0
    maintenance_escalation_fraction: Annotated[float, Field(strict=True, ge=-0.5, le=0.5)] = 0
    discount_rate_fraction: Annotated[float, Field(strict=True, ge=0, le=1)] = 0.08
    future_expenses: list[FutureExpense] = Field(default_factory=list, max_length=100)
    final_salvage_value_inr: Money = 0
    assumptions_source: str = Field(min_length=3, max_length=500)

    @model_validator(mode="after")
    def validate_financial_inputs(self):
        if self.upfront_subsidy_inr > self.installation_cost_inr:
            raise ValueError("upfront subsidy cannot exceed installation cost")
        if any(expense.year > self.lifetime_years for expense in self.future_expenses):
            raise ValueError("future expense year exceeds the scenario lifetime")
        return self


class FinancialYear(AnalyticsModel):
    year: int
    generation_kwh: Nonnegative
    onsite_consumed_kwh: Nonnegative
    exported_kwh: Nonnegative
    avoided_import_cost_inr: Nonnegative
    export_revenue_inr: Nonnegative
    maintenance_cost_inr: Nonnegative
    other_expenses_inr: Nonnegative
    salvage_value_inr: Nonnegative
    net_cash_flow_inr: Number
    discounted_cash_flow_inr: Number
    cumulative_cash_flow_inr: Number
    cumulative_discounted_cash_flow_inr: Number


class FinancialScenarioResponse(AnalyticsModel):
    contract_version: Literal["1.0"] = "1.0"
    assumptions_source: str
    net_upfront_cost_inr: Nonnegative
    first_year_net_savings_inr: Number
    lifetime_generation_kwh: Nonnegative
    lifetime_net_cash_flow_inr: Number
    net_present_value_inr: Number
    irr_pct: Number | None
    irr_status: Literal["unique", "zero_initial_investment", "no_positive_return", "non_conventional_cash_flows", "outside_supported_range"]
    simple_payback_years: Nonnegative | None
    discounted_payback_years: Nonnegative | None
    annual_cash_flows: list[FinancialYear]
    assumptions: list[str]


class EnvironmentalImpactRequest(AnalyticsModel):
    first_year_generation_kwh: Energy
    displaced_emissions_kg_co2e_per_kwh: Annotated[float, Field(strict=True, ge=0, le=5)]
    emissions_factor_source: str = Field(min_length=3, max_length=500)
    lifetime_years: Annotated[int, Field(strict=True, ge=1, le=100)] = 25
    annual_degradation_fraction: Degradation = 0.005
    embodied_emissions_kg_co2e: Annotated[float, Field(strict=True, ge=0, le=1e15)] = 0


class EnvironmentalYear(AnalyticsModel):
    year: int
    generation_kwh: Nonnegative
    avoided_operational_kg_co2e: Nonnegative
    cumulative_net_kg_co2e: Number


class EnvironmentalImpactResponse(AnalyticsModel):
    contract_version: Literal["1.0"] = "1.0"
    emissions_factor_source: str
    first_year_avoided_kg_co2e: Nonnegative
    lifetime_generation_kwh: Nonnegative
    lifetime_avoided_operational_kg_co2e: Nonnegative
    embodied_emissions_kg_co2e: Nonnegative
    lifetime_net_avoided_kg_co2e: Number
    carbon_payback_years: Nonnegative | None
    annual_impact: list[EnvironmentalYear]
    assumptions: list[str]
