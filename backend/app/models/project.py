from sqlalchemy import Column, String, Float, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, index=True)
    organization_name = Column(String, nullable=False, default="Organization")
    city = Column(String, nullable=False, default="New Delhi")
    latitude = Column(Float, nullable=False, default=28.6139)
    longitude = Column(Float, nullable=False, default=77.2090)
    budget = Column(Float, nullable=False, default=1000000.0) # In INR (default 10 Lakhs)
    tariff_rate = Column(Float, nullable=False, default=8.5) # INR / kWh
    export_tariff = Column(Float, nullable=False, default=3.5) # INR / kWh
    co2_factor = Column(Float, nullable=False, default=0.716) # kg CO2 / kWh
    is_demo = Column(String, default="false")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    buildings = relationship("Building", back_populates="project", cascade="all, delete-orphan")
    optimization_runs = relationship("OptimizationRun", back_populates="project", cascade="all, delete-orphan")
    activities = relationship("EnergyActivity", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="project", cascade="all, delete-orphan")
