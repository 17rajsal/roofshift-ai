import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.project import Project
from app.models.building import Building
from app.models.monitoring import SolarMonitoringLog
from app.schemas.monitoring import SolarMonitoringResponse
from app.services.monitoring.inverter_telemetry import process_inverter_telemetry_csv
from app.core.file_security import (
    validate_csv_content,
    assert_path_in_directory,
    generate_safe_disk_filename,
    sanitize_filename
)

router = APIRouter()

@router.post("/projects/{project_id}/monitoring-upload", response_model=SolarMonitoringResponse)
async def upload_solar_monitoring_csv(
    project_id: str,
    building_id: Optional[str] = Query(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads historical actual inverter solar generation telemetry CSV.
    Evaluates expected vs recorded performance, actual Performance Ratio (PR), and degradation.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_filename = file.filename or "monitoring.csv"
    contents = await file.read()
    validate_csv_content(contents, filename=raw_filename, max_bytes=10 * 1024 * 1024)
    clean_name = sanitize_filename(raw_filename)

    # Determine installed capacity
    if building_id:
        b = db.query(Building).filter(Building.id == building_id, Building.project_id == project_id).first()
        if not b:
            raise HTTPException(status_code=404, detail="Specified building not found in project.")
        installed_cap = b.solar_analysis.max_pv_capacity_kwp if b.solar_analysis else 10.0
    else:
        # Fleet-wide installed capacity from buildings
        buildings = db.query(Building).filter(Building.project_id == project_id).all()
        installed_cap = sum(b.solar_analysis.max_pv_capacity_kwp for b in buildings if b.solar_analysis) or 50.0

    try:
        metrics = process_inverter_telemetry_csv(
            contents=contents,
            installed_capacity_kwp=installed_cap
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save telemetry file locally
    uploads_dir = Path(settings.UPLOADS_DIR).resolve() / "telemetry"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    disk_filename = generate_safe_disk_filename(clean_name, prefix=f"{project_id[:8]}_telemetry_")
    save_path = uploads_dir / disk_filename
    assert_path_in_directory(save_path, uploads_dir)
    with open(save_path, "wb") as f:
        f.write(contents)

    log_entry = SolarMonitoringLog(
        project_id=project_id,
        building_id=building_id,
        filename=clean_name,
        record_count=metrics["record_count"],
        total_measured_generation_kwh=metrics["total_measured_generation_kwh"],
        expected_generation_kwh=metrics["expected_generation_kwh"],
        performance_ratio_actual=metrics["performance_ratio_actual"],
        expected_performance_ratio=metrics["expected_performance_ratio"],
        generation_delta_pct=metrics["generation_delta_pct"],
        degradation_annual_pct=metrics["degradation_annual_pct"],
        underperformance_flag=metrics["underperformance_flag"],
        diagnostic_summary=metrics["diagnostic_summary"],
        data_mode="Uploaded Inverter Telemetry"
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return log_entry

@router.get("/projects/{project_id}/monitoring-logs", response_model=List[SolarMonitoringResponse])
def get_project_monitoring_logs(
    project_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves all inverter telemetry analysis logs for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(SolarMonitoringLog).filter(
        SolarMonitoringLog.project_id == project_id
    ).order_by(SolarMonitoringLog.created_at.desc()).all()
