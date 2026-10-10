from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class SolarMonitoringLog(Base):
    __tablename__ = "solar_monitoring_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    building_id = Column(String, ForeignKey("buildings.id", ondelete="SET NULL"), nullable=True)

    filename = Column(String, nullable=False)
    record_count = Column(Integer, nullable=False)
    total_measured_generation_kwh = Column(Float, nullable=False)
    expected_generation_kwh = Column(Float, nullable=False)
    performance_ratio_actual = Column(Float, nullable=False) # e.g. 0.72
    expected_performance_ratio = Column(Float, nullable=False, default=0.75)
    generation_delta_pct = Column(Float, nullable=False) # e.g. -4.0%
    degradation_annual_pct = Column(Float, nullable=False, default=0.8) # e.g. 0.8%
    underperformance_flag = Column(Boolean, nullable=False, default=False)
    diagnostic_summary = Column(Text, nullable=False)
    data_mode = Column(String, nullable=False, default="Uploaded Inverter Telemetry")

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="monitoring_logs")
