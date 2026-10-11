import os
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.building import Building
from app.models.project import Project
from app.models.inspection import PanelInspection
from app.schemas.inspection import PanelInspectionResponse, DefectSummaryResponse
from app.services.inspection.panel_analyzer import analyze_solar_panel_image
from app.core.file_security import validate_image_file, sanitize_filename, generate_safe_disk_filename

router = APIRouter()

@router.post("/buildings/{building_id}/panel-inspection", response_model=PanelInspectionResponse)
async def upload_panel_inspection(
    building_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a visual or thermal infrared image of a solar rooftop module.
    Evaluates cell hotspotting, dust soiling, and micro-cracking deterministically.
    """
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    raw_filename = file.filename or "inspection.jpg"
    clean_name = sanitize_filename(Path(raw_filename).name)
    ext = Path(clean_name).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]:
        raise HTTPException(status_code=400, detail="Invalid image file format. Supported: JPG, JPEG, PNG, WEBP, TIFF.")

    contents = await file.read()
    validate_image_file(contents, clean_name, max_bytes=10 * 1024 * 1024)

    analysis = analyze_solar_panel_image(contents, clean_name)

    # Save image file safely
    uploads_dir = Path(settings.UPLOADS_DIR).resolve() / "inspections"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    disk_filename = generate_safe_disk_filename(clean_name, prefix=building_id[:8])
    save_path = uploads_dir / disk_filename
    with open(save_path, "wb") as f:
        f.write(contents)

    rel_url = f"/uploads/inspections/{disk_filename}"

    record = PanelInspection(
        building_id=building_id,
        filename=clean_name,
        image_url=rel_url,
        defect_type=analysis["defect_type"],
        severity=analysis["severity"],
        confidence_score=analysis["confidence_score"],
        temperature_delta_c=analysis["temperature_delta_c"],
        estimated_power_loss_pct=analysis["estimated_power_loss_pct"],
        recommended_action=analysis["recommended_action"],
        model_provenance=analysis["model_provenance"]
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return record

@router.get("/buildings/{building_id}/panel-inspections", response_model=List[PanelInspectionResponse])
def get_building_inspections(
    building_id: str,
    db: Session = Depends(get_db)
):
    """Retrieves chronological inspection history for a specific building rooftop."""
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    return db.query(PanelInspection).filter(
        PanelInspection.building_id == building_id
    ).order_by(PanelInspection.created_at.desc()).all()

@router.get("/projects/{project_id}/defect-summary", response_model=DefectSummaryResponse)
def get_project_defect_summary(
    project_id: str,
    db: Session = Depends(get_db)
):
    """Calculates fleet-wide health status and power loss across all inspected rooftop modules."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    buildings = db.query(Building).filter(Building.project_id == project_id).all()
    b_ids = [b.id for b in buildings]

    inspections = db.query(PanelInspection).filter(
        PanelInspection.building_id.in_(b_ids)
    ).order_by(PanelInspection.created_at.desc()).all() if b_ids else []

    total = len(inspections)
    healthy = sum(1 for i in inspections if i.defect_type == "NORMAL")
    defects = total - healthy
    critical = sum(1 for i in inspections if i.severity in ("HIGH", "CRITICAL"))
    loss_sum = sum(i.estimated_power_loss_pct for i in inspections)
    avg_loss = round(loss_sum / max(1, total), 2)

    return DefectSummaryResponse(
        total_inspections=total,
        defects_detected=defects,
        healthy_panels=healthy,
        critical_alerts=critical,
        total_estimated_power_loss_pct=avg_loss,
        inspections=inspections
    )
