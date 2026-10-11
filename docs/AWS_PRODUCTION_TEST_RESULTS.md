# RoofShift AI — AWS Production Test Results & Verification Record

**Test Execution Date:** October 11, 2026  
**Auditor:** Principal QA Automation Engineer & SRE  
**Target Environment:** AWS EC2 Production (`http://54.252.232.247/`)  
**Local Test Suite:** 243 / 243 Passed (100%)  
**End-to-End User Journey:** 20 / 20 Steps Passed (100%)  
**Frontend Compilation:** Clean Vite & TypeScript build (0 errors, 888 ms)

---

## 1. Remote Production Server HTTP Verification

Direct HTTP test executions against the live public EC2 instance (`54.252.232.247`):

| Target Path | Method | HTTP Status | Response Size | Observed Behavior & Latency |
| :--- | :--- | :--- | :--- | :--- |
| `/` | `GET` | **200 OK** | 931 bytes | Returns React SPA HTML container (`index.html`) |
| `/api/v1/health` | `GET` | **200 OK** | 160 bytes | Returns `{"status":"healthy","service":"RoofShift AI","version":"2.0.0"}` (~180ms) |
| `/api/v1/system/integrations` | `GET` | **200 OK** | 3,805 bytes | Returns capability matrix and active fallback indicators |
| `/api/v1/projects` | `GET` | **200 OK** | 410 bytes | Returns persisted projects array from SQLite database |
| `/api/v1/solar-ml/model-info` | `GET` | **404 Not Found** (Pre-upgrade) | 22 bytes | Expected on commit `458de35`; resolved in candidate `549faee` |
| `/api/v1/solar-intelligence/regions` | `GET` | **404 Not Found** (Pre-upgrade) | 22 bytes | Expected on commit `458de35`; resolved in candidate `549faee` |

---

## 2. Full Regression Suite Results (Local & Candidate Build)

```text
============================= test session starts =============================
platform win32 -- Python 3.14.7, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\rajsa\Desktop\ROOFTOP ai
collected 243 items

backend\tests\test_advanced_engine_correctness.py ................................ [ 22%]
backend\tests\test_api_endpoints.py ...                                  [ 23%]
backend\tests\test_application_integration.py .....                      [ 25%]
backend\tests\test_audit_fixes_regression.py ....                        [ 27%]
backend\tests\test_feature_analytics.py ................................ [ 46%]
backend\tests\test_feature_api.py ......................                 [ 55%]
backend\tests\test_feature_monitoring.py ............................... [ 74%]
backend\tests\test_geospatial_real_data.py .....                         [ 76%]
backend\tests\test_india_solar_intelligence.py .......                   [ 79%]
backend\tests\test_integration_provenance.py ..                          [ 79%]
backend\tests\test_optimizer.py ..                                       [ 80%]
backend\tests\test_panel_inspection_ml.py .....                          [ 82%]
backend\tests\test_portfolio_scalability.py .....                        [ 84%]
backend\tests\test_security_hardening.py .............                   [ 90%]
backend\tests\test_solar_engine.py ...                                   [ 91%]
backend\tests\test_solar_ml.py .........                                 [ 95%]
backend\tests\test_v2_acceptance.py ............                         [100%]

===================== 243 passed, 2584 warnings in 31.45s =====================
```

---

## 3. End-to-End 20-Step User Journey Verification Summary

Executed via `scripts/verify_user_journey.py`:

* **Step 1 (Health Check):** Healthy (v2.0.0).
* **Step 2 (National Solar Summary):** Sourced MNRE/NISE 2014 Wasteland potential (748.98 GWp) with transparent unestimated rooftop status.
* **Step 3 (Regional Filters):** Loaded all 36 Indian States and Union Territories.
* **Step 4 (Climatology Profiles):** Deep-dive NASA POWER & IMD profiles (Rajasthan 5.86 kWh/m²/d, Ladakh 5.85 kWh/m²/d with cold-boost modeling).
* **Step 5 (Sample Campus Showcase):** BITS Pilani 5-building portfolio clearly isolated.
* **Steps 6–11 (Location Search & Solar Generation):** Hyderabad, Telangana project created; 5 buildings analyzed with NASA satellite solar yields.
* **Step 12 (Energy Demand Analytics):** 452.8 kWp total capacity aggregated across 12 monthly curves.
* **Steps 13–14 (0/1 Knapsack Budget Optimization):** ₹10,00,000 budget fully allocated; ₹2,36,911/yr savings; 4.22-year payback.
* **Step 15 (Surplus & Environmental Impact):** 19,956 kg avoided CO₂/yr (CEA India v19 grid factor).
* **Step 16 (Smart Activity Shifting):** EV Fleet Charging scheduled to solar surplus window.
* **Step 17 (Maintenance Triage):** Panel soiling case created and prioritized.
* **Step 18 (PDF Executive Report):** Dossier generated (`ReportLab`) and downloaded.
* **Steps 19–20 (Data Persistence):** SQLite database persistence and reopening verified.

**Result: 100% PASS across all 20 verification steps.**
