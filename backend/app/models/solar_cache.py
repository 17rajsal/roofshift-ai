from sqlalchemy import Column, String, Float, DateTime, JSON, Integer
from datetime import datetime
from app.core.database import Base

class SolarDataCache(Base):
    __tablename__ = "solar_data_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grid_lat = Column(Float, nullable=False, index=True)
    grid_lon = Column(Float, nullable=False, index=True)
    ghi_monthly = Column(JSON, nullable=False) # Dictionary or list of 12 monthly GHI values (kWh/m2/day)
    ghi_annual = Column(Float, nullable=False) # Annual average GHI
    source = Column(String, default="NASA POWER Climatology")
    fetched_at = Column(DateTime, default=datetime.utcnow)
