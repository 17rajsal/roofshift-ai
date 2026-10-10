from sqlalchemy import Column, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class Building(Base):
    __tablename__ = "buildings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Identity
    name = Column(String, nullable=False)
    category = Column(String, nullable=False, default="Academic") # Academic, Residential, Administrative, Commercial, Industrial, Utility
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Roof Characteristics
    gross_roof_area = Column(Float, nullable=False, default=300.0) # in m^2
    usable_roof_percentage = Column(Float, nullable=False, default=70.0) # % (e.g. 70%)
    shading_category = Column(String, nullable=False, default="Low") # Low, Medium, High, Custom
    custom_shading_loss = Column(Float, nullable=True, default=5.0) # in %
    roof_polygon = Column(JSON, nullable=True) # GeoJSON or list of lat/lng pairs
    obstacles_notes = Column(Text, nullable=True)
    
    # Demand & Tariff
    monthly_consumption_kwh = Column(Float, nullable=False, default=2000.0) # in kWh
    tariff_inr = Column(Float, nullable=True) # Override project tariff if building specific
    daytime_consumption_pct = Column(Float, nullable=False, default=65.0) # % of load during daylight
    demand_origin = Column(String, default="Estimated profile") # Actual bill, Measured upload, Estimated profile
    
    # Financial parameters
    cost_per_kwp = Column(Float, nullable=False, default=50000.0) # In INR per kWp
    fixed_cost = Column(Float, nullable=False, default=0.0) # In INR
    max_eligible_kwp = Column(Float, nullable=True) # Optional cap
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="buildings")
    solar_analysis = relationship("SolarAnalysis", back_populates="building", uselist=False, cascade="all, delete-orphan")
    inspections = relationship("PanelInspection", back_populates="building", cascade="all, delete-orphan")
