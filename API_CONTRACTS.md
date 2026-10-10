# RoofShift AI — API Contracts & Integration Guide
**Version:** 2.0.0-PROD  
**Team:** TEAM DRX  
**Primary Application Branch:** `antigravity/core-app`  
**Parallel QA/CI Branch:** `codex/qa-ci`  

---

## 1. Parallel Development Protocols & Ownership Matrix

To ensure clean, non-conflicting parallel development between Antigravity (App Developer) and Codex (Independent QA / CI):

| Area | Primary Owner | Branch | Boundary Rules |
|------|---------------|--------|----------------|
| **Core Application Code** (`frontend/src/`, `backend/app/`, `infrastructure/`) | **Antigravity** | `antigravity/core-app` | Codex should treat app interfaces as the source of truth to test against. |
| **Independent QA & CI** (`.github/workflows/`, performance checks, audit docs) | **Codex** | `codex/qa-ci` | Antigravity will NOT modify or overwrite Codex workflows or QA scripts. |
| **Shared Contracts** (`API_CONTRACTS.md`, `requirements.txt`, `package.json`) | **Coordinated** | PR-based | Maintained to guarantee stable API interfaces for automated tests. |

---

## 2. Global Architectural Constants & Directives

```json
{
  "bedrock_directive": "HARD_DISABLED",
  "reason": "100% deterministic mathematical optimization (Google OR-Tools CP-SAT) & physics models. Zero LLM rate limits or latency during critical demonstrations.",
  "aws_fallback_matrix": "All 10 AWS services automatically fall back to zero-cost, local equivalents if AWS credentials are not configured.",
  "base_url": "http://127.0.0.1:8000/api/v1"
}
```

---

## 3. REST API Specifications

### 3.1 System & Health

#### `GET /api/v1/health`
- **Description:** Basic liveness and service metadata.
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "service": "RoofShift AI",
  "version": "1.0.0",
  "region_support": "India (NASA POWER & NISE climatology integrated)"
}
```

#### `GET /api/v1/system/integrations`
- **Description:** Real-time AWS capability matrix, fallback status, and Bedrock directive.
- **Response `200 OK`:**
```json
{
  "platform": "RoofShift AI",
  "version": "2.0.0",
  "environment": "development",
  "aws_enabled": false,
  "aws_region": "ap-south-1",
  "bedrock_status": {
    "enabled": false,
    "status": "HARD_DISABLED",
    "decision": "Amazon Bedrock excluded per architectural directive. 100% deterministic OR-Tools & physics.",
    "latency_impact": "0ms (No generative model latency or rate limits)"
  },
  "services": [
    {
      "service": "AWS Amplify Hosting",
      "category": "Frontend Hosting",
      "status": "Configured / Deploy-Ready",
      "active_provider": "Amplify SPA (Vite / React 19)",
      "fallback": "Nginx Container / Local Vite Server",
      "evidence": "amplify.yml in repository root with build pipeline",
      "cost_estimate": "$0.00 / month (Free tier)"
    },
    {
      "service": "Amazon EC2",
      "category": "Backend Compute",
      "status": "Production Docker Container Ready",
      "active_provider": "FastAPI + Uvicorn on EC2",
      "fallback": "Local Python Server",
      "evidence": "deploy-ec2.sh, docker-compose.yml, Dockerfile",
      "cost_estimate": "~$0 - $15 / month (t3.small / Free tier eligible)"
    },
    {
      "service": "Amazon S3",
      "category": "Secure Document Storage",
      "status": "Local Fallback Active",
      "active_provider": "Local Backend Storage",
      "fallback": "Local File System (/app/generated_reports)",
      "bucket_name": "roofshift-reports-storage",
      "evidence": "s3_adapter.py with presigned URL generator & local fallback",
      "cost_estimate": "< $0.05 / month"
    },
    {
      "service": "Amazon Location Service",
      "category": "Geospatial & Geocoding",
      "status": "OSM Fallback Active",
      "active_provider": "OpenStreetMap Nominatim + Gazetteer",
      "fallback": "OpenStreetMap Nominatim (Rate-limited compliant) + Local Indian Gazetteer",
      "place_index": "RoofShiftPlaceIndex",
      "evidence": "location_adapter.py with SearchPlaceIndexForText & OSM fallback",
      "cost_estimate": "$0.00 / month (Free tier 10,000 requests)"
    },
    {
      "service": "AWS Lambda",
      "category": "Background Solar Data Normalization",
      "status": "Configured / Standalone Handler Ready",
      "active_provider": "In-process Python Normalizer",
      "fallback": "Synchronous Python Normalization Engine in FastAPI",
      "function_name": "RoofShiftSolarProcessor",
      "evidence": "aws/lambda/solar_processor.py event handler",
      "cost_estimate": "$0.00 / month (Free tier 1M requests)"
    },
    {
      "service": "Amazon EventBridge",
      "category": "Scheduled Cache Maintenance",
      "status": "Configured",
      "active_provider": "EventBridge Weekly Cron Rule",
      "fallback": "On-Demand SQLite/Postgres Solar Cache Expiration",
      "schedule_expression": "cron(0 2 ? * SUN *)",
      "evidence": "aws/eventbridge/schedule_rule.json",
      "cost_estimate": "$0.00 / month"
    },
    {
      "service": "Amazon CloudWatch",
      "category": "Monitoring & Logging",
      "status": "Console JSON Logging Active",
      "active_provider": "Structured JSON Console Logger",
      "fallback": "Structured Console Output with timestamp & latency metrics",
      "log_group": "/roofshift/backend",
      "evidence": "monitoring_adapter.py with duration_ms metric telemetry",
      "cost_estimate": "< $0.50 / month"
    },
    {
      "service": "AWS IAM",
      "category": "Security & Access Management",
      "status": "Configured / Least Privilege Enforced",
      "active_provider": "IAM Role Policies",
      "fallback": "Local OS Process Boundaries",
      "evidence": "aws/iam/ (s3_policy.json, cloudwatch_policy.json, location_policy.json)",
      "cost_estimate": "$0.00 / month"
    },
    {
      "service": "AWS SSM Parameter Store",
      "category": "Configuration & Secrets",
      "status": "Local .env Fallback Active",
      "active_provider": "Local .env & Environment Variables",
      "fallback": "Standard Python dotenv / environment variables",
      "evidence": "param_store.py with get_parameter & decryption support",
      "cost_estimate": "$0.00 / month (Standard parameters free)"
    },
    {
      "service": "AWS Budgets",
      "category": "Cost Governance",
      "status": "Configured",
      "active_provider": "Monthly Cost Threshold Alarm",
      "fallback": "Local Resource Teardown Documentation",
      "threshold": "$20.00 USD (80% notification alarm)",
      "evidence": "aws/budgets/budget_alarm.json",
      "cost_estimate": "$0.00 (First 2 budgets free)"
    }
  ]
}
```

---

### 3.2 Projects Management

#### `GET /api/v1/projects`
- **Description:** Lists all projects.
- **Response `200 OK`:** Array of `ProjectResponse`.

#### `POST /api/v1/projects`
- **Description:** Create a new project campus.
- **Request Body:**
```json
{
  "name": "Delhi College Campus",
  "organization_name": "State Technical University",
  "city": "New Delhi",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "budget": 1000000.0,
  "tariff_rate": 8.5,
  "export_tariff": 3.2,
  "co2_factor": 0.716
}
```
- **Response `201 Created`:** `ProjectResponse`.

#### `GET /api/v1/projects/{project_id}`
- **Response `200 OK`:** Full project object including aggregated building count and total roof area.

---

### 3.3 Buildings & Solar Potential

#### `GET /api/v1/projects/{project_id}/buildings`
- **Description:** Returns all buildings belonging to a project, including embedded `solar_analysis` object.

#### `POST /api/v1/projects/{project_id}/buildings`
- **Description:** Adds a building to a project and automatically computes initial solar analysis via NASA POWER / NISE fallback.
- **Request Body:**
```json
{
  "name": "Science Block",
  "category": "Academic",
  "latitude": 28.6142,
  "longitude": 77.2095,
  "gross_roof_area": 850.0,
  "usable_roof_percentage": 75.0,
  "shading_category": "Low",
  "custom_shading_loss": 5.0,
  "monthly_consumption_kwh": 6500.0,
  "daytime_consumption_pct": 70.0,
  "cost_per_kwp": 50000.0,
  "fixed_cost": 0.0
}
```
- **Response `201 Created`:** `BuildingResponse` with embedded `SolarAnalysisResponse`.

#### `POST /api/v1/buildings/{building_id}/solar-analysis`
- **Description:** Re-triggers solar physics calculation for a building.
- **Response `200 OK`:** `SolarAnalysisResponse`.

---

### 3.4 Budget Optimization (OR-Tools & Knapsack)

#### `POST /api/v1/projects/{project_id}/optimize`
- **Description:** Runs Multiple-Choice Knapsack & OR-Tools CP-SAT optimization across candidate buildings under budget constraint.
- **Request Body:**
```json
{
  "budget_inr": 1000000.0,
  "objective": "MAXIMIZE_SAVINGS",
  "scenario_name": "Optimal Plan - ₹10L",
  "capacity_step_kwp": 1.0,
  "override_cost_per_kwp": null,
  "override_tariff_rate": null,
  "override_export_tariff": null
}
```
- **Response `200 OK`:**
```json
{
  "id": "opt-uuid",
  "project_id": "proj-uuid",
  "scenario_name": "Optimal Plan - ₹10L",
  "budget_inr": 1000000.0,
  "objective": "MAXIMIZE_SAVINGS",
  "total_allocated_inr": 950000.0,
  "unallocated_budget_inr": 50000.0,
  "total_capacity_kwp": 19.0,
  "total_annual_generation_kwh": 28350.0,
  "total_annual_savings_inr": 235450.0,
  "total_avoided_co2_kg": 20298.6,
  "allocations": [
    {
      "building_id": "b-uuid",
      "building_name": "Library Block",
      "allocated_capacity_kwp": 10.0,
      "max_possible_capacity_kwp": 10.0,
      "allocation_pct": 100.0,
      "allocated_cost_inr": 500000.0,
      "annual_generation_kwh": 14920.0,
      "annual_savings_inr": 126820.0,
      "selection_status": "SELECTED_FULL"
    }
  ],
  "baseline_comparison": {
    "greedy_cost_inr": 1000000.0,
    "greedy_capacity_kwp": 20.0,
    "greedy_savings_inr": 205200.0,
    "knapsack_savings_inr": 235450.0,
    "savings_lift_pct": 14.74,
    "methodology_note": "Dynamic programming knapsack avoids low-yield over-allocation and prioritizes high-tariff daytime coincidence."
  }
}
```

---

### 3.5 Energy Insights & Demand Upload

#### `GET /api/v1/projects/{project_id}/energy-insights`
- **Description:** Returns 24-hour diurnal generation curve, institutional load curve, midday surplus pool (10:00 - 15:00), and seasonal monthly trend.

#### `POST /api/v1/projects/{project_id}/demand-upload`
- **Description:** Uploads interval meter CSV file for Mode A (Measured Demand).
- **Request:** `multipart/form-data` with `file: UploadFile` (.csv).
- **Accepted Columns:** `timestamp`, `consumption_kwh`, `kw`, `demand`, or `power`.
- **Response `200 OK`:**
```json
{
  "status": "UPLOAD_VALIDATED_SUCCESSFULLY",
  "filename": "campus_hourly_demand.csv",
  "readings_count": 8760,
  "average_power_kw": 62.4,
  "peak_power_kw": 115.0,
  "total_measured_kwh": 546624.0,
  "data_mode": "Mode A — Measured Meter Data Upload",
  "coverage_note": "Successfully parsed 8760 chronological intervals from 'campus_hourly_demand.csv'."
}
```

---

### 3.6 Smart Load Shifting & Scheduling

#### `GET /api/v1/projects/{project_id}/activities`
- **Description:** Lists shiftable campus utilities (EV shuttle, water pumps, RO filtration, HVAC precooling).

#### `POST /api/v1/projects/{project_id}/activities`
- **Description:** Creates a shiftable load item.
- **Request Body:**
```json
{
  "name": "Electric Campus Shuttle Charging",
  "building_id": null,
  "power_kw": 22.0,
  "duration_hours": 3.0,
  "earliest_hour": 9,
  "latest_hour": 17,
  "preferred_hour": 18,
  "days_per_week": 6,
  "is_shiftable": true
}
```

#### `POST /api/v1/projects/{project_id}/schedule-optimize`
- **Description:** Mathematically reschedules shiftable loads into the midday solar surplus window (10:00 - 15:00) without double-counting surplus.
- **Response `200 OK`:** `SchedulingOptimizationResponse` with before/after load comparison curves and net financial gains.

---

### 3.7 Recommendations & PDF Reports

#### `GET /api/v1/projects/{project_id}/recommendations`
- **Description:** Generates deterministic, explainable recommendation cards categorized into High, Medium, and Info priorities.

#### `POST /api/v1/projects/{project_id}/reports`
- **Description:** Generates publication-grade ReportLab PDF. Uploads to S3 if active (returns presigned URL) or local filesystem fallback.
- **Request Body:**
```json
{
  "include_scenarios": true,
  "include_load_shifting": true,
  "notes": "Official institutional capital planning report"
}
```
- **Response `201 Created`:** `ReportResponse`.

#### `GET /api/v1/reports/{report_id}/download`
- **Description:** Streams or redirects to the generated PDF binary (`application/pdf`).

---

## 4. Deterministic Intelligence Interface Signatures

All components reside in `backend/app/services/intelligence/`:

```python
# Component A: Solar Potential
from app.services.intelligence.solar_intel import calculate_building_solar_potential
# async def calculate_building_solar_potential(building: Building, project: Project, db: Session, ...) -> SolarAnalysis

# Component B: Investment Optimization
from app.services.intelligence.investment_intel import solve_budget_optimization
# def solve_budget_optimization(building_options: List[List[Dict[str, Any]]], budget: float, objective: str = "MAXIMIZE_SAVINGS") -> Tuple[List[Dict[str, Any]], float]

# Component C: Scheduling & Load Shifting
from app.services.intelligence.scheduling_intel import optimize_load_shifting
# async def optimize_load_shifting(project_id: str, db: Session) -> SchedulingOptimizationResponse

# Component D: Explanations
from app.services.intelligence.explanation_intel import generate_building_rationales
# def generate_building_rationales(project: Project, buildings: List[Building], latest_run: Optional[OptimizationRun]) -> List[Dict[str, Any]]

# Component E: ML Demand Estimation
from app.services.intelligence.ml_demand_estimator import estimate_hourly_demand_profile
# def estimate_hourly_demand_profile(category: str, monthly_consumption_kwh: float, daytime_pct: float) -> List[float]
```

---

## 5. Verification Commands for Codex QA

Codex can execute the following commands in the workspace root to verify system compliance:

1. **Backend Tests:**
   ```powershell
   python -m pytest -o pythonpath=backend backend/tests -v
   ```
   *Expected:* 20 passed, 0 failed.

2. **Frontend Production Build:**
   ```powershell
   cd frontend
   npm run build
   ```
   *Expected:* Vite build complete with 0 errors.

3. **System Integrations Probe:**
   ```powershell
   curl.exe -s http://127.0.0.1:8000/api/v1/system/integrations
   ```
   *Expected:* Returns all 10 AWS services and `"status": "HARD_DISABLED"` for Amazon Bedrock.
