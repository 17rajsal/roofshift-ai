from sqlalchemy import Column, String, Float, DateTime, Text, JSON, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class EnergyActivity(Base):
    __tablename__ = "energy_activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    building_id = Column(String, nullable=True) # Optional link to specific building
    
    name = Column(String, nullable=False) # e.g. "Campus EV Fleet Charging", "Water Reservoir Pumping"
    power_kw = Column(Float, nullable=False, default=15.0) # Power draw in kW
    duration_hours = Column(Float, nullable=False, default=3.0) # Operating duration
    earliest_hour = Column(Integer, nullable=False, default=8) # 0-23
    latest_hour = Column(Integer, nullable=False, default=18) # 0-23
    preferred_hour = Column(Integer, nullable=False, default=18) # Current operating hour
    days_per_week = Column(Integer, nullable=False, default=5)
    is_shiftable = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="activities")

class SchedulingResult(Base):
    __tablename__ = "scheduling_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    recommendations_json = Column(JSON, nullable=False)
    hourly_baseline_load = Column(JSON, nullable=False) # 24 points
    hourly_shifted_load = Column(JSON, nullable=False) # 24 points
    hourly_solar_generation = Column(JSON, nullable=False) # 24 points
    solar_surplus_before_kwh = Column(Float, nullable=False)
    solar_surplus_after_kwh = Column(Float, nullable=False)
    self_consumed_shift_kwh = Column(Float, nullable=False)
    annual_financial_gain_inr = Column(Float, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
