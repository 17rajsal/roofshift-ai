# RoofShift AI — 12-Feature Complete Implementation Specification

This document details the complete feature matrix implemented in **RoofShift AI**, mapping each capability to its user benefit, engineering mechanism, mathematical inputs, and verification status.

---

## Feature Matrix Overview

| # | Blueprint Feature | Primary User Benefit | Engineering Mechanism | Status |
|---|---|---|---|---|
| **1** | **Solar Location Finder** | Instant Indian campus geocoding on GIS map | OpenStreetMap Nominatim with Amazon Location Service adapter | **Verified & Active** |
| **2** | **Solar Energy Prediction** | Accurate physics-based annual generation (kWh) | NASA POWER Climatology API + 75% PR + shading geometry | **Verified & Active** |
| **3** | **Solar Panel Image Inspection** | Identifies cell hotspots, micro-cracks, and soiling | Deterministic gradient & color-space image classifier | **Verified & Active** |
| **4** | **Solar Performance Monitoring** | Validates empirical PR vs. design expectations | Inverter telemetry ingestion + NASA irradiance comparison | **Verified & Active** |
| **5** | **Smart Budget Optimization** | Maximizes annual ₹ bill savings under strict capex | Multiple-Choice Knapsack Problem (MCKP) Dynamic Programming | **Verified & Active** |
| **6** | **Electricity Demand Analysis** | Captures true facility daytime electricity usage | Dual-mode: Ingested meter CSV (Mode A) + Archetype synthesis (Mode B) | **Verified & Active** |
| **7** | **Solar Surplus Detection** | Eliminates uncompensated grid export waste | 24-hour diurnal solar bell curve vs. facility baseline demand | **Verified & Active** |
| **8** | **Smart Energy Scheduling** | Absorbs midday solar surplus with campus assets | Flexible load dispatcher (EV fleets, pumps, chiller pre-cooling) | **Verified & Active** |
| **9** | **Cost & Savings Calculation** | Realistic financial payback & cash flow modeling | Displaced grid import tariffs + DISCOM export net-metering rates | **Verified & Active** |
| **10** | **Environmental Impact Calculation** | Verified Scope 2 institutional carbon reporting | CEA India grid emissions factor ($0.716\text{ kg CO}_2/\text{kWh}$) | **Verified & Active** |
| **11** | **Maintenance Recommendations** | Prioritizes physical repairs by revenue impact | Automated ticket workflow with daily kWh derate metrics | **Verified & Active** |
| **12** | **Solar Intelligence Reports** | Instant investor-ready PDF executive proposal | Multi-page ReportLab PDF compiler with audit-trail notices | **Verified & Active** |

---

## Detailed Feature Specifications

### 1. Solar Location Finder
- **Description:** Interactive OpenStreetMap GIS canvas supporting instant geocoding across Indian cities and coordinates.
- **User Benefit:** Campus administrators can visually inspect their institutional grounds, draw rooftop boundary polygons, and view satellite imagery.
- **Inputs:** City name / campus search string, or direct latitude/longitude coordinates.
- **Outputs:** Latitude, longitude, bounding box, and geographic map center.
- **Verification:** Verified via `backend/tests/test_api_endpoints.py::test_geocoding_search` and interactive Leaflet map controls.

### 2. Solar Energy Prediction
- **Description:** Physics-grounded solar generation calculations factoring local monthly GHI, usable rooftop area, and ambient shading derating.
- **User Benefit:** Eliminates generic rule-of-thumb guesswork with scientific generation estimates.
- **Inputs:** Coordinates, usable roof area ($m^2$), shading profile (Low <8%, Medium 15%, High 30%, or custom %), and system capacity (kWp).
- **Formula:**
  $$E_{\text{annual}} = P_{\text{installed}} \times \overline{GHI} \times 365 \times PR \times (1 - \text{ShadeLoss})$$
- **Verification:** Verified via `backend/tests/test_solar_engine.py`.

### 3. Solar Panel Image Inspection
- **Description:** Optical and thermal drone image evaluation for automated anomaly detection.
- **User Benefit:** Detects localized hot-spots, heavy dust soiling, and glass micro-cracks before they cause string degradation.
- **Inputs:** Optical (RGB) or thermal infrared module photo (JPG, PNG, TIFF).
- **Outputs:** Anomaly classification (`NORMAL`, `SOILING`, `HOTSPOT`, `MICRO_CRACK`), severity (`LOW`, `MEDIUM`, `HIGH`), confidence score, and temperature delta ($\Delta T$).
- **Verification:** Verified via `backend/tests/test_v2_acceptance.py::test_panel_inspection_upload_and_summary`.

### 4. Solar Performance Monitoring
- **Description:** Telemetry comparison service comparing measured inverter energy logs against theoretical NASA POWER yield.
- **User Benefit:** Uncovers inverter tripping, grid curtailment, or gradual PID degradation.
- **Inputs:** Inverter generation CSV (`timestamp`, `generation_kwh`).
- **Outputs:** Empirical Performance Ratio (PR %), design PR deviation, annual degradation rate (%/year), and underperformance alerts.
- **Verification:** Verified via `backend/tests/test_v2_acceptance.py::test_monitoring_csv_upload_and_performance_ratio`.

### 5. Smart Budget Optimization
- **Description:** Multiple-Choice Knapsack Problem (MCKP) solver allocating capital across multiple candidate rooftops.
- **User Benefit:** Delivers the mathematically optimal solar capacity per facility to maximize monetary savings.
- **Fair Benchmark:** Automatically computes a greedy naive benchmark (largest roof first) to demonstrate the verifiable savings lift (e.g. +26.3% lift / +₹77.8k/yr on the demo campus).
- **Inputs:** Institutional budget ($B$), candidate rooftops, cost per kWp, grid tariffs.
- **Verification:** Verified via `backend/tests/test_optimizer.py` and `backend/tests/test_v2_acceptance.py`.

### 6. Electricity Demand Analysis
- **Description:** Dual-mode energy demand modeling. Supports Mode A (actual 15-minute or hourly metered consumption CSVs) and Mode B (institutional archetype diurnal synthesis).
- **User Benefit:** Prevents over-sizing solar systems beyond facility base loads.
- **Conservation Law:** Normalizes hourly diurnal weights to strictly conserve $\sum_{h=0}^{23} w_h = 1.0$, preventing energy inflation.
- **Verification:** Verified via `backend/tests/test_v2_acceptance.py::test_mode_a_demand_upload`.

### 7. Solar Surplus Detection
- **Description:** 24-hour diurnal coincidence analysis contrasting midday solar generation curves against campus daytime loads.
- **User Benefit:** Identifies exact hours when surplus solar energy is generated, preventing low-value feed-in exports.
- **Outputs:** Peak solar window (e.g., 10:30 AM – 02:30 PM), daily surplus kWh, and grid import requirements.
- **Verification:** Verified via `backend/tests/test_v2_acceptance.py::test_surplus_and_scheduling`.

### 8. Smart Energy Scheduling
- **Description:** Dispatches flexible electrical loads into peak solar generation hours.
- **User Benefit:** Shifts equipment like EV fleet chargers, water reservoir pumps, and HVAC pre-cooling to achieve maximum solar self-consumption.
- **Inputs:** Registered shiftable equipment with power draw (kW), operating duration (h), and operating days per week.
- **Outputs:** Recommended operating window, additional solar energy absorbed (kWh/session), and avoided peak grid purchase costs (₹/yr).
- **Verification:** Verified via `backend/tests/test_application_integration.py::test_scheduling_optimization`.

### 9. Cost & Savings Calculation
- **Description:** Transparent financial ledger calculating turnkey capex, annual utility bill reduction, and simple payback periods.
- **User Benefit:** Delivers executive-grade financial justifications for campus leadership.
- **Inputs:** Grid import tariff (e.g. ₹8.50/kWh), DISCOM export rate (e.g. ₹3.50/kWh), turnkey capex (₹/kWp), and fixed balance-of-system costs.
- **Outputs:** Annual savings (₹), net payback (years), and return on investment.
- **Verification:** Verified via `backend/tests/test_optimizer.py`.

### 10. Environmental Impact Calculation
- **Description:** Scope 2 indirect carbon emissions avoidance modeling.
- **User Benefit:** Supports institutional ESG sustainability reporting and green accreditation.
- **Standard Factor:** Central Electricity Authority (CEA) of India national grid emission benchmark of $0.716\text{ kg CO}_2/\text{kWh}$.
- **Verification:** Verified across all project and optimization endpoints.

### 11. Maintenance Recommendations
- **Description:** Preventive and corrective maintenance case tracking system tied directly to solar revenue impact.
- **User Benefit:** Enables facility technicians to log, prioritize, and resolve array issues before generation losses accumulate.
- **Outputs:** Issue category (`SOILING`, `INVERTER_FAULT`, `HOTSPOT`, etc.), priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), daily kWh loss estimate, and resolution tracking.
- **Verification:** Verified via `backend/tests/test_v2_acceptance.py::test_maintenance_lifecycle`.

### 12. Solar Intelligence Reports
- **Description:** Automated multi-page executive PDF proposal compiler built on ReportLab.
- **User Benefit:** Produces an instant, boardroom-ready document complete with executive summaries, mathematical knapsack allocations, baseline comparisons, and regulatory screening notices.
- **Outputs:** Timestamped, non-overwriting PDF documents ready for download and distribution.
- **Verification:** Verified via `backend/tests/test_application_integration.py::test_reports_accept_text_notes_and_never_overwrite_a_previous_file`.
