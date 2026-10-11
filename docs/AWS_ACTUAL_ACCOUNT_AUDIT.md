# RoofShift AI — AWS Actual Account & Infrastructure Audit

**Audit Date:** October 11, 2026  
**Auditor:** Principal AWS Solutions Architect / SRE  
**AWS Account ID:** `191611156592`  
**AWS Region:** `ap-southeast-2` (Sydney)  
**Authentication Identity:** `arn:aws:sts::191611156592:assumed-role/AccountFullAccessRole/34083478-b0c1-705c-e36b-53a14b641b84`  
**CLI Profile:** `roofshift-ai`

---

## 1. Executive Summary

A comprehensive, real-time read-only inspection of AWS Account `191611156592` in region `ap-southeast-2` was conducted using the AWS CLI and `boto3`.

### Critical Findings:
1. **Existing Running Compute:** An EC2 instance `i-0803fc68806367b46` (`t3.micro`) is running in a custom VPC (`vpc-0161efd6d7df44eb8`) created via CloudFormation stack `roofshift-ai-production`.
2. **Public Reachability:** Port 80 is publicly reachable at `http://54.252.232.247/`. The frontend SPA and basic `/api/v1/health` and `/api/v1/projects` endpoints respond with HTTP 200.
3. **Outdated Deployed Code:** The deployed container was launched from branch `integration/master-delivery` (commit `458de35485ddc7b93461e50423def37a81e4ef82`). It lacks the newer India Solar Intelligence Map routes and dated Solar ML forecasting endpoints, causing HTTP 404 responses for `/api/v1/solar-intelligence/regions` and `/api/v1/solar-ml/model-info`.
4. **Administration Blockers:**
   - The instance has **no EC2 key pair** (`KeyName: None`).
   - The instance has **no attached IAM instance profile** (`IamInstanceProfile: None`).
   - The security group **does not allow port 22 SSH** (only port 80 is open to `0.0.0.0/0`).
   - Because no IAM role is attached, the preinstalled `amazon-ssm-agent` cannot authenticate to AWS Systems Manager. Consequently, SSM Managed Instance listing is currently empty.
5. **AWS Service Cloud State:**
   - S3: Zero buckets deployed. Backend currently uses local disk fallback (`/app/generated_reports`).
   - CloudWatch: Zero log groups deployed in `ap-southeast-2`. Backend logs to console stdout/stderr.
   - Lambda: Zero functions deployed in `ap-southeast-2`.
   - EventBridge: Zero rules deployed in `ap-southeast-2`.
   - Amazon Location: Zero place indexes deployed in `ap-southeast-2`.
   - SSM Parameter Store: Zero parameters deployed in `ap-southeast-2`.
   - AWS Amplify: Zero applications deployed in `ap-southeast-2`.
   - AWS Budgets: No active AWS Budgets configured via AWS API.
6. **Financial Status:**
   - Month-to-date Unblended Cost (Oct 1–11, 2026): **$0.00 USD**.
   - `t3.micro` and 30 GB EBS gp3 volume are currently within Free Tier limits.

---

## 2. Detailed Service-by-Service Audit Matrix

| Service | Exists in AWS? | Configured in Code? | Operational in AWS? | Actually Used by RoofShift? | Last Verified Activity | Evidence of Real Execution | Active Fallback in Production | Monthly Cost |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AWS CloudFormation** | Yes (`roofshift-ai-production`) | Yes (`aws/cloudformation/`) | Yes | Yes (Provisions VPC, Subnet, IGW, SG, EC2) | 2026-10-10 18:51 UTC | `describe_stacks` returns `CREATE_COMPLETE` | None | $0.00 |
| **Amazon EC2** | Yes (`i-0803fc68806367b46`) | Yes (`deploy-ec2.sh`) | Yes | Yes (Hosts Docker containers on port 80) | Running (Health checks OK) | HTTP 200 on `http://54.252.232.247/` | Local Dev Server | ~$0.00 (Free tier) |
| **Amazon VPC & Networking** | Yes (`vpc-0161efd6d7df44eb8`) | Yes (CFN) | Yes | Yes (Subnet `10.0.1.0/24`, IGW attached) | 2026-10-10 18:36 UTC | `describe_vpcs` / `describe_subnets` | Default VPC | $0.00 |
| **Amazon EBS** | Yes (`vol-07406facd5e8ece12`, 30GB gp3) | Yes (CFN) | Yes | Yes (Root OS volume `/dev/xvda`) | Attached & in-use | `describe_volumes` returns `in-use` | None | $0.00 (30GB Free Tier) |
| **AWS IAM (Instance Role)** | **No** (None created/attached) | Yes (`aws/iam/*.json`) | **No** | **No** | None | `IamInstanceProfile` is `None` on instance | Local OS permissions | $0.00 |
| **AWS Systems Manager (SSM)** | **No** (0 managed instances) | Yes (`param_store.py`) | **No** | **No** | None | `describe_instance_information` returns `[]` | Local `.env` | $0.00 |
| **Amazon S3** | **No** (0 buckets in account) | Yes (`s3_adapter.py`) | **No** | **No** | None | `s3.list_buckets()` returns `[]` | Local disk (`/app/generated_reports`) | $0.00 |
| **Amazon CloudWatch** | **No** (0 log groups) | Yes (`monitoring.py`) | **No** | **No** | None | `logs.describe_log_groups()` returns `[]` | Docker console logging (stdout) | $0.00 |
| **AWS Lambda** | **No** (0 functions) | Yes (`solar_processor.py`) | **No** | **No** | None | `lambda.list_functions()` returns `[]` | In-process Python FastAPI engine | $0.00 |
| **Amazon EventBridge** | **No** (0 rules) | Yes (`schedule_rule.json`)| **No** | **No** | None | `events.list_rules()` returns `[]` | On-demand cache invalidation | $0.00 |
| **Amazon Location Service** | **No** (0 place indexes) | Yes (`location_adapter.py`)| **No** | **No** | None | `location.list_place_indexes()` returns `[]` | OSM Nominatim + Gazetteer | $0.00 |
| **AWS Amplify Hosting** | **No** (0 apps) | Yes (`amplify.yml`) | **No** | **No** | None | `amplify.list_apps()` returns `[]` | EC2 Nginx Reverse Proxy | $0.00 |
| **AWS Budgets** | **No** | Yes (`budget_alarm.json`)| **No** | **No** | None | `describe_budgets` returns empty | None | $0.00 |

---

## 3. Discrepancy & Gap Analysis

### 3.1 Region Mismatch
- **Actual Infrastructure Region:** `ap-southeast-2` (Sydney, Australia)
- **Deployed Backend Configuration:** Reports `AWS_REGION=ap-south-1` in `/api/v1/system/integrations`.
- **Action Required:** Align backend configuration to `ap-southeast-2` to match the EC2 host and provisioned VPC.

### 3.2 Misleading Dashboard Status
- The `/api/v1/system/integrations` endpoint reports `status: "Configured / Standalone Handler Ready"` or `"Local Fallback Active"`.
- However, it creates boto3 clients without proving connectivity, and labels services in a manner that could be misread as partially deployed cloud resources.
- **Action Required:** Update `system.py` to expose truthful execution statuses (`NOT_CONFIGURED`, `FALLBACK_ACTIVE`, `VERIFIED_OPERATIONAL`).

### 3.3 Remote Access & Instance Management Gap
- The EC2 instance `i-0803fc68806367b46` runs Amazon Linux 2023.
- `amazon-ssm-agent` is preinstalled in AL2023, but inactive for remote management because no IAM instance profile with `AmazonSSMManagedInstanceCore` is attached to the instance.
- **Action Required:** Attach a dedicated least-privilege IAM instance role to allow non-disruptive, zero-port-opening AWS Systems Manager Session Manager access.
