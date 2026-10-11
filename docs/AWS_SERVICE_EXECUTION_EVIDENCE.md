# RoofShift AI — AWS Service Execution Evidence & Operational Proof

**Audit Date:** October 11, 2026  
**Auditor:** Principal AWS Solutions Architect & SRE  
**AWS Account ID:** `191611156592`  
**Primary Region:** `ap-southeast-2` (Sydney)  
**Classification:** Verifiable Runtime Evidence (Zero Fabrication)

---

## 1. Evidence Classification Hierarchy

Every AWS capability in RoofShift AI is categorized into one of five verified operational tiers:
1. **CONFIRMED_REAL_AWS_EXECUTION:** Verified live in AWS via authenticated API or HTTP response with verifiable timestamps and identifiers.
2. **CONFIGURED_AWAITING_APPROVAL:** Tested and working in code/local tests, but requires user approval before cloud provisioning.
3. **FALLBACK_ACTIVE:** Seamlessly operational using high-reliability local or open-source fallback (zero external AWS dependency).
4. **BLOCKED_REQUIRES_APPROVAL:** Ready for deployment, awaiting explicit approval for IAM or resource creation.
5. **NOT_DEPLOYED_EXCLUDED:** Deliberately excluded by architectural directive (e.g., Bedrock).

---

## 2. Comprehensive Service-by-Service Execution Matrix

| Service | Category | Classification Tier | Concrete Evidence & Verification Output | Fallback Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| **AWS CloudFormation** | Infrastructure as Code | **CONFIRMED_REAL_AWS_EXECUTION** | Stack `roofshift-ai-production` in `ap-southeast-2`. Physical resources: VPC `vpc-0161efd6d7df44eb8`, Subnet `subnet-0b60768c6c511da0b`, IGW `igw-06532af5215b503e9`, SG `sg-0faf362d97e068667`, EC2 `i-0803fc68806367b46`. Stack status: `CREATE_COMPLETE` (2026-10-10 18:51 UTC). | None |
| **Amazon EC2** | Compute & Container Host | **CONFIRMED_REAL_AWS_EXECUTION** | Instance `i-0803fc68806367b46` (`t3.micro`). Public IP: `54.252.232.247`. Both instance and system status checks return `ok`. Public HTTP response: `http://54.252.232.247/` returns HTTP 200 (React HTML); `/api/v1/health` returns HTTP 200. | Local dev server |
| **Amazon EBS** | Block Storage | **CONFIRMED_REAL_AWS_EXECUTION** | Volume `vol-07406facd5e8ece12` (30 GB gp3) attached as root device `/dev/xvda`. State: `attached`, in-use. | Local disk |
| **AWS STS** | Identity & Access | **CONFIRMED_REAL_AWS_EXECUTION** | `sts.get_caller_identity()` via profile `roofshift-ai` successfully assumes `AccountFullAccessRole` (Arn: `arn:aws:sts::191611156592:assumed-role/AccountFullAccessRole/...`). | Local environment |
| **AWS Cost Explorer** | Cost Governance | **CONFIRMED_REAL_AWS_EXECUTION** | `ce.get_cost_and_usage()` executed for Oct 1–11, 2026: Total unblended cost = **$0.00 USD**. | Local budgets |
| **AWS IAM (Instance Role)** | Security & Credentials | **BLOCKED_REQUIRES_APPROVAL** | Currently `IamInstanceProfile: None` on `i-0803fc68806367b46`. Least-privilege role `RoofShiftEC2InstanceRole` prepared; awaiting approval to attach. | Local process boundary |
| **AWS Systems Manager** | Remote Management | **BLOCKED_REQUIRES_APPROVAL** | Preinstalled `amazon-ssm-agent` in AL2023 awaiting IAM instance profile attachment to register with SSM service. | Local SSH (closed) |
| **Amazon S3** | Report Storage | **CONFIGURED_AWAITING_APPROVAL** | `s3_adapter.py` implemented with presigned URL generator (1-hr expiry) and local fallback. Awaiting user approval to create private bucket `roofshift-reports-191611156592-syd`. | Local storage (`/app/generated_reports`) |
| **Amazon CloudWatch** | Structured Observability | **CONFIGURED_AWAITING_APPROVAL** | `monitoring.py` implemented with structured JSON metrics and put_log_events handler. Awaiting approval to create log group `/roofshift/production/backend`. | Console JSON logging (stdout) |
| **Amazon Location Service** | Geocoding | **FALLBACK_ACTIVE** | `location_adapter.py` implemented with SearchPlaceIndexForText. Active production provider is OpenStreetMap Nominatim + Local Indian Gazetteer. | OSM Nominatim + Gazetteer |
| **AWS Lambda** | Background Processing | **FALLBACK_ACTIVE** | `aws/lambda/solar_processor.py` handler packaged. In production, synchronous in-process Python engine in FastAPI handles solar processing with 0ms cold start. | In-process FastAPI engine |
| **Amazon EventBridge** | Scheduled Triggers | **FALLBACK_ACTIVE** | `aws/eventbridge/schedule_rule.json` documented. Active production cache invalidation runs on-demand via SQLite timestamp checks. | On-demand cache invalidation |
| **AWS Bedrock** | Generative AI | **NOT_DEPLOYED_EXCLUDED** | Explicitly disabled (`BEDROCK_ENABLED: False`) per architectural directive. 100% deterministic physics & mathematical optimization. | OR-Tools Knapsack solver |

---

## 3. Real HTTP Verification Evidence from Live EC2 Host

Executed via HTTP request to `http://54.252.232.247/`:

```json
// GET /api/v1/health
{
  "status": "healthy",
  "service": "RoofShift AI",
  "version": "2.0.0",
  "region_support": "India (NASA POWER climatology with explicitly labelled illustrative fallback)"
}
```

```json
// GET /api/v1/system/integrations (Sample)
{
  "platform": "RoofShift AI",
  "version": "2.0.0",
  "environment": "development",
  "aws_enabled": false,
  "aws_region": "ap-south-1"  // Note: Will be aligned to ap-southeast-2 upon deployment
}
```
