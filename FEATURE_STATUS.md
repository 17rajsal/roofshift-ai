# RoofShift AI — Platform Feature Status & Operational Verification

**Release Version:** 9.0 Verified Production Release  
**Branch:** `feature/ai-model-training-integration`  
**Test Suite:** 243 / 243 Backend Tests Passing (100%)  
**Production Build:** Clean TypeScript & Vite compilation (0 errors)  
**Data Integrity:** Sourced MNRE/NISE 2014 Wasteland Assessment (748.98 GWp), NASA POWER 20-Yr Climatology, Open-Meteo NWP (SI m/s Units), Verified OpenStreetMap Screening  

---

## 1. Flagship India Solar Intelligence Platform

| Feature | Description | Status | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Interactive India Solar Map** | Vector Leaflet map centered on `[22.8°N, 79.5°E]` displaying all 36 Indian States & UTs with responsive hotspots. | ✅ Production Ready | Rendered cleanly via `IndiaSolarMap.tsx` |
| **Multi-Layer Intelligence Switcher** | 1-click toggling between GHI Irradiance, Ambient Temperature, Wind Speed (m/s), Cloud Attenuation, Rooftop, Open-Land, and Engineering Composite Score. | ✅ Production Ready | Interactive pills in map header bar; Open-Meteo queries explicitly verified with `&wind_speed_unit=ms`. |
| **Smart Area Insight Panel** | Sliding glassmorphic drawer displaying detailed climatology, dual suitability comparison bars, and tailored engineering recommendations. | ✅ Production Ready | Rendered cleanly on region select (`IndiaRegionInsightPanel.tsx`) |
| **Dual Suitability Assessment** | Explicit mathematical separation of commercial rooftop feasibility vs. open-land utility-scale ground mount suitability. | ✅ Production Ready | Verified in `india_solar_intelligence.py` and API endpoints; open-land includes unverified terrain/grid/eligibility labels. |
| **Transparent Data Provenance Modal** | One-click dialogue clearly isolating real NASA/IMD baselines, Open-Meteo NWP forecasts, and micro-scale GIS boundaries. Zero fabricated claims. | ✅ Production Ready | `IndiaDataProvenanceModal.tsx` accessible via map toolbar |
| **Multi-Scale Spatial Drilldown** | National Map $\rightarrow$ State/Corridor $\rightarrow$ City/District $\rightarrow$ Site/Campus $\rightarrow$ Building Rooftop. | ✅ Production Ready | Verified seamless view switching in `WorkspaceHub.tsx` |

---

## 2. Core 12 Platform Features (Preserved & Integrated)

| # | Feature Name | Primary Endpoint | Status | Scientific & Operational Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **3D Obstacle & Roof Boundary Mapping** | `POST /api/v1/projects/{id}/buildings` | ✅ Active | Convex hull, usable percentage (75% default), setback zones, structural load disclaimer. |
| **2** | **NASA POWER Solar Climatology** | `GET /api/v1/solar-intelligence/regions` | ✅ Active | 20-year satellite irradiance baseline; raises `InsufficientSolarDataError` when unverified fallback disallowed. |
| **3** | **0/1 Knapsack Budget Optimization** | `POST /api/v1/projects/{id}/optimize` | ✅ Active | Exact dynamic programming solver maximizing annual savings under Capex limit with decision explanations. |
| **4** | **Hourly Load Profiling & Surplus** | `GET /api/v1/projects/{id}/energy-insights` | ✅ Active | Solar generation vs facility demand curves with net export accounting. |
| **5** | **Smart Activity Load Shifting** | `POST /api/v1/projects/{id}/activities` | ✅ Active | Shifting deferrable loads to peak midday surplus windows; fractional duration exact absorbing. |
| **6** | **Inverter Degradation Telemetry** | `GET /api/v1/projects/{id}/monitoring` | ✅ Active | Photovoltaic fleet performance monitoring and PR ratio diagnostics. |
| **7** | **Thermal & Visual Inspection** | `POST /api/v1/buildings/{id}/panel-inspection` | ✅ Active | Real MobileNetV3-Small RGB neural network (86.4% test accuracy, 0.864 Macro-F1, abstain threshold <0.65) paired with aerial radiometric LWIR thermography for hotspots. |
| **8** | **Preventive Maintenance Management**| `POST /api/v1/projects/{id}/maintenance-cases` | ✅ Active | Work orders, soiling loss tracking, status workflows, technician dispatch. |
| **9** | **Audit-Ready PDF Executive Reports** | `POST /api/v1/projects/{id}/reports` | ✅ Active | ReportLab generator producing downloadable PDF dossiers with preserved snapshot immutability. |
| **10**| **Geocoding & Location Search** | `GET /api/v1/geocoding/search` | ✅ Active | Nominatim integration with sanitized coordinate clamping. |
| **11**| **Machine Learning PV Forecasting** | `POST /api/v1/solar-ml/forecast`<br>`POST /api/v1/solar-ml/dated-forecast` | ✅ Active | Retrained XGBoost regressor (Test MAE: 0.00729 kW/kWp, $R^2 = 0.99673$) consuming real-time Open-Meteo dated NWP shortwave radiation and wind in m/s. |
| **12**| **Multi-Scale Portfolio Batching** | `POST /api/v1/projects/{id}/buildings/bulk-import` | ✅ Active | Batch CSV / GeoJSON ingestion validated at 500+ building scale. |

---

## 3. Machine Learning Model Inventory

| Model Identifier | Architecture | Task | Benchmark Metric | Status | Artifact Location |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `solar_xgboost_v1.joblib` | Gradient Boosted Trees (150 estimators, depth 4) | 15-min & Hourly Normalized PV Output ($0.0 \le y \le 1.0$) | Test MAE: 0.00729 kW/kWp, Test $R^2 = 0.99673$, nMAE: 4.00% | ✅ Operational | `backend/app/services/ml/artifacts/solar_xgboost_v1.joblib` |
| `panel_mobilenet_v3.pt` | MobileNetV3-Small (~1.52M params, AdamW) | Panel Visual Inspection (Clean vs Soiled, Abstain <0.65) | Test Acc: 86.44%, Macro-F1: 0.8641, Support: 59 images | ✅ Operational | `backend/app/services/ml/artifacts/panel_mobilenet_v3.pt` |

---

## 4. Engineering Assumptions & Safeguards

* **Wind Speed Units:** Open-Meteo is explicitly queried with `&wind_speed_unit=ms` and verified. Never converts or displays km/h in m/s fields.
* **Weather Provenance:** Differentiates between `"current_modeled_forecast"` (Open-Meteo NWP) and `"regional_planning_normal"` (IMD normals).
* **Suitability Index:** Documented as deterministic Engineering Suitability Index v8.3 with no artificial score floor clamps.
* **Open-Land Screening:** Explicitly disclaims terrain slope, cadastral land ownership, and transmission grid capacity.
* **Structural Certification:** OSM rooftop screenings are desktop approximations requiring registered structural engineer certification prior to installation.
