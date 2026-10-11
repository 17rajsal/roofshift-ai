"""
RoofShift AI — Automated Solar Dataset Ingestion Script
Dataset: Solar Power Generation Data (Plant 1, Gandikota, Andhra Pradesh, India)
License: Public Domain / Open Research (CC0)
Source: Open repository mirroring Kaggle Solar Power Generation Dataset
"""
import os
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("roofshift.ml.data")

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

SOURCES = {
    "Plant_1_Generation_Data.csv": "https://raw.githubusercontent.com/eshan-kaul/Regression-Voting-Ensemble-for-Solar-Power-Prediction/master/Plant_1_Generation_Data.csv",
    "Plant_1_Weather_Sensor_Data.csv": "https://raw.githubusercontent.com/eshan-kaul/Regression-Voting-Ensemble-for-Solar-Power-Prediction/master/Plant_1_Weather_Sensor_Data.csv",
    "Plant_2_Generation_Data.csv": "https://raw.githubusercontent.com/eshan-kaul/Regression-Voting-Ensemble-for-Solar-Power-Prediction/master/Plant_2_Generation_Data.csv",
    "Plant_2_Weather_Sensor_Data.csv": "https://raw.githubusercontent.com/eshan-kaul/Regression-Voting-Ensemble-for-Solar-Power-Prediction/master/Plant_2_Weather_Sensor_Data.csv"
}

EXPECTED_MIN_BYTES = {
    "Plant_1_Generation_Data.csv": 4_000_000,
    "Plant_1_Weather_Sensor_Data.csv": 250_000,
    "Plant_2_Generation_Data.csv": 4_000_000,
    "Plant_2_Weather_Sensor_Data.csv": 250_000
}

def download_solar_data(force: bool = False):
    os.makedirs(DATA_DIR, exist_ok=True)
    for filename, url in SOURCES.items():
        target_path = os.path.join(DATA_DIR, filename)
        if os.path.exists(target_path) and not force:
            size = os.path.getsize(target_path)
            if size >= EXPECTED_MIN_BYTES.get(filename, 0):
                logger.info(f"Dataset '{filename}' already exists ({size:,} bytes). Skipping download.")
                continue
        logger.info(f"Downloading '{filename}' from {url}...")
        urllib.request.urlretrieve(url, target_path)
        size = os.path.getsize(target_path)
        logger.info(f"Successfully downloaded '{filename}' ({size:,} bytes).")

if __name__ == "__main__":
    download_solar_data()
