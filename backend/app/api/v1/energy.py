import os
import csv
import io
import datetime
from pathlib import Path
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.project import Project
from app.models.building import Building
from app.schemas.energy import EnergyInsightsResponse
from app.services.energy.surplus_analyzer import analyze_project_energy_surplus
from app.core.file_security import (
    validate_csv_content,
    assert_path_in_directory,
    generate_safe_disk_filename,
    sanitize_filename
)

router = APIRouter()

@router.get("/projects/{project_id}/energy-insights", response_model=EnergyInsightsResponse)
async def get_energy_insights(project_id: str, db: Session = Depends(get_db)):
    try:
        return await analyze_project_energy_surplus(project_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing energy surplus: {str(e)}")

@router.post("/projects/{project_id}/demand-upload")
async def upload_hourly_demand_csv(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads and validates an hourly electricity consumption CSV file (Mode A: Customer Demand).
    Validates formatting, timestamps, chronology, interval consistency, non-negative finite values,
    and calculates statistical consumption baselines without touching disk or DB on failure.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_filename = file.filename or ""
    contents = await file.read()
    validate_csv_content(contents, filename=raw_filename, max_bytes=5 * 1024 * 1024)
    clean_filename = sanitize_filename(raw_filename)

    try:
        # Parse CSV text
        try:
            text_stream = io.StringIO(contents.decode("utf-8-sig"))
            reader = csv.reader(text_stream)
            rows = list(reader)
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed CSV file structure.")

        if not rows or len(rows) < 2:
            raise HTTPException(status_code=400, detail="CSV file contains no data rows.")

        headers = [str(h).strip().lower() for h in rows[0]]
        
        # 1. Identify timestamp column
        ts_col_idx = None
        for idx, h in enumerate(headers):
            if any(term in h for term in ["timestamp", "datetime", "date", "time"]):
                ts_col_idx = idx
                break

        if ts_col_idx is None:
            raise HTTPException(status_code=400, detail="CSV must include a timestamp column.")

        # 2. Identify demand / consumption column (avoid row indexes, IDs, or notes)
        energy_terms = ["demand_kw", "consumption_kwh", "kwh", "kw", "consumption", "demand", "power", "load", "energy"]
        val_col_idx = None
        for idx, h in enumerate(headers):
            if idx != ts_col_idx and any(term in h for term in energy_terms):
                val_col_idx = idx
                break

        if val_col_idx is None:
            raise HTTPException(
                status_code=400,
                detail="Could not identify electricity consumption column (expected 'demand_kw', 'consumption_kwh', or similar)."
            )

        val_col_name = headers[val_col_idx]
        is_energy_reading = "kwh" in val_col_name or ("consumption" in val_col_name and "kw" not in val_col_name)

        # 3. Parse and validate timestamps and numeric values
        import math
        import dateutil.parser

        epochs = []
        values = []

        for row_num, row in enumerate(rows[1:], start=2):
            if not row or all(c.strip() == "" for c in row):
                continue
            if len(row) <= max(ts_col_idx, val_col_idx):
                raise HTTPException(status_code=400, detail=f"Row {row_num} has insufficient columns.")

            ts_str = row[ts_col_idx].strip()
            val_str = row[val_col_idx].strip()

            if not ts_str:
                raise HTTPException(status_code=400, detail=f"Row {row_num} has missing timestamp.")

            try:
                dt = dateutil.parser.isoparse(ts_str)
                if dt.tzinfo is None:
                    epoch = dt.timestamp()
                else:
                    epoch = dt.astimezone(datetime.timezone.utc).timestamp()
                epochs.append(epoch)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Row {row_num} has invalid ISO timestamp '{ts_str}'.")

            try:
                val = float(val_str)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Row {row_num} has non-numeric reading '{val_str}'.")

            if math.isnan(val) or math.isinf(val):
                raise HTTPException(status_code=400, detail=f"Row {row_num} has non-finite reading '{val_str}'.")
            if val < 0:
                raise HTTPException(status_code=400, detail=f"Row {row_num} has negative consumption reading: {val}.")

            values.append(val)

        if not values:
            raise HTTPException(status_code=400, detail="CSV contains no valid reading entries.")

        # 4. Validate chronology and interval consistency
        for i in range(1, len(epochs)):
            if epochs[i] <= epochs[i - 1]:
                raise HTTPException(status_code=400, detail="Timestamps must be strictly chronological and unique.")

        if len(epochs) >= 3:
            step = epochs[1] - epochs[0]
            for i in range(2, len(epochs)):
                if abs((epochs[i] - epochs[i - 1]) - step) > 1e-3:
                    raise HTTPException(status_code=400, detail="Timestamps contain inconsistent time intervals.")

        interval_seconds = (epochs[1] - epochs[0]) if len(epochs) > 1 else 3600.0
        interval_hours = interval_seconds / 3600.0

        # 5. Compute baseline statistics
        total_readings = len(values)
        if is_energy_reading:
            total_kwh = round(float(sum(values)), 2)
            mean_kw = round(float(sum(values) / total_readings) / interval_hours, 2)
            peak_kw = round(float(max(values)) / interval_hours, 2)
        else:
            mean_kw = round(float(sum(values) / total_readings), 2)
            peak_kw = round(float(max(values)), 2)
            total_kwh = round(float(sum(values)) * interval_hours, 2)

        # 6. Save validated file locally (safe path resolution)
        uploads_dir = Path(settings.UPLOADS_DIR).resolve()
        uploads_dir.mkdir(parents=True, exist_ok=True)
        disk_filename = generate_safe_disk_filename(clean_filename, prefix=f"{project_id[:8]}_demand_")
        save_path = uploads_dir / disk_filename
        assert_path_in_directory(save_path, uploads_dir)

        with open(save_path, "wb") as f:
            f.write(contents)

        # 7. Update buildings demand origin label
        buildings = db.query(Building).filter(Building.project_id == project_id).all()
        for b in buildings:
            b.demand_origin = f"Customer CSV upload (Modeled profile): {clean_filename}"
        db.commit()

        return {
            "status": "UPLOAD_VALIDATED_SUCCESSFULLY",
            "filename": clean_filename,
            "readings_count": total_readings,
            "average_power_kw": mean_kw,
            "peak_power_kw": peak_kw,
            "total_measured_kwh": total_kwh,
            "data_mode": "Mode A — Measured Meter Data Upload",
            "coverage_note": f"Successfully parsed {total_readings} chronological intervals from '{clean_filename}'."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")
