import os
import logging
from typing import Optional, Tuple
from app.core.config import settings

logger = logging.getLogger(__name__)

class S3StorageAdapter:
    """
    AWS S3 Storage Adapter with seamless local filesystem fallback.
    Never lets an S3 connectivity failure prevent generating or downloading reports.
    """
    def __init__(self):
        self.s3_client = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.AWS_ENABLED and settings.STORAGE_PROVIDER == "s3":
            try:
                import boto3
                self.s3_client = boto3.client(
                    "s3",
                    region_name=settings.AWS_REGION
                )
                logger.info(f"Initialized Amazon S3 client for bucket '{settings.S3_BUCKET_NAME}'")
            except Exception as e:
                logger.warning(f"Could not initialize S3 client: {str(e)}. Using local filesystem fallback.")
                self.s3_client = None

    def is_s3_active(self) -> bool:
        return self.s3_client is not None

    def save_report_file(self, local_file_path: str, filename: str) -> Tuple[str, str, bool]:
        """
        Saves report. If S3 is active, uploads to private S3 bucket and returns presigned URL.
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
                logger.info(f"Successfully uploaded {filename} to S3 bucket {settings.S3_BUCKET_NAME}")
                return presigned_url, "Amazon S3 (Presigned URL)", True
            except Exception as e:
                logger.warning(f"S3 upload failed ({str(e)}). Falling back to local backend storage.")

        # Local Fallback
        return local_file_path, "Local File System", False

storage_adapter = S3StorageAdapter()
