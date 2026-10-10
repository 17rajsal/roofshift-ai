from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class PanelInspection(Base):
    __tablename__ = "panel_inspections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    building_id = Column(String, ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, index=True)

    filename = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    defect_type = Column(String, nullable=False)  # NORMAL, HOTSPOT, SOILING, MICRO_CRACK, DELAMINATION
    severity = Column(String, nullable=False)     # NONE, LOW, MEDIUM, HIGH, CRITICAL
    confidence_score = Column(Float, nullable=False) # e.g. 0.94
    temperature_delta_c = Column(Float, nullable=True) # e.g. +14.2 deg C
    estimated_power_loss_pct = Column(Float, nullable=False, default=0.0) # e.g. 8.5%
    recommended_action = Column(Text, nullable=False)
    model_provenance = Column(String, nullable=False, default="Thermal / Optical Defect Analyzer v1.2 (Deterministic Computer Vision)")

    created_at = Column(DateTime, default=datetime.utcnow)

    building = relationship("Building", back_populates="inspections")
