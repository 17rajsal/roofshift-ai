# RoofShift AI — Model Limitations & Operational Disclaimers

**Engineering Standard:** Scientific Integrity, Transparent Provenance, Risk Management  
**Version:** 2.0  
**Repository Branch:** `feature/ai-model-training-integration`

---

## 1. Solar Photovoltaic Generation Forecaster (XGBoost)

### 1.1 Single-Site Geographic & Hardware Transfer Gap
* **Empirical Reality:** The model was trained on high-frequency telemetry from a single utility-scale installation (Gandikota Plant 1, Kadapa, Andhra Pradesh). While it achieves $R^2 = 0.99673$ and $\text{nMAE} = 4.00\%$ on held-out Plant 1 test data, zero-shot transfer to Plant 2 (Kadapa, AP) yields $R^2 = 0.73322$ and $\text{nMAE} = 29.64\%$.
* **Operational Limitation:** This model **must not** be represented as an universally accurate, out-of-the-box solar yield predictor for all microclimates and hardware configurations in India without local calibration.
* **Prerequisite for Production Deployment:** New facilities require 7 to 14 days of inverter telemetry paired with on-site meteorological measurements to calibrate local DC/AC clipping, temperature coefficients, and cable resistance losses.

### 1.2 Atmospheric Ramp Dynamics & Temporal Granularity
* **Sub-Hour Cloud Transients:** Fast-moving cumulus clouds cause steep photovoltaic ramping (up to 70% loss of irradiance in seconds). Numerical Weather Prediction (NWP) models (ECMWF, GFS, ICON via Open-Meteo) operate on hourly temporal resolutions and cannot forecast instantaneous micro-scale cloud shadow paths.
* **Aerosol & Pollution Spikes:** Sudden winter smog events (e.g., in the Indo-Gangetic Plain) or dust storm particulate fronts (Andhi in Rajasthan) cause aerosol optical depth (AOD) anomalies that deviate from standard NWP radiation forecasts.

### 1.3 Electrical & Degradation Physics
* **Non-Linear Cell Aging:** The model assumes standard linear operational performance and does not simulate Potential-Induced Degradation (PID), Light and Elevated Temperature-Induced Degradation (LeTID), or inverter maximum power point tracking (MPPT) firmware hunting glitches.

---

## 2. Solar Panel Surface Inspection Classifier (MobileNetV3)

### 2.1 Sensor Modality Boundaries (Visual RGB vs. Thermal IR vs. EL)
* **Visual RGB Constraints:** The MobileNetV3-Small classifier analyzes standard visible-spectrum (RGB 400–700 nm) photographic imagery. It is capable of detecting surface dust, sand accumulation, bird droppings, and surface staining with 86.44% test accuracy.
* **Invisible Sub-Surface Defects:** Visual RGB imagery **cannot detect**:
  * Internal cell micro-cracks or wafer fracturing (requires Electroluminescence / EL imaging at 950–1150 nm).
  * Inactive strings, failed solder ribbons, or bypass diode short-circuits.
  * Localized cell hotspots and thermal runaway (requires Long-Wave Infrared / LWIR thermography at 8–14 µm).
* **Architectural Routing:** RoofShift AI explicitly separates image modalities. Aerial drone thermal radiometric imagery must be routed through thermal triage channels, not evaluated as visual RGB dust.

### 2.2 Specular Reflections & Solar Glint
* **Optical Artifacts:** At low sun angles, direct specular glint off anti-reflective module glass can cause false positive soiling alerts by creating high-contrast texture gradients across the panel face.
* **Operational Protocol:** Technicians should acquire aerial or handheld images at an off-axis tilt angle of $15^\circ$ to $30^\circ$ relative to direct solar incidence or use a circular polarizing filter.

### 2.3 Boundary Uncertainty & The Abstain Protocol
* When the classification confidence falls below 65% ($\max(P) < 0.65$), the system abstains from issuing an authoritative diagnosis and labels the inspection as `INCONCLUSIVE`. This prevents automated dispatch of unnecessary water-washing operations in arid zones.

---

## 3. Geospatial & Engineering Suitability Calculations

### 3.1 Engineering Suitability Index v8.3 (Not AI)
* **Algorithmic Nature:** The Composite Suitability Score in the India Solar Intelligence workspace is a **deterministic multi-criteria engineering weighting index (v8.3)** combining NASA POWER 20-year GHI, IMD climatological normals, Open-Meteo wind speeds, and cloud attenuation. It is **not** an artificial neural network or black-box predictive model.
* **No Artificial Score Inflation:** Raw scores are bounded strictly within $[0.0, 100.0]$ without artificial minimum score floor clamps (e.g., no synthetic `max(35.0, score)`).

### 3.2 Open-Land Utility-Scale Ground-Mount Screening
* **Screening Nature:** Open-land suitability scores indicate high-level regional meteorological favorability for ground-mount solar.
* **Explicit Exclusions:** The screening calculation explicitly **does not verify**:
  1. Micro-topographical slope and digital elevation model (DEM) washouts (`terrain_slope: "Not verified"`).
  2. Cadastral revenue records, forest clearances, or tribal land ownership (`land_use_eligibility: "Not established"`).
  3. Proximity to state transmission utility (STU) sub-stations or grid injection capacity (`grid_connection: "Not verified"`).

### 3.3 OpenStreetMap Rooftop Geometry & Capacity
* **Desktop Estimation Only:** Building footprints imported from OpenStreetMap (Overpass API) provide desktop screening approximations based on transparent planning assumptions (75% usable roof area, 180 W/m² PV density).
* **Structural Certification:** Remote satellite and vector polygon screening **does not confirm structural integrity**. Physical load-bearing capacity, wind uplift tolerance, parapet stability, and roof membrane conditions must be inspected and stamped by a licensed structural engineer prior to engineering procurement or construction (EPC).
