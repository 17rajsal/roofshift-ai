import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.project import Project
from app.models.report import GeneratedReport
from app.schemas.report import ReportGenerateRequest, ReportResponse
from app.services.reports.pdf_generator import generate_project_pdf_report

router = APIRouter()

@router.post("/projects/{project_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(project_id: str, req: ReportGenerateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        report_record = generate_project_pdf_report(project_id, db, notes=req.notes)
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
        raise HTTPException(status_code=500, detail=f"PDF report generation error: {str(e)}")

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
            s3_key = f"reports/{r.filename}"
            presigned_url = storage_adapter.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
                ExpiresIn=3600
            )
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=presigned_url)
        except Exception:
            pass  # Fall through to local filesystem copy

    if not os.path.exists(r.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    return FileResponse(
        path=r.file_path,
        media_type="application/pdf",
        filename=r.filename,
        headers={"Content-Disposition": f'attachment; filename="{r.filename}"'}
    )
