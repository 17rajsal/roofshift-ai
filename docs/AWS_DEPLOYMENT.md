# RoofShift AI — AWS Deployment & Infrastructure Guide

> **Environmental Hacks 2026 — WeMakeDevs × AWS**  
> **Track:** Waste & Energy  
> **Team:** TEAM DRX  

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

For rapid hackathon demonstration or institutional pilot deployment, run the automated EC2 deployment script:

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
