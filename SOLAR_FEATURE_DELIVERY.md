# RoofShift AI solar feature delivery

Branch: `codex/solar-feature-expansion`. Shared parent: `1e8227904c1b07a675d0983bcd2f06e73ec0a86f`. The exact committed SHA and file manifest accompany the delivery bundle; this branch does not incorporate or replace Antigravity's application branch.

## Implemented features and contracts

All new POST paths start with `/api/v1/projects/{project_id}/features/`. Each accepts the named strict Pydantic request, returns its corresponding response, persists the validated inputs/result, and supplies `X-Assessment-ID`. Existing projects must exist (404); invalid units, missing data, overlaps, nonfinite inputs or unsupported fields return 422. Calculation engines are pure functions; ORM/API adapters own project checks and persistence.

| Feature | POST suffix | Function in `services/features` | Request / response in `schemas` |
|---|---|---|---|
| Solar Location Finder | `solar-location-finder` | `analytics.find_solar_locations` | `feature_analytics.SolarLocationRequest` / `SolarLocationResponse` |
| Solar Prediction | `solar-prediction` | `analytics.predict_solar` | `SolarPredictionRequest` / `SolarPredictionResponse` |
| Electricity Demand Analysis | `demand-analysis` | `analytics.analyze_demand` | `DemandAnalysisRequest` / `DemandAnalysisResponse` |
| Cost & Savings Calculator | `cost-savings` | `analytics.calculate_financial_scenario` | `FinancialScenarioRequest` / `FinancialScenarioResponse` |
| Environmental Impact Calculator | `environmental-impact` | `analytics.calculate_environmental_impact` | `EnvironmentalImpactRequest` / `EnvironmentalImpactResponse` |
| Panel Fault Detection | `panel-fault-detection` | `monitoring.detect_panel_faults` | `feature_monitoring.PanelFaultDetectionRequest` / `PanelFaultDetectionResponse` |
| Performance Monitoring | `performance-monitoring` | `monitoring.monitor_performance` | `PerformanceMonitoringRequest` / `PerformanceMonitoringResponse` |
| Maintenance Recommendations | `maintenance-recommendations` | `monitoring.recommend_maintenance` | `MaintenanceRecommendationsRequest` / `MaintenanceRecommendationsResponse` |
| Expanded PDF reports | Existing `POST /api/v1/projects/{project_id}/reports` | `reports.pdf_generator.generate_project_pdf_report` | Existing report schemas, additive `include_features: bool = true` |

GET `.../features/templates` provides editable project-derived inputs and explicit data limitations. GET `.../features/latest` returns the latest saved result for every feature independently of history volume. GET `.../features/history?feature_key=...&limit=100` returns bounded newest-first history (1–100). Times are UTC with explicit offsets. Each result includes provenance/methodology or supplied assumptions. OpenAPI `/openapi.json` contains the complete concrete schemas; acceptance tests contain runnable minimal examples for every endpoint.

Units: money is INR; energy is kWh; power is kW; capacity is kWp; roof area is m²; irradiation is kWh/m²/day; irradiance is W/m²; emissions are kg CO2e. Fraction fields use 0–1, percent fields 0–100. Meter intervals require explicit start/end timezone offsets and exactly one of interval energy or interval-average power. A demand record is not a cumulative meter register. Known coverage excludes gaps, and tariffs split intervals at local fixed-offset boundaries. Demand supports at most 10,000 records within 366 days.

Finance pays net capex at year zero, discounts end-of-year nominal cash flows, degrades generation from year two, handles independently escalating O&M/tariffs, specified future expenses and final salvage. Payback is first cumulative recovery with within-year interpolation; subsequent expenses can reverse recovery. IRR is withheld for nonconventional multi-sign-change cash flows. The [IRR equation](https://numpy.org/doc/1.17/reference/generated/numpy.irr.html) defines the tested root; no financial-library dependency is added.

## Shared files and preservation

- The three report files start from Antigravity's verified working checkpoint: escaped multiline notes, unique filenames, actual scheduling-engine output and existing download/archive contracts are preserved. Expanded sections read saved assessment snapshots and never invent monitoring results. `include_features=false` omits the expansion; `include_scenarios=false` excludes the financial expansion. Large details are capped visibly in the PDF; full inputs/results remain in history.
- `backend/app/api/v1/api.py` adds only the feature router; existing route registration remains.
- `models/project.py` adds one assessment cascade relationship; `models/__init__.py` registers the new model. Existing project/building columns, roof polygons and database records are not replaced.
- New UI files are `SolarFeaturesPage.tsx` and `solarFeatureApi.ts`. The only existing frontend changes are one route/import and one sidebar item. On the newer lazy-loading application checkpoint, add the page via the existing lazy import pattern and `/solar-features` route, retaining `ApplicationShell`, keyed project routes, drawer behavior and persisted selection. Do not copy this branch's entire `App.tsx` or sidebar over the checkpoint. The new page cancels requests when project/feature changes, uses configured API origin, restores saved results, and presents editable forms rather than JSON.
- No map, project context, existing optimizer/surplus/scheduling page, Docker or AWS file is changed by this delivery.

## Database and dependencies

No new runtime or frontend dependency. One additive table, `feature_assessments`: string primary/project/feature identifiers, schema version, validated inputs/result JSON and UTC creation time; indexes on project and feature. Project deletion cascades through ORM and FK. Existing startup `Base.metadata.create_all()` creates it. For controlled DDL deployments, set `PYTHONPATH=backend` and run `python backend/scripts/create_feature_assessments.py` with the deployment's existing DATABASE_URL. This checks for the table before creating it and alters no existing columns. Back up the database before rollout. Rollback can leave this unused additive table intact; export its records before any deliberate table removal.

## Validation

Final standalone backend run: 133 passed (46 analytics, 45 diagnostics, 22 feature API/report, 20 existing acceptance/engine tests). Coverage includes hand-calculated generation/NPV/IRR, leap years, actual DST elapsed time, conservation, zero benefits, invalid inputs, concrete OpenAPI models, project isolation, persistence/cascade, diagnostics-to-maintenance, and report snapshots/toggles/literal notes/prior-file preservation. Frontend TypeScript and production build pass. Additional integration checks against the application checkpoint and advanced engine branch are recorded in the external delivery manifest. Existing datetime/Starlette deprecation warnings remain.

On Windows use a short writable pytest basetemp to avoid MAX_PATH in PDF fixtures. Run tests against a disposable database, never the user's campus database:

```powershell
$env:DATABASE_URL = 'sqlite:///./delivery-tests.db'
$env:AWS_ENABLED = 'false'
python -m pytest -o pythonpath=backend -p no:cacheprovider backend/tests -q --basetemp C:\temp\roofshift-tests
```

## Integration

Commit the verified application checkpoint first. Import the delivered branch refs from the Git bundle into a separate integration checkout; integrate advanced engines before feature expansion. Review shared report/API/schema hunks deliberately, retaining checkpoint code wherever it is newer. Both delivery branches descend from the shared baseline and can be merged; branch replacement/copying is unnecessary. The external manifest contains exact refs/SHAs, patch files and verified integration commands. Run backend checks, frontend build and project/map/optimizer/surplus/scheduling/report switching acceptance before promotion. No merge into main, cloud deployment or remote push was performed without a configured GitHub destination.

## Known limits

Location finding ranks supplied survey candidates; it does not discover arbitrary satellite rooftops. Predictions use supplied irradiation and physics assumptions; no forecast provider is connected, and sensitivity ranges are not statistical confidence intervals. Diagnostics require supplied telemetry/expectations; image classification and live acquisition are unsupported. Monitoring availability is known-status panel-hours, with missing coverage explicit. Maintenance uses configurable service intervals, not guessed manufacturer requirements. Financial results omit inferred loans/taxes/incentives; environmental scenarios use supplied displacement/embodied factors and are not carbon-credit certification. UI exposes common inputs; advanced optional tariff periods, future expenses and diagnostic-reference composition are available through typed APIs. Existing application authentication/authorization boundaries are inherited rather than replaced. Docker startup/AWS deployment are outside this code delivery.
