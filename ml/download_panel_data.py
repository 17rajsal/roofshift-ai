"""
RoofShift AI — Photovoltaic Panel Image Dataset Downloader
Dataset: Solar-Panel-Fault-Detection (Clean vs Visibly Soiled/Dusty)
Source: https://github.com/djdhairya/Solar-Panel-Fault-Detection
License: MIT License (Copyright 2024 Dhairya Hindoriya)
Modality: Genuine RGB Photography of Photovoltaic Panels
"""

import os
import urllib.request
import urllib.parse
import json
import logging
from concurrent.futures import ThreadPoolExecutor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("roofshift.ml.panel_data")

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PANEL_DATA_DIR = os.path.join(BASE_DIR, "ml", "data", "panel_images")

REPO_API_BASE = "https://api.github.com/repos/djdhairya/Solar-Panel-Fault-Detection/contents/Faulty_solar_panel"


def fetch_file_list(category: str):
    url = f"{REPO_API_BASE}/{category}"
    req = urllib.request.Request(url, headers={"User-Agent": "RoofShift-AI/2.0"})
    with urllib.request.urlopen(req) as resp:
        items = json.loads(resp.read().decode())
    return [item for item in items if item["type"] == "file"]


def download_single_file(item, dest_folder):
    filename = item["name"]
    dest_path = os.path.join(dest_folder, filename)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        return filename, "cached"

    download_url = item.get("download_url")
    if not download_url:
        return filename, "no_url"

    req = urllib.request.Request(download_url, headers={"User-Agent": "RoofShift-AI/2.0"})
    with urllib.request.urlopen(req) as resp:
        content = resp.read()

    with open(dest_path, "wb") as f:
        f.write(content)

    return filename, "downloaded"


def download_panel_dataset():
    os.makedirs(os.path.join(PANEL_DATA_DIR, "clean"), exist_ok=True)
    os.makedirs(os.path.join(PANEL_DATA_DIR, "soiled"), exist_ok=True)

    categories = {
        "Clean": os.path.join(PANEL_DATA_DIR, "clean"),
        "Dusty": os.path.join(PANEL_DATA_DIR, "soiled")
    }

    for cat_name, dest_dir in categories.items():
        logger.info(f"Listing files for category '{cat_name}' from GitHub API...")
        files = fetch_file_list(cat_name)
        logger.info(f"Found {len(files)} files in category '{cat_name}'. Starting concurrent download...")

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(download_single_file, f, dest_dir) for f in files]
            results = [fut.result() for fut in futures]

        downloaded = sum(1 for _, status in results if status == "downloaded")
        cached = sum(1 for _, status in results if status == "cached")
        logger.info(f"Category '{cat_name}' complete: {downloaded} downloaded, {cached} cached.")


if __name__ == "__main__":
    download_panel_dataset()
