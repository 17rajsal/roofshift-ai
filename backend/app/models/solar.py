from sqlalchemy import Column, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class SolarAnalysis(Base):
    __tablename__ = "solar_analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    building_id = Column(String, ForeignKey("buildings.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    usable_roof_area_sqm = Column(Float, nullable=False)
    max_pv_capacity_kwp = Column(Float, nullable=False)
    annual_generation_kwh = Column(Float, nullable=False)
    monthly_generation_kwh = Column(JSON, nullable=False) # List of 12 monthly kWh estimates
    specific_yield_kwh_per_kwp = Column(Float, nullable=False)
    performance_ratio = Column(Float, default=0.75)
    effective_shading_loss_pct = Column(Float, default=5.0)
    
    # Energy Balance & Financials
    annual_consumption_kwh = Column(Float, nullable=False)
    annual_onsite_consumed_kwh = Column(Float, nullable=False)
    annual_exported_kwh = Column(Float, nullable=False)
    onsite_utilization_pct = Column(Float, nullable=False)
    
    annual_savings_inr = Column(Float, nullable=False)
    installation_cost_inr = Column(Float, nullable=False)
    simple_payback_years = Column(Float, nullable=True)
    avoided_co2_kg_annual = Column(Float, nullable=False)
    
    # Metadata & Provenance
    ghi_annual_avg_kwh_m2_day = Column(Float, nullable=False)
    irradiance_source = Column(String, default="NASA POWER Climatology")
    data_quality_label = Column(String, default="Public dataset (NASA POWER)")
    calculation_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    building = relationship("Building", back_populates="solar_analysis")
