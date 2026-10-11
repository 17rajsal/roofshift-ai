# RoofShift AI — Strategic Improvement & Scaling Plan

This document outlines high-impact architectural enhancements and future scalability milestones for RoofShift AI following the India-Scale Solar Intelligence Map release.

---

## 1. High-Resolution Climatological Interpolation (Near-Term)

* **Objective:** Expand the spatial resolution of India's solar irradiance grid from state-level centroids down to $0.1^\circ \times 0.1^\circ$ (approx. 10 km) sub-regional grids.
* **Architecture:**
  - Ingest NREL National Solar Radiation Database (NSRDB) India gridded datasets.
  - Implement spatial IDW (Inverse Distance Weighting) interpolation on the backend to yield continuous contour choropleths.
  - Enable micro-climate distinction (e.g., distinguishing coastal Mumbai from high-altitude Pune within Maharashtra).

---

## 2. GIS Cadastral & District Administrative Boundary Ingestion

* **Objective:** Replace circle hotspot markers with full GeoJSON vector multipolygons for all 28 States, 8 UTs, and 750+ districts.
* **Architecture:**
  - Integrate Survey of India Open Data / BharatMaps GeoJSON boundary boundaries.
  - Enable interactive choropleth hover states with dynamic SVG fill gradients reflecting real-time active intelligence layers.
  - Optimize client-side vector rendering using TopoJSON compression to maintain bundle sizes under 150 kB.

---

## 3. Discom Tariff & Open Access Policy Engine

* **Objective:** Integrate state-specific commercial and industrial electricity tariff structures into the Smart Area Insight Panel.
* **Architecture:**
  - Build DISCOM tariff database covering major utilities (MSEDCL, BESCOM, TANGEDCO, UGVCL, Tata Power, BSES).
  - Model cross-subsidy surcharges (CSS), additional surcharges (AS), and wheeling charges for open-access solar power purchase agreements (PPAs).
  - Automatically calculate realistic financial payback periods ($PBP$) specific to each state's regulatory framework.

---

## 4. Agrivoltaics & Floating Solar Dedicated Intelligence Layers

* **Objective:** Surface specialized dual-use solar opportunity layers across India.
* **Architecture:**
  - **Agrivoltaics Layer:** Identifies agricultural belt suitability (Punjab, Haryana, UP, Telangana) matching crop shade tolerance with elevated solar mounting.
  - **Floating Solar Layer:** Maps inland reservoirs, dams, and waterbodies (e.g., Ramagundam, Banasura Sagar, Omkareshwar) with water evaporation reduction and PV water-cooling efficiency bonuses.

---

## 5. Automated Satellite AI Rooftop Segmentation Pipeline

* **Objective:** Provide automated building boundary extraction when users drill down from city level to a specific campus coordinate.
* **Architecture:**
  - Connect optional self-hosted SAM (Segment Anything Model) or fine-tuned YOLOv8-OBB model for rooftop polygon detection.
  - Retain strict data honesty: only trigger segmentation upon explicit user upload or designated satellite API coordinate, clearly tagging extracted polygons as machine-learning inferences.
