from sqlalchemy import Column, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base

class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    budget_inr = Column(Float, nullable=False)
    objective = Column(String, nullable=False, default="MAXIMIZE_SAVINGS") # MAXIMIZE_SAVINGS, MAXIMIZE_ONSITE_UTILIZATION, MAXIMIZE_GENERATION
    scenario_name = Column(String, nullable=False, default="Base Scenario") # Base, Conservative, Optimistic, Custom
    
    # Results
    total_allocated_inr = Column(Float, nullable=False)
    remaining_budget_inr = Column(Float, nullable=False)
    total_capacity_kwp = Column(Float, nullable=False)
    total_annual_generation_kwh = Column(Float, nullable=False)
    total_annual_savings_inr = Column(Float, nullable=False)
    total_onsite_consumed_kwh = Column(Float, nullable=False)
    total_exported_kwh = Column(Float, nullable=False)
    overall_payback_years = Column(Float, nullable=True)
    avoided_co2_kg_annual = Column(Float, nullable=False)
    
    # Baseline Results
    baseline_allocated_inr = Column(Float, nullable=False)
    baseline_savings_inr = Column(Float, nullable=False)
    baseline_capacity_kwp = Column(Float, nullable=False)
    baseline_generation_kwh = Column(Float, nullable=False)
    savings_lift_pct = Column(Float, nullable=False, default=0.0)
    
    # JSON Breakdowns
    allocations_json = Column(JSON, nullable=False) # List of dicts for each building
    baseline_allocations_json = Column(JSON, nullable=False)
    explanations_json = Column(JSON, nullable=False) # Dictionary of building_id -> explanation text & reasons
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="optimization_runs")
