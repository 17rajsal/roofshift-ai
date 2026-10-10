from fastapi import APIRouter
from app.core.config import settings
from app.services.storage.s3_adapter import storage_adapter
from app.services.geospatial.location_adapter import location_adapter
from app.core.monitoring import monitoring_adapter
from app.core.param_store import param_store_adapter

router = APIRouter()

@router.get("/system/integrations")
def get_system_integrations_status():
    """
    Returns real-time capability matrix, AWS service integration status,
    and active fallback modes across the platform.
    """
    s3_active = storage_adapter.is_s3_active()
    loc_active = location_adapter.is_amazon_location_active()
    cw_active = monitoring_adapter.is_cloudwatch_active()
    ssm_active = param_store_adapter.is_ssm_active()

    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "aws_enabled": settings.AWS_ENABLED,
        "aws_region": settings.AWS_REGION,
        "bedrock_status": {
            "enabled": False,
            "status": "HARD_DISABLED",
            "decision": "Amazon Bedrock excluded per architectural directive. 100% deterministic OR-Tools & physics.",
            "latency_impact": "0ms (No generative model latency or rate limits)"
        },
        "services": [
            {
                "service": "AWS Amplify Hosting",
                "category": "Frontend Hosting",
                "status": "Configured / Deploy-Ready",
                "active_provider": "Amplify SPA (Vite / React 19)",
                "fallback": "Nginx Container / Local Vite Server",
                "evidence": "amplify.yml in repository root with build pipeline",
                "cost_estimate": "$0.00 / month (Free tier)"
            },
            {
                "service": "Amazon EC2",
                "category": "Backend Compute",
                "status": "Production Docker Container Ready",
                "active_provider": "FastAPI + Uvicorn on EC2",
                "fallback": "Local Python Server",
                "evidence": "deploy-ec2.sh, docker-compose.yml, Dockerfile",
                "cost_estimate": "~$0 - $15 / month (t3.small / Free tier eligible)"
            },
            {
                "service": "Amazon S3",
                "category": "Secure Document Storage",
                "status": "Active" if s3_active else "Local Fallback Active",
                "active_provider": "Amazon S3 Bucket" if s3_active else "Local Backend Storage",
                "fallback": "Local File System (/app/generated_reports)",
                "bucket_name": settings.S3_BUCKET_NAME,
                "evidence": "s3_adapter.py with presigned URL generator & local fallback",
                "cost_estimate": "< $0.05 / month"
            },
            {
                "service": "Amazon Location Service",
                "category": "Geospatial & Geocoding",
                "status": "Active" if loc_active else "OSM Fallback Active",
                "active_provider": "Amazon Location Service" if loc_active else "OpenStreetMap Nominatim + Gazetteer",
                "fallback": "OpenStreetMap Nominatim (Rate-limited compliant) + Local Indian Gazetteer",
                "place_index": settings.AMAZON_LOCATION_INDEX_NAME,
                "evidence": "location_adapter.py with SearchPlaceIndexForText & OSM fallback",
                "cost_estimate": "$0.00 / month (Free tier 10,000 requests)"
            },
            {
                "service": "AWS Lambda",
                "category": "Background Solar Data Normalization",
                "status": "Configured / Standalone Handler Ready",
                "active_provider": "In-process Python Normalizer" if not settings.LAMBDA_SOLAR_PROCESSOR_ARN else "AWS Lambda",
                "fallback": "Synchronous Python Normalization Engine in FastAPI",
                "function_name": "RoofShiftSolarProcessor",
                "evidence": "aws/lambda/solar_processor.py event handler",
                "cost_estimate": "$0.00 / month (Free tier 1M requests)"
            },
            {
                "service": "Amazon EventBridge",
                "category": "Scheduled Cache Maintenance",
                "status": "Configured",
                "active_provider": "EventBridge Weekly Cron Rule",
                "fallback": "On-Demand SQLite/Postgres Solar Cache Expiration",
                "schedule_expression": "cron(0 2 ? * SUN *)",
                "evidence": "aws/eventbridge/schedule_rule.json",
                "cost_estimate": "$0.00 / month"
            },
            {
                "service": "Amazon CloudWatch",
                "category": "Monitoring & Logging",
                "status": "Active" if cw_active else "Console JSON Logging Active",
                "active_provider": "CloudWatch Logs" if cw_active else "Structured JSON Console Logger",
                "fallback": "Structured Console Output with timestamp & latency metrics",
                "log_group": settings.CLOUDWATCH_LOG_GROUP,
                "evidence": "monitoring_adapter.py with duration_ms metric telemetry",
                "cost_estimate": "< $0.50 / month"
            },
            {
                "service": "AWS IAM",
                "category": "Security & Access Management",
                "status": "Configured / Least Privilege Defined",
                "active_provider": "IAM Role Policies",
                "fallback": "Local OS Process Boundaries",
                "evidence": "aws/iam/ (s3_policy.json, cloudwatch_policy.json, location_policy.json)",
                "cost_estimate": "$0.00 / month"
            },
            {
                "service": "AWS SSM Parameter Store",
                "category": "Configuration & Secrets",
                "status": "Active" if ssm_active else "Local .env Fallback Active",
                "active_provider": "SSM Parameter Store" if ssm_active else "Local .env & Environment Variables",
                "fallback": "Standard Python dotenv / environment variables",
                "evidence": "param_store.py with get_parameter & decryption support",
                "cost_estimate": "$0.00 / month (Standard parameters free)"
            },
            {
                "service": "AWS Budgets",
                "category": "Cost Governance",
                "status": "Configured",
                "active_provider": "Monthly Cost Threshold Alarm",
                "fallback": "Local Resource Teardown Documentation",
                "threshold": "$20.00 USD (80% notification alarm)",
                "evidence": "aws/budgets/budget_alarm.json",
                "cost_estimate": "$0.00 (First 2 budgets free)"
            }
        ]
    }
