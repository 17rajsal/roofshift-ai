import logging
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class ParameterStoreAdapter:
    """
    AWS Systems Manager Parameter Store adapter with fallback to environment variables.
    Provides truthful operational status:
    NOT_CONFIGURED, CONFIGURED_NOT_VERIFIED, VERIFIED_OPERATIONAL, FALLBACK_ACTIVE, DEGRADED, ERROR.
    """
    def __init__(self):
        self.ssm_client = None
        self._last_operation_timestamp = None
        self._last_operation_type = None
        self._last_error = None
        self._last_operation_success = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.AWS_ENABLED:
            try:
                import boto3
                self.ssm_client = boto3.client(
                    "ssm",
                    region_name=settings.AWS_REGION
                )
                logger.info(f"Initialized AWS Systems Manager Parameter Store client in region '{settings.AWS_REGION}'.")
            except Exception as e:
                logger.warning(f"Could not initialize SSM client: {str(e)}. Using local .env configuration.")
                self.ssm_client = None
                self._last_error = str(e)

    def is_ssm_active(self) -> bool:
        return self.ssm_client is not None

    def get_parameter(self, param_name: str, default_value: Optional[str] = None) -> Optional[str]:
        if self.is_ssm_active():
            try:
                resp = self.ssm_client.get_parameter(Name=param_name, WithDecryption=True)
                val = resp.get("Parameter", {}).get("Value", default_value)
                self._last_operation_timestamp = datetime.utcnow().isoformat()
                self._last_operation_type = "GET_PARAMETER"
                self._last_operation_success = True
                self._last_error = None
                return val
            except Exception as e:
                self._last_operation_timestamp = datetime.utcnow().isoformat()
                self._last_operation_type = "GET_PARAMETER"
                self._last_operation_success = False
                self._last_error = f"{type(e).__name__}: {str(e)}"
                logger.warning(f"Failed to fetch parameter '{param_name}' from SSM ({str(e)}). Using local fallback.")
        return default_value

    def get_status(self) -> Dict[str, Any]:
        """Returns truthful operational status and execution evidence."""
        if not settings.AWS_ENABLED:
            return {
                "status": "FALLBACK_ACTIVE",
                "active_provider": "Local .env & Process Environment",
                "fallback": "Standard Python dotenv / environment variables",
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": None,
                "cost_estimate": "$0.00 / month (Standard parameters free)"
            }
        if self.ssm_client is None:
            return {
                "status": "ERROR",
                "active_provider": "Local .env Fallback",
                "fallback": "Local environment variables",
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": self._last_error,
                "cost_estimate": "$0.00 / month"
            }
        if self._last_operation_success is True:
            return {
                "status": "VERIFIED_OPERATIONAL",
                "active_provider": "AWS Systems Manager Parameter Store",
                "fallback": "Local environment variables",
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": None,
                "cost_estimate": "$0.00 / month"
            }
        if self._last_operation_success is False:
            return {
                "status": "DEGRADED",
                "active_provider": "Local .env (SSM Fallback Active)",
                "fallback": "Local environment variables",
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": self._last_error,
                "cost_estimate": "$0.00 / month"
            }
        return {
            "status": "CONFIGURED_NOT_VERIFIED",
            "active_provider": "AWS Systems Manager (Awaiting First Parameter Read)",
            "fallback": "Local environment variables",
            "region": settings.AWS_REGION,
            "last_operation_timestamp": None,
            "last_operation_type": None,
            "last_error": None,
            "cost_estimate": "$0.00 / month"
        }

param_store_adapter = ParameterStoreAdapter()
