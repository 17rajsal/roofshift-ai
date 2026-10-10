"""
Component E — Statistical / ML Demand Profile Estimator
Uses Scikit-learn polynomial regression to synthesize continuous 24-hour diurnal
campus electricity load curves based on monthly bill totals, category, and daytime fractions.
Zero Bedrock / Zero Generative AI.
"""
from typing import List, Dict, Any
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Canonical 24-hr normalized load archetypes (Hour 0 to 23)
ARCHETYPE_HOURLY_WEIGHTS = {
    "academic": [
        0.025, 0.025, 0.025, 0.025, 0.025, 0.030,
        0.040, 0.055, 0.075, 0.085, 0.085, 0.080,
        0.075, 0.070, 0.070, 0.065, 0.055, 0.045,
        0.040, 0.045, 0.050, 0.045, 0.035, 0.030
    ],
    "residential": [
        0.045, 0.040, 0.035, 0.035, 0.035, 0.045,
        0.055, 0.060, 0.050, 0.040, 0.035, 0.035,
        0.035, 0.035, 0.035, 0.040, 0.045, 0.055,
        0.065, 0.075, 0.080, 0.075, 0.065, 0.055
    ],
    "commercial": [
        0.020, 0.020, 0.020, 0.020, 0.020, 0.025,
        0.035, 0.055, 0.075, 0.085, 0.090, 0.090,
        0.085, 0.080, 0.080, 0.075, 0.065, 0.050,
        0.035, 0.030, 0.025, 0.025, 0.020, 0.020
    ]
}

def estimate_hourly_load_profile(
    monthly_consumption_kwh: float,
    category: str = "Academic",
    daytime_pct: float = 65.0
) -> List[float]:
    """
    Fits a smooth 24-hour diurnal load curve scaled to the daily average consumption.
    Employs Scikit-learn polynomial regression smoothing over archetype weights.
    """
    if monthly_consumption_kwh < 0:
        raise ValueError("Monthly electricity consumption cannot be negative.")
    if monthly_consumption_kwh == 0:
        return [0.0] * 24

    cat_key = category.strip().lower()
    if "hostel" in cat_key or "residential" in cat_key:
        raw_weights = ARCHETYPE_HOURLY_WEIGHTS["residential"]
    elif "commercial" in cat_key or "admin" in cat_key or "office" in cat_key:
        raw_weights = ARCHETYPE_HOURLY_WEIGHTS["commercial"]
    else:
        raw_weights = ARCHETYPE_HOURLY_WEIGHTS["academic"]

    daily_total_kwh = monthly_consumption_kwh / 30.0

    # Adjust weights according to daytime_pct (Hours 6 to 17 daytime, rest nighttime)
    w_arr = np.array(raw_weights, dtype=float)
    day_indices = list(range(6, 18))
    night_indices = list(range(0, 6)) + list(range(18, 24))

    day_sum = w_arr[day_indices].sum()
    night_sum = w_arr[night_indices].sum()

    target_day = max(0.01, min(0.99, daytime_pct / 100.0))
    target_night = 1.0 - target_day

    w_adjusted = np.zeros(24, dtype=float)
    w_adjusted[day_indices] = (w_arr[day_indices] / day_sum) * target_day
    w_adjusted[night_indices] = (w_arr[night_indices] / night_sum) * target_night

    try:
        from sklearn.linear_model import Ridge
        from sklearn.preprocessing import PolynomialFeatures

        # Hours 0 to 23
        X = np.arange(24).reshape(-1, 1)
        y = w_adjusted * daily_total_kwh

        poly = PolynomialFeatures(degree=6)
        X_poly = poly.fit_transform(X)
        model = Ridge(alpha=1.0)
        model.fit(X_poly, y)
        fitted = model.predict(X_poly)

        # Ensure non-negative and preserve daytime and nighttime target sums
        fitted = np.maximum(0.0, fitted)
        fitted_day = fitted[day_indices]
        fitted_night = fitted[night_indices]
        if fitted_day.sum() > 0:
            fitted[day_indices] = (fitted_day / fitted_day.sum()) * (target_day * daily_total_kwh)
        if fitted_night.sum() > 0:
            fitted[night_indices] = (fitted_night / fitted_night.sum()) * (target_night * daily_total_kwh)

        return [round(float(v), 2) for v in fitted]
    except Exception as e:
        logger.debug(f"Statistical model fallback to baseline weights: {str(e)}")
        return [round(float(w * daily_total_kwh), 2) for w in w_adjusted]
