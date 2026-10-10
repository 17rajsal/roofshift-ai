# Advanced engine delivery

Branch: `codex/advanced-engines`. Shared parent: `1e8227904c1b07a675d0983bcd2f06e73ec0a86f`.
Delivery date: 10 October 2026 (Asia/Calcutta). Resolve the actual committed delivery SHA with `git rev-parse codex/advanced-engines`; this document does not invent a future SHA.

This branch changes backend algorithms and the minimum shared input/response contracts needed to make their results correct. It does not replace the application checkout, alter frontend routing/styles, infrastructure, project persistence, rooftop drawing, or the verified PDF checkpoint. Expanded features and financial scenarios are delivered separately on `codex/solar-feature-expansion`.

## Implemented behavior

- Budget optimizer: exact multiple-choice Pareto-frontier dynamic programming using Decimal monetary and objective values, without rounded INR buckets. Selects one supplied choice per building, including explicit no-installation choices. Ties choose lower cost. Three established objectives and the additive self-consumption alias are supported. No feasible plan, corrupted input or resource exhaustion raises a clear error rather than returning an infeasible or approximate result.
- Candidate generation: honors the requested 0.1-5 kWp step, explicit zero tariff/export/PR overrides, fixed installation charges, a zero eligibility cap and exact physical roof endpoints. The endpoint is included even below one step. Capacity is never rounded upward beyond roof eligibility. Baseline greedy comparison uses identical Decimal budget feasibility.
- Solar generation: `kWp × monthly GHI kWh/m²/day × calendar days × PR × unshaded fraction`. PR is 0-1; shading is 0-100%. Common 365-day, non-leap planning year. Capacity override above physical eligibility is rejected; valid overrides return transient scenario analyses without overwriting canonical full-roof analysis. Zero capacity has no fixed installation charge, generation, savings or payback. Explicit zero emissions factors are respected.
- Energy conservation: solar, optimizer and insights use one shared synthetic monthly representative-day model. Each building's declared daytime demand share is allocated to 06:00-18:00; no storage or undeclared inter-building netting. For every month and hourly mean, generation equals onsite plus export; demand equals onsite plus grid import. Monthly bills remain equal kWh/month, rather than being redistributed by month length. Seasonal generation follows the stored GHI-derived shape. Summed hourly flows match annual balances; averaging is performed after nonlinear onsite/export clipping.
- Load scheduling: exact fractional session energy and partial-hour overlap. Feasible integer start times satisfy earliest start and latest exclusive finish, including 24:00. All activities enter the original and recommended profiles at their full power on assumed operating weekdays, before clipping to real monthly exported PV headroom. Multiple activities cannot claim the same surplus twice. Financial value is actual incremental onsite absorption multiplied by purchase tariff minus export tariff; zero/negative margins retain a legal original schedule. Greedy decisions are deterministic and explicitly not claimed as joint global optima.
- Carbon accounting: generated PV, including exports, earns the existing grid-emissions credit. Shifting the same exported generation onsite adds **zero** system-wide avoided CO2. No curtailment or extra generation is invented.
- Irradiance provenance: valid NASA POWER model values include zero; missing/sentinel/nonfinite/out-of-range values are replaced with clearly labeled illustrative defaults. Mixed and fallback labels survive caching. Cache uses the same four-decimal coordinates as requests, 30-day model TTL, 1-hour composite/fallback TTL and a versioned source marker to replace unverifiable legacy caches. Annual average is weighted by calendar days. The example fallback is no longer presented as verified NISE/IMD data.
- API validation: finite bounded create/PATCH/optimizer/activity values; no null required PATCH fields; activity windows validated before persistence; building references must belong to the activity's project. Explanations derive yield/payback from calculated values, without fabricated performance adjectives.

## Backend function contracts

Existing imports and argument order remain compatible:

| Interface | Result and semantics |
|---|---|
| `solar.solar_engine.calculate_building_solar_potential(building, project, db, area_per_kwp=8, performance_ratio=.75, override_capacity_kwp=None)` | `SolarAnalysis`; canonical full-roof result persisted only without capacity override. With override, transient result has physical ceiling in `max_pv_capacity_kwp` and evaluated capacity explicitly in `calculation_notes`. |
| `solar.nasa_power.fetch_solar_irradiance(lat, lon, db)` | `(dict of JAN-DEC GHI, day-weighted annual mean GHI, source, quality label)`; existing cache table, no migration. |
| `optimization.budget_solver.evaluate_capacity_option(...)` | Existing capacity/cost/generation/onsite/export/savings dict. Capital cost multiplies decimal capacity × decimal unit price plus fixed charge, then rounds once to paise with `ROUND_HALF_UP`, identically in solar analysis. Energy remains unrounded until presentation. |
| `optimization.budget_solver.solve_multiple_choice_knapsack(groups, budget, objective)` | `(chosen supplied choices, objective value)`; exact among finite supplied options. Zero budget is valid at helper level. Negative/nonfinite input, empty groups or infeasible plans raise `ValueError`. |
| `optimization.optimizer_service.run_project_optimization(project_id, request, db)` | Existing `OptimizationRunResponse` and persisted `OptimizationRun`, with corrected arithmetic and truthful solver scope. |
| `energy.surplus_analyzer.analyze_project_energy_surplus(project_id, db)` | Existing `EnergyInsightsResponse`, plus `monthly_hourly_surplus_kw`, a 12 × 24 list of representative monthly exported-power bins for scheduling. |
| `scheduling.load_shifter.find_best_operating_window(activity, available_surplus, solar_gen)` | `(integer start, gross absorbed surplus kWh/session, available window surplus kWh)`; synthetic solar alone never counts as free surplus. |
| `scheduling.load_shifter.optimize_energy_scheduling(project_id, db)` | Existing `SchedulingOptimizationResponse`; recommendation gain is **incremental per operating session**, aggregate daily gain is calendar average, annual gain is daily average ×365. Registered activities are additional loads above declared building baseload. |
| `intelligence.investment_intel.solve_with_ortools_knapsack(groups, budget, objective)` | Existing three-item return, now consistently delegates to the verified Decimal solver; optional OR-Tools truncation removed. |

All routes remain under `/api/v1`. Existing route paths and required response fields are preserved: building/solar analyses, project `optimize` and optimization history, `energy-insights`, `activities` and `schedule-optimize`. Invalid API payloads return 422. Service-level optimization constraint/resource errors return 400 through the existing route. The solar endpoint's monthly breakdown uses the shared coincidence balance.

`latest_hour` is the exclusive latest finish (0-24), not latest start. Activity preferred starts must finish by midnight. A declared 2.5-hour session retains 2.5 hours; it is not rounded to 2 or 3. The weekly pattern assumes Monday through the first `days_per_week` weekdays, and uses a stationary seven-day pattern across the non-leap model year. There is no calendar/date-specific forecast.

Resource limits: at most 5,000 step-generated capacity choices per building, 50,000 supplied choices per solver request, 50,000 unpruned states, and 5,000,000 DP transitions. Exceeding a limit produces an explicit failure and never silently substitutes a heuristic. API bounds prevent numeric overflow: roof area ≤10,000,000 m²; monthly demand ≤10¹² kWh; tariff ≤10⁶ INR/kWh; cost ≤10⁹ INR/kWp; fixed cost and budget ≤10¹⁵ INR; eligible capacity and activity power ≤10⁶; emissions factor ≤1000 kg/kWh. Existing normal projects remain within these bounds.

## Dependencies and storage

No new runtime dependencies, SQL columns, tables or destructive migrations. The one response addition is `EnergyInsightsResponse.monthly_hourly_surplus_kw`. Existing historical optimization/solar records are preserved. Recalculate canonical solar analyses and run a fresh optimization after integration or changing inputs; historical runs remain historical and are not relabeled as proof of the new solver. Optional OR-Tools is no longer used for investment decisions, but requirements are not removed because other application capabilities may use it.

## Verification

The complete backend suite runs against disposable SQLite/report/upload directories, with deterministic NASA fixtures. Real AWS and live NASA availability are not tested. Run from `backend`: `python -m pytest tests -q -p no:cacheprovider`.

The added suite includes 300 independent exhaustive-oracle cases across all three objective fields; currency-cents and INR bucket counterexamples; 100-building exact solving; deterministic cheaper ties; infeasible/corrupt and resource-limit rejection; fractional roof ceilings/zero scenarios; solar/optimizer/monthly/hourly conservation; zero-capacity persistence protection; fractional and midnight scheduling; coincident partial loads; weekly full-power and seasonal clipping regressions; no double counting; zero/negative tariff margins; CO2 boundary consistency; finite PATCH/API failure before mutation; and NASA timeout/status/malformed/missing/zero/cache provenance tests.

Final complete suite: **75 passed, 0 failed**, 8.65 seconds; 213 deprecation warnings. The final run includes full-power weekly/seasonal, resource-limit, decimal half-up capital cost, and sub-step selected-capacity regressions. Tests require ordinary Windows temporary-file access; restricted sandbox SQLite creation failed before test collection, then the approved isolated run passed. The commit SHA is recorded by the accompanying delivery manifest. Warnings are existing SQLAlchemy model `datetime.utcnow()` and Starlette/AnyIO deprecations, plus equivalent timestamp usage in the retained cache/model interfaces.

NASA parameter/community contract references: [NASA POWER climatology API](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/) and [NASA POWER data/community methodology](https://power.larc.nasa.gov/docs/methodology/communities/). NASA data are satellite/model climatology, not measured site meter readings.

## Changed files

- `backend/app/api/v1/optimization.py`
- `backend/app/api/v1/scheduling.py`
- `backend/app/api/v1/solar.py`
- `backend/app/schemas/building.py`
- `backend/app/schemas/energy.py`
- `backend/app/schemas/optimization.py`
- `backend/app/schemas/project.py`
- `backend/app/schemas/scheduling.py`
- `backend/app/services/energy/balance.py` (new)
- `backend/app/services/energy/surplus_analyzer.py`
- `backend/app/services/intelligence/investment_intel.py`
- `backend/app/services/optimization/baseline_solver.py`
- `backend/app/services/optimization/budget_solver.py`
- `backend/app/services/optimization/optimizer_service.py`
- `backend/app/services/scheduling/load_shifter.py`
- `backend/app/services/solar/nasa_power.py`
- `backend/app/services/solar/solar_engine.py`
- `backend/tests/conftest.py` (new disposable storage/external fixture configuration)
- `backend/tests/test_advanced_engine_correctness.py` (new)
- `ADVANCED_ENGINE_DELIVERY.md` (this delivery contract)

## Integration and limitations

Preserve `antigravity/core-app` and all newer working source. Import this branch's commit/patch into an isolated integration checkout rooted in the shared history; apply `codex/solar-feature-expansion` next. Review conflicts in shared API/schema files manually. Keep Antigravity's PDF, persistent project selection, rooftop drawing and infrastructure changes. Run complete backend tests and a fresh demo optimization/energy/scheduling/report journey before accepting integration. No direct main merge, tree replacement or force push is part of this delivery.

There is no configured GitHub remote in this isolated checkout. The parent delivery supplies history-preserving patch/bundle artifacts and actual branch SHAs; no remote push is claimed. New GitHub configuration would be needed before publishing.

Numeric corrections change onsite/export and savings estimates; the former monthly-daytime shortcut overstated coincidence. Results remain synthetic planning estimates: no panel orientation/tilt, storage, curtailment, measured irradiance, grid topology, dated activity calendar, authentication or live telemetry is added here. Scheduling assumes shared electrical access to exported PV and treats activities as additional declared loads; do not register demand already included in building bills without first removing it from the baseload. Greedy scheduling can depend on deterministic activity-ID order and is not globally optimal. Exact budget DP may reject unusually large frontiers at documented resource limits. Illustrative India example irradiance fallback is unsuitable as certified resource assessment. Financial lifecycle/NPV/IRR scenarios and the nine additional application features belong to the separate expansion delivery.
