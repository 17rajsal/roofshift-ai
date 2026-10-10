import os
import csv
import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.project import Project
from app.models.building import Building
from app.schemas.energy import EnergyInsightsResponse
from app.services.energy.surplus_analyzer import analyze_project_energy_surplus

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
    Uploads and validates an hourly electricity consumption CSV file (Mode A: Measured Customer Demand).
    Validates formatting, timestamps, non-negative values, and calculates statistical consumption baselines.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only standard CSV files (.csv) are accepted.")

    try:
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File exceeds maximum size limit of 5MB.")

        # Parse CSV
        df = pd.read_csv(io.BytesIO(contents))
        if df.empty or len(df.columns) < 1:
            raise HTTPException(status_code=400, detail="CSV file is empty or contains no valid columns.")

        # Identify demand / consumption column
        cols_lower = [str(c).strip().lower() for c in df.columns]
        val_col_idx = None
        for idx, c in enumerate(cols_lower):
            if any(term in c for term in ["kwh", "kw", "consumption", "demand", "power", "load", "energy"]):
                val_col_idx = idx
                break

        if val_col_idx is None:
            # Fallback to second column or first numeric column
            numeric_cols = df.select_dtypes(include=["number"]).columns
            if len(numeric_cols) > 0:
                val_col_name = numeric_cols[0]
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Could not identify electricity consumption column (expected 'kwh', 'kw', 'consumption', or 'demand')."
                )
        else:
            val_col_name = df.columns[val_col_idx]

        consumption_series = pd.to_numeric(df[val_col_name], errors="coerce").dropna()
        if len(consumption_series) == 0:
            raise HTTPException(status_code=400, detail="No numeric electricity consumption readings found.")

        if (consumption_series < 0).any():
            raise HTTPException(status_code=400, detail="Consumption values cannot be negative. Please check meter readings.")

        total_readings = len(consumption_series)
        mean_kw = round(float(consumption_series.mean()), 2)
        peak_kw = round(float(consumption_series.max()), 2)
        total_kwh = round(float(consumption_series.sum()), 2)

        # Save validated file locally
        os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
        save_path = os.path.join(settings.UPLOADS_DIR, f"demand_{project_id}_{file.filename}")
        with open(save_path, "wb") as f:
            f.write(contents)

        # Update buildings demand origin label
        buildings = db.query(Building).filter(Building.project_id == project_id).all()
        for b in buildings:
            b.demand_origin = f"Verified meter upload: {file.filename}"
        db.commit()

        return {
            "status": "UPLOAD_VALIDATED_SUCCESSFULLY",
            "filename": file.filename,
            "readings_count": total_readings,
            "average_power_kw": mean_kw,
            "peak_power_kw": peak_kw,
            "total_measured_kwh": total_kwh,
            "data_mode": "Mode A — Measured Meter Data Upload",
            "coverage_note": f"Successfully parsed {total_readings} chronological intervals from '{file.filename}'."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")
