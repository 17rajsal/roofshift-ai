from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.project import Project
from app.services.recommendations.rules_engine import generate_smart_recommendations

router = APIRouter()

@router.get("/projects/{project_id}/recommendations")
def get_recommendations(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    recs = generate_smart_recommendations(project_id, db)
    return {
        "project_id": project_id,
        "count": len(recs),
        "recommendations": recs
    }
