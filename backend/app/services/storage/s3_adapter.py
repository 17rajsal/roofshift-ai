import os
import logging
from datetime import datetime
from typing import Optional, Tuple, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class S3StorageAdapter:
    """
    AWS S3 Storage Adapter with seamless local filesystem fallback.
    Never lets an S3 connectivity failure prevent generating or downloading reports.
    Provides truthful execution status:
    NOT_CONFIGURED, CONFIGURED_NOT_VERIFIED, VERIFIED_OPERATIONAL, FALLBACK_ACTIVE, DEGRADED, ERROR.
    """
    def __init__(self):
        self.s3_client = None
        self._last_operation_timestamp = None
        self._last_operation_type = None
        self._last_error = None
        self._last_operation_success = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.AWS_ENABLED and settings.STORAGE_PROVIDER == "s3":
            try:
                import boto3
                self.s3_client = boto3.client(
                    "s3",
                    region_name=settings.AWS_REGION
                )
                logger.info(f"Initialized Amazon S3 client for bucket '{settings.S3_BUCKET_NAME}' in region '{settings.AWS_REGION}'")
            except Exception as e:
                logger.warning(f"Could not initialize S3 client: {str(e)}. Using local filesystem fallback.")
                self.s3_client = None
                self._last_error = str(e)

    def is_s3_active(self) -> bool:
        return self.s3_client is not None

    def save_report_file(self, local_file_path: str, filename: str) -> Tuple[str, str, bool]:
        """
        Saves report. If S3 is configured, attempts upload to private S3 bucket and returns presigned URL.
        Otherwise preserves in local filesystem and returns relative backend download URL.
        Returns: (storage_location_or_url, provider_name, is_cloud)
        """
        if self.is_s3_active():
            try:
                s3_key = f"reports/{filename}"
                self.s3_client.upload_file(
                    local_file_path,
                    settings.S3_BUCKET_NAME,
                    s3_key,
                    ExtraArgs={"ContentType": "application/pdf"}
                )
                # Generate 1-hour presigned URL
                presigned_url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": settings.S3_BUCKET_NAME, "Key": s3_key},
                    ExpiresIn=3600
                )
                self._last_operation_timestamp = datetime.utcnow().isoformat()
                self._last_operation_type = "PUT_OBJECT"
                self._last_operation_success = True
                self._last_error = None
                logger.info(f"Successfully uploaded {filename} to S3 bucket {settings.S3_BUCKET_NAME}")
                return presigned_url, "Amazon S3 (Presigned URL)", True
            except Exception as e:
                self._last_operation_timestamp = datetime.utcnow().isoformat()
                self._last_operation_type = "PUT_OBJECT"
                self._last_operation_success = False
                self._last_error = f"{type(e).__name__}: {str(e)}"
                logger.warning(f"S3 upload failed ({str(e)}). Falling back to local backend storage.")

        # Local Fallback
        return local_file_path, "Local File System", False

    def get_status(self) -> Dict[str, Any]:
        """Returns truthful operational status and execution evidence."""
        if not settings.AWS_ENABLED or settings.STORAGE_PROVIDER != "s3":
            return {
                "status": "FALLBACK_ACTIVE",
                "active_provider": "Local File System",
                "fallback": "Local Backend Storage (/app/generated_reports)",
                "bucket_name": settings.S3_BUCKET_NAME,
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": None,
                "cost_estimate": "< $0.05 / month"
            }
        if self.s3_client is None:
            return {
                "status": "ERROR",
                "active_provider": "Local File System",
                "fallback": "Local Backend Storage",
                "bucket_name": settings.S3_BUCKET_NAME,
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": self._last_error,
                "cost_estimate": "< $0.05 / month"
            }
        if self._last_operation_success is True:
            return {
                "status": "VERIFIED_OPERATIONAL",
                "active_provider": "Amazon S3 Bucket",
                "fallback": "Local Backend Storage",
                "bucket_name": settings.S3_BUCKET_NAME,
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": None,
                "cost_estimate": "< $0.05 / month"
            }
        if self._last_operation_success is False:
            return {
                "status": "DEGRADED",
                "active_provider": "Local File System (Fallback Active)",
                "fallback": "Local Backend Storage",
                "bucket_name": settings.S3_BUCKET_NAME,
                "region": settings.AWS_REGION,
                "last_operation_timestamp": self._last_operation_timestamp,
                "last_operation_type": self._last_operation_type,
                "last_error": self._last_error,
                "cost_estimate": "< $0.05 / month"
            }
        return {
            "status": "CONFIGURED_NOT_VERIFIED",
            "active_provider": "Amazon S3 (Awaiting First Upload)",
            "fallback": "Local Backend Storage",
            "bucket_name": settings.S3_BUCKET_NAME,
            "region": settings.AWS_REGION,
            "last_operation_timestamp": None,
            "last_operation_type": None,
            "last_error": None,
            "cost_estimate": "< $0.05 / month"
        }

storage_adapter = S3StorageAdapter()
