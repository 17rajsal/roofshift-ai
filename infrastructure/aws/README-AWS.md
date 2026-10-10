# RoofShift AI — AWS Cloud Architecture & Deployment Guide
**Team DRX** | **Environmental Hacks 2026 — WeMakeDevs × AWS (Track: Waste & Energy)**

---

## 1. Cloud Architecture Overview

RoofShift AI is engineered to deploy seamlessly on Amazon Web Services (AWS) using either **AWS EC2 (Docker Compose)** or **AWS ECS Fargate (Containerized Microservices)**.

```
                      Internet / Campus Users
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   AWS Route 53 / ALB  │
                     │    (Port 80 / 443)    │
                     └───────────┬───────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
   ┌───────────────────────┐             ┌──────────────────────┐
   │    Nginx Frontend     │             │    FastAPI Backend   │
   │   (React Vite SPA)    │             │  (Python OR-Solver)  │
   │     Port 80 / 3000    │──/api/v1/──▶│       Port 8000      │
   └───────────────────────┘             └──────────┬───────────┘
                                                    │
                               ┌────────────────────┴────────────────────┐
                               ▼                                         ▼
                    ┌─────────────────────┐                   ┌─────────────────────┐
                    │ NASA POWER Public   │                   │  Persistent Storage │
                    │ Climatology API     │                   │  (EBS Volume / EFS) │
                    └─────────────────────┘                   └─────────────────────┘
```

---

## 2. Option A: AWS EC2 One-Click Deployment (Recommended)

### Prerequisites
- AWS Account
- EC2 Key Pair (optional for SSH)
- AWS CLI configured or AWS Web Console access

### Step 1: Launch EC2 Instance
- **AMI:** Amazon Linux 2023 or Ubuntu 22.04 LTS
- **Instance Type:** `t3.small` (2 vCPU, 2 GB RAM) or `t3.medium`
- **Security Group Inbound Rules:**
  - `HTTP (80)`: `0.0.0.0/0` (Web UI)
  - `HTTPS (443)`: `0.0.0.0/0` (Secure SSL)
  - `Custom TCP (8000)`: `0.0.0.0/0` (FastAPI Swagger Docs)
  - `SSH (22)`: `My IP` (Administrative Access)
- **Storage:** 25–30 GB gp3 root volume

### Step 2: Run Deployment
Connect to your EC2 instance via SSH or EC2 Instance Connect, and execute:

```bash
# Clone the repository
git clone https://github.com/Team-DRX/roofshift-ai.git /opt/roofshift-ai
cd /opt/roofshift-ai

# Make deploy script executable and run
chmod +x infrastructure/aws/deploy-ec2.sh
./infrastructure/aws/deploy-ec2.sh
```

### Step 3: Verification
Open your browser and navigate to:
- **Web Application:** `http://<YOUR-EC2-PUBLIC-IP>`
- **API Swagger Documentation:** `http://<YOUR-EC2-PUBLIC-IP>:8000/docs`
- **API Health Endpoint:** `http://<YOUR-EC2-PUBLIC-IP>:8000/api/v1/health`

---

## 3. Option B: CloudFormation Automated Provisioning

Deploy the full VPC, Security Group, and EC2 instance via the AWS CLI:

```bash
aws cloudformation create-stack \
  --stack-name roofshift-ai-stack \
  --template-body file://infrastructure/aws/cloudformation-template.yaml \
  --parameters ParameterKey=InstanceType,ParameterValue=t3.small
```

---

## 4. Environment Variables Configuration

Create a `.env` file on the server:

```env
DATABASE_URL=sqlite:///./roofshift.db
REPORTS_DIR=/app/generated_reports
NASA_POWER_BASE_URL=https://power.larc.nasa.gov/api/temporal/climatology/point
```

---

## 5. Cost Transparency on AWS

| AWS Service | Specification | Monthly Estimated Cost (Free Tier Eligible) |
|---|---|---|
| **Amazon EC2** | 1 × `t3.micro` or `t3.small` | ~$0.00 (Free Tier 750h) or ~$15.00/mo |
| **Amazon EBS** | 30 GB gp3 storage | ~$2.40/mo |
| **Data Transfer** | Outbound < 100 GB | ~$0.00 (Free Tier allowance) |
| **Total** | | **~$0 – $18 / month** |
