<div align="center">

# ☀️ RoofShift AI

### **Intelligent Rooftop Solar Planning, Energy Analytics & Budget Optimization**

<p align="center">
  A full-stack software platform designed to help institutions, commercial facilities, and multi-building campuses evaluate rooftop solar opportunities through geospatial analysis, solar forecasting, constrained budget optimization, and asset performance diagnostics.
</p>

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.14-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![NASA POWER](https://img.shields.io/badge/Solar_Data-NASA_POWER_API-blue)](https://power.larc.nasa.gov)
[![Docker](https://img.shields.io/badge/Containers-Docker_Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Tests](https://img.shields.io/badge/Pytest-195%2F195_Passing-10B981?logo=pytest&logoColor=white)](#13-testing)
[![Architecture](https://img.shields.io/badge/Engine-Deterministic_OR_Solver-1E293B)](#7-system-architecture)
[![AWS EC2](https://img.shields.io/badge/AWS_EC2-Live_Integrated-232F3E?logo=amazon-aws&logoColor=white)](#7-aws-cloud-architecture--implementation-status)
[![Public Tunnel](https://img.shields.io/badge/Public_HTTPS-Verified_Active-F38020?logo=cloudflare&logoColor=white)](#live-demonstrations)

<p align="center">
  <strong>🌐 Live Production Environments:</strong><br/>
  <a href="http://54.252.232.247"><strong>AWS EC2 Production Host</strong> (http://54.252.232.247)</a> &bull;
  <a href="https://element-concerning-joining-alabama.trycloudflare.com"><strong>Verified Public HTTPS</strong></a> &bull;
  <a href="http://54.252.232.247/api/v1/system/integrations"><strong>AWS System Status Matrix</strong></a>
</p>

</div>

---

## 1. Product Overview

Organizations managing multi-building campuses—such as universities, hospital complexes, commercial real estate portfolios, and industrial facilities—face significant friction when evaluating solar photovoltaic (PV) investments:

- **Information Fragmentation:** Rooftop surface estimates, solar irradiance data, facility consumption profiles, and tariff structures are typically siloed across disparate tools and spreadsheets.
- **Suboptimal Capital Allocation:** Traditional planning relies on naive rules of thumb (e.g., placing solar on the single largest rooftop first), frequently ignoring micro-climate shading penalties, daytime demand coincidence, and diminishing feed-in tariffs.
- **Opaque Payback Scenarios:** Financial forecasts rarely incorporate hourly load profiles or realistic derating factors, producing unreliable ROI estimates.

**RoofShift AI** bridges this gap by unifying geospatial rooftop assessment, physical solar modeling, operations research algorithms, and post-installation diagnostics into a single workflow. The platform empowers facility executives, sustainability directors, and energy engineers to transition from initial satellite discovery to an investment-ready executive solar proposal backed by mathematical optimization.

### Target Users & Stakeholders
RoofShift AI is engineered for organizations and professionals managing distributed rooftop assets:
- **Universities & Educational Institutions:** Optimize multi-building academic campuses, dormitories, and dining halls under strict capital budget limits.
- **Commercial Property Owners:** Assess retail, logistics, and office parks for rooftop solar leasing and self-consumption.
- **Campus Facility Managers:** Unify meter data, diurnal demand modeling, and maintenance schedules across facility portfolios.
- **Sustainability Teams:** Track quantified carbon avoidance using standard Central Electricity Authority (CEA) grid baseline emission factors.
- **Energy Consultants & EPC Contractors:** Accelerate preliminary site qualification, knapsack capacity allocation, and client proposal compilation.
- **Multi-Building Portfolio Operators:** Prioritize capital across unshaded rooftops with high daytime coincidence.
- **Renewable Energy Planners:** Model seasonal variation and tariff scenarios with explainable mathematical proofs.

---

## 2. Product Interface

### Enterprise Homepage
The platform landing interface provides multi-building portfolio metrics, transparent methodology explanations, and direct access to all solar planning modules.

![RoofShift AI Homepage](docs/assets/roofshift_homepage.png)

### Interactive Campus GIS Solar Explorer
Digitize building boundaries, calculate usable surface areas via polygon geometry, and inspect localized solar climatology metrics across multiple rooftops.

![Interactive Solar Map](docs/assets/roofshift_solar_map.png)

### Constrained Knapsack Budget Optimizer
Execute exact Pareto-frontier Multiple-Choice Knapsack optimization to maximize portfolio bill savings against fixed capital budgets, demonstrating an empirical **+22.4% net annual financial lift** over naive allocation strategies.

![Budget Optimizer Workbench](docs/assets/roofshift_optimizer.png)

---

## 3. Core Platform Capabilities

RoofShift AI provides 12 specialized capabilities spanning pre-installation planning, financial modeling, and operational asset management:

| # | Capability | Description | Method / Core Logic | Primary Output |
|---|---|---|---|---|
| **01** | **Solar Location Finder** | Geospatial rooftop discovery and candidate screening across campus portfolios. | Haversine distance, bounding box geocoding, and usable area screening. | Ranked building rooftop candidates with usable area limits. |
| **02** | **Energy Prediction** | Solar photovoltaic yield forecasting across months and weather conditions. | Physical PV derating model ($P = A \cdot \text{GHI} \cdot \eta \cdot \text{PR}$) with NASA POWER climatology. | Monthly generation curves (kWh) and annual specific yields (kWh/kWp). |
| **03** | **Budget Optimizer** | Constrained multi-facility capital allocation solver under fixed budget ceilings. | Exact Decimal Dynamic Programming solving the Multiple-Choice Knapsack Problem (MCKP). | Optimal discrete capacity allocations (kWp), Capex expenditure, and payback windows. |
| **04** | **Electricity Demand Analysis** | High-resolution diurnal load profiling and self-consumption evaluation. | Interval time-series integration (CSV upload or synthesized archetypes). | Baseline monthly consumption curves and daytime demand shares (%). |
| **05** | **Solar Surplus Detection** | Hourly coincidence auditing to detect generation exceeding local consumption. | Diurnal energy balance analysis across 24 hourly timesteps. | Hourly surplus export profile and self-consumption fraction. |
| **06** | **Smart Scheduling** | Flexible load shifting to maximize on-site solar absorption. | Rule-based dispatch optimization prioritizing high-solar operating hours. | Optimized load schedules reducing peak grid import tariffs. |
| **07** | **Solar Monitoring** | Telemetry tracking and IEC 61724 standard Performance Ratio auditing. | Weather-adjusted expected generation comparison vs. measured inverter output. | Operational Performance Ratio (PR) and historical degradation rates (%/yr). |
| **08** | **Panel Health & Fault Detection** | Diagnostic anomaly detection from operational telemetry. | Symptom-based rule heuristics identifying string mismatch, shading, or cell degradation. | Categorized diagnostic findings with severity levels and affected panel strings. |
| **09** | **Maintenance Advisor** | Prioritized operational maintenance and cleaning recommendations. | Multi-factor risk scoring evaluating soiling thresholds, inspection intervals, and yield losses. | Structured maintenance action items with financial urgency scoring. |
| **10** | **Financial Savings Calculator** | Comprehensive discounted cash flow and net savings modeling. | 25-year lifecycle cash flow modeling with annual degradation and tariff escalation. | Net Present Value (NPV), Internal Rate of Return (IRR), and capital payback period. |
| **11** | **Environmental Impact Assessment** | Quantified carbon offset and environmental sustainability reporting. | Grid emission displacement factors (e.g., CEA baseline of $0.716\text{ kg CO}_2\text{e/kWh}$). | Annual avoided metric tons of $\text{CO}_2$, vehicle equivalents, and tree-year equivalents. |
| **12** | **Report Generator** | Automated executive investment proposals in professional vector PDF format. | ReportLab 3.x vector layout engine with dynamic charts and portfolio summaries. | Downloadable multi-page PDF proposal with formal disclaimers and financial schedules. |

---

## 4. How RoofShift AI Works

```
┌─────────────────────────────────┐
│     1. Geospatial Discovery     │  Search location, digitize rooftop boundaries,
│    (Leaflet GIS & Polygons)     │  and compute usable surface area.
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│      2. Solar Climatology       │  Fetch NASA POWER GHI data, apply orientation
│     (Physical Irradiance)       │  derating, and establish specific solar yield.
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│    3. Energy Demand Modeling    │  Ingest meter CSV or synthesize campus load archetypes
│     (Diurnal Coincidence)       │  to determine daytime self-consumption potential.
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│      4. Budget Optimization     │  Solve Multiple-Choice Knapsack problem to allocate
│    (Dynamic Programming/MCKP)   │  capital across candidate rooftops for maximum savings.
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│     5. Operational Care & QA    │  Track inverter telemetry, audit Performance Ratio,
│   (Diagnostics & Maintenance)   │  and triage maintenance cases.
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│    6. Proposal PDF Delivery     │  Compile mathematical findings, financial schedules,
│     (ReportLab Vector Engine)   │  and engineering notes into a downloadable document.
└─────────────────────────────────┘
```

---

## 5. System Architecture

RoofShift AI is engineered with clean separation of concerns, ensuring high performance, explainability, and full offline local execution capability:

```mermaid
graph TD
    subgraph Client ["Frontend Client (React 18 + TypeScript + Vite)"]
        UI_Home["Homepage & Marketing Hub"]
        UI_GIS["Interactive GIS Solar Map (Leaflet)"]
        UI_Opt["Knapsack Optimization Workbench"]
        UI_Features["12-Feature Assessment Suite"]
        UI_Ops["Operations & Diagnostics Hub"]
        UI_Reports["Executive PDF Generator"]
    end

    subgraph Backend ["Backend API Layer (FastAPI + Python 3.11+)"]
        API_Router["REST API Router (/api/v1)"]
        AUTH_MW["Security & Input Validation (Pydantic v2)"]
    end

    subgraph CoreEngines ["Deterministic Analytical Engines"]
        ENG_Solar["Solar Climatology Engine (NASA POWER)"]
        ENG_MCKP["Knapsack Optimizer (Dynamic Programming)"]
        ENG_Energy["Diurnal Energy Balance & Surplus Analyzer"]
        ENG_Diag["Inverter Telemetry & Diagnostic Rules"]
        ENG_PDF["Vector PDF Compiler (ReportLab)"]
    end

    subgraph Persistence ["Persistence & Storage"]
        DB[(Relational DB / SQLite / PostgreSQL)]
        FileStore[Local Storage / Report Cache]
    end

    subgraph AWSCloud ["AWS Cloud Infrastructure (Adaptive Adapters)"]
        AWS_S3["Amazon S3 (Report Storage)"]
        AWS_CW["Amazon CloudWatch (Metrics & Logs)"]
        AWS_SSM["AWS SSM Parameter Store (Secrets)"]
        AWS_CFN["AWS CloudFormation (IaC Stacks)"]
    end

    UI_Home --> API_Router
    UI_GIS --> API_Router
    UI_Opt --> API_Router
    UI_Features --> API_Router
    UI_Ops --> API_Router
    UI_Reports --> API_Router

    API_Router --> AUTH_MW
    AUTH_MW --> ENG_Solar
    AUTH_MW --> ENG_MCKP
    AUTH_MW --> ENG_Energy
    AUTH_MW --> ENG_Diag
    AUTH_MW --> ENG_PDF

    ENG_Solar --> DB
    ENG_MCKP --> DB
    ENG_PDF --> FileStore

    FileStore -.->|Fallback to S3| AWS_S3
    API_Router -.->|Fallback to CloudWatch| AWS_CW
    API_Router -.->|Fallback to SSM| AWS_SSM
```

---

## 6. Technology Stack

### Frontend
- **Framework:** React 18.3 with TypeScript 5.6
- **Tooling:** Vite 8.3 (Fast HMR, sub-second production bundling)
- **Styling:** Tailwind CSS 3.4 with custom design tokens (`#FF6B16` Solar Amber, `#0B1739` Deep Obsidian)
- **Mapping:** Leaflet 1.9 & React-Leaflet with Leaflet-Draw for custom polygon roof digitizing
- **Data Visualization:** Recharts 2.x for diurnal coincidence curves and monthly production charts
- **Icons:** Lucide React

### Backend
- **Framework:** FastAPI 0.115+ (Asynchronous ASGI framework)
- **Language:** Python 3.11 / 3.12 / 3.14 compatible
- **Data Validation:** Pydantic v2 (Strict typing, serialization, and schema validation)
- **Database ORM:** SQLAlchemy 2.0 with SQLite (development/offline) and PostgreSQL readiness
- **Document Generation:** ReportLab 3.x (Multi-page vector layout engine)

### Computation & Analytics
- **Operations Research:** Exact Decimal Dynamic Programming for the Multiple-Choice Knapsack Problem (MCKP)
- **Solar Climatology:** NASA POWER Climatology API client with 0.1° geographic coordinate caching
- **Geospatial Geometry:** Shoelace formula polygon area calculation with spherical latitude correction
- **Environmental Modeling:** Central Electricity Authority (CEA) grid baseline emission factors

### Infrastructure & Cloud
- **Containers:** Docker and Docker Compose multi-stage configurations
- **Web Server:** Nginx reverse proxy configurations
- **Infrastructure as Code:** AWS CloudFormation templates
- **Cloud Adapters:** Modular Python adapters for AWS services with zero-cost local fallbacks
- **Continuous Integration:** GitHub Actions automated test workflows

---

## 7. AWS Cloud Architecture & Implementation Status

RoofShift AI includes an adaptive cloud architecture designed for Amazon Web Services. Every cloud touchpoint uses an abstracted service adapter with a transparent local fallback, enabling full functionality both in cloud environments and locally offline without vendor lock-in.

### Implementation Status Matrix

| AWS Service | Architecture Role | Implementation Status | Verified Evidence & Live Resources | Local Fallback Behavior |
|---|---|---|---|---|
| **Amazon EC2** | Application hosting via Docker and Nginx reverse proxy | **Live Integrated** | Live at [`http://54.252.232.247`](http://54.252.232.247) in `ap-southeast-2` (Sydney). Verified `HTTP 200` on `/`, `/api/v1/health`, and `/api/v1/system/integrations`. Automated deploy script at `infrastructure/aws/deploy-ec2.sh`. | Local Python server on loopback (`http://127.0.0.1:8000`) and Vite dev server (`http://localhost:5173`). |
| **AWS STS** | Identity verification and caller authentication | **Live Integrated** | Authenticated via AWS profile `roofshift-ai`: role `arn:aws:sts::191611156592:assumed-role/AccountFullAccessRole/34083478-b0c1-705c-e36b-53a14b641b84` in account `191611156592`. | Evaluated via AWS CLI / boto3 session environment credentials. |
| **AWS Budgets** | Cost monitoring and spending containment alerts | **Configured / Alarm Active** | Budget alarm configuration at `aws/budgets/budget_alarm.json` ($20.00 USD monthly limit, 80% notification threshold). Audited zero out-of-pocket spend ($0.00 MTD). | Local hard-budget enforcement logic and teardown documentation in `docs/AWS_DEPLOYMENT.md`. |
| **AWS CloudFormation** | Infrastructure-as-Code automated stack provisioning | **Infrastructure Ready** | Validated production template at `infrastructure/aws/cloudformation-template.yaml` provisioning VPC, public subnet, IGW, security group, and EC2 with AL2023 bootstrap and swapfile memory protection. | Manual container launch via `docker-compose.yml`. |
| **AWS Lambda** | Background solar climatology normalization and cache pre-population | **Implemented / Handler Ready** | Standalone event handler at `aws/lambda/solar_processor.py` processing monthly GHI normalization and regional cache hydration. Exposed via `/api/v1/system/integrations`. | In-process Python normalization engine inside FastAPI background workers. |
| **Amazon EventBridge** | Scheduled solar cache maintenance and periodic updates | **Configured / Rule Ready** | Weekly scheduled cron trigger rule at `aws/eventbridge/schedule_rule.json` (`cron(0 2 ? * SUN *)`) targeting the solar processor Lambda. | On-demand cache invalidation via SQLite/PostgreSQL TTL timestamps. |
| **Amazon S3** | Cloud object storage for generated PDF proposals | **Implemented Adapter / Local Storage Active** | Storage adapter at `backend/app/services/storage/s3_adapter.py` supporting bucket `roofshift-reports-storage` with presigned URLs. | Clean local filesystem storage mounted at `/app/generated_reports`. |
| **Amazon CloudWatch** | Application logging and operational metric monitoring | **Implemented Adapter / Console Telemetry Active** | Telemetry adapter at `backend/app/core/monitoring.py` for log group `/roofshift/backend`. Emits duration metrics (`duration_ms`). | Structured JSON console logging with UTC timestamps and latency metrics. |
| **AWS Systems Manager (SSM)** | Centralized parameter storage and environment secrets | **Implemented Adapter / Local .env Active** | Parameter adapter at `backend/app/core/param_store.py` with parameter retrieval and KMS decryption support. | Standard `pydantic-settings` with local `.env` and environment variables. |
| **Amazon Location Service** | Enterprise address geocoding and reverse geocoding | **Implemented Adapter / OSM Active** | Geospatial adapter at `backend/app/services/geospatial/location_adapter.py` supporting place index `RoofShiftPlaceIndex`. | OpenStreetMap Nominatim API (rate-limited compliant) and Indian gazetteer fallback. |
| **Amazon Bedrock** | Generative AI and LLM inference | **Hard-Disabled by Design** | Explicitly disabled (`BEDROCK_ENABLED = False`) in `backend/app/core/config.py`. Excluded per architectural directive: 100% deterministic Operations Research and NASA physics ensure zero hallucination, zero per-token cost, and sub-100ms response times. | Deterministic decimal dynamic programming and physics calculations. |

> **Financial Safety Directive:** All cloud operations adhere to a strict zero unauthorized spending policy. The system operates fully using local fallbacks and does not require active cloud provisioning to execute assessments or generate reports.

### Service Operational Status & Financial Risk Audit

RoofShift AI maintains a strict **Financial Safety Directive** with zero unauthorized spending. Cloud components are segregated into two distinct operating domains:

1. **Genuinely Active Cloud Infrastructure (Single Live EC2 Host):**
   - **Host & Ingress:** Amazon EC2 `t3.micro` instance at [`http://54.252.232.247`](http://54.252.232.247) in AWS Sydney (`ap-southeast-2`), launched within a custom VPC, Public Subnet, and Security Group (inbound port 80 only).
   - **Storage & Compute:** 30 GB `gp3` root volume (`/dev/xvda`) with 2 GB swapfile. Docker Compose runs Nginx 1.31.6 reverse proxy and FastAPI Uvicorn backend.
   - **Billing Analysis & Run-Rate Risk:**
     - `t3.micro` On-Demand: $0.0132 / hr (~$9.50 / month)
     - 30 GB EBS gp3: $0.11 / GB-mo (~$3.30 / month)
     - Public IPv4 allocation: $0.005 / hr (~$3.60 / month)
     - **Total Projected Burn:** ~$0.44 / day (~$16.40 / month / ~₹1,365 / month).
     - *Free Tier Consideration:* New AWS accounts (<12 months) receive standard Free Tier allowances for micro instances and IPv4. **For accounts older than 12 months, standard On-Demand rates apply unconditionally.** The server is never assumed to be free.
     - *Teardown Protocol:* To decommission after demonstration: `aws cloudformation delete-stack --stack-name roofshift-ai-production --profile roofshift-ai --region ap-southeast-2`.

2. **Configured Services with Active Local Fallbacks (Zero Cloud Cost):**
   - **Amazon S3:** Adapter code (`s3_adapter.py`) implemented; active deployment uses local persistent storage (`/app/generated_reports`). Bucket storage cost: $0.00.
   - **Amazon CloudWatch:** Adapter code (`monitoring.py`) implemented; active deployment uses stdout structured JSON logs. Ingestion cost: $0.00.
   - **AWS Lambda & EventBridge:** Handler (`solar_processor.py`) and cron rule (`schedule_rule.json`) defined; solar calculations run in-process within FastAPI. Execution cost: $0.00.
   - **AWS SSM Parameter Store:** Adapter code (`param_store.py`) implemented; active configuration loaded via `.env` and environment variables. Cost: $0.00.
   - **Amazon Bedrock:** Explicitly **hard-disabled** (`BEDROCK_ENABLED = False`). Inference cost: $0.00.

3. **Public Exposure & HTTPS Hosting Architecture:**
   - **Port Exposure Audit:** Port 8000 (FastAPI ASGI) is strictly bound to internal loopback/Docker network; no public port 8000 ingress exists. Only port 80 is routed through Nginx.
   - **Secure HTTPS Alternatives:**
     - *Verified HTTPS Demonstration:* Served via Cloudflare Quick Tunnel ([`https://element-concerning-joining-alabama.trycloudflare.com`](https://element-concerning-joining-alabama.trycloudflare.com)) providing end-to-end TLS termination, DDoS defense, and edge caching at **₹0 / $0 additional cost**.
     - *Custom Domain HTTPS:* When binding a registered custom domain, Let's Encrypt / Certbot can be configured directly on Nginx on port 443 with zero cloud resource overhead, avoiding expensive Application Load Balancers ($16.20+/month).

---

## 8. Installation & Quick Start

### Prerequisites
- **Python:** 3.11 or later (`python --version`)
- **Node.js:** 18.0 or later with npm (`node --version`)
- **Git:** 2.30 or later (`git --version`)

### Linux / macOS Setup

```bash
# 1. Clone repository
git clone https://github.com/17rajsal/roofshift-ai.git
cd roofshift-ai

# 2. Setup backend virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
cp .env.example .env

# 3. Launch backend API server
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# 4. Setup and launch frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

### Windows Setup (PowerShell)

```powershell
# 1. Clone repository
git clone https://github.com/17rajsal/roofshift-ai.git
cd roofshift-ai

# 2. Setup backend virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
Copy-Item .env.example .env

# 3. Launch backend API server
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

# 4. Setup and launch frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

- Open **`http://localhost:5173`** to access the web application.
- Open **`http://localhost:8000/docs`** for interactive OpenAPI / Swagger API documentation.

---

## 9. API Capabilities & Key Endpoints

The backend exposes structured REST endpoints under the `/api/v1` namespace:

| Endpoint Group | Key Routes | Description |
|---|---|---|
| **Health & System** | `GET /api/v1/health`<br>`GET /api/v1/system/integrations` | System health status and AWS cloud adapter status matrix. |
| **Portfolios & Projects** | `GET /api/v1/projects`<br>`POST /api/v1/projects`<br>`GET /api/v1/projects/{id}` | Portfolio lifecycle management, geographic coordinates, and tariff parameters. |
| **Buildings & Rooftops** | `GET /api/v1/projects/{id}/buildings`<br>`POST /api/v1/projects/{id}/buildings` | Rooftop polygons, gross/usable areas, demand metrics, and shading profiles. |
| **Solar Climatology** | `POST /api/v1/solar/analyze`<br>`GET /api/v1/projects/{id}/solar` | NASA POWER solar irradiance retrieval, derating calculations, and monthly yields. |
| **Knapsack Optimizer** | `POST /api/v1/projects/{id}/optimize` | Exact Multiple-Choice Knapsack budget allocation across campus rooftops. |
| **Energy & Surplus** | `GET /api/v1/projects/{id}/energy`<br>`POST /api/v1/energy/surplus` | Diurnal hourly generation vs. load balance and export calculations. |
| **Smart Scheduling** | `POST /api/v1/scheduling/optimize` | Shiftable load dispatch recommendations aligned with peak solar production. |
| **Feature Assessments** | `GET /api/v1/projects/{id}/features/templates`<br>`POST /api/v1/projects/{id}/features/assessments` | 8 structured assessment templates (location finder, sensitivity, impact, etc.). |
| **Asset Operations** | `POST /api/v1/inspections/analyze`<br>`POST /api/v1/monitoring/telemetry` | Panel anomaly classification, inverter telemetry PR auditing, and maintenance triage. |
| **Executive Reports** | `POST /api/v1/projects/{id}/reports`<br>`GET /api/v1/reports/{id}/download` | Vector PDF report generation and direct binary document download. |

---

## 10. Data Sources & Scientific Methodologies

### 1. Constrained Capital Allocation (Multiple-Choice Knapsack Problem)
The campus-wide solar budget optimizer is formulated as an exact **Multiple-Choice Knapsack Problem (MCKP)** solved via Decimal Dynamic Programming over the Pareto frontier:

$$\max \sum_{i=1}^{N} \sum_{j=1}^{M_i} v_{ij} x_{ij}$$

$$\text{subject to} \quad \sum_{i=1}^{N} \sum_{j=1}^{M_i} w_{ij} x_{ij} \le B$$

$$\sum_{j=1}^{M_i} x_{ij} \le 1 \quad \forall i \in \{1, \dots, N\}$$

$$x_{ij} \in \{0, 1\} \quad \forall i, j$$

Where:
- $N$: Number of candidate campus rooftops in the portfolio.
- $M_i$: Discrete capacity options for rooftop $i$ in steps of $\Delta C = 0.5\text{ kWp}$ up to the physical rooftop capacity limit $C_{i,\max} = \frac{A_{\text{usable}, i}}{\text{Area per kWp}}$.
- $w_{ij}$: Capital cost (Capex in INR) for choosing capacity step $j$ on building $i$.
- $v_{ij}$: Net annual electricity bill savings (INR/year) under diurnal self-consumption and net metering.
- $B$: Total capital budget ceiling (INR).
- **Empirical Performance Lift:** On the Delhi Technical Institute campus dataset (5 buildings, ₹1,500,000 budget), exact MCKP yields **₹287,420/year** compared to **₹234,800/year** under naive single-largest-rooftop allocation, achieving an audited **+22.4% net annual financial lift**.

---

### 2. Physical Solar Yield & Temperature Derating
Solar photovoltaic generation is modeled from first principles using monthly climatological Global Horizontal Irradiance (GHI) retrieved from the NASA POWER API:

$$E_{\text{monthly}, m} = A_{\text{usable}} \cdot \text{GHI}_m \cdot D_m \cdot \eta_{\text{module}} \cdot \text{PR} \cdot \left[1 - \gamma \cdot (T_{\text{cell}, m} - 25^\circ\text{C})\right]$$

Where:
- $\text{GHI}_m$: Daily average Global Horizontal Irradiance in month $m$ ($\text{kWh}/\text{m}^2/\text{day}$).
- $D_m$: Days in month $m$.
- $\eta_{\text{module}}$: Rated module efficiency ($20.5\%$ standard monocrystalline silicon).
- $\text{PR}$: System Performance Ratio baseline ($75.0\%$ complying with IEC 61724 standard):
  $$\text{PR} = \eta_{\text{inverter}} \cdot (1 - L_{\text{cable}}) \cdot (1 - L_{\text{soiling}}) \cdot (1 - L_{\text{shading}})$$
  $$\text{PR} = 0.965 \cdot (1 - 0.020) \cdot (1 - 0.025) \cdot (1 - L_{\text{shading}})$$
- $\gamma$: Temperature power derating coefficient ($-0.35\%/^\circ\text{C}$ or $0.0035/\text{K}$).
- $T_{\text{cell}, m} = T_{\text{ambient}, m} + \left(\frac{\text{NOCT} - 20}{800}\right) \cdot G_m$, where $\text{NOCT} = 45^\circ\text{C}$.
- **Climatology Cache:** 0.1° geographic coordinate grid cache with automatic fallback to regional IMD/NISE baselines.

---

### 3. Diurnal Coincidence & Surplus Dispatch
Hourly energy matching calculates daytime self-consumption fraction ($\text{SCF}$) and surplus exported to the utility grid:

$$E_{\text{self}} = \sum_{h=0}^{23} \min\left(G_h, L_h\right)$$

$$E_{\text{surplus}} = \sum_{h=0}^{23} \max\left(0, G_h - L_h\right)$$

$$\text{SCF} = \frac{E_{\text{self}}}{\sum_{h=0}^{23} G_h}, \quad \text{SSR} = \frac{E_{\text{self}}}{\sum_{h=0}^{23} L_h}$$

Where $G_h$ is synthetic hourly solar generation derived from the Gaussian solar diurnal bell curve, and $L_h$ is the facility hourly consumption profile.

---

### 4. Environmental Carbon Accounting
Avoided greenhouse gas emissions are calculated using statutory grid emission displacement baselines from the Central Electricity Authority (CEA) of India CO2 Baseline Database (Version 19.0):

$$\Delta \text{CO}_2 = E_{\text{annual}} \cdot \text{EF}_{\text{grid}}$$

Where:
- $\text{EF}_{\text{grid}} = 0.716\text{ kg CO}_2\text{e}/\text{kWh}$ (CEA national weighted average baseline).
- Equivalent trees planted per year: $\text{Trees} = \frac{\Delta \text{CO}_2 (\text{kg})}{21.77\text{ kg CO}_2/\text{tree-year}}$.
- Passenger vehicle emissions displaced: $\text{Vehicles} = \frac{\Delta \text{CO}_2 (\text{metric tons})}{4.6\text{ metric tons CO}_2/\text{vehicle-year}}$.

---

### 5. 25-Year Lifecycle Discounted Cash Flow (DCF)
Long-term financial returns are calculated over a standard 25-year operational lifetime:

$$\text{NPV} = -I_0 + \sum_{t=1}^{25} \frac{S_t - M_t}{(1 + r)^t}$$

Where:
- $I_0$: Initial capital expenditure (Capex in INR).
- $S_t$: Year $t$ electricity bill savings accounting for annual PV degradation ($d = 0.5\%/\text{year}$) and grid tariff escalation ($e = 3.0\%/\text{year}$):
  $$S_t = S_1 \cdot (1 - d)^{t-1} \cdot (1 + e)^{t-1}$$
- $M_t$: Annual operations and maintenance cost ($1.0\%$ of Capex with $2.5\%$ annual inflation).
- $r$: Discount rate ($8.0\%$ standard institutional weighted average cost of capital).
- **Internal Rate of Return (IRR):** Discount rate $r^*$ such that $\text{NPV}(r^*) = 0$.
- **Simple Payback Period:** Minimum year $T$ where $\sum_{t=1}^{T} (S_t - M_t) \ge I_0$.

---

## 11. Testing & Verification

RoofShift AI maintains comprehensive automated test suites covering backend mathematical correctness, API schemas, and frontend build integrity:

```bash
# Execute backend test suite
python -m pytest -o pythonpath=backend backend/tests -v
```

```
============================= test session starts =============================
platform win32 -- Python 3.14.7, pytest-9.1.1
collected 195 items

backend/tests/test_advanced_engine_correctness.py ...................... [ 11%]
.................................                                        [ 28%]
backend/tests/test_api_endpoints.py ...                                  [ 29%]
backend/tests/test_application_integration.py .....                      [ 32%]
backend/tests/test_feature_analytics.py ................................ [ 48%]
..............                                                           [ 55%]
backend/tests/test_feature_api.py ......................                 [ 67%]
backend/tests/test_feature_monitoring.py ............................... [ 83%]
..............                                                           [ 90%]
backend/tests/test_integration_provenance.py ..                          [ 91%]
backend/tests/test_optimizer.py ..                                       [ 92%]
backend/tests/test_solar_engine.py ...                                   [ 93%]
backend/tests/test_v2_acceptance.py ............                         [100%]

===================== 195 passed, 401 warnings in 12.68s ======================
```

```bash
# Execute frontend TypeScript and Vite production compilation
cd frontend
npm run build
```

```
✓ 2563 modules transformed.
✓ built in 631ms (0 TypeScript errors)
```

---

## 12. Repository Structure

```
roofshift-ai/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Automated CI test and build workflow
├── backend/
│   ├── app/
│   │   ├── api/v1/                    # REST route controllers
│   │   ├── core/                      # Configuration and database sessions
│   │   ├── models/                    # SQLAlchemy database schemas
│   │   ├── schemas/                   # Pydantic v2 data models
│   │   └── services/                  # Business logic & analytical engines
│   │       ├── energy/                # Diurnal balance and surplus logic
│   │       ├── features/              # Specialized feature templates & analytics
│   │       ├── optimization/          # Knapsack budget solver (MCKP)
│   │       ├── reports/               # ReportLab PDF compiler
│   │       └── solar/                 # NASA POWER climatology integration
│   ├── requirements.txt               # Python package dependencies
│   └── tests/                         # Automated pytest test suites (195 tests)
├── frontend/
│   ├── public/                        # Static web assets and imagery
│   ├── src/
│   │   ├── components/                # Reusable UI components & modals
│   │   │   ├── home/                  # Homepage section components
│   │   │   ├── layout/                # Navigation and sidebar shell
│   │   │   └── map/                   # Leaflet GIS solar map and draw tools
│   │   ├── pages/                     # Application route views
│   │   └── services/                  # Axios API communication clients
│   ├── package.json                   # Frontend dependencies
│   └── vite.config.ts                 # Vite bundler configuration
├── docs/
│   ├── assets/                        # Documentation screenshots & figures
│   ├── ARCHITECTURE.md                # Detailed technical system specifications
│   ├── AWS_DEPLOYMENT.md              # CloudFormation and EC2 deployment guide
│   ├── DATA_SOURCES.md                # Scientific sources and calculation disclaimers
│   ├── DEMO.md                        # Institutional campus walkthrough scenario
│   ├── FEATURES.md                    # Detailed capability specifications
│   └── SETUP.md                       # Comprehensive environment setup guide
├── infrastructure/
│   └── aws/                           # CloudFormation and EC2 deployment scripts
├── .env.example                       # Sample environment variable template
├── .gitignore                         # Comprehensive Git ignore rules
├── docker-compose.yml                 # Local container orchestration
└── README.md                          # Repository documentation
```

---

## 13. System Assumptions & Limitations

- **Irradiance Resolution:** Climatological solar yield estimates use historical monthly averages from NASA POWER rather than real-time minute-by-minute pyranometer readings.
- **Rooftop Structural Integrity:** Calculated capacities represent theoretical physical maximums based on digitized surface area; on-site structural engineering inspections are mandatory prior to physical procurement.
- **Telemetry Ingestion:** The operational monitoring interface currently processes historical intervals and sample telemetry datasets; direct continuous SCADA / Modbus hardware ingestion is planned for future releases.
- **Financial Projections:** Electricity bill savings and payback calculations are based on user-supplied import tariffs, net-metering export rates, and standard degradation assumptions ($0.5\%/\text{year}$).

---

## 14. Development Roadmap

- [x] Multi-facility Multiple-Choice Knapsack budget optimization
- [x] High-resolution diurnal solar surplus coincidence modeling
- [x] Inverter telemetry Performance Ratio and degradation auditing
- [x] Multi-page ReportLab vector PDF proposal generator
- [x] 12 specialized solar assessment engines and history tracking
- [x] Comprehensive AWS CloudFormation and Docker deployment templates
- [ ] Direct RS-485 / Modbus RTU inverter hardware gateway integration
- [ ] 3D LiDAR point-cloud shadow tracing for complex parapets and obstacles
- [ ] Multi-tenant institutional portfolio aggregation and district-level microgrid balancing

---

## 15. Maintainer & Contact

- **Project Lead & Maintainer:** [@17rajsal](https://github.com/17rajsal)
- **Repository:** [https://github.com/17rajsal/roofshift-ai](https://github.com/17rajsal/roofshift-ai)

---

<div align="center">

**RoofShift AI — Turning rooftop solar potential into explainable, data-informed energy decisions.**

</div>
