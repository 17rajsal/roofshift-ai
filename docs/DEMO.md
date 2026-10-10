# RoofShift AI — Demonstration Campus Walkthrough Guide

> **Scenario:** Delhi Institutional Campus (Engineering College)  
> **Location:** New Delhi, India ($28.614^\circ\text{ N}, 77.209^\circ\text{ E}$)  
> **Capital Budget:** **₹10,00,000 (INR 10 Lakh)**  
> **Grid Electricity Tariff:** ₹8.50 / kWh  
> **Export Net-Metering Rate:** ₹3.50 / kWh  
> **Target Audience:** College Deans, Facility Engineers, AWS Evaluators, and Hackathon Judges  

---

## 1. Candidate Buildings Profile

RoofShift AI comes pre-seeded with 5 realistic academic campus buildings exhibiting diverse rooftop orientations, daytime consumption patterns, and shading characteristics:

| Building Name | Category | Gross Area | Usable Area | Monthly Demand | Daytime Load | Shading Profile | Physical PV Cap |
|---|---|---:|---:|---:|---:|---|---:|
| **Academic Block** | Academic | $800\text{ m}^2$ | $640\text{ m}^2$ | $4,500\text{ kWh}$ | 75% | Low (<5% loss) | $80.0\text{ kWp}$ |
| **Library Building** | Academic | $450\text{ m}^2$ | $360\text{ m}^2$ | $2,200\text{ kWh}$ | 70% | Medium (15% loss) | $45.0\text{ kWp}$ |
| **Hostel Block A** | Residential | $600\text{ m}^2$ | $450\text{ m}^2$ | $3,800\text{ kWh}$ | 45% | Low (<5% loss) | $56.2\text{ kWp}$ |
| **Auditorium & Dining** | Utility | $550\text{ m}^2$ | $400\text{ m}^2$ | $1,800\text{ kWh}$ | 60% | High (30% loss) | $50.0\text{ kWp}$ |
| **Admin Complex** | Administrative | $350\text{ m}^2$ | $280\text{ m}^2$ | $2,600\text{ kWh}$ | 80% | Low (<5% loss) | $35.0\text{ kWp}$ |
| **Portfolio Aggregate** | — | **$2,750\text{ m}^2$** | **$2,130\text{ m}^2$** | **$14,900\text{ kWh}$** | — | — | **$266.2\text{ kWp}$** |

---

## 2. Step-by-Step Live Demonstration Script

### Step 1: Portfolio Executive Overview (`/`)
- **Key Message:** High-level institutional dashboard synthesizing campus solar potential, sanctioned budget, and the 4-stage engineering pipeline.
- **What to Show:**
  - Notice the tabular metrics in JetBrains Mono font (`₹10.0L Budget`, `2,130 m² Usable Roof`, `266.2 kWp Capacity`).
  - Highlight the 4-stage methodology: Geospatial Survey &rarr; NASA Irradiance Physics &rarr; OR-Tools Knapsack Solver &rarr; Diurnal Coincidence Dispatch.

### Step 2: Interactive GIS Solar Map (`/map`)
- **Key Message:** Geospatial intelligence ground-truthed on OpenStreetMap with instant Indian city geocoding.
- **What to Show:**
  - Center on New Delhi coordinates.
  - Click on the Academic Block polygon or marker to view the slide-out technical drawer.
  - Review the 8-point parameter breakdown: Gross Area, Parapet Setbacks, Usable Surface, and Shading Derates.

### Step 3: Multi-Facility Building Catalog (`/buildings`)
- **Key Message:** Comprehensive inventory contrasting monthly solar generation curves against campus seasonal consumption.
- **What to Show:**
  - The 12-month Recharts bar chart showing clean solar generation (`#059669`) overlaid with facility demand (`#475569`).
  - Note how seasonal summer loads peak in May–June while solar generation peaks in April–May.

### Step 4: Mathematical Budget Optimizer (`/optimize`)
- **Key Message:** The core algorithmic innovation of RoofShift AI — **Multiple-Choice Knapsack Optimization** vs. Intuitive Guesswork.
- **What to Show:**
  - Click the **"Run Mathematical Optimization"** button.
  - Review the **Fair Baseline Benchmark Container (Slate-900 Card):**
    - Conventional Intuition (Largest Roof First): Allocates exclusively to the Academic Block, yielding ₹2,96,000/yr in bill savings.
    - RoofShift AI Knapsack Solver: Strategically splits capacity across Academic Block and Admin Complex (high daytime load coincidence), yielding **₹3,73,800/yr**.
    - **Demonstrated Savings Lift:** **+₹77,800/year (+26.3% lift)** under the identical ₹10 Lakh capex!
  - Explain the deterministic proof: The Academic Block alone would produce excess midday energy exported at the discounted ₹3.50/kWh rate. Splitting capacity into the Admin Complex displaces direct ₹8.50/kWh grid purchases.

### Step 5: Diurnal Energy Balance & Solar Surplus (`/insights`)
- **Key Message:** Solving midday solar waste through 24-hour coincidence modeling.
- **What to Show:**
  - The 24-hour Diurnal Area Chart displaying the midday solar production bell curve rising above baseline demand between **10:30 AM and 02:30 PM**.
  - Show the surplus export window and explain why selling back to the grid at ₹3.50/kWh wastes potential value.

### Step 6: Smart Electricity Load Shifting (`/scheduling`)
- **Key Message:** Active demand-side flexibility maximizing institutional self-consumption.
- **What to Show:**
  - Inspect the 3 shiftable campus assets:
    1. **Electric Vehicle Fleet Charging (25 kW draw, 3 hours):** Shifted from 06:00 PM evening tariff to 11:00 AM midday surplus (+75 kWh solar absorbed per session).
    2. **Overhead Water Reservoir Pumps (15 kW draw, 2 hours):** Shifted from 06:00 AM dawn to 01:00 PM solar peak (+30 kWh solar absorbed).
    3. **Academic Chiller Pre-Cooling (30 kW draw, 2 hours):** Shifted to 12:00 PM to coast through late afternoon peak tariff hours (+60 kWh solar absorbed).
  - The before-and-after line chart visibly illustrates the campus demand peak moving directly under the solar generation curve.

### Step 7: Operations & Asset Care (`/operations`)
- **Key Message:** Complete lifecycle maintenance protecting institutional solar ROI.
- **What to Show:**
  - **Tab 1 (Panel Defect Inspection):** Upload a drone photo to view deterministic gradient classification identifying hotspot cell anomalies and temperature deltas ($\Delta T$).
  - **Tab 2 (Inverter Telemetry & PR):** Inspect recorded generation logs evaluated against NASA POWER solar irradiance to verify Performance Ratio ($75.0\%$ baseline).
  - **Tab 3 (Maintenance Cases):** View active corrective tickets with estimated kWh/day losses and toggle status to `RESOLVED`.

### Step 8: Executive Investment Report (`/reports`)
- **Key Message:** Turnkey executive PDF proposal generation for institutional leadership.
- **What to Show:**
  - Type an engineering review note: *"Recommended for Phase 1 campus greening sanction."*
  - Click **"Generate New PDF Report"** to compile the document via ReportLab.
  - Download and open the multi-page PDF proposal featuring complete allocation tables, baseline comparisons, load curves, and statutory disclaimers.

### Step 9: AWS Architecture Modal (Navbar Cloud Icon)
- **Key Message:** Production-grade AWS cloud capability matrix with zero Bedrock dependency.
- **What to Show:**
  - Click the **AWS Architecture** button in the top navbar.
  - Showcase the 10 configured AWS cloud adapters with their active providers and verified zero-cost local fallbacks.
  - Point out the **Zero Amazon Bedrock Dependency** directive banner, explaining why deterministic algorithms were chosen to eliminate latency and costs.
