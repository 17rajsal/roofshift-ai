import asyncio
import itertools
import random
from decimal import Decimal
from types import SimpleNamespace

import httpx
import pytest
from pydantic import ValidationError

from app.services.optimization.budget_solver import solve_multiple_choice_knapsack, evaluate_capacity_option, generate_decision_explanations
from app.services.optimization.optimizer_service import run_project_optimization
from app.services.solar.solar_engine import calculate_building_solar_potential
from app.services.solar.nasa_power import fetch_solar_irradiance, MONTH_KEYS
from app.services.energy.balance import monthly_balance, HOURLY_SOLAR_WEIGHTS, HOURLY_DEMAND_WEIGHTS, DAYS_IN_MONTH
from app.services.energy.surplus_analyzer import analyze_project_energy_surplus
from app.services.scheduling.load_shifter import find_best_operating_window, optimize_energy_scheduling, activity_profile, export_profile, calendar_export_profile
from app.models.scheduling import EnergyActivity
from app.schemas.optimization import OptimizeRequest
from app.schemas.building import BuildingUpdate
from app.schemas.project import ProjectUpdate
from app.schemas.scheduling import EnergyActivityCreate


def option(cost, value, ident):
    return dict(cost_inr=cost, savings_inr=value, annual_gen_kwh=value * 2, onsite_kwh=value * 3,
                capacity_kwp=int(cost > 0), option_id=ident)


@pytest.mark.parametrize("objective,key", [("MAXIMIZE_SAVINGS", "savings_inr"),
    ("MAXIMIZE_GENERATION", "annual_gen_kwh"), ("MAXIMIZE_ONSITE_UTILIZATION", "onsite_kwh")])
def test_exact_solver_random_oracle(objective, key):
    rng = random.Random(1701)
    for case in range(100):
        groups = [[option(0, 0, f"{g}-0")] + [option(rng.randrange(1, 300000) / 100,
                  rng.randrange(1, 10000) / 100, f"{g}-{o}") for o in range(3)] for g in range(4)]
        budget = rng.randrange(1, 600000) / 100
        feasible = [choices for choices in itertools.product(*groups)
                    if sum(Decimal(str(c["cost_inr"])) for c in choices) <= Decimal(str(budget))]
        expected = max(sum(Decimal(str(c[key])) for c in choices) for choices in feasible)
        chosen, value = solve_multiple_choice_knapsack(groups, budget, objective)
        assert len(chosen) == len(groups)
        assert all(c in g for c, g in zip(chosen, groups))
        assert sum(Decimal(str(c["cost_inr"])) for c in chosen) <= Decimal(str(budget))
        assert value == pytest.approx(float(expected))
        assert solve_multiple_choice_knapsack(groups, budget, objective) == (chosen, value)


def test_non_aligned_cost_counterexample_and_tie():
    groups = [[option(0, 0, "none"), option(1000, 10, "pv")] for _ in range(2)]
    assert solve_multiple_choice_knapsack(groups, 2000, "MAXIMIZE_SAVINGS")[1] == 20
    groups = [[option(1000, 10, "dear"), option(999.99, 10, "cheap")]]
    assert solve_multiple_choice_knapsack(groups, 1000, "MAXIMIZE_SAVINGS")[0][0]["option_id"] == "cheap"


@pytest.mark.parametrize("groups,budget,objective", [([[]], 100, "MAXIMIZE_SAVINGS"),
    ([[option(101, 1, "pv")]], 100, "MAXIMIZE_SAVINGS"),
    ([[option(-1, 1, "pv")]], 100, "MAXIMIZE_SAVINGS"),
    ([[option(0, 0, "none")]], float("inf"), "MAXIMIZE_SAVINGS"),
    ([[option(0, 0, "none")]], -1, "MAXIMIZE_SAVINGS"),
    ([[option(0, 0, "none")]], 1, "TYPO")])
def test_solver_rejects_corrupt_or_infeasible(groups, budget, objective):
    with pytest.raises(ValueError):
        solve_multiple_choice_knapsack(groups, budget, objective)


def test_empty_plan_and_zero_budget():
    assert solve_multiple_choice_knapsack([], 0, "MAXIMIZE_SAVINGS") == ([], 0)
    assert solve_multiple_choice_knapsack([[option(0, 0, "none")]], 0, "MAXIMIZE_SAVINGS")[1] == 0


@pytest.mark.parametrize("maximum,step", [(.01, .1), (.19, .2), (.49, .5), (1.99, .5), (0, .1)])
def test_service_never_exceeds_fractional_capacity(engine_db, engine_building, maximum, step):
    project, building = engine_building
    building.max_eligible_kwp = maximum
    engine_db.commit()
    result = asyncio.run(run_project_optimization(project.id, OptimizeRequest(budget_inr=1000000, capacity_step_kwp=step), engine_db))
    alloc = result.allocations[0]
    assert alloc.max_capacity_kwp == maximum
    assert alloc.recommended_capacity_kwp <= maximum
    assert alloc.recommended_capacity_kwp == maximum
    assert alloc.is_selected == (maximum > 0)
    assert alloc.capacity_utilization_pct == (100 if maximum > 0 else 0)
    assert result.total_allocated_inr <= 1000000
    assert result.total_onsite_consumed_kwh + result.total_exported_kwh == pytest.approx(result.total_annual_generation_kwh, abs=.2)


def test_zero_export_and_performance_overrides_are_respected(engine_db, engine_building):
    project, _ = engine_building
    result = asyncio.run(run_project_optimization(project.id, OptimizeRequest(budget_inr=1000000, override_export_tariff=0), engine_db))
    assert result.total_annual_savings_inr == pytest.approx(result.total_onsite_consumed_kwh * project.tariff_rate, abs=.5)
    zero = asyncio.run(run_project_optimization(project.id, OptimizeRequest(budget_inr=1000000, performance_ratio_multiplier=0), engine_db))
    assert zero.total_capacity_kwp == zero.total_annual_generation_kwh == zero.total_annual_savings_inr == 0


def test_generation_conservation_and_zero_installation(engine_db, engine_building):
    project, building = engine_building
    analysis = asyncio.run(calculate_building_solar_potential(building, project, engine_db))
    assert analysis.max_pv_capacity_kwp == 10
    assert analysis.annual_generation_kwh == pytest.approx(10 * 5 * 365 * .75)
    assert sum(analysis.monthly_generation_kwh) == pytest.approx(analysis.annual_generation_kwh)
    assert analysis.annual_onsite_consumed_kwh + analysis.annual_exported_kwh == pytest.approx(analysis.annual_generation_kwh)
    value = evaluate_capacity_option(10, building, project, {m: 5 for m in MONTH_KEYS}, 1, .75, 8, 3, 50000)
    assert value['onsite_kwh'] == pytest.approx(analysis.annual_onsite_consumed_kwh)
    with pytest.raises(ValueError, match='exceeds'):
        asyncio.run(calculate_building_solar_potential(building, project, engine_db, override_capacity_kwp=10.001))
    project.co2_factor = 0
    zero = asyncio.run(calculate_building_solar_potential(building, project, engine_db, override_capacity_kwp=0))
    assert zero.annual_generation_kwh == zero.installation_cost_inr == zero.avoided_co2_kg_annual == 0
    assert zero.simple_payback_years is None
    engine_db.refresh(analysis)
    assert analysis.annual_generation_kwh > 0  # override does not overwrite full-roof analysis


def test_hourly_monthly_annual_energy_agree(engine_db, engine_building):
    project, building = engine_building
    asyncio.run(calculate_building_solar_potential(building, project, engine_db))
    result = asyncio.run(analyze_project_energy_surplus(project.id, engine_db))
    assert sum(HOURLY_SOLAR_WEIGHTS) == pytest.approx(1)
    assert sum(HOURLY_DEMAND_WEIGHTS) == pytest.approx(1)
    for monthly in result.monthly_trends:
        assert monthly.onsite_solar_kwh + monthly.surplus_export_kwh == pytest.approx(monthly.solar_generation_kwh)
        assert monthly.onsite_solar_kwh + monthly.grid_import_kwh == pytest.approx(monthly.electricity_demand_kwh)
    for hourly in result.hourly_profile:
        assert hourly.onsite_solar_used_kw + hourly.solar_surplus_kw == pytest.approx(hourly.solar_generation_kw)
        assert hourly.onsite_solar_used_kw + hourly.grid_import_kw == pytest.approx(hourly.electricity_demand_kw)
    assert sum(p.solar_generation_kw for p in result.hourly_profile) * 365 == pytest.approx(result.total_annual_generation_kwh)
    assert sum(p.electricity_demand_kw for p in result.hourly_profile) * 365 == pytest.approx(result.total_annual_demand_kwh)
    assert sum(p.onsite_solar_used_kw for p in result.hourly_profile) * 365 == pytest.approx(result.total_onsite_solar_kwh)
    assert sum(p.surplus_export_kwh for p in result.monthly_trends) == pytest.approx(result.total_surplus_kwh)


@pytest.mark.parametrize('share', [0, 50, 100])
def test_daytime_share_and_balance_bounds(share):
    balance = monthly_balance([1000] * 12, 500, share)
    assert sum(balance['demand_hourly'][6:18]) * 365 == pytest.approx(6000 * share / 100)
    assert sum(balance['onsite']) <= min(12000, 6000 * share / 100)
    assert all(v >= 0 for k in ('onsite', 'export', 'grid') for v in balance[k])


@pytest.mark.parametrize('duration', [.5, 1.25, 2.5, 3.75])
def test_fractional_schedule_exact_energy_and_headroom(duration):
    act = SimpleNamespace(duration_hours=duration, power_kw=20, earliest_hour=10, latest_hour=24, preferred_hour=18)
    available = [0] * 24
    available[10:15] = [10] * 5
    start, absorbed, headroom = find_best_operating_window(act, available, [100] * 24)
    assert start + duration <= 24
    assert sum(activity_profile(start, duration, act.power_kw)) == pytest.approx(20 * duration)
    assert absorbed <= headroom
    assert absorbed == pytest.approx(10 * duration)
    assert find_best_operating_window(act, [0] * 24, [100] * 24)[1:] == (0, 0)


def test_midnight_finish_and_infeasible_window():
    act = SimpleNamespace(duration_hours=1, power_kw=10, earliest_hour=23, latest_hour=24, preferred_hour=23)
    assert find_best_operating_window(act, [10] * 24, [10] * 24)[0] == 23
    act.duration_hours = 1.5
    with pytest.raises(ValueError):
        find_best_operating_window(act, [10] * 24, [10] * 24)
    # Two half-hour coincident loads cannot consume an entire hour's PV.
    slots = {'a': (10, .5, 20), 'b': (10, .5, 20)}
    assert sum(export_profile(slots, [10] * 24)) == pytest.approx(235)


def test_scheduling_no_double_counting_and_annual_frequency(engine_db, engine_building):
    project, building = engine_building
    building.monthly_consumption_kwh = 10
    engine_db.commit()
    asyncio.run(calculate_building_solar_potential(building, project, engine_db))
    for idx, frequency in enumerate((3, 7)):
        engine_db.add(EnergyActivity(project_id=project.id, name=f'Pump {idx}', power_kw=50,
            duration_hours=2.5, earliest_hour=10, latest_hour=15, preferred_hour=18, days_per_week=frequency, is_shiftable=True))
    engine_db.commit()
    energy = asyncio.run(analyze_project_energy_surplus(project.id, engine_db))
    result = asyncio.run(optimize_energy_scheduling(project.id, engine_db))
    assert sum(p.baseline_load_kw for p in result.hourly_comparison) == pytest.approx(sum(p.shifted_load_kw for p in result.hourly_comparison))
    assert result.daily_solar_absorption_gain_kwh == pytest.approx(result.daily_surplus_before_kwh - result.daily_surplus_after_kwh)
    assert result.daily_solar_absorption_gain_kwh <= result.daily_surplus_before_kwh
    assert result.annual_solar_absorption_gain_kwh == pytest.approx(result.daily_solar_absorption_gain_kwh * 365)
    assert result.annual_financial_gain_inr == pytest.approx(sum(r.estimated_annual_savings_inr for r in result.recommendations))
    assert result.annual_solar_absorption_gain_kwh <= energy.total_surplus_kwh
    assert result.co2_reduction_gain_kg == 0  # unchanged generation/export already credited
    assert all(r.recommended_start_hour + r.duration_hours <= 15 for r in result.recommendations)


def test_zero_tariff_margin_has_no_invented_savings(engine_db, engine_building):
    project, building = engine_building
    project.export_tariff = project.tariff_rate
    engine_db.add(EnergyActivity(project_id=project.id, name='Legal original', power_kw=5,
        duration_hours=.5, earliest_hour=8, latest_hour=22, preferred_hour=18, days_per_week=7, is_shiftable=True))
    engine_db.commit()
    result = asyncio.run(optimize_energy_scheduling(project.id, engine_db))
    assert result.annual_financial_gain_inr == 0
    assert result.daily_solar_absorption_gain_kwh == 0
    assert result.recommendations[0].recommended_start_hour == 18


@pytest.mark.parametrize('model,payload', [
    (BuildingUpdate, {'gross_roof_area': -1}), (BuildingUpdate, {'gross_roof_area': None}),
    (BuildingUpdate, {'latitude': 200}), (BuildingUpdate, {'fixed_cost': float('inf')}),
    (ProjectUpdate, {'budget': -1}), (ProjectUpdate, {'tariff_rate': None}),
    (OptimizeRequest, {'budget_inr': float('inf')}), (OptimizeRequest, {'budget_inr': 100, 'objective': 'TYPO'}),
    (OptimizeRequest, {'budget_inr': 100, 'override_cost_per_kwp': -1}),
    (EnergyActivityCreate, {'name': 'bad', 'power_kw': 1, 'duration_hours': 2, 'earliest_hour': 12, 'latest_hour': 13}),
])
def test_invalid_inputs_rejected_before_persistence(model, payload):
    with pytest.raises(ValidationError):
        model(**payload)


@pytest.mark.parametrize('missing', [0, 5, 12])
def test_nasa_partial_missing_data_and_cache_provenance(engine_db, monkeypatch, missing):
    values = {m: (-999 if i < missing else 5) for i, m in enumerate(MONTH_KEYS)}
    calls = []
    async def get(client, url, *args, **kwargs):
        calls.append(url)
        return httpx.Response(200, request=httpx.Request('GET', url), json={'properties': {'parameter': {'ALLSKY_SFC_SW_DWN': values}}})
    monkeypatch.setattr(httpx.AsyncClient, 'get', get)
    first = asyncio.run(fetch_solar_irradiance(20.1234, 70.5678, engine_db))
    second = asyncio.run(fetch_solar_irradiance(20.1234, 70.5678, engine_db))
    assert len(calls) == 1
    assert second[0] == first[0]
    assert first[1] == pytest.approx(sum(first[0][m] * d for m, d in zip(MONTH_KEYS, DAYS_IN_MONTH)) / 365)
    if missing:
        assert 'fallback' in first[3].lower()
        assert 'fallback' in second[3].lower()
        assert 'verified' not in first[3].lower().replace('not location-verified', '')
    else:
        assert 'NASA POWER' in first[2]


def test_explanation_uses_actual_yield(engine_building):
    project, building = engine_building
    opt = dict(capacity_kwp=1, annual_gen_kwh=200, onsite_kwh=100, savings_inr=100, cost_inr=50000)
    reasons, _, _ = generate_decision_explanations(building, opt, 10, 'MAXIMIZE_SAVINGS', 100000, 50000, .2)
    assert any('200 kWh/kWp' in reason for reason in reasons)
    assert all('1,400' not in reason and 'Highly favorable' not in reason for reason in reasons)


@pytest.mark.parametrize('kind', ['timeout', 'status', 'malformed'])
def test_nasa_outage_is_labeled_illustrative(engine_db, monkeypatch, kind):
    async def get(client, url, *args, **kwargs):
        if kind == 'timeout':
            raise httpx.ReadTimeout('fixture outage')
        return httpx.Response(503 if kind == 'status' else 200, request=httpx.Request('GET', url),
                              content=b'not JSON')
    monkeypatch.setattr(httpx.AsyncClient, 'get', get)
    monthly, annual, source, label = asyncio.run(fetch_solar_irradiance(10, 70, engine_db))
    assert len(monthly) == 12
    assert annual > 0
    assert 'Illustrative' in source and 'fallback' in label
    assert 'NISE' not in source and 'IMD' not in source


def test_zero_irradiance_is_valid_and_legacy_cache_replaced(engine_db, monkeypatch):
    from app.models.solar_cache import SolarDataCache
    engine_db.add(SolarDataCache(grid_lat=0, grid_lon=0, ghi_monthly={m: 6 for m in MONTH_KEYS},
                 ghi_annual=6, source='NASA POWER Climatology'))
    engine_db.commit()
    async def get(client, url, *args, **kwargs):
        return httpx.Response(200, request=httpx.Request('GET', url), json={
            'properties': {'parameter': {'ALLSKY_SFC_SW_DWN': {m: 0 for m in MONTH_KEYS}}}})
    monkeypatch.setattr(httpx.AsyncClient, 'get', get)
    monthly, annual, source, label = asyncio.run(fetch_solar_irradiance(0, 0, engine_db))
    assert sum(monthly.values()) == annual == 0
    assert 'v3' in source and 'Illustrative' not in source


def test_api_invalid_patch_does_not_modify_working_building(engine_db, engine_building):
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db
    project, building = engine_building
    original_area = building.gross_roof_area
    def override():
        yield engine_db
    prior = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override
    try:
        client = TestClient(app)
        for payload in ({'gross_roof_area': -1}, {'gross_roof_area': None}, {'latitude': 200}, {'cost_per_kwp': -1}):
            response = client.patch(f'/api/v1/buildings/{building.id}', json=payload)
            assert response.status_code == 422
            engine_db.refresh(building)
            assert building.gross_roof_area == original_area
        assert client.patch(f'/api/v1/projects/{project.id}', json={'budget': -1}).status_code == 422
        assert client.post(f'/api/v1/projects/{project.id}/optimize', json={'budget_inr': 100, 'objective': 'BAD'}).status_code == 422
        assert client.post(f'/api/v1/projects/{project.id}/activities', json={
            'name': 'Wrong project', 'building_id': 'missing', 'power_kw': 1, 'duration_hours': 1
        }).status_code == 422
    finally:
        if prior is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = prior


def test_negative_margin_retains_legal_schedule(engine_db, engine_building):
    project, _ = engine_building
    project.export_tariff = project.tariff_rate + 1
    engine_db.add(EnergyActivity(project_id=project.id, name='Export valuable', power_kw=5,
        duration_hours=1.25, earliest_hour=8, latest_hour=22, preferred_hour=18, days_per_week=3, is_shiftable=True))
    engine_db.commit()
    result = asyncio.run(optimize_energy_scheduling(project.id, engine_db))
    assert result.recommendations[0].recommended_start_hour == 18
    assert result.annual_financial_gain_inr == result.annual_solar_absorption_gain_kwh == 0


def test_large_discrete_plan_is_exact_without_combination_enumeration():
    groups = [[option(0, 0, f'{i}-0')] + [option(1000 * j, j * 10, f'{i}-{j}') for j in range(1, 6)]
              for i in range(100)]
    chosen, value = solve_multiple_choice_knapsack(groups, 100000, 'MAXIMIZE_SAVINGS')
    assert len(chosen) == 100
    assert sum(c['cost_inr'] for c in chosen) == 100000
    assert value == 1000


def test_weekly_frequency_applied_after_actual_power_clipping():
    available = [[0.0] * 24 for _ in range(12)]
    for row in available:
        row[11] = 5
    frequencies = {'pump': 1}
    original = {'pump': (18, 1, 10)}
    shifted = {'pump': (11, 1, 10)}
    gain = sum(calendar_export_profile(original, available, frequencies)) - sum(calendar_export_profile(shifted, available, frequencies))
    assert gain == pytest.approx(5 / 7)
    assert gain / (1 / 7) == pytest.approx(5)  # not ten kWh/session
    assert gain * 365 == pytest.approx(5 * 365 / 7)


def test_monthly_headroom_clipped_before_seasonal_averaging():
    available = [[0.0] * 24 for _ in range(12)]
    available[0][11] = 20
    frequencies = {'pump': 7}
    original, shifted = {'pump': (18, 1, 10)}, {'pump': (11, 1, 10)}
    gain = sum(calendar_export_profile(original, available, frequencies)) - sum(calendar_export_profile(shifted, available, frequencies))
    assert gain * 365 == pytest.approx(10 * 31)


def test_baseline_currency_cents_identical_budget_feasibility():
    from app.services.optimization.baseline_solver import run_baseline_first_feasible
    buildings = [SimpleNamespace(id='A', name='A', gross_roof_area=2), SimpleNamespace(id='B', name='B', gross_roof_area=1)]
    options = {'A': [option(0, 0, 'zero'), option(.2, 10, 'A')], 'B': [option(0, 0, 'zero'), option(.1, 10, 'B')]}
    allocations, cost, savings, _, _ = run_baseline_first_feasible(buildings, None, .3, options, 'MAXIMIZE_SAVINGS')
    assert cost == .3 and savings == 20


def test_explicit_resource_limits_never_return_approximate_plan(engine_db, engine_building, monkeypatch):
    from app.services.optimization import budget_solver
    monkeypatch.setattr(budget_solver, 'MAX_SOLVER_TRANSITIONS', 1)
    with pytest.raises(ValueError, match='transition limit'):
        solve_multiple_choice_knapsack([[option(0, 0, 'none'), option(1, 1, 'pv')]], 10, 'MAXIMIZE_SAVINGS')
    project, building = engine_building
    building.gross_roof_area = 10000000
    engine_db.commit()
    with pytest.raises(ValueError, match='capacity option limit'):
        asyncio.run(run_project_optimization(project.id, OptimizeRequest(budget_inr=1000000, capacity_step_kwp=.1), engine_db))


def test_capital_cost_uses_decimal_half_up_once():
    from app.services.energy.balance import installation_cost
    assert installation_cost(1, 1999.995, 0) == 2000
    assert installation_cost(.1, 9999.95, 0) == 1000
    assert installation_cost(0, 50000, 1000) == 0
