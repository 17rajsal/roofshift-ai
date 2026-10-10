# RoofShift AI — AWS Deployment & Infrastructure Guide

> **Product:** RoofShift AI Enterprise Platform  
> **Infrastructure & Deployment Guide**  
> **Maintainer:** @17rajsal  

This guide provides technical instructions for provisioning and deploying RoofShift AI on Amazon Web Services (AWS) using CloudFormation, EC2/ECS, and Docker.

---

## 1. Architectural Strategy

RoofShift AI is designed with an **adaptive multi-service AWS architecture**:
- Every cloud service utilizes an abstracted adapter interface.
- If AWS credentials are present and `AWS_ENABLED=true`, the system calls real AWS SDK (boto3) endpoints.
- If running locally or without cloud credentials, the system falls back seamlessly to deterministic local implementations with zero degradation.

```
                    +------------------------------------------+
                    |             RoofShift AI                 |
                    +--------------------+---------------------+
                                         |
                       +-----------------+-----------------+
                       |                                   |
              [AWS Mode Enabled]                 [Local Fallback Mode]
                       |                                   |
         +-------------+-------------+             +-------+-------+
         | Amazon S3                 |             | Local Storage |
         | Amazon CloudWatch         |             | Rotating Logs |
         | Amazon Location Service   |             | OSM Nominatim |
         | AWS Lambda                |             | Async Workers |
         | Amazon EventBridge        |             | In-Process    |
         | AWS Systems Manager (SSM) |             | .env File     |
         | AWS Budgets               |             | Simulated     |
         | Amazon EC2 / ECS          |             | Docker Engine |
         +---------------------------+             +---------------+
```

---

## 2. Infrastructure as Code (CloudFormation)

A complete CloudFormation template is provided in [`infrastructure/aws/cloudformation-template.yaml`](../infrastructure/aws/cloudformation-template.yaml).

### Resources Provisioned by the Template:
1. **Compute:** Amazon EC2 instance (t3.medium recommended) with Docker & Docker Compose pre-configured via UserData.
2. **Storage:** Amazon S3 bucket (`roofshift-reports-<account-id>`) with SSE-S3 encryption and public read block.
3. **Networking:** Security Group allowing Inbound HTTP (80), HTTPS (443), and SSH (22).
4. **IAM Role:** EC2 Instance Profile with least-privilege policies for S3, CloudWatch Logs, Systems Manager Parameter Store, and Location Service.
5. **Observability:** CloudWatch Log Group (`/roofshift/production`).

### Deploy via AWS CLI:
```bash
aws cloudformation create-stack \
  --stack-name roofshift-ai-production \
  --template-body file://infrastructure/aws/cloudformation-template.yaml \
  --parameters \
      ParameterKey=InstanceType,ParameterValue=t3.medium \
      ParameterKey=KeyName,ParameterValue=my-ec2-keypair \
  --capabilities CAPABILITY_IAM \
  --region ap-south-1
```

---

## 3. Deployment Option A: Single EC2 Host with Docker & Nginx

For rapid single-host evaluation or institutional pilot deployment, run the automated EC2 deployment script:

```bash
# SSH into the Amazon Linux 2023 or Ubuntu EC2 instance
ssh -i my-key.pem ubuntu@<ec2-public-ip>

# Clone repository
git clone https://github.com/<your-org>/roofshift-ai.git
cd roofshift-ai

# Execute the deployment setup script
chmod +x infrastructure/aws/deploy-ec2.sh
./infrastructure/aws/deploy-ec2.sh
```

The script automatically:
1. Installs Docker and Docker Compose.
2. Configures production `.env` with EC2 host public IP.
3. Builds and launches the multi-container stack (`docker-compose.yml`):
   - Frontend served via optimized Nginx container on port `80`.
   - Backend FastAPI running in uvicorn container on port `8000`.
   - Local reverse proxy routing `/api/v1` to FastAPI.

---

## 4. Deployment Option B: AWS Amplify + ECS Fargate

For scalable serverless deployment:

### Frontend (AWS Amplify Hosting)
1. Connect the GitHub repository to the AWS Amplify Console.
2. Select the `antigravity/core-app` or `main` branch.
3. Use the repository's [`amplify.yml`](../amplify.yml) build specification:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd frontend
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: frontend/dist
       files:
         - '**/*'
     cache:
       paths:
         - frontend/node_modules/**/*
   ```
4. Set environment variable: `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1`.

### Backend (Amazon ECS Fargate)
1. Build the Docker image:
   ```bash
   docker build -t roofshift-backend -f backend/Dockerfile .
   ```
2. Tag and push to Amazon ECR:
   ```bash
   aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com
   docker tag roofshift-backend:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/roofshift-backend:latest
   docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/roofshift-backend:latest
   ```
3. Create an ECS Task Definition referencing the ECR image with `0.5 vCPU` and `1024 MB RAM`.
4. Launch an ECS Service behind an Application Load Balancer (ALB).

---

## 5. Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./roofshift.db` | PostgreSQL connection string for production or SQLite for demo |
| `AWS_ENABLED` | `false` | Enable real AWS SDK calls when credentials exist |
| `AWS_REGION` | `ap-south-1` | Target AWS Region (Mumbai default for India projects) |
| `STORAGE_PROVIDER` | `local` | `local` (filesystem) or `s3` (Amazon S3 bucket) |
| `S3_BUCKET_NAME` | `roofshift-reports-storage` | Target S3 bucket for PDF proposals |
| `GEOCODING_PROVIDER` | `osm` | `osm` (OpenStreetMap Nominatim) or `amazon_location` |
| `MONITORING_PROVIDER` | `console` | `console` (stdout) or `cloudwatch` (CloudWatch Logs) |
| `CLOUDWATCH_LOG_GROUP`| `/roofshift/backend` | CloudWatch log stream destination |
| `BEDROCK_ENABLED` | `false` | **Hard-disabled per architectural directive** |

---

## 6. Post-Deployment Verification

Verify deployment health by running these verification requests against your domain:

```bash
# 1. Check API Liveness & Database Readiness
curl -s http://<domain>/api/v1/health | jq .
# Expected: {"status": "ok", "app": "RoofShift AI", "version": "2.0.0"}

# 2. Check AWS Architecture & Fallback Diagnostics
curl -s http://<domain>/api/v1/system/integrations | jq .
# Expected: {"platform": "RoofShift AI", "aws_enabled": ..., "bedrock_status": {"enabled": false}}

# 3. Check Pre-Seeded Demonstration Project
curl -s http://<domain>/api/v1/projects | jq .
```

---

## 7. Critical Billing Safety & Regional Pricing Policy

### Free Tier Limitations & Zero-Spend Constraints
1. **12-Month Free Tier Expiration:** Standard Free Tier allowances (750 hours/month of `t2.micro` or `t3.micro`, 30 GB EBS gp3) are only valid for **12 months from AWS account creation**. Accounts older than 12 months transition to standard On-Demand pricing.
2. **Public IPv4 Charges (Effective Feb 1, 2024):** AWS charges **$0.005/hour (~$3.60 / month)** for every in-use public IPv4 address. While 750 hours/month are included in the Free Tier during the first 12 months, post-Free Tier accounts incur this charge unconditionally.
3. **Budget Alerts Are Asynchronous:** AWS Budgets alerts (such as the $20 threshold in `aws/budgets/budget_alarm.json`) send email notifications with an 8-to-24 hour reporting lag. **Budgets alerts do NOT automatically shut down EC2 instances or halt billing.**
4. **Tax Considerations:** For accounts registered under Amazon Internet Services Private Limited (AISPL - India), 18% GST is automatically applied, and promotional credits frequently do not cover government taxes.

### Regional Pricing Breakdown (On-Demand)

| Service Component | `ap-south-1` (Mumbai) | `ap-southeast-2` (Sydney) | Free Tier Allowance |
|---|---|---|---|
| **EC2 `t3.micro` (1 vCPU, 1 GB)** | $0.0104 / hr (~$7.50/mo) | $0.0132 / hr (~$9.50/mo) | 750 hours/mo (Yr 1 only) |
| **EC2 `t3.small` (2 vCPU, 2 GB)** | $0.0208 / hr (~$15.00/mo) | $0.0264 / hr (~$19.00/mo) | Not covered by Free Tier |
| **EBS Storage (gp3, 30 GB)** | $0.08 / GB-mo (~$2.40/mo) | $0.11 / GB-mo (~$3.30/mo) | 30 GB free (Yr 1 only) |
| **Public IPv4 Address** | $0.005 / hr (~$3.60/mo) | $0.005 / hr (~$3.60/mo) | 750 hours/mo (Yr 1 only) |
| **Amazon S3 (< 1 GB proposals)** | $0.023 / GB (<$0.05/mo) | $0.025 / GB (<$0.05/mo) | 5 GB free (Yr 1 only) |
| **Amazon CloudWatch Logs** | $0.50 / GB (<$0.50/mo) | $0.57 / GB (<$0.55/mo) | 5 GB ingestion free |

### Guaranteed ₹0 Public Demo Alternatives
For a zero out-of-pocket spending requirement (₹0 budget):
- **Local Application + Free Public Tunnel:** Run the verified application locally on ports 8000 (backend) and 5173 (frontend) and expose it via Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:80`) for a zero-cost HTTPS URL.
- **Time-Bounded CloudFormation Lifecycle:** If launching on AWS, only create the stack immediately prior to live evaluation and execute `aws cloudformation delete-stack --stack-name roofshift-ai-production` immediately after the demo concludes to ensure no lingering EBS or IPv4 charges accrue.

