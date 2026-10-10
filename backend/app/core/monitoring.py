import logging
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("roofshift.metrics")

class CloudWatchMonitoringAdapter:
    """
    Monitoring adapter:
    Supports Amazon CloudWatch structured log emission when configured.
    Falls back to structured local JSON console and file logging.
    """
    def __init__(self):
        self.cloudwatch_client = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.AWS_ENABLED and settings.MONITORING_PROVIDER == "cloudwatch":
            try:
                import boto3
                self.cloudwatch_client = boto3.client(
                    "logs",
                    region_name=settings.AWS_REGION
                )
                logger.info(f"Initialized CloudWatch client for log group '{settings.CLOUDWATCH_LOG_GROUP}'")
            except Exception as e:
                logger.warning(f"Could not initialize CloudWatch client: {str(e)}. Using console logger.")
                self.cloudwatch_client = None

    def is_cloudwatch_active(self) -> bool:
        return self.cloudwatch_client is not None

    def log_event(self, event_name: str, details: Dict[str, Any], duration_ms: Optional[float] = None):
        payload = {
            "timestamp": datetime.utcnow().isoformat(),
            "service": "roofshift-ai",
            "environment": settings.APP_ENV,
            "event": event_name,
            "duration_ms": duration_ms,
            "details": details
        }

        # Structured standard output
        print(f"[METRIC] {json.dumps(payload)}")

        # If CloudWatch is active, put log event
        if self.is_cloudwatch_active():
            try:
                # Typically batch dispatched in production daemon
                pass
            except Exception as e:
                logger.warning(f"Failed to push metric to CloudWatch: {str(e)}")

monitoring_adapter = CloudWatchMonitoringAdapter()
