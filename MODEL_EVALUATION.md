# RoofShift AI — Comprehensive Machine Learning Evaluation Report

**Document Status:** Production Scientific Record  
**Version:** 2.0  
**Repository Branch:** `feature/ai-model-training-integration`  
**Evaluation Protocol:** Single held-out test evaluation, out-of-distribution cross-plant validation, confusion matrix decomposition, and failure mode analysis.

---

## 1. Solar Photovoltaic Generation Forecasting Model (XGBoost)

### 1.1 Evaluation Protocol & Data Partition Integrity
* **Training Protocol:** 70% Train (2,227 timestamps), 15% Validation (477 timestamps) chronologically separated. All feature selection, tree depth tuning, and regularization parameters were finalized strictly on the validation set.
* **Held-Out Test Set:** 15% chronologically isolated window (478 timestamps, 12–17 June 2020) at Plant 1. The test set was held sealed until final model lock and evaluated **exactly once**.
* **Zero Contamination Verification:** Zero random sampling, zero cross-validation leakage, zero normalization parameter leakage across train and test partitions.

### 1.2 Quantitative Benchmark Comparison

| Metric | Persistence Baseline | Linear Regression | Random Forest | XGBoost Regressor (Champion) |
| :--- | :--- | :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | 0.04812 kW/kWp | 0.03810 kW/kWp | 0.00814 kW/kWp | **0.00729 kW/kWp** |
| **Root Mean Squared Error (RMSE)**| 0.09841 kW/kWp | 0.06120 kW/kWp | 0.01602 kW/kWp | **0.01437 kW/kWp** |
| **Coefficient of Determination ($R^2$)**| 0.81240 | 0.94110 | 0.99592 | **0.99673** |
| **Normalized MAE (nMAE)** | 26.37% | 20.88% | 4.46% | **4.00%** |
| **Mean Absolute Percentage Error (MAPE)**| 31.42% | 24.15% | 7.82% | **6.45%** |

*Note: In-plane irradiance and normalized capacity factors yield an exceptional $R^2 = 0.99673$ and $\text{nMAE} = 4.00\%$ on held-out Plant 1 test data.*

### 1.3 Out-of-Distribution Cross-Plant Generalization Test (Plant 2)
To empirically test spatial transferability and address the "single-site overconfidence" problem, the champion model trained on Plant 1 was tested **without retraining or fine-tuning** on the full 3,259 interval dataset of Plant 2 (a geographically adjacent but physically separate solar power plant with different string inverters and cabling runs):

| Generalization Metric | Plant 1 Held-Out Test (In-Distribution) | Plant 2 Cross-Plant Test (Out-of-Distribution) | Performance Shift |
| :--- | :--- | :--- | :--- |
| **MAE** | 0.00729 kW/kWp | 0.05719 kW/kWp | $+0.04990$ kW/kWp |
| **RMSE** | 0.01437 kW/kWp | 0.12559 kW/kWp | $+0.11122$ kW/kWp |
| **$R^2$ Score** | **0.99673** | **0.73322** | $-0.26351$ |
| **Normalized MAE (nMAE)** | **4.00%** | **29.64%** | $+25.64\%$ |

#### Critical Engineering Insight
* While the model still captures the dominant diurnal trajectory ($R^2 = 0.733$), uncalibrated zero-shot transfer exhibits a significant error increase ($\text{nMAE}$ rises from 4.0% to 29.6%).
* **Root Causes:** Differences in inverter clipping thresholds, string DC-to-AC ratios, localized sensor calibration offsets, and back-of-module thermal transfer rates.
* **Production Policy:** RoofShift AI explicitly labels forecasts generated outside calibrated sites as requiring local transfer recalibration (3–7 days of site inverter telemetry).

---

## 2. Solar Panel Surface Inspection Model (MobileNetV3-Small)

### 2.1 Test Partition Overview
* **Dataset:** 385 curated real-world panel images (194 Clean, 191 Soiled).
* **Held-Out Test Set:** 59 images (30 Clean, 29 Soiled) evaluated once after training completion.

### 2.2 Classification Metrics

| Class Label | Precision | Recall | F1-Score | Support (Images) |
| :--- | :--- | :--- | :--- | :--- |
| **Clean Panel** | 0.8438 (84.4%) | 0.9000 (90.0%) | 0.8710 (87.1%) | 30 |
| **Soiled / Dusty Panel** | 0.8889 (88.9%) | 0.8276 (82.8%) | 0.8571 (85.7%) | 29 |
| **Macro Average** | **0.8663 (86.6%)** | **0.8638 (86.4%)** | **0.8641 (86.4%)** | 59 |
| **Weighted Average** | **0.8659 (86.6%)** | **0.8644 (86.4%)** | **0.8642 (86.4%)** | 59 |
| **Overall Accuracy** | — | — | **86.44% (51/59)** | 59 |

### 2.3 Confusion Matrix Decomposition

$$\begin{pmatrix} & \textbf{Pred: Clean} & \textbf{Pred: Soiled} \\ \textbf{True: Clean (30)} & 27 & 3 \\ \textbf{True: Soiled (29)} & 5 & 24 \end{pmatrix}$$

* **True Clean Correctly Classified (TN):** 27 / 30 (90.0%)
* **False Alarms (FP — Clean predicted as Soiled):** 3 / 30 (10.0%)
* **Missed Soiling (FN — Soiled predicted as Clean):** 5 / 29 (17.2%)
* **True Soiling Correctly Detected (TP):** 24 / 29 (82.8%)

### 2.4 Empirical Failure Case Analysis
1. **False Positive Failure Mode (Clean classified as Soiled — 3 instances):**
   * *Mechanism:* Intense specular solar reflections and direct sun glint off pristine module glass created high-frequency luminance gradients mimicking dust accumulation patterns.
   * *Mitigation:* Polarizing lens filters or off-axis inspection angles recommended in operational guidelines.
2. **False Negative Failure Mode (Soiled classified as Clean — 5 instances):**
   * *Mechanism:* Uniform, thin micro-particulate desert dust films covering the entire active cell area without streaks, patches, or bird droppings. Because contrast across the panel was uniform, the spatial convolutional filters did not detect distinct edge textures.
   * *Mitigation:* Combined triage with inverter Daily Yield ratio and module temperature differential ($\Delta T$).
3. **Abstain Policy Validation:**
   * Images evaluated near the decision boundary ($\max(P) < 0.65$) are automatically routed to `INCONCLUSIVE` status, triggering a low-priority verification dispatch rather than asserting false certainty.
