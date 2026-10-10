import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class ParameterStoreAdapter:
    """
    AWS Systems Manager Parameter Store adapter with fallback to environment variables.
    """
    def __init__(self):
        self.ssm_client = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.AWS_ENABLED:
            try:
                import boto3
                self.ssm_client = boto3.client(
                    "ssm",
                    region_name=settings.AWS_REGION
                )
                logger.info("Initialized AWS Systems Manager Parameter Store client.")
            except Exception as e:
                logger.warning(f"Could not initialize SSM client: {str(e)}. Using local .env configuration.")
                self.ssm_client = None

    def is_ssm_active(self) -> bool:
        return self.ssm_client is not None

    def get_parameter(self, param_name: str, default_value: Optional[str] = None) -> Optional[str]:
        if self.is_ssm_active():
            try:
                resp = self.ssm_client.get_parameter(Name=param_name, WithDecryption=True)
                return resp.get("Parameter", {}).get("Value", default_value)
            except Exception as e:
                logger.warning(f"Failed to fetch parameter '{param_name}' from SSM: {str(e)}")
        return default_value

param_store_adapter = ParameterStoreAdapter()
