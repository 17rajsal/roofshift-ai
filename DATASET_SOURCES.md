# RoofShift AI — Dataset Sources & Provenance Specification

**Project:** RoofShift AI  
**Repository:** https://github.com/17rajsal/roofshift-ai  
**Document Purpose:** Complete provenance, licensing, spatial/temporal resolution, and scientific validation documentation for all datasets integrated across RoofShift AI's machine learning, geospatial, and climatology pipelines.

---

## 1. Solar PV Generation & Inverter Telemetry (Plants 1 & 2)

### 1.1 Source & Licensing
* **Dataset Name:** Solar Power Generation Data (Gandikota PV Facility)
* **Author / Host:** Anil Kumar / Kaggle (Gandikota, Kadapa District, Andhra Pradesh, India)
* **License:** Creative Commons CC0: Public Domain
* **Data Accession:** Ingested into `ml/data/` via verified HTTPS endpoints.
* **Geographic Coordinates:** Gandikota, Andhra Pradesh, India (~14.81° N, 78.28° E)

### 1.2 Dataset Partition & Contents
The telemetry comprises paired 15-minute interval datasets from two separate utility-scale sub-plants over a 34-day operational window (15 May 2020 to 17 June 2020):

| Dataset Split | Records | Inverter Streams | Sensor Streams | Primary Metrics |
| :--- | :--- | :--- | :--- | :--- |
| **Plant 1 Generation** | 68,778 | 22 Inverter Channels | N/A | DC Power (kW), AC Power (kW), Daily Yield (kWh), Total Cumulative Yield |
| **Plant 1 Weather** | 3,182 | N/A | Plant Meteorological Station | Ambient Temperature (°C), Module Surface Temperature (°C), Irradiance (kW/m²) |
| **Plant 2 Generation** | 67,698 | 22 Inverter Channels | N/A | DC Power (kW), AC Power (kW), Daily Yield (kWh), Total Cumulative Yield |
| **Plant 2 Weather** | 3,259 | N/A | Plant Meteorological Station | Ambient Temperature (°C), Module Surface Temperature (°C), Irradiance (kW/m²) |

### 1.3 Preprocessing & Normalization Pipeline
1. **Timestamp Alignment:** Inner-join merge of inverter telemetry and meteorological sensor logs on exact 15-minute timestamps (`DATE_TIME`).
2. **Specific Capacity Normalization:** Generation targets normalized by individual inverter peak rating to yield normalized capacity factor `normalized_power_kw_per_kwp` ($0.0 \le y \le 1.0$), ensuring inverter-agnostic machine learning modeling.
3. **Physical Bounds & Night Filtering:** Irradiance capped strictly at $[0, 1.5]$ kW/m²; negative/sensor-glitch readings clamped to 0. Night-time zero-generation intervals preserved to ensure model accurately reflects dusk/dawn diurnal transitions.
4. **Partition Isolation:** Plant 1 is strictly partitioned into chronological splits: **70% Train**, **15% Validation**, and **15% Held-out Test**. Plant 2 is reserved entirely as an **Unseen Cross-Plant Validation Set** to evaluate geographic and hardware generalization.

---

## 2. Solar Panel Surface Inspection RGB Imagery

### 2.1 Source & Licensing
* **Dataset Name:** Solar Panel Fault Detection RGB Dataset
* **Source Repository:** `djdhairya/Solar-Panel-Fault-Detection` (GitHub)
* **License:** MIT License
* **Dataset Ingestion:** Downloaded and structured via `ml/download_panel_data.py` into `ml/data/panel_images/`

### 2.2 Class Distribution & Resolution
* **Total Curated Images:** 385 high-resolution RGB photographic inspections
  * **Clean Panels:** 194 genuine panel images exhibiting clear glass surface, normal cell grid lines, and negligible particulate accumulation.
  * **Dusty / Soiled Panels:** 191 real-world panel images exhibiting desert dust, agricultural topsoil accumulation, bird fouling, and localized particulate masking.
* **Stratified Data Partition:**
  * **Train Set:** 260 images (131 Clean, 129 Dusty) — 67.5%
  * **Validation Set:** 66 images (33 Clean, 33 Dusty) — 17.1%
  * **Held-out Test Set:** 59 images (30 Clean, 29 Dusty) — 15.3%
* **Computer Vision Preprocessing:**
  * Resize to $256 \times 256$, Center-crop to $224 \times 224$ (MobileNetV3 input resolution).
  * Standard ImageNet channel normalization ($\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$).
  * Training data augmentations: Random horizontal flip ($p=0.5$), Random rotation ($\pm 10^\circ$), Color jitter ($\pm 10\%$ brightness/contrast).

---

## 3. NASA POWER Climatological Satellite Data

### 3.1 Source & Licensing
* **Provider:** NASA Langley Research Center, Prediction of Worldwide Energy Resources (POWER) Project
* **Data Access:** RESTful Geospatial API (`https://power.larc.nasa.gov/api/temporal/climatology/point`)
* **License / Access Policy:** Open Access / Public Data (US Federal Government)
* **Spatial Resolution:** $0.5^\circ \times 0.5^\circ$ latitude/longitude grid

### 3.2 Key Parameters Utilized
* `ALLSKY_SFC_SW_DWN`: All Sky Surface Downwelling Solar Irradiance (GHI) in $\text{kWh/m}^2/\text{day}$.
* Climatological period: 20-year multi-satellite homogenized baseline (1984–2020).
* Service Integration: `backend/app/services/solar/nasa_power.py`.
* **Provenance State:** Tagged as `"20-Yr NASA Satellite Climatology"`. When offline and `allow_illustrative=False`, service raises `InsufficientSolarDataError` rather than fabricating synthetic data.

---

## 4. Open-Meteo High-Resolution Numerical Weather Prediction (NWP)

### 4.1 Source & Licensing
* **Provider:** Open-Meteo Weather API (`https://api.open-meteo.com/v1/forecast`)
* **Underlying Numerical Models:** ECMWF IFS, DWD ICON, NOAA GFS ensembles.
* **License / Attribution:** Open-Meteo Open Data License (Attribution required: Open-Meteo.com / CC BY 4.0).
* **Spatial Resolution:** Seamless 1 km to 11 km downscaled atmospheric grid across India.

### 4.2 Real-Time Ingested Metrics
* `shortwave_radiation`: Global Horizontal Irradiance in $\text{W/m}^2$.
* `temperature_2m`: Ambient dry-bulb temperature in $^\circ\text{C}$.
* `wind_speed_10m`: Wind speed at 10 m hub height, explicitly queried in SI units: `&wind_speed_unit=ms` (verified unit: $\text{m/s}$).
* `cloud_cover`: Total cloud fraction percentage ($0\% - 100\%$).
* **Provenance State:** Tagged as `"current_modeled_forecast"`. Used for dated 168-hour PV yield forecasts (`POST /api/v1/solar-ml/dated-forecast`).

---

## 5. OpenStreetMap (OSM) Vector Building Data

### 5.1 Source & Licensing
* **Provider:** OpenStreetMap Foundation / Overpass API (`https://overpass-api.de/api/interpreter`)
* **License:** Open Database License (ODbL) 1.0
* **Data Ingested:** Raw polygon nodes and tagged building footprints (`way["building"]`).

### 5.2 Engineering Modeling Assumptions
To convert raw unverified 2D polygons into indicative solar potential estimates without misrepresenting them as surveyed BIM models, RoofShift AI applies documented `DEFAULT_OSM_PLANNING_ASSUMPTIONS`:
* Usable rooftop fraction: **75.0%** (setbacks, parapets, lift machine rooms, and HVAC clearances).
* PV panel power density: **180 W/m²** (standard tier-1 mono-PERC crystalline modules).
* Benchmark specific yield: **1,500 kWh/kWp/year** adjusted by local annual GHI ratio.
* Shading derate: **10.0%** default urban obstruction allowance.
* Commercial electricity tariff: **₹7.50 / kWh** baseline.
* Grid carbon intensity: **0.716 kg CO₂ / kWh** (CEA India CO₂ Baseline Database v19).
* Structural note: Non-destructive desktop screening only; physical rooftop load-bearing capacity must be certified by an on-site structural engineer.
