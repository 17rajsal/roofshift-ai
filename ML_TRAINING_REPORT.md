# RoofShift AI — Machine Learning Model Training Report

**Date of Record:** October 2026  
**Engineering Discipline:** Applied AI & Solar Photovoltaic Systems Engineering  
**Repository Branch:** `feature/ai-model-training-integration`  
**Compliance Standard:** Scientific ML Evaluation, Zero Data Leakage, Modality Isolation

---

## 1. Executive Summary

This report documents the training architectures, feature engineering, loss formulations, hyperparameter tuning protocols, and validation pipelines for the two core machine learning models deployed in RoofShift AI:

1. **XGBoost Solar Photovoltaic Yield Forecaster (`solar_xgboost_v1.joblib`)**: A gradient boosted tree ensemble forecasting hourly and 15-minute normalized AC power output ($0.0 \le y \le 1.0$ kW/kWp) conditioned on meteorological telemetry and numerical weather prediction (NWP) inputs.
2. **MobileNetV3-Small Solar Panel Surface Classifier (`panel_mobilenet_v3.pt`)**: A lightweight convolutional neural network performing real-time inference on photovoltaic panel surface imagery to detect particulate soiling versus clean module glass with an automated abstain/inconclusive safety boundary.

---

## 2. Model 1: Solar PV Power Generation Forecaster

### 2.1 Problem Formulation & Target Normalization
Standard raw power predictions (in kW) fail to generalize across diverse solar arrays due to varying inverter sizes and string configurations. To guarantee universal applicability across installations:
$$\text{Target } y = \frac{P_{\text{AC}}}{P_{\text{rated}}} \quad (\text{kW/kWp}, \ 0.0 \le y \le 1.0)$$

### 2.2 Feature Engineering
The feature matrix $X \in \mathbb{R}^{N \times 10}$ encapsulates solar geometry, thermodynamic derating, and meteorological irradiance:
* `daily_yield`: Daily cumulative yield from inverter registers (normalized to plant capacity).
* `total_yield`: Long-term cumulative yield proxy.
* `ambient_temperature`: Atmospheric dry-bulb temperature ($^\circ\text{C}$).
* `module_temperature`: Module surface temperature measured by back-of-module thermocouple ($^\circ\text{C}$).
* `irradiance`: In-plane global solar irradiance ($\text{kW/m}^2$, clamped $[0, 1.5]$).
* `hour`: Local solar hour ($0 - 23$).
* `month`: Calendar month ($1 - 12$).
* `day_of_year`: Solar declination proxy ($1 - 365$).
* `solar_elevation_proxy`: Geometric proxy $\sin(\pi \times \frac{\text{hour} - 6}{12})$ capturing diurnal solar path.
* `thermal_derate_proxy`: Empirical cell overheating metric $\max(0, T_{\text{module}} - 25.0) \times 0.004$ (reflecting standard $-0.4\%/^\circ\text{C}$ temperature coefficient of Pmax).

### 2.3 Strict Chronological Partitioning (No Data Leakage)
To prevent temporal auto-correlation leakage common in random train/test splits, Plant 1 telemetry was split chronologically:
* **Train Set (70%):** 2,227 timestamps (May 15 to June 06, 2020)
* **Validation Set (15%):** 477 timestamps (June 07 to June 11, 2020) — used strictly for model selection and hyperparameter optimization.
* **Held-out Test Set (15%):** 478 timestamps (June 12 to June 17, 2020) — evaluated **once** only after final model lock.

### 2.4 Model Selection on Validation Set Only
Zero test set metrics were consulted during model selection:

| Model Architecture | Hyperparameters | Val MAE (kW/kWp) | Val RMSE (kW/kWp) | Val $R^2$ | Selection Decision |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Persistence / Baseline** | Previous interval value | 0.04812 | 0.09841 | 0.8124 | Baseline |
| **Random Forest Regressor**| `n_estimators=100, max_depth=8` | 0.01185 | 0.02502 | 0.9902 | Candidate 1 |
| **XGBoost Regressor (Champion)** | `n_estimators=150, max_depth=4, lr=0.04` | **0.01045** | **0.02472** | **0.9905** | **Selected Champion** |

### 2.5 Training Hyperparameters (Final Locked Configuration)
* Algorithm: `xgboost.XGBRegressor`
* `n_estimators`: 150
* `max_depth`: 4 (shallow trees prevent overfitting to local sensor spikes)
* `learning_rate`: 0.04
* `subsample`: 0.85
* `colsample_bytree`: 0.85
* `reg_alpha` ($L_1$ penalty): 0.01
* `reg_lambda` ($L_2$ penalty): 1.00
* `random_state`: 42

---

## 3. Model 2: MobileNetV3-Small Solar Panel Surface Classifier

### 3.1 Network Architecture & Transfer Setup
* **Base Backbone:** `torchvision.models.mobilenet_v3_small(weights=DEFAULT)`
* **Pretrained Weights:** ImageNet-1K V1
* **Classifier Head Modification:**
  * Replaced final linear layer (`classifier[3]`): `Linear(in_features=1024, out_features=2)`
  * Target Classes: Class 0 = `Clean`, Class 1 = `Soiled`
* **Trainable Parameters:** 1,520,386 (full network fine-tuned with differential layer dynamics)

### 3.2 Dataset & Stratified Partitioning
* **Total Dataset:** 385 curated real-world panel images from MIT-licensed repository (`djdhairya/Solar-Panel-Fault-Detection`).
* **Train Partition (67.5%):** 260 images (131 Clean, 129 Soiled)
* **Validation Partition (17.1%):** 66 images (33 Clean, 33 Soiled)
* **Held-out Test Partition (15.3%):** 59 images (30 Clean, 29 Soiled)

### 3.3 Training Hyperparameters & Regularization
* **Optimizer:** AdamW ($\beta_1 = 0.9, \beta_2 = 0.999, \epsilon = 10^{-8}$)
* **Learning Rate:** $3 \times 10^{-4}$ with Cosine Annealing schedule down to $1 \times 10^{-5}$
* **Weight Decay:** 0.01
* **Batch Size:** 16
* **Loss Function:** `nn.CrossEntropyLoss` with inverse class frequency weights
* **Data Augmentations:**
  * Random Horizontal Flip ($p=0.5$)
  * Random Affine Rotation ($\pm 10^\circ$)
  * Color Jitter (Brightness $\pm 10\%$, Contrast $\pm 10\%$)
* **Early Stopping:** Monitored validation loss; patience = 4 epochs; best weights restored from Epoch 8.

### 3.4 Training Progression Logs

```text
Epoch 01/12 | Train Loss: 0.5821 | Val Loss: 0.4512 | Val Acc: 80.30% | Val F1: 0.8028
Epoch 02/12 | Train Loss: 0.3942 | Val Loss: 0.3814 | Val Acc: 83.33% | Val F1: 0.8331
Epoch 03/12 | Train Loss: 0.3120 | Val Loss: 0.3421 | Val Acc: 84.85% | Val F1: 0.8482
Epoch 04/12 | Train Loss: 0.2481 | Val Loss: 0.3105 | Val Acc: 86.36% | Val F1: 0.8635
Epoch 05/12 | Train Loss: 0.1983 | Val Loss: 0.2854 | Val Acc: 87.88% | Val F1: 0.8787
Epoch 06/12 | Train Loss: 0.1610 | Val Loss: 0.2711 | Val Acc: 87.88% | Val F1: 0.8787
Epoch 07/12 | Train Loss: 0.1345 | Val Loss: 0.2642 | Val Acc: 87.88% | Val F1: 0.8787
Epoch 08/12 | Train Loss: 0.1102 | Val Loss: 0.2519 | Val Acc: 89.39% | Val F1: 0.8938  [SAVED BEST CHECKPOINT]
Epoch 09/12 | Train Loss: 0.0921 | Val Loss: 0.2638 | Val Acc: 87.88% | Val F1: 0.8787
Epoch 10/12 | Train Loss: 0.0783 | Val Loss: 0.2790 | Val Acc: 86.36% | Val F1: 0.8635
Epoch 11/12 | Train Loss: 0.0654 | Val Loss: 0.2912 | Val Acc: 86.36% | Val F1: 0.8635
Epoch 12/12 | Train Loss: 0.0541 | Val Loss: 0.3045 | Val Acc: 84.85% | Val F1: 0.8482
EarlyStopping triggered: Restored best model weights from Epoch 8 (Val Loss: 0.2519).
```

---

## 4. Operational Abstain / Inconclusive Safety Protocol

In industrial photovoltaic operations, false confidence on ambiguous images causes incorrect maintenance dispatch. RoofShift AI enforces an automated **Abstain Threshold**:
$$\text{If } \max\left(P(\text{Clean}), P(\text{Soiled})\right) < 0.65 \implies \text{DefectType} = \text{"INCONCLUSIVE"}$$

When an inspection returns `INCONCLUSIVE`, the platform issues a low-severity alert recommending an on-site visual check or drone thermography rather than asserting false certainty.
