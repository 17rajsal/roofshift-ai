"""Pure, deterministic version 1 analytical engines.

These functions require validated typed requests and return typed responses.
They do not read projects, mutate storage, fetch weather, geocode addresses or
assume a live forecast. API adapters provide provenance and persist assessments.
"""

import calendar
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from app.schemas.feature_analytics import (
    DemandAnalysisRequest, DemandAnalysisResponse, DemandTariffSummary,
    EnvironmentalImpactRequest, EnvironmentalImpactResponse, EnvironmentalYear,
    ExcludedSolarSite, FinancialScenarioRequest, FinancialScenarioResponse,
    FinancialYear, MonthlySolarPrediction, RankedSolarSite, SolarLocationRequest,
    SolarLocationResponse, SolarPredictionRequest, SolarPredictionResponse,
)


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance on a mean-radius Earth, including the date line."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi, dlambda = phi2 - phi1, math.radians(lon2 - lon1)
    haversine = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(min(1.0, max(0.0, haversine))))


def find_solar_locations(request: SolarLocationRequest) -> SolarLocationResponse:
    """Rank only supplied candidates by annual horizontal-screening generation.

    capacity = usable area / area per kWp; annual yield = daily GHI × 365 ×
    performance ratio × (1 - shading). Scores normalize to the best eligible
    site's annual generation. Ties use site_id for deterministic ordering.
    This is a screening calculation, not structural or electrical approval.
    """
    eligible, excluded = [], []
    for candidate in request.candidates:
        area = candidate.roof_area_sqm * candidate.usable_roof_fraction
        distance = None
        if request.reference_latitude is not None:
            distance = _distance_km(request.reference_latitude, request.reference_longitude, candidate.latitude, candidate.longitude)
        reasons = []
        if area <= 0:
            reasons.append("No usable roof area")
        elif area < request.minimum_usable_area_sqm:
            reasons.append("Usable roof area is below the minimum")
        if candidate.ghi_kwh_m2_day < request.minimum_ghi_kwh_m2_day:
            reasons.append("Daily GHI is below the minimum")
        if candidate.shading_loss_pct > request.maximum_shading_loss_pct:
            reasons.append("Shading loss exceeds the maximum")
        if request.maximum_distance_km is not None and distance > request.maximum_distance_km:
            reasons.append("Distance exceeds the search radius")
        if reasons:
            excluded.append(ExcludedSolarSite(site_id=candidate.site_id, reasons=reasons))
            continue
        capacity = area / request.area_sqm_per_kwp
        yield_per_kwp = candidate.ghi_kwh_m2_day * 365 * request.performance_ratio * (1 - candidate.shading_loss_pct / 100)
        eligible.append(dict(
            site_id=candidate.site_id, name=candidate.name, latitude=candidate.latitude,
            longitude=candidate.longitude, usable_roof_area_sqm=area,
            screening_capacity_kwp=capacity, annual_generation_kwh=capacity * yield_per_kwp,
            annual_specific_yield_kwh_per_kwp=yield_per_kwp, distance_km=distance,
            irradiance_source=candidate.irradiance_source, data_basis=candidate.data_basis,
        ))
    eligible.sort(key=lambda item: (-item["annual_generation_kwh"], item["site_id"]))
    best = eligible[0]["annual_generation_kwh"] if eligible else 0.0
    ranked = [RankedSolarSite(rank=index + 1, score_pct=min(100.0, 100 * item["annual_generation_kwh"] / best) if best > 0 else 0.0, **item)
              for index, item in enumerate(eligible[:request.max_results])]
    return SolarLocationResponse(
        ranked_sites=ranked, excluded_sites=excluded, eligible_sites_count=len(eligible),
        assumptions=[
            "Only supplied candidate roofs are searched; no geocoder or global roof inventory is queried.",
            "Generation uses supplied mean daily horizontal GHI over a 365-day screening year; no tilt/transposition or temperature adjustment.",
            "Performance ratio excludes the separately applied shading loss; annual generation determines ranking, not profit or structural feasibility.",
            "Scores are relative to eligible supplied sites, not certified site suitability; engineering approval and local permissions are required.",
        ],
    )


def predict_solar(request: SolarPredictionRequest) -> SolarPredictionResponse:
    """Project monthly AC kWh using supplied irradiation and loss assumptions.

    kWh = kWp × daily GHI × calendar days × POA multiplier × PR × shading
    multiplier × max(0, 1 + temperature coefficient × (cell°C - 25)) × age loss.
    Bounds are a user-defined sensitivity range, never a calibrated probability.
    """
    degradation = (1 - request.annual_degradation_fraction) ** request.age_years
    common = request.capacity_kwp * request.plane_of_array_multiplier * request.performance_ratio * (1 - request.shading_loss_pct / 100) * degradation
    monthly = []
    for item in sorted(request.monthly_irradiance, key=lambda item: item.month):
        days = calendar.monthrange(request.year, item.month)[1]
        temperature = max(0.0, 1 + request.temperature_coefficient_per_c * (item.mean_cell_temperature_c - 25))
        energy = common * item.ghi_kwh_m2_day * days * temperature
        monthly.append(MonthlySolarPrediction(
            month=item.month, days=days, ghi_kwh_m2_day=item.ghi_kwh_m2_day,
            temperature_multiplier=temperature, generation_kwh=energy,
            lower_generation_kwh=energy * (1 - request.uncertainty_fraction),
            upper_generation_kwh=energy * (1 + request.uncertainty_fraction),
        ))
    annual = math.fsum(item.generation_kwh for item in monthly)
    return SolarPredictionResponse(
        year=request.year, annual_generation_kwh=annual,
        annual_lower_generation_kwh=math.fsum(item.lower_generation_kwh for item in monthly),
        annual_upper_generation_kwh=math.fsum(item.upper_generation_kwh for item in monthly),
        specific_yield_kwh_per_kwp=annual / request.capacity_kwp if request.capacity_kwp > 0 else 0.0,
        monthly_predictions=monthly, irradiance_source=request.irradiance_source,
        data_basis=request.data_basis,
        assumptions=[
            "A deterministic calendar-year projection from supplied monthly irradiation; no live weather forecast is fetched.",
            "GHI-to-plane-of-array multiplier is supplied and defaults to 1; orientation, horizon shading and snow are not inferred.",
            "Performance ratio excludes the separately applied shading and temperature effects; avoid counting those losses twice.",
            "Cell temperature defaults to 25°C; temperature multiplier is clipped at zero and age degradation applies to every month.",
            "The lower/upper range is an assumption-based sensitivity range, not a statistical confidence interval or guaranteed yield.",
        ],
    )


def analyze_demand(request: DemandAnalysisRequest) -> DemandAnalysisResponse:
    """Integrate non-overlapping intervals and allocate energy to tariff windows.

    For energy readings, implied interval-average kW = kWh / observed hours.
    For average-kW readings, interval kWh = kW × hours. Tariff crossings split
    energy in proportion to duration, assuming constant power within each record.
    Missing intervals contribute neither zero energy nor zero power to averages.
    """
    records = sorted(request.intervals, key=lambda item: item.start)
    local_zone = timezone(timedelta(minutes=request.tariff_utc_offset_minutes))
    buckets = {"default": {"energy": 0.0, "hours": 0.0, "rate": request.base_tariff_inr_per_kwh}}
    for period in request.tariff_periods:
        buckets[period.period_id] = {"energy": 0.0, "hours": 0.0, "rate": period.rate_inr_per_kwh}
    energies, durations = [], []
    peak_start, peak = records[0].start, -1.0
    for record in records:
        hours = (record.end - record.start).total_seconds() / 3600
        power = record.average_power_kw if record.average_power_kw is not None else record.energy_kwh / hours
        energy = power * hours if record.average_power_kw is not None else record.energy_kwh
        energies.append(energy)
        durations.append(hours)
        if power > peak:
            peak, peak_start = power, record.start
        cursor, end = record.start.astimezone(local_zone), record.end.astimezone(local_zone)
        # Day boundaries and tariff boundaries exactly partition each interval.
        while cursor < end:
            day_start = datetime(cursor.year, cursor.month, cursor.day, tzinfo=local_zone)
            relevant = [period for period in request.tariff_periods if cursor.weekday() in period.weekdays]
            boundaries = [day_start + timedelta(hours=24)]
            boundaries.extend(day_start + timedelta(hours=hour) for period in relevant for hour in (period.start_hour, period.end_hour))
            segment_end = min(end, min(boundary for boundary in boundaries if boundary > cursor))
            midpoint_hour = ((cursor - day_start).total_seconds() + (segment_end - cursor).total_seconds() / 2) / 3600
            matching = next((period for period in relevant if period.start_hour <= midpoint_hour < period.end_hour), None)
            key = matching.period_id if matching else "default"
            segment_hours = (segment_end - cursor).total_seconds() / 3600
            buckets[key]["hours"] += segment_hours
            buckets[key]["energy"] += power * segment_hours
            cursor = segment_end
    total, observed = math.fsum(energies), math.fsum(durations)
    elapsed = (records[-1].end - records[0].start).total_seconds() / 3600
    breakdown = [DemandTariffSummary(period_id=key, energy_kwh=item["energy"], observed_hours=item["hours"],
                                    rate_inr_per_kwh=item["rate"], cost_inr=item["energy"] * item["rate"])
                 for key, item in buckets.items()]
    mean = total / observed
    return DemandAnalysisResponse(
        source=request.source, interval_count=len(records), observation_start=records[0].start,
        observation_end=records[-1].end, observed_hours=observed, elapsed_hours=elapsed,
        coverage_fraction=min(1.0, observed / elapsed), total_energy_kwh=total,
        mean_observed_power_kw=mean, peak_interval_average_kw=peak, peak_interval_start=peak_start,
        load_factor=min(1.0, mean / peak) if peak > 0 else 0.0,
        estimated_energy_cost_inr=math.fsum(item.cost_inr for item in breakdown), tariff_breakdown=breakdown,
        assumptions=[
            "kW input is interval-average power, not an instantaneous sample; kWh input is interval energy, not cumulative meter-register readings.",
            "Uniform power within each interval is assumed when allocating energy across tariff boundaries.",
            "Gaps are excluded from observed-hour mean power and load factor; coverage reports their impact without inventing readings.",
            "Peak is the maximum interval-average power, not an instantaneous demand peak or a demand-charge measurement.",
            "Tariffs use the supplied fixed UTC offset and Monday=0 weekday numbering; daylight-saving transitions require separately specified intervals/rates.",
            "Cost includes energy tariffs only; fixed charges, taxes and demand charges are excluded.",
        ],
    )


def _first_payback(cash_flows: list[float]) -> float | None:
    """First cumulative recovery, interpolating uniformly within a cash-flow year."""
    cumulative = cash_flows[0]
    if cumulative >= 0:
        return 0.0
    for year, flow in enumerate(cash_flows[1:], 1):
        previous = cumulative
        cumulative += flow
        if previous < 0 <= cumulative:
            return year - 1 + (-previous / flow)
    return None


def _irr(cash_flows: list[float]) -> tuple[float | None, str]:
    """Find the unique IRR when there is exactly one cash-flow sign change.

    NPV(r) = sum(CF_t / (1+r)^t) = 0, r > -1. Non-conventional cash flows
    with multiple sign changes have no single reported IRR. At negative rates
    NPV is scaled by (1+r)^N to prevent overflow without changing its roots.
    """
    if cash_flows[0] == 0:
        return None, "zero_initial_investment"
    nonzero = [flow for flow in cash_flows if flow != 0]
    if not any(flow > 0 for flow in nonzero):
        return None, "no_positive_return"
    if sum((left < 0) != (right < 0) for left, right in zip(nonzero, nonzero[1:])) != 1:
        return None, "non_conventional_cash_flows"
    # Remove zero terminal cash flows so scaling does not underflow a root's sign.
    last = max(index for index, flow in enumerate(cash_flows) if flow != 0)
    flows = cash_flows[:last + 1]

    def value(rate):
        if rate < 0:
            growth = 1 + rate
            return math.fsum(flow * growth ** (last - year) for year, flow in enumerate(flows))
        inverse = 1 / (1 + rate)
        return math.fsum(flow * inverse ** year for year, flow in enumerate(flows))

    low, high = math.nextafter(-1.0, 0.0), 1.0
    if value(low) <= 0:
        return None, "outside_supported_range"
    for _ in range(1000):
        if value(high) <= 0:
            break
        high *= 2
        if high > 1e300:
            return None, "outside_supported_range"
    else:
        return None, "outside_supported_range"
    for _ in range(200):
        middle = low + (high - low) / 2
        if middle == low or middle == high:
            break
        if value(middle) > 0:
            low = middle
        else:
            high = middle
    result = low + (high - low) / 2
    if not math.isfinite(result * 100) or result <= -1:
        return None, "outside_supported_range"
    return result * 100, "unique"


def calculate_financial_scenario(request: FinancialScenarioRequest) -> FinancialScenarioResponse:
    """End-of-year nominal INR cash flows; year zero is net upfront investment.

    Generation degrades from year 2. Both supplied energy tariffs escalate from
    year 2; O&M escalates independently. Replacement costs occur in their given
    nominal-cost year; salvage enters only the final year. All costs are net
    supplied amounts: taxes, loans and incentives are never implicitly invented.
    """
    upfront = request.installation_cost_inr - request.upfront_subsidy_inr
    expenses = defaultdict(float)
    for expense in request.future_expenses:
        expenses[expense.year] += expense.cost_inr
    annual, flows, discounted = [], [-upfront], [-upfront]
    cumulative, cumulative_discounted = -upfront, -upfront
    for year in range(1, request.lifetime_years + 1):
        generation = request.first_year_generation_kwh * (1 - request.annual_degradation_fraction) ** (year - 1)
        onsite = generation * request.onsite_consumption_fraction
        export = generation - onsite
        escalation = (1 + request.tariff_escalation_fraction) ** (year - 1)
        avoided = onsite * request.import_tariff_inr_per_kwh * escalation
        export_income = export * request.export_tariff_inr_per_kwh * escalation
        maintenance = request.annual_maintenance_inr * (1 + request.maintenance_escalation_fraction) ** (year - 1)
        salvage = request.final_salvage_value_inr if year == request.lifetime_years else 0.0
        net = avoided + export_income - maintenance - expenses[year] + salvage
        present = net / (1 + request.discount_rate_fraction) ** year
        cumulative += net
        cumulative_discounted += present
        flows.append(net)
        discounted.append(present)
        annual.append(FinancialYear(
            year=year, generation_kwh=generation, onsite_consumed_kwh=onsite, exported_kwh=export,
            avoided_import_cost_inr=avoided, export_revenue_inr=export_income,
            maintenance_cost_inr=maintenance, other_expenses_inr=expenses[year], salvage_value_inr=salvage,
            net_cash_flow_inr=net, discounted_cash_flow_inr=present,
            cumulative_cash_flow_inr=cumulative, cumulative_discounted_cash_flow_inr=cumulative_discounted,
        ))
    irr, irr_status = _irr(flows)
    return FinancialScenarioResponse(
        assumptions_source=request.assumptions_source, net_upfront_cost_inr=upfront,
        first_year_net_savings_inr=annual[0].net_cash_flow_inr,
        lifetime_generation_kwh=math.fsum(item.generation_kwh for item in annual),
        lifetime_net_cash_flow_inr=math.fsum(flows), net_present_value_inr=math.fsum(discounted),
        irr_pct=irr, irr_status=irr_status, simple_payback_years=_first_payback(flows),
        discounted_payback_years=_first_payback(discounted), annual_cash_flows=annual,
        assumptions=[
            "Year zero pays installation cost less the supplied upfront subsidy; subsequent cash flows occur at each year end.",
            "Onsite consumption fraction is supplied and held constant; self-consumed and exported energy sum to generation in every year.",
            "Generation degrades from year 2; tariffs and maintenance escalate independently in nominal INR.",
            "Replacement expenses are supplied nominal year costs; final salvage is received in the final year only.",
            "Payback is the first cumulative cash-flow crossing, linearly interpolated within a year; later large expenses may reverse recovery.",
            "IRR is reported only for one-sign-change cash flows with a representable unique root; multiple sign changes return no single IRR.",
            "No taxes, financing, demand-charge savings, eligibility rules or additional subsidies are inferred.",
        ],
    )


def calculate_environmental_impact(request: EnvironmentalImpactRequest) -> EnvironmentalImpactResponse:
    """Operational displacement = generation × supplied kg CO2e/kWh factor.

    Degradation starts in year 2. User-supplied embodied emissions are subtracted
    once at year zero; carbon payback is the first gross operational recovery.
    """
    rows, generations, avoided_values = [], [], []
    cumulative = -request.embodied_emissions_kg_co2e
    for year in range(1, request.lifetime_years + 1):
        generation = request.first_year_generation_kwh * (1 - request.annual_degradation_fraction) ** (year - 1)
        avoided = generation * request.displaced_emissions_kg_co2e_per_kwh
        cumulative += avoided
        generations.append(generation)
        avoided_values.append(avoided)
        rows.append(EnvironmentalYear(year=year, generation_kwh=generation,
                                      avoided_operational_kg_co2e=avoided, cumulative_net_kg_co2e=cumulative))
    gross = math.fsum(avoided_values)
    return EnvironmentalImpactResponse(
        emissions_factor_source=request.emissions_factor_source,
        first_year_avoided_kg_co2e=avoided_values[0], lifetime_generation_kwh=math.fsum(generations),
        lifetime_avoided_operational_kg_co2e=gross, embodied_emissions_kg_co2e=request.embodied_emissions_kg_co2e,
        lifetime_net_avoided_kg_co2e=gross - request.embodied_emissions_kg_co2e,
        carbon_payback_years=_first_payback([-request.embodied_emissions_kg_co2e, *avoided_values]),
        annual_impact=rows,
        assumptions=[
            "Generation is multiplied by the supplied displacement factor held constant for the scenario lifetime; no official grid factor is fetched.",
            "Generation degrades from year 2. The supplied factor must represent the intended self-consumption/export displacement accounting boundary.",
            "Embodied emissions, if supplied, are subtracted once; zero means they were not supplied, not that manufacturing has no emissions.",
            "Operational avoided emissions are a scenario estimate, not a certified carbon credit or a complete lifecycle assessment.",
        ],
    )
