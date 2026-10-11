import os
import json
import logging
from pydantic import BaseModel
from typing import List, Optional

logger = logging.getLogger(__name__)

class Settings(BaseModel):
    PROJECT_NAME: str = "RoofShift AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./roofshift.db")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ] if not os.getenv("BACKEND_CORS_ORIGINS") else [
        o.strip() for o in os.getenv("BACKEND_CORS_ORIGINS", "").split(",") if o.strip()
    ]
    
    # NASA POWER API
    NASA_POWER_BASE_URL: str = os.getenv("NASA_POWER_BASE_URL", "https://power.larc.nasa.gov/api/temporal/climatology/point")
    NASA_REQUEST_TIMEOUT_SECONDS: float = 12.0
    
    # Default Assumptions
    DEFAULT_AREA_PER_KWP: float = 8.0  # m^2 per kWp
    DEFAULT_PERFORMANCE_RATIO: float = 0.75 # 75% system PR
    DEFAULT_COST_PER_KWP: float = 50000.0 # INR 50,000 / kWp
    DEFAULT_TARIFF_INR_PER_KWH: float = 8.5 # INR 8.5 / kWh
    DEFAULT_EXPORT_TARIFF_INR_PER_KWH: float = 3.5 # INR 3.5 / kWh
    DEFAULT_GRID_EMISSIONS_FACTOR_KG_CO2_PER_KWH: float = 0.716 # CEA India factor
    
    REPORTS_DIR: str = os.getenv("REPORTS_DIR", "./generated_reports")
    UPLOADS_DIR: str = os.getenv("UPLOADS_DIR", "./uploaded_demand")

    # AWS Capability & Fallback Matrix Flags
    AWS_ENABLED: bool = os.getenv("AWS_ENABLED", "false").lower() in ("true", "1", "yes")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    
    STORAGE_PROVIDER: str = os.getenv("STORAGE_PROVIDER", "local") # "local" or "s3"
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "roofshift-reports-storage")
    
    GEOCODING_PROVIDER: str = os.getenv("GEOCODING_PROVIDER", "osm") # "osm" or "amazon_location"
    AMAZON_LOCATION_INDEX_NAME: str = os.getenv("AMAZON_LOCATION_INDEX_NAME", "RoofShiftPlaceIndex")
    
    BACKGROUND_PROCESSOR: str = os.getenv("BACKGROUND_PROCESSOR", "local") # "local" or "lambda"
    LAMBDA_SOLAR_PROCESSOR_ARN: Optional[str] = os.getenv("LAMBDA_SOLAR_PROCESSOR_ARN", None)
    
    SOLAR_DATA_PROVIDER: str = os.getenv("SOLAR_DATA_PROVIDER", "nasa")
    RECOMMENDATION_ENGINE: str = os.getenv("RECOMMENDATION_ENGINE", "deterministic") # Strictly deterministic
    
    MONITORING_PROVIDER: str = os.getenv("MONITORING_PROVIDER", "console") # "console" or "cloudwatch"
    CLOUDWATCH_LOG_GROUP: str = os.getenv("CLOUDWATCH_LOG_GROUP", "/roofshift/backend")

    # Bedrock Hard-disabled: Mentor Rule
    BEDROCK_ENABLED: bool = False

settings = Settings()
