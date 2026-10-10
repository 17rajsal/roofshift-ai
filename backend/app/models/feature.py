"""Additive project-scoped history; existing project/building columns are unchanged."""
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class FeatureAssessment(Base):
    __tablename__ = "feature_assessments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_key = Column(String, nullable=False, index=True)
    schema_version = Column(String, nullable=False, default="1.0")
    inputs_json = Column(JSON, nullable=False)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    project = relationship("Project", back_populates="feature_assessments")
