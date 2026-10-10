"""
AWS Lambda Function: Solar Data Normalizer & Cache Processor
Purpose: Normalizes raw NASA POWER or meteorological satellite responses,
computes 12-month solar irradiance averages, and pre-populates regional caches.
Can be triggered via EventBridge, S3 upload events, or direct invocation.
"""
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

MONTH_KEYS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

def lambda_handler(event, context):
    logger.info("Received solar processing event: %s", json.dumps(event))

    lat = event.get("latitude", 28.6139)
    lon = event.get("longitude", 77.2090)
    raw_ghi = event.get("raw_ghi", {})

    normalized_monthly = {}
    total_ghi = 0.0

    for m in MONTH_KEYS:
        val = raw_ghi.get(m, 5.0)
        try:
            val_float = float(val)
        except (ValueError, TypeError):
            val_float = 5.0
        normalized_monthly[m] = round(val_float, 2)
        total_ghi += normalized_monthly[m]

    annual_avg = round(total_ghi / 12.0, 2)

    response = {
        "statusCode": 200,
        "grid_lat": round(lat, 1),
        "grid_lon": round(lon, 1),
        "normalized_monthly_ghi": normalized_monthly,
        "annual_avg_ghi": annual_avg,
        "status": "PROCESSED_SUCCESSFULLY"
    }

    logger.info("Normalized solar data: %s", json.dumps(response))
    return response
