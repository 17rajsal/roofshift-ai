# ROOFSHIFT AI — 3-MINUTE HACKATHON VIDEO DEMONSTRATION SCRIPT
**Event:** Environmental Hacks 2026  
**Project:** RoofShift AI — Real AI Solar Intelligence & Multi-Site Energy Optimization  
**Live Public URL:** [https://d2pxwgtcwn203c.cloudfront.net](https://d2pxwgtcwn203c.cloudfront.net)  
**Total Target Video Duration:** 3 minutes (180 seconds)  

---

## VIDEO SCRIPT TIMELINE & ACTION BREAKDOWN

### 0:00 – 0:30 (30s) — The Problem & Live Platform Introduction
- **Visual:** Open browser to `https://d2pxwgtcwn203c.cloudfront.net`. Show the landing page with the live India Solar Intelligence Map.
- **Narration:**
  > "Welcome to RoofShift AI. In India and emerging solar markets, commercial campuses and multi-facility enterprises face a massive challenge: they have capital budgets to install solar, but roof area, daytime demand, export tariffs, and local climate vary wildly across their buildings. Choosing blindly or installing solar on every roof equally wastes millions of rupees and causes massive curtailment.
  >
  > RoofShift AI solves this with demand-aware, budget-constrained solar optimization and genuine AI forecasting. And best of all, the platform is live right now in production on AWS at `d2pxwgtcwn203c.cloudfront.net`."

---

### 0:30 – 1:15 (45s) — India-Scale Solar Geospatial Intelligence & Real Data
- **Visual:** Navigate to `/workspace` or scroll through the interactive India map showing all 36 Indian States and Union Territories. Click on Rajasthan, then Karnataka.
- **Narration:**
  > "First, we look at macro-geospatial intelligence. Unlike typical demos with hardcoded numbers, RoofShift AI covers all 36 Indian states and union territories with verified NASA POWER climatological irradiance data. 
  > 
  > For every region, we track Global Horizontal Irradiance, Direct Normal Irradiance, ambient temperatures, and monsoon cloud attenuation factors. We maintain strict scientific integrity: technical radiation potential is never conflated with available commercial rooftop wasteland."

---

### 1:15 – 1:55 (40s) — The Core Innovation: Multi-Choice Knapsack Portfolio Optimizer
- **Visual:** Navigate to the **Portfolio Optimizer** tab (`/optimizer`). Set a budget of INR 2,000,000. Run the optimization.
- **Narration:**
  > "Now, here is our core algorithmic breakthrough: multi-site capital allocation. 
  >
  > Given a finite budget, how should an institution allocate solar capacity across candidate rooftops to maximize monetary savings? A naive greedy approach prioritizes roofs solely by available area or peak radiation. But solar power generated when a building has zero demand must be exported to the grid at low feed-in tariffs.
  >
  > Our integer programming solver treats this as a Multiple-Choice Knapsack Problem. As you can see live on screen, with a 20 Lakh Rupee budget, RoofShift allocates 40 kWp across optimal demand-matched buildings, generating 48,000 kWh annually and producing **over 46% higher savings lift** compared to conventional greedy sizing."

---

### 1:55 – 2:30 (35s) — Genuine AI: XGBoost Forecasting & MobileNetV3 Defect Inspection
- **Visual:** Navigate to Solar Forecast / ML tab, show the XGBoost prediction vs IEC 61724 physics derating baseline. Briefly show the MobileNetV3 visual inspection module.
- **Narration:**
  > "Next, our machine learning models. We trained an XGBoost regressor on real sensor telemetry from Gandikota Solar Power Plants in Andhra Pradesh, achieving a held-out test R² score of 0.9967 and an 87% error reduction over standard physics derating models.
  >
  > In operations, our MobileNetV3 vision model inspects rooftop panel photos to classify soiling, dust, and cell hotspotting with high precision."

---

### 2:30 – 3:00 (30s) — AWS Cloud Architecture, S3 Presigned PDF & Conclusion
- **Visual:** Click "Generate Executive PDF Report". Show the download redirecting directly to the Amazon S3 presigned URL. Open the generated multi-page professional PDF. Display `/api/v1/system/integrations` capability matrix.
- **Narration:**
  > "Finally, let's look under the hood at our AWS cloud architecture. The app runs on Amazon EC2 fronted by Amazon CloudFront with global TLS encryption. When we generate an executive PDF report, it is streamed to a private Amazon S3 bucket, and downloaded securely via an AWS IAM-governed presigned URL. Observability is live with structured Amazon CloudWatch telemetry, AWS Parameter Store, and AWS Budgets cost governance.
  >
  > RoofShift AI bridges the gap between raw geospatial physics, real machine learning, and actionable clean energy finance. Try it live at `d2pxwgtcwn203c.cloudfront.net`. Thank you!"

---

## SPEAKER CHECKLIST BEFORE RECORDING
- [x] CloudFront HTTPS URL is active: `https://d2pxwgtcwn203c.cloudfront.net`
- [x] Backend API status is verified healthy (`/api/v1/health`)
- [x] S3 bucket has verified report files
- [x] CloudWatch log group `/roofshift/backend` is actively logging events
- [x] All 36 Indian states load cleanly in the map
- [x] Optimization engine returns live results in under 200ms
