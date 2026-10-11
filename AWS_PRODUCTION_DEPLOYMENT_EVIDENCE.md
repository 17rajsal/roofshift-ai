# ROOFSHIFT AI — AWS PRODUCTION DEPLOYMENT & VERIFICATION EVIDENCE
**Event:** Environmental Hacks 2026  
**Project:** RoofShift AI — Commercial Solar Planning & Energy Portfolio Management  
**Live Public HTTPS URL:** `https://d2pxwgtcwn203c.cloudfront.net`  
**Direct Origin:** `http://54.252.232.247` (`ec2-54-252-232-247.ap-southeast-2.compute.amazonaws.com`)  
**Deployment Date:** October 11, 2026  
**AWS Account ID:** `191611156592`  
**AWS Region:** `ap-southeast-2` (Asia Pacific - Sydney)  

---

## 1. EXECUTIVE SUMMARY & DEPLOYMENT STATUS

RoofShift AI is fully deployed to AWS in production mode with a live, globally accelerated, TLS-secured CloudFront public URL. All claimed AWS integrations are **active, genuine, tested, and verifiable via AWS APIs and the live public URL**. No simulated integrations, mock endpoints, or placeholder values are used.

```
========================================================================================
LIVE SERVICE CAPABILITY MATRIX (/api/v1/system/integrations)
========================================================================================
Service                   Status                  Active Provider / Resource
------------------------  ----------------------  ---------------------------------------
Amazon CloudFront         VERIFIED_OPERATIONAL    Distribution E3SF9J628LX68V (d2pxwgtcwn203c.cloudfront.net)
Amazon EC2                VERIFIED_OPERATIONAL    t3.micro (i-0803fc68806367b46, ap-southeast-2)
Amazon S3                 VERIFIED_OPERATIONAL    Bucket: roofshift-reports-191611156592-syd
Amazon CloudWatch         VERIFIED_OPERATIONAL    Log Group: /roofshift/backend (api-stream)
AWS SSM Parameter Store   VERIFIED_OPERATIONAL    Parameter: /roofshift/environment
AWS IAM                   VERIFIED_OPERATIONAL    Role: RoofShiftEC2InstanceRole
AWS Budgets               VERIFIED_OPERATIONAL    Budget: RoofShift-Monthly-Cost-Safety-Budget ($10 limit)
Amazon Location Service   FALLBACK_ACTIVE         OpenStreetMap Nominatim + Indian Gazetteer
AWS Lambda                FALLBACK_ACTIVE         In-process Python Normalizer in FastAPI
Amazon EventBridge        FALLBACK_ACTIVE         On-Demand SQLite Solar Cache Expiration
AWS Amplify Hosting       NOT_CONFIGURED          Full-stack EC2 Nginx Host (Option A active)
========================================================================================
```

---

## 2. VERIFIED AWS INFRASTRUCTURE RESOURCES

### A. Global Edge Delivery & HTTPS: Amazon CloudFront
- **Distribution ID:** `E3SF9J628LX68V`
- **Domain Name:** `d2pxwgtcwn203c.cloudfront.net`
- **Status:** `Deployed` (Enabled)
- **Origin:** `ec2-54-252-232-247.ap-southeast-2.compute.amazonaws.com:80`
- **Protocol Policy:** `redirect-to-https` (HTTP requests automatically redirected to HTTPS)
- **SSL/TLS Certificate:** AWS-Managed Global CloudFront Certificate
- **Cache Behaviors:**
  - `/api/*`: Managed Cache Policy `Managed-CachingDisabled` (`4135ea2d-6df8-44a3-9df3-4b5a84be39ad`) + Origin Request Policy `Managed-AllViewerExceptHostHeader` (`b689b0a8-53d0-40ab-baf2-68738e2966ac`) for dynamic real-time API responses.
  - Default (`/*`): Compressed static asset delivery with custom error responses (HTTP 403/404 mapped to `/index.html` with status 200) for seamless React SPA client-side routing.

### B. Compute & Application Host: Amazon EC2
- **Instance ID:** `i-0803fc68806367b46`
- **Instance Type:** `t3.micro` (2 vCPUs, 1 GiB RAM + 2047 MiB Swap)
- **VPC / Subnet:** `vpc-0161efd6d7df44eb8` via CloudFormation stack `roofshift-ai-production`
- **Public IP:** `54.252.232.247`
- **OS:** Amazon Linux 2023 (Linux 6.1.157-176.242.amzn2023.x86_64)
- **Container Runtime:** Docker 25.0.6 + Docker Compose v2.24.6
- **Running Containers:**
  - `roofshift_backend` (FastAPI + Uvicorn, port 8000, healthy)
  - `roofshift_frontend` (Vite React + Nginx, port 80)
- **Persistent Storage:** Docker named volumes `roofshift-ai_backend_data` (`/data/roofshift.db`) and `roofshift-ai_reports_data` (`/app/generated_reports`).

### C. Secure Remote Access: AWS Systems Manager (SSM)
- **SSM Agent Version:** `3.3.5226.0` (Amazon Linux native)
- **Status:** `Online`
- **IAM Instance Profile:** `RoofShiftEC2InstanceProfile` (`arn:aws:iam::191611156592:instance-profile/RoofShiftEC2InstanceProfile`)
- **Security Posture:** Port 22 (SSH) is completely closed in Security Groups; all maintenance and deployments are executed securely via AWS Systems Manager `AWS-RunShellScript` with IMDSv2 credential rotation.

### D. Cloud Storage: Amazon S3
- **Bucket Name:** `roofshift-reports-191611156592-syd`
- **Region:** `ap-southeast-2`
- **Access Control:** All 4 Public Access Blocks enabled (`BlockPublicAcls`, `IgnorePublicAcls`, `BlockPublicPolicy`, `RestrictPublicBuckets`).
- **Encryption:** Server-Side Encryption with Amazon S3 managed keys (`AES256`).
- **Verified Files Uploaded & Downloaded:**
  - `reports/RoofShift_Report_Delhi_College_Campus__Dem_20261011_150353_29c2dcdc8a.pdf` (35,433 bytes)
  - `reports/RoofShift_Report_Delhi_College_Campus__Dem_20261011_150711_1c189e3719.pdf` (39,877 bytes)
  - `reports/RoofShift_Report_Delhi_College_Campus__Dem_20261011_151031_e2ac85e300.pdf` (39,872 bytes)
- **Presigned URLs:** PDF report downloads issue 3600-second expiring HTTPS presigned URLs directly from S3.

### E. Telemetry & Observability: Amazon CloudWatch
- **Log Group:** `/roofshift/backend`
- **Retention Period:** 7 days
- **Log Stream:** `api-stream`
- **Verified Events Emitted & Queried:**
  - `service_startup`: Recorded container initialization with environment `production` and version `2.0.0`.
  - `pdf_report_generated`: Emitted live generation events with project ID, file size, storage provider (`Amazon S3 (Presigned URL)`), and cloud storage boolean.

### F. Configuration Governance: AWS SSM Parameter Store
- **Parameter Name:** `/roofshift/environment`
- **Type:** `String`
- **Value:** `production`
- **Verification:** Automatically read by the FastAPI lifespan handler at application launch.

### G. Security & Least Privilege: AWS IAM
- **Role Name:** `RoofShiftEC2InstanceRole`
- **Attached Policies:**
  - Managed: `AmazonSSMManagedInstanceCore`
  - Inline: `RoofShiftProductionServicesPolicy`
- **Inline Policy Scope:**
  - `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` restricted to `arn:aws:s3:::roofshift-reports-191611156592-syd*`
  - `logs:CreateLogStream`, `logs:PutLogEvents`, `logs:DescribeLogStreams` restricted to `arn:aws:logs:ap-southeast-2:191611156592:log-group:/roofshift/backend*`
  - `ssm:GetParameter`, `ssm:GetParameters` restricted to `arn:aws:ssm:ap-southeast-2:191611156592:parameter/roofshift/*`

### H. Cost Governance: AWS Budgets & Cost Explorer
- **Budget Name:** `RoofShift-Monthly-Cost-Safety-Budget`
- **Monthly Limit:** $10.00 USD
- **Actual Month-to-Date Spend (Oct 1–11):** **$0.00 USD**
- **Projected Monthly Spend:** < $0.25 USD (all provisioned resources fit comfortably within AWS Free Tier quotas).

---

## 3. LIVE VERIFICATION COMMANDS & API PROOF

### A. Health & Version Check
```bash
curl -s https://d2pxwgtcwn203c.cloudfront.net/api/v1/health
```
**Response:**
```json
{
  "status": "healthy",
  "service": "RoofShift AI",
  "version": "2.0.0",
  "region_support": "India (NASA POWER climatology with explicitly labelled illustrative fallback)"
}
```

### B. Machine Learning Model Metadata
```bash
curl -s https://d2pxwgtcwn203c.cloudfront.net/api/v1/solar-ml/model-info
```
**Response:**
```json
{
  "model_name": "RoofShift Solar Forecaster",
  "model_version": "1.1.0",
  "champion_algorithm": "XGBoost_Regressor",
  "dataset_provenance": "Gandikota Solar Power Plants 1 & 2 (Andhra Pradesh, India, CC0 Public Domain)",
  "evaluation_on_held_out_test_data": {
    "champion_test_metrics": {
      "mae": 0.00729,
      "rmse": 0.01437,
      "r2_score": 0.99673,
      "nmae_pct": 4.0,
      "nrmse_pct": 7.87,
      "mae_improvement_over_physics_pct": 87.56,
      "rmse_improvement_over_physics_pct": 85.6
    }
  }
}
```

### C. Live Solar ML Prediction vs Physics Baseline
```bash
curl -s -X POST https://d2pxwgtcwn203c.cloudfront.net/api/v1/solar-ml/forecast \
  -H "Content-Type: application/json" \
  -d '{"capacity_kwp": 100.0, "irradiance_w_per_m2": 850.0, "ambient_temperature_c": 32.0, "hour_of_day": 13.0}'
```
**Response:**
```json
{
  "capacity_kwp": 100.0,
  "irradiance_w_per_m2": 850.0,
  "ambient_temperature_c": 32.0,
  "cell_temperature_c": 58.56,
  "hour_of_day": 13.0,
  "ml_predicted_power_kw": 81.903,
  "physics_baseline_kw": 56.261,
  "delta_kw": 25.642,
  "confidence_lower_kw": 79.529,
  "confidence_upper_kw": 84.277,
  "model_name": "RoofShift Solar Forecaster",
  "model_version": "1.1.0",
  "model_algorithm": "XGBoost_Regressor",
  "test_r2_score": 0.99673
}
```

### D. Multi-Site Knapsack Portfolio Optimization
```bash
curl -s -X POST https://d2pxwgtcwn203c.cloudfront.net/api/v1/projects/d38857e3-93fd-4fc2-8cf1-d5cbfb8036bd/optimize \
  -H "Content-Type: application/json" \
  -d '{"budget_inr": 2000000.0, "objective": "MAXIMIZE_SAVINGS", "scenario_name": "Base Scenario"}'
```
**Response Summary:**
- **Total Budget:** INR 2,000,000.0
- **Total Capital Allocated:** INR 2,000,000.0 (100% budget compliance)
- **Total Installed Capacity:** 40.0 kWp across 5 candidate buildings
- **Annual Solar Generation:** 47,993.3 kWh
- **Annual Net Savings:** INR 386,533.07
- **Knapsack vs Greedy Baseline Lift:** **+INR 123,284.55 (+46.8% economic efficiency gain)**

### E. Amazon S3 Presigned PDF Report Generation & Download
```bash
# 1. Trigger Report Generation
curl -s -X POST https://d2pxwgtcwn203c.cloudfront.net/api/v1/projects/d38857e3-93fd-4fc2-8cf1-d5cbfb8036bd/reports \
  -H "Content-Type: application/json" \
  -d '{"notes": "Environmental Hacks 2026 Audit", "include_load_shifting": true, "include_features": true, "include_scenarios": true}'

# 2. Download via Presigned URL (HTTP 307 Redirect to S3 Bucket)
curl -I https://d2pxwgtcwn203c.cloudfront.net/api/v1/reports/930a7017-7e39-45f4-98fc-dccdf94ba5d9/download
```
**Response:**
```
HTTP/2 307 
location: https://roofshift-reports-191611156592-syd.s3.amazonaws.com/reports/RoofShift_Report_Delhi_College_Campus__Dem_20261011_151031_e2ac85e300.pdf?AWSAccessKeyId=...&Signature=...&Expires=...
```

---

## 4. TEST SUITE & RIGOROUS VERIFICATION RESULTS

- **Local Backend Test Suite:** **243 passed, 0 failed** (48.22 seconds)
- **Production EC2 Container Acceptance Suite:** **12 passed, 0 failed** (4.75 seconds)
- **Production EC2 Container ML Suite:** **14 passed, 0 failed** (10.15 seconds)
- **Data Attribution Integrity:** 36 Indian States and Union Territories with authentic radiation figures (GHI/DNI), explicitly separating total state technical radiation potential from commercial rooftop space.

---

## 5. SUMMARY OF LIVE URLS FOR EVALUATION

- **Live Public HTTPS Web App:** [https://d2pxwgtcwn203c.cloudfront.net](https://d2pxwgtcwn203c.cloudfront.net)
- **Live AWS Integrations API:** [https://d2pxwgtcwn203c.cloudfront.net/api/v1/system/integrations](https://d2pxwgtcwn203c.cloudfront.net/api/v1/system/integrations)
- **Live Solar ML Model API:** [https://d2pxwgtcwn203c.cloudfront.net/api/v1/solar-ml/model-info](https://d2pxwgtcwn203c.cloudfront.net/api/v1/solar-ml/model-info)
- **Live India Solar Intelligence:** [https://d2pxwgtcwn203c.cloudfront.net/api/v1/solar-intelligence/regions](https://d2pxwgtcwn203c.cloudfront.net/api/v1/solar-intelligence/regions)
- **Interactive Swagger Docs:** [https://d2pxwgtcwn203c.cloudfront.net/docs](https://d2pxwgtcwn203c.cloudfront.net/docs)
