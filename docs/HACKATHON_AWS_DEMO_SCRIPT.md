# RoofShift AI — 3-Minute Hackathon Demonstration Script

**Title:** RoofShift AI — India-Scale AI Solar Intelligence & Optimization Platform on AWS  
**Target Duration:** Exactly 3 Minutes (180 Seconds)  
**Live Production URL:** `http://54.252.232.247/`  
**API Endpoint:** `http://54.252.232.247/api/v1`  
**AWS Host:** Amazon EC2 `t3.micro` (`i-0803fc68806367b46`) in Sydney (`ap-southeast-2`)

---

## Act 1: The Problem & The Solution (0:00 – 0:20)
* **Visual:** Pitch slide / landing page hero at `http://54.252.232.247/`.
* **Voiceover:**
  > "India has committed to 500 gigawatts of non-fossil capacity by 2030, but multi-building campuses, universities, and commercial parks face a critical dilemma: when capital budgets are limited, which rooftops yield the maximum financial savings and highest solar utilization?
  > Welcome to RoofShift AI — the demand-aware, budget-constrained solar intelligence platform built on AWS."

---

## Act 2: AWS Cloud Architecture (0:20 – 0:40)
* **Visual:** AWS Management Console showing running EC2 instance `i-0803fc68806367b46` and architecture diagram.
* **Voiceover:**
  > "RoofShift AI runs production-live on Amazon EC2 in `ap-southeast-2`, leveraging zero-port-opening AWS Systems Manager Session Manager, encrypted Amazon EBS persistence, and Amazon S3 object storage for audit-ready reports.
  > Built with a frugal engineering philosophy, our complete cloud infrastructure runs efficiently on AWS Free Tier and promotional credits with zero wasteful spend."

---

## Act 3: India Solar Intelligence Map (0:40 – 1:20)
* **Visual:** Click into the live interactive **India Solar Intelligence Map** in the web app.
* **Actions on Screen:**
  1. Hover over Rajasthan (Tier A+, 5.86 kWh/m²/day GHI).
  2. Toggle map layers: GHI Irradiance $\rightarrow$ Ambient Temperature $\rightarrow$ Wind Speed (m/s) $\rightarrow$ Composite Suitability Score.
  3. Click on the Data Provenance Modal showing authentic NASA POWER 20-year satellite data and IMD climatology.
* **Voiceover:**
  > "Instead of a fixed campus mockup, RoofShift AI begins at India scale. Our vector geospatial map analyzes all 36 Indian States and Union Territories, dynamically indexing satellite solar irradiance, ambient temperature, wind cooling, and cloud attenuation.
  > Notice the transparency: every metric displays verified scientific provenance with clear separation between commercial rooftop feasibility and open-land ground-mount screening."

---

## Act 4: Demand-Aware 0/1 Knapsack Budget Optimization (1:20 – 2:10)
* **Visual:** Drill down into campus rooftop analysis and open the Budget Optimizer.
* **Actions on Screen:**
  1. View the 5-building portfolio (gross roof areas, usable percentages, consumption profiles).
  2. Input a Capex budget constraint of **₹10,00,000**.
  3. Click **"Run Solar Optimization"**.
  4. Review the exact dynamic programming allocation table: capacity allocations, ₹2,36,911/yr savings, and 4.22-year simple payback.
* **Voiceover:**
  > "Here is our core engineering innovation: when an organization has ₹10 Lakhs, greedy rooftop selection leaves money on the table.
  > RoofShift AI executes an exact multiple-choice 0/1 Knapsack solver. It evaluates hourly facility demand curves against solar generation profiles to maximize self-consumption and financial savings without unscientific approximations."

---

## Act 5: Real ML Forecasting & Solar Panel Inspection (2:10 – 2:35)
* **Visual:** Open dated ML solar forecasting and the panel defect inspection drawer.
* **Actions on Screen:**
  1. Show 48-hour dated yield forecast powered by retrained XGBoost regressor ($R^2 = 0.9967$) consuming real-time Open-Meteo numerical weather predictions.
  2. Upload a sample panel image: MobileNetV3 neural network classifies clean vs. soiled modules with an automated $<65\%$ abstain safety threshold.
* **Voiceover:**
  > "Under the hood, RoofShift AI deploys real machine learning. Our XGBoost model forecasts hourly capacity factor against real-time numerical weather models, while our lightweight MobileNetV3 vision classifier triages module soiling with an automated abstain safety protocol."

---

## Act 6: Executive Reporting & Environmental Impact (2:35 – 3:00)
* **Visual:** Download the audit-ready PDF executive report and display the environmental summary.
* **Actions on Screen:**
  1. Click **"Generate Executive Dossier"** and open the generated PDF report.
  2. Highlight the 19,956 kg avoided CO₂ metric (CEA India v19 grid baseline).
  3. Show the live AWS integration health status.
* **Voiceover:**
  > "With one click, facility managers generate audit-ready engineering dossiers, securely stored in Amazon S3 with time-bounded presigned URLs.
  > RoofShift AI turns raw satellite data and complex capital constraints into clear, bankable clean energy decisions. Thank you!"
