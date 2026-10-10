from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class MaintenanceCase(Base):
    __tablename__ = "maintenance_cases"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    building_id = Column(String, ForeignKey("buildings.id", ondelete="SET NULL"), nullable=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False, default="PANEL_SOILING") # PANEL_SOILING, INVERTER_FAULT, HOTSPOT, CABLE_DAMAGE, VEGETATION_SHADING
    priority = Column(String, nullable=False, default="MEDIUM")       # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String, nullable=False, default="OPEN")           # OPEN, IN_PROGRESS, RESOLVED
    estimated_loss_kwh_per_day = Column(Float, nullable=False, default=0.0)
    assigned_to = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="maintenance_cases")
