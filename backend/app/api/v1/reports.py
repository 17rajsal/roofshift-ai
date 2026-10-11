import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.project import Project
from app.models.report import GeneratedReport
from app.models.scheduling import EnergyActivity
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.services.reports.pdf_generator import generate_project_pdf_report
from app.services.scheduling.load_shifter import optimize_energy_scheduling
from app.core.file_security import sanitize_filename, assert_path_in_directory

logger = logging.getLogger("roofshift.reports")
router = APIRouter()

@router.post("/projects/{project_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(project_id: str, req: ReportGenerateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        schedule = None
        if req.include_load_shifting and db.query(EnergyActivity).filter(EnergyActivity.project_id == project_id).first():
            schedule = await optimize_energy_scheduling(project_id, db)
        report_record = generate_project_pdf_report(
            project_id, db, notes=req.notes,
            scheduling_result=schedule, include_load_shifting=req.include_load_shifting,
            include_features=req.include_features, include_scenarios=req.include_scenarios,
        )
        return ReportResponse(
            report_id=report_record.id,
            project_id=project.id,
            project_name=project.name,
            filename=report_record.filename,
            download_url=f"/api/v1/reports/{report_record.id}/download",
            file_size_bytes=report_record.file_size_bytes,
            generated_at=report_record.generated_at
        )
    except Exception as e:
        logger.exception(f"PDF report generation error for project {project_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate PDF report. Please verify project inputs and try again."
        )

@router.get("/projects/{project_id}/reports", response_model=List[ReportResponse])
def list_reports(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    reports = db.query(GeneratedReport).filter(
        GeneratedReport.project_id == project_id
    ).order_by(GeneratedReport.generated_at.desc()).all()

    return [
        ReportResponse(
            report_id=r.id,
            project_id=project.id,
            project_name=project.name,
            filename=r.filename,
            download_url=f"/api/v1/reports/{r.id}/download",
            file_size_bytes=r.file_size_bytes,
            generated_at=r.generated_at
        )
        for r in reports
    ]

@router.get("/reports/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db)):
    r = db.query(GeneratedReport).filter(GeneratedReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report record not found")

    from app.services.storage.s3_adapter import storage_adapter
    from app.core.config import settings
    if storage_adapter.is_s3_active():
        try:
            safe_s3_filename = sanitize_filename(r.filename)
            s3_key = f"reports/{safe_s3_filename}"
            presigned_url = storage_adapter.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
                ExpiresIn=3600
            )
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=presigned_url)
        except Exception:
            pass  # Fall through to local filesystem copy

    # Validate against directory traversal
    try:
        validated_path = assert_path_in_directory(r.file_path, settings.REPORTS_DIR)
    except HTTPException:
        logger.warning(f"Path traversal blocked on report download: {r.file_path}")
        raise HTTPException(status_code=403, detail="Access denied: Invalid report file location.")

    if not os.path.exists(validated_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    safe_download_name = sanitize_filename(r.filename)
    return FileResponse(
        path=validated_path,
        media_type="application/pdf",
        filename=safe_download_name,
        headers={"Content-Disposition": f'attachment; filename="{safe_download_name}"'}
    )
