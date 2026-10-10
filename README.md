# RoofShift AI — Solar Planning & Energy Optimization Platform
### Turn Every Rooftop into a Smarter Energy Investment.

[![Environmental Hacks 2026](https://img.shields.io/badge/Hackathon-Environmental%20Hacks%202026-10B981)](https://wemakedevs.org)
[![AWS Track](https://img.shields.io/badge/AWS-Waste%20%26%20Energy%20Track-F5B942)](https://aws.amazon.com)
[![Team](https://img.shields.io/badge/Team-TEAM%20DRX-123C32)](#team-attribution)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.141-009688)](https://fastapi.tiangolo.com)
[![React Vite](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20TS-61DAFB)](https://vitejs.dev)
[![NASA POWER](https://img.shields.io/badge/Data-NASA%20POWER%20Climatology-blue)](https://power.larc.nasa.gov)

---

## 1. Executive Summary & Vision

**RoofShift AI** is an explainable, software-only decision-support platform designed for institutions managing multiple campus facilities (universities, colleges, hospitals, industrial parks, and government complexes) across India.

### The Core Problem
Organizations know rooftop solar is beneficial, but face a critical multi-facility capital allocation dilemma:
> *"With an institutional capital budget of ₹10 Lakh and five candidate campus rooftops, where should we install solar PV panels to maximize financial returns, eliminate waste, and avoid low-value grid export?"*

Traditional solar assessments analyze rooftops in isolation. **RoofShift AI integrates physics, electricity tariffs, and mathematical optimization into one unified decision:**

$$\textbf{Solar Potential} + \textbf{Energy Demand} + \textbf{Budget Optimization} + \textbf{Smart Load Shifting} = \textbf{One Explainable Solar Plan}$$

---

## 2. Key Product Capabilities

1. **Interactive Geospatial Solar Map:**
   - Real OpenStreetMap GIS canvas with Nominatim Indian location search (Delhi, Mumbai, Bengaluru, Pune, etc.).
   - Visual candidate building markers color-coded by shading severity (<8% Low, 15% Medium, 30% High).
   - Click-to-place rooftop boundaries with geodesic surface area estimations.

2. **Public Satellite Solar Data Integration (NASA POWER):**
   - Direct integration with NASA POWER Climatological Point API for monthly Global Horizontal Irradiance (GHI in $\text{kWh/m}^2/\text{day}$).
   - Geographic database caching (grid rounded to 0.1° ~ 11 km) and IMD/NISE Indian regional solar baseline fallback.

3. **Multiple-Choice Knapsack Budget Solver (OR-Optimization):**
   - Formulated as a global **Multiple-Choice Knapsack Problem (MCKP)** using dynamic programming.
   - Evaluates discrete capacity increments (0.5 kWp / 1.0 kWp) up to each rooftop's physical usable area.
   - User-selectable objectives:
     - **Maximize Annual Bill Savings (INR)** (accounts for diminishing returns where export tariffs are lower than grid avoidance).
     - **Maximize Onsite Solar Self-Consumption (kWh)**.
     - **Maximize Clean Energy Generation (kWh)**.
   - Fair baseline benchmark: compares solver outputs against a naive greedy strategy (largest roof first), computing verifiable savings lift ($+\%$) under identical constraints.

4. **Solar Surplus & Diurnal Load Coincidence Analyzer:**
   - 24-hour diurnal solar bell curve modeling vs. institutional load curve.
   - Automatic detection of midday surplus windows (e.g., 10:00 AM – 03:00 PM) where solar generation exceeds campus base load.

5. **Smart Electricity Load Shifting Engine:**
   - Evaluates shiftable campus utilities (Electric vehicle fleet charging, overhead water reservoir pumps, battery storage).
   - Recommends optimal daylight operating windows that maximize direct solar absorption without double-counting surplus.
   - Quantifies additional clean energy absorbed ($\text{kWh/year}$) and avoided grid import costs ($\text{₹/year}$).

6. **Explainable Rationales Feed:**
   - Generates deterministic, calculation-grounded explanations for every building (why it was prioritized, payback ROI, shade impact).

7. **Publication-Grade PDF Report Generator:**
   - Genuine ReportLab PDF engine compiling multi-page investment proposals with executive summaries, KPI tables, baseline comparisons, and regulatory disclaimers.

---

## 3. Technology Stack

### Frontend
- **Framework:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS v4 + Custom ClimateTech SaaS design system
- **Mapping:** Leaflet + React-Leaflet + OpenStreetMap tiles
- **Data Visualization:** Recharts (Area charts, Bar charts, Line charts)
- **Icons:** Lucide React

### Backend
- **Framework:** Python 3.11+ / FastAPI
- **Data Validation:** Pydantic v2 (with `ConfigDict`)
- **Database & ORM:** SQLAlchemy 2.0 (SQLite for local development, PostgreSQL ready)
- **Mathematical Optimization:** Multiple-Choice Knapsack Dynamic Programming
- **HTTP Client:** HTTPX (async client with retries and timeout controls)
- **PDF Generation:** ReportLab 5.0
- **Testing:** Pytest 9.1

### Cloud & DevOps (AWS)
- **Containerization:** Docker & Docker Compose
- **Web Server:** Nginx (Alpine) with reverse proxy
- **AWS Targets:** EC2, AWS ECS Fargate, AWS CloudFormation
- **Cloud Readiness:** Health checks, persistent EBS volumes, zero hardcoded secrets

---

## 4. Built-in Demonstration Project: Delhi College Campus

RoofShift AI includes a pre-seeded, dynamically calculated demonstration campus:

- **Location:** New Delhi, India ($28.614^\circ\text{ N}, 77.209^\circ\text{ E}$)
- **Capital Budget:** **₹10,00,000 (INR 10 Lakh)**
- **Grid Electricity Tariff:** ₹8.50 / kWh
- **Export Tariff Benchmark:** ₹3.50 / kWh

| Candidate Building | Category | Gross Roof | Usable Roof | Monthly Load | Shading Profile |
|---|---|---:|---:|---:|---|
| **Academic Block** | Academic | 450 m² | 338 m² | 2,400 kWh | Low (<5%) |
| **Library** | Academic | 300 m² | 210 m² | 1,100 kWh | Low (<5%) |
| **Hostel** | Residential | 600 m² | 390 m² | 4,200 kWh | Medium (15%) |
| **Auditorium** | Utility | 520 m² | 312 m² | 900 kWh | High (30%) |
| **Admin Block** | Administrative | 250 m² | 175 m² | 1,500 kWh | Medium (15%) |

*Note: Figures are computed dynamically through the backend solver; no hardcoded static winners.*

---

## 5. Quickstart Guide (Local Development)

### Prerequisites
- Python 3.11+ installed
- Node.js v18+ and npm installed

### Step 1: Run Backend (FastAPI)
```bash
# From workspace root
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation will be available at: http://localhost:8000/docs*

### Step 2: Run Frontend (React Vite)
In a separate terminal:
```bash
# From workspace root
cd frontend

# Install npm dependencies (if not already installed)
npm install --legacy-peer-deps

# Start Vite dev server on port 5173
npm run dev
```
*Open http://localhost:5173 in your browser.*

### Application and engine ownership

Complex backend engines are developed separately on `codex/advanced-engines`. The nine additional solar features and expanded PDFs are owned by `codex/solar-feature-expansion`. Frontend foundations, routing, project context, persistence integration, and infrastructure continue on `antigravity/core-app`. Read [ENGINE_HANDOFF.md](ENGINE_HANDOFF.md), [API_CONTRACTS.md](API_CONTRACTS.md), and [APPLICATION_CHECKPOINT.md](APPLICATION_CHECKPOINT.md) before integration. Avoid independently rewriting modules assigned to either Codex branch.

The application remembers the selected project across reloads and isolates page state when switching projects. On the Solar Map, use **Draw roof boundary**, click corners in order, and choose **Use this roof**. Confirm the estimated area in the building form before saving. Outlines are stored with the building and remain available after reload; point-only buildings continue to work.

For a separately hosted frontend, configure `VITE_API_BASE_URL` before the production build using `frontend/.env.example`. Same-origin local and Docker deployments need no override. Report notes are included in generated PDFs, and report history belongs to the active project.

### Verification

Use a separate test database to keep application data intact:

```powershell
New-Item -ItemType Directory -Force tmp | Out-Null
$env:DATABASE_URL = 'sqlite:///./tmp/acceptance.db'
python -m pytest -o pythonpath=backend backend/tests -q --basetemp=tmp/pytest-application
Remove-Item Env:DATABASE_URL
cd frontend
npm run build
node --test --test-isolation=none tests/roofGeometry.test.ts
```

The geometry checks use Node's TypeScript support; run them on Node 22.18+ or a current Node release. `--basetemp` is a disposable test directory inside the workspace.

---

## 6. Docker Compose Deployment

To run both services in isolated containers:
```bash
# From project root
docker compose up -d --build
```
- Web Application: http://localhost (Port 80)
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/v1/health

---

## 7. AWS Cloud Deployment

See [`infrastructure/aws/README-AWS.md`](infrastructure/aws/README-AWS.md) for full instructions.

### One-Click EC2 Launch:
```bash
chmod +x infrastructure/aws/deploy-ec2.sh
./infrastructure/aws/deploy-ec2.sh
```

### CloudFormation Provisioning:
```bash
aws cloudformation create-stack \
  --stack-name roofshift-ai \
  --template-body file://infrastructure/aws/cloudformation-template.yaml
```

---

## 8. Verification & Test Suite

Run the automated backend test suite:
```bash
python -m pytest -o pythonpath=backend backend/tests
```
All tests verify:
- Health check endpoint
- Location geocoding & gazetteer fallback
- Full CRUD lifecycle (Project -> Building -> Solar Potential -> Knapsack Solver -> ReportLab PDF binary)
- Knapsack budget constraints (strictly $\le \text{Budget}$)
- Shading deratings and CEA emission factors

Run frontend build check:
```bash
cd frontend && npm run build
```

---

## 9. Scientific & Regulatory Disclaimer

RoofShift AI is an institutional preliminary decision-support and screening platform. All calculations are modeled approximations based on public climatology from NASA POWER and standard PV performance parameters (75% PR). This software does not substitute for certified structural engineering load audits, electrical single-line diagram (SLD) sign-offs, or statutory distribution company (DISCOM) net-metering sanctions.

---

## Team Attribution
**TEAM DRX**
- Hackathon: Environmental Hacks 2026 (WeMakeDevs × AWS)
- Track: Waste & Energy
- Platform: RoofShift AI
