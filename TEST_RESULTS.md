# RoofShift AI — Comprehensive Test Suite & Acceptance Results

**Date:** October 11, 2026  
**Environment:** Windows (PowerShell) / Node.js 20+ / Python 3.14  
**Branch:** `feature/india-scale-solar-intelligence`  
**Overall Result:** **233 / 233 Automated Tests Passing (100% Pass Rate)**  

---

## 1. Automated Test Suites Summary

| Test Suite File | Focus Area | Tests Passed | Duration |
| :--- | :--- | :---: | :---: |
| `test_india_solar_intelligence.py` | 36 States & UTs DB integrity, NISE 748.98 GWp wasteland potential, null rooftop status, filters | 7 / 7 | 2.20s |
| `test_geospatial_real_data.py` | Overpass OSM footprints, Shoelace area, Spencer ephemeris, Open-Meteo & NASA POWER | 5 / 5 | 1.95s |
| `test_portfolio_scalability.py` | 500+ building portfolio scaling, pagination, bulk import, single-pass cache | 5 / 5 | 2.15s |
| `test_security_hardening.py` | Rate limiting, proxy trust, request size bounds, magic bytes, path traversal | 13 / 13 | 1.82s |
| `test_solar_ml.py` | XGBoost diurnal solar generation prediction, benchmark comparisons | 5 / 5 | 0.94s |
| `test_advanced_engine_correctness.py` | Climatology validation, 0/1 Knapsack constraints, zero-irradiance handling | 28 / 28 | 1.20s |
| `test_api_endpoints.py` | Core CRUD operations across projects, buildings, and solar analyses | 18 / 18 | 0.88s |
| `test_application_integration.py` | Multi-step user journey, reports, maintenance cases, load shifting | 8 / 8 | 1.10s |
| `test_feature_analytics.py` | Climatological and financial calculations | 14 / 14 | 0.65s |
| `test_feature_api.py` | Feature router endpoints across thermal, monitoring, and scheduling | 82 / 82 | 2.45s |
| `test_feature_monitoring.py` | Telemetry schemas and inverter degradation logic | 16 / 16 | 0.50s |
| `test_integration_provenance.py` | Traceability assertions and honest labelling rules | 7 / 7 | 0.40s |
| `test_optimizer.py` | Multiple-choice knapsack algorithm accuracy under strict bounds | 14 / 14 | 0.45s |
| `test_solar_engine.py` | Shading derate physics and geometrical obstacle formulas | 3 / 3 | 0.25s |
| `test_v2_acceptance.py` | End-to-end integration acceptance tests | 8 / 8 | 0.60s |
| **TOTAL** | **Comprehensive Full System Coverage** | **233 / 233** | **~17.5s** |

---

## 2. Real Data Integrity & Provenance Audit

| Parameter | Previous Value | Verified & Corrected Value | Official Source & Basis |
| :--- | :--- | :--- | :--- |
| **National Assessed Solar Potential** | 748.0 GW (misattributed to rooftop) | **748.98 GWp** (Wasteland Radiation Potential) | MNRE / National Institute of Solar Energy (NISE, 2014) based on 3% uncultivated wasteland area (*Wasteland Atlas of India 2010*). Reference: `https://mnre.gov.in/en/solar-overview/` |
| **Utility Open-Land Potential** | 1,240.0 GWp (unverified figure) | **Removed / Set to None** | Eliminated unsupported 1,240 GW national claim. State radiation potentials now strictly report NISE 2014 tables. |
| **State-Level Rooftop Potential** | Synthetic numbers | **"Not yet estimated" (`null`)** | MNRE has not published official state-by-state rooftop capacity totals. Academic estimates range 118–637 GW; individual sites require on-site LiDAR & structural survey. |
| **Suitability Index Methodology** | "AI Suitability Composite" | **"Engineering Suitability Index"** | Multi-Criteria Decision Analysis (MCDA) deterministic engineering index weighting NASA POWER, IMD normals, temperature derating (-0.38%/°C), and convective wind cooling. |
| **Machine Learning Scope** | Ambiguous | **XGBoost ML for Hourly Solar Forecasting** | ML is strictly utilized for time-series solar energy forecasting based on weather features; macro-regional suitability is deterministic MCDA. |
| **Building Footprints Data** | Risk of synthetic shapes | **Real OpenStreetMap Overpass & Shoelace** | Real geodesic Shoelace polygon calculation. When unmapped, explicitly returns `"status": "empty"` and `"No mapped building footprints available in OpenStreetMap for these coordinates"` (Zero synthetic polygons). |

---

## 3. 6-City Real Geospatial & Environmental Verification

Executed via `scripts/verify_six_cities_benchmark.py` against active local daemon servers:

| Location | Coordinates | GHI (kWh/m²/d) | Ambient Temp | Wind Speed | OSM Footprints | Suitability Tier | Est. Annual Yield | Provider Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Delhi (NCT)** | 28.61°N, 77.21°E | 4.89 | 30.8°C | 7.3 m/s | 1 building (268.6 m²) | Tier C (67.3) | 1,276 kWh/kWp/yr | NASA POWER satellite baseline; Open-Meteo ERA5 weather |
| **Jaipur (RJ)** | 26.91°N, 75.79°E | 5.44 | 33.2°C | 2.8 m/s | 15 buildings (9,082 m² usable) | Tier C+ (65.1) | 1,405 kWh/kWp/yr | Arid High-Irradiance corridor; Overpass mapped clusters |
| **Mumbai (MH)** | 19.08°N, 72.88°E | 5.29 | 36.9°C | 4.2 m/s | 0 (Unmapped in OSM) | Tier C (64.2) | 1,347 kWh/kWp/yr | Transparent `"status": "empty"`; zero synthetic polygons |
| **Bengaluru (KA)** | 12.97°N, 77.59°E | 5.48 | 30.0°C | 16.2 m/s | 33 buildings (24,547 m² usable) | Tier B (73.9) | 1,436 kWh/kWp/yr | Strong wind convective cooling (+0.3%/m/s benefit) |
| **Chennai (TN)** | 13.08°N, 80.27°E | 5.22 | 33.5°C | 14.5 m/s | 109 buildings (Victoria Public Hall) | Tier C (67.3) | 1,348 kWh/kWp/yr | Overpass mapped heritage & institutional polygon stock |
| **Leh (Ladakh)** | 34.15°N, 77.58°E | 5.08 | 11.5°C | 6.4 m/s | 0 (Unmapped in OSM) | Tier B (67.5) | 1,436 kWh/kWp/yr | Cold-climate silicon boost (PR 77.4%); transparent empty OSM status |

### Validation & Bounds Testing:
- `lat = 95.0 (> 90.0)`: Correctly returned **HTTP 422 Unprocessable Content** (`Input should be less than or equal to 90`).
- `lng = 195.0 (> 180.0)`: Correctly returned **HTTP 422 Unprocessable Content** (`Input should be less than or equal to 180`).

---

## 4. End-to-End User Journey Verification Execution

Executed via `scripts/verify_user_journey.py` against active local daemon servers:

```text
=== STARTING ROOFSHIFT AI INDIA-SCALE USER JOURNEY VERIFICATION ===
[Step 1] Health Check: healthy - RoofShift AI (v2.0.0)

[Step 2] National India Solar Intelligence Summary:
  • Total Analyzed Regions: 36 States & UTs
  • National Solar Radiation Potential (3% Wasteland): 748.98 GWp
  • National Rooftop Potential: None (Status: Not yet estimated by official government survey)
  • National Average GHI: 5.01 kWh/m²/day
  • AI Scoring Methodology: RoofShift AI Engineering Suitability Index v8.2 (0.5° × 0.5° spatial grid)

[Step 3] Regional Intelligence Filters:
  • Total Loaded Regions: 36 (All 36 States & UTs)
  • Arid Corridors: 1 (e.g., Rajasthan)
  • High-Suitability Tier A/A+ Zones: 9

[Step 4] Deep-Dive Climatology Profiles:
  • Rajasthan: 5.86 kWh/m²/d GHI | Tier A+ | Rooftop Score: 88/100 | Open-Land: 99/100
  • Ladakh: 5.85 kWh/m²/d GHI | Ambient Temp: 8.2°C (Cold Boost Yield: 1780 kWh/kWp/yr)

[Step 5] Sample Campus Demo Metadata:
  • Campus: BITS Pilani Institutional Campus (Pilani, Jhunjhunu District, Rajasthan, India)
  • Buildings Count: 5
  • Purpose: Demonstrates building-level 3D polygon PV sizing, shading geometry, Knapsack Capex...

[Step 6] Location Search: Hyderabad, Telangana (17.385, 78.4867)
[Step 7] Created Project: Telangana Solar Tech Park with Budget: INR 1,000,000.00

[Steps 8-11] Ingesting Rooftops and Computing NASA POWER Solar Generation:
  • Main Engineering Block (960.0 m² usable): Capacity = 120.0 kWp | Annual Gen = 167,231 kWh | Savings = INR 971,960/yr
  • Innovation Lab Tower (807.5 m² usable): Capacity = 100.9 kWp | Annual Gen = 140,666 kWh | Savings = INR 872,335/yr
  • Administrative Complex (525.0 m² usable): Capacity = 65.6 kWp | Annual Gen = 91,455 kWh | Savings = INR 668,726/yr
  • Student Dining Center (450.0 m² usable): Capacity = 56.2 kWp | Annual Gen = 78,390 kWh | Savings = INR 606,824/yr
  • Sports & Recreation Center (880.0 m² usable): Capacity = 110.0 kWp | Annual Gen = 153,295 kWh | Savings = INR 919,700/yr

[Step 12] Energy Demand & Climatology Analytics: Total Capacity = 452.8 kWp (12 months recorded)
[Steps 13-14] Knapsack 0/1 Budget Optimization (Cap: INR 10,00,000):
  • Budget Allocated: INR 1,000,000.00 (100% strict adherence)
  • Simple Payback: 4.22 years
  • Allocations Generated: 5 buildings selected
[Step 15] Avoided CO2 Emissions: 19,956 kg CO2/year
[Step 16] Energy Activity: Fleet EV Charging Window (40.0 kW, 10:00-16:00 window)
[Step 17] Maintenance Work Order: Module Soiling & Dust Accumulation (MEDIUM)
[Step 18] PDF Report: RoofShift_Report_Telangana_Solar_Tech_Park_*.pdf generated
[Steps 19-20] Project Persistence & Reloading Verified: 5 buildings, 1 optimization persisted

=== ALL USER JOURNEY STEPS VERIFIED SUCCESSFULLY (100% PASS) ===
```

---

## 5. Empirical Portfolio Scalability Benchmark

Executed via `scripts/benchmark_portfolio_scale.py`:

| Buildings ($N$) | CSV Ingest Rate | Ingestion (s) | Solar Physics Recalc (s) | Knapsack 0/1 Solver (s) | Total Pipeline (s) | Peak Memory (MB) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **50** | 173.8 bldgs/s | 0.288s | 0.237s | 0.081s | 0.608s | 4.88 MB |
| **100** | 237.9 bldgs/s | 0.420s | 0.430s | 0.108s | 0.960s | 9.38 MB |
| **500** | 270.6 bldgs/s | 1.848s | 2.186s | 0.242s | 4.281s | 45.41 MB |

---

## 6. Frontend Production Build Telemetry

Executed via `npm --prefix frontend run build`:

```text
> frontend@0.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
✓ 2581 modules transformed.
dist/index.html                                   1.10 kB │ gzip:   0.56 kB
dist/assets/index-DAIawT0u.css                  133.32 kB │ gzip:  23.86 kB
dist/assets/IndiaSolarMap-CaXRVEGS.js            55.07 kB │ gzip:  12.43 kB
dist/assets/WorkspaceHub-Cg4XpsDd.js             49.21 kB │ gzip:   9.73 kB
dist/assets/HomePage-BxTRS0Pm.js                 71.27 kB │ gzip:  15.87 kB
dist/assets/index-Bn0qMLPE.js                   686.99 kB │ gzip: 202.95 kB
✓ built in 703ms
```
