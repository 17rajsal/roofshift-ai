# RoofShift AI — AWS Billing, Credit Governance & Cost Control

**Date of Record:** October 11, 2026  
**AWS Account ID:** `191611156592`  
**Primary Region:** `ap-southeast-2` (Sydney)  
**Promotional Credit Allocation:** Up to $100.00 USD available / under review  
**Month-to-Date Spend (Oct 1–11, 2026):** **$0.00 USD**  

---

## 1. Current Infrastructure Cost Run-Rate

The live RoofShift AI cloud infrastructure runs on the following minimal footprint:

| Resource | Identifier / Specification | Billing Metric | Monthly Run-Rate | Free Tier / Credit Applicability |
| :--- | :--- | :--- | :--- | :--- |
| **EC2 Compute** | `i-0803fc68806367b46` (`t3.micro`) | $0.0132 / hour | ~$9.64 / month | Covered by AWS Free Tier (750 hours/month) |
| **EBS Storage** | `vol-07406facd5e8ece12` (30 GB gp3) | $0.096 / GB-month | ~$2.88 / month | Covered by AWS Free Tier (30 GB storage) |
| **Public IPv4 Address** | `54.252.232.247` | $0.005 / hour | ~$3.60 / month | Standard charge per public IPv4 in use |
| **Data Transfer Out** | Regional Internet Gateway egress | $0.114 / GB | < $0.20 / month | First 100 GB/month free globally |
| **Total Baseline** | **Existing Footprint** | — | **~$3.60 – $16.32 / mo** | Net zero cash spend with Free Tier + Credits |

---

## 2. Incremental Spend for Proposed Integrations

RoofShift AI follows a strict **frugal engineering** principle. No billable services are provisioned unless they deliver verifiable production value.

| Proposed AWS Service | Planned Resource & Configuration | Estimated Incremental Cost | Frugality & Cost Control Strategy |
| :--- | :--- | :--- | :--- |
| **AWS IAM** | `RoofShiftEC2InstanceRole` (Instance Profile) | **$0.00** | IAM roles, instance profiles, and policies are completely free. |
| **AWS Systems Manager** | SSM Session Manager connection | **$0.00** | Standard Session Manager usage on EC2 is free of charge. |
| **Amazon S3** | `roofshift-reports-191611156592-syd` (Private) | **< $0.05 / month** | Low-frequency report PDF uploads (~50 KB each). 5 GB Free Tier storage. |
| **Amazon CloudWatch** | `/roofshift/production/backend` (7-day retention) | **< $0.20 / month** | Strict 7-day log retention. First 5 GB ingestion / month is free. |
| **AWS Budgets** | Monthly $20.00 USD threshold alarm | **$0.00** | First 2 AWS Budgets are free. |
| **Total Proposed Additional** | — | **< $0.25 / month** | Well within available credits. |

---

## 3. Disallowed Expensive Services

Per project architectural guidelines, the following costly or unnecessary services are **strictly prohibited**:
* ❌ **Amazon Bedrock / Generative AI Endpoints:** Banned ($0 spend, 100% deterministic OR-Tools Knapsack solver).
* ❌ **NAT Gateways:** Banned ($0.059/hr + $0.059/GB = ~$45/mo). The EC2 instance resides in a public subnet with an Internet Gateway ($0).
* ❌ **Application Load Balancers (ALB):** Banned ($0.027/hr = ~$20/mo). Nginx container on EC2 handles reverse proxying directly.
* ❌ **Managed RDS / Aurora Databases:** Banned ($15–$50/mo). SQLite on EBS volume provides sufficient single-node persistence.
* ❌ **Provisioned SageMaker Endpoints:** Banned ($50–$200/mo). Lightweight XGBoost and MobileNetV3 run in-process inside FastAPI.

---

## 4. Cost Governance & Emergency Teardown Plan

1. **Credit Depletion Safety:**
   - If credits expire or are depleted, the monthly baseline without credits is capped at ~$16.32/month.
2. **Emergency Teardown:**
   - In the event of an unplanned charge spike, running `aws cloudformation delete-stack --stack-name roofshift-ai-production --region ap-southeast-2` terminates the EC2 instance, EBS volume, and VPC in one automated transaction.
