# RoofShift AI — AWS Cloud Security & IAM Architecture Review

**Date of Record:** October 11, 2026  
**Security Standard:** AWS Well-Architected Framework — Security Pillar  
**Repository Branch:** `feature/ai-model-training-integration`  
**Classification:** Internal Engineering Review (Zero Secrets)

---

## 1. Network Boundary & Ingress Controls

### 1.1 Security Group Configuration
* **Attached Security Group:** `sg-0faf362d97e068667` (`roofshift-ai-production-RoofShiftSecurityGroup-vsmsj3Dyej8c`)
* **Inbound Rules:**
  * Port 80 (TCP): `0.0.0.0/0` (Public web traffic to Nginx reverse proxy).
  * Port 22 (SSH): **CLOSED**. Zero public SSH exposure.
  * Port 8000 (FastAPI): **CLOSED to public**. Backend is accessible solely via internal Docker network bridge behind Nginx.
* **Outbound Egress Rules:**
  * `0.0.0.0/0`: Outbound HTTPS (TCP 443) enabled to communicate with NASA POWER, Open-Meteo, OpenStreetMap Overpass API, and AWS SSM / S3 endpoints.

### 1.2 Remote Administration via Outbound-Only SSM
* Because port 22 is closed and the instance has no EC2 keypair, remote access is established exclusively via **AWS Systems Manager Session Manager**.
* Session Manager establishes an outbound TLS/WSS tunnel from the instance `amazon-ssm-agent` to the AWS SSM endpoint. No inbound ports are opened on the firewall, eliminating the attack surface of public SSH brute-forcing.

---

## 2. Identity and Access Management (IAM)

### 2.1 Instance Profile Credentialing
* **No Hardcoded Credentials:** RoofShift AI prohibits static `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env` or Docker files.
* **Temporary Role Credentials:** The EC2 instance assumes an IAM Instance Profile (`RoofShiftEC2InstanceProfile`). Boto3 automatically retrieves temporary rotating STS credentials via IMDSv2.

### 2.2 Instance Metadata Service v2 (IMDSv2) Hardening
* The CloudFormation template enforces **IMDSv2**:
  ```yaml
  MetadataOptions:
    HttpTokens: required
  ```
* This requirement enforces session tokens for all metadata requests, neutralizing Server-Side Request Forgery (SSRF) attack vectors that attempt to harvest IAM role tokens.

### 2.3 Least-Privilege IAM Policy Definition
The proposed `RoofShiftEC2InstanceRole` contains only the minimal permissions required:
1. `AmazonSSMManagedInstanceCore` (AWS Managed Policy for Systems Manager agent registration and command execution).
2. Service-specific least-privilege policy for S3 and CloudWatch:
   * S3: `s3:PutObject`, `s3:GetObject` scoped strictly to `arn:aws:s3:::roofshift-reports-191611156592-syd/*`.
   * CloudWatch: `logs:CreateLogStream`, `logs:PutLogEvents` scoped strictly to `arn:aws:logs:ap-southeast-2:191611156592:log-group:/roofshift/production/backend:*`.

---

## 3. Data Storage & Encryption

### 3.1 Amazon S3 Bucket Hardening
* **Public Access Block:** `BlockPublicAcls=true`, `IgnorePublicAcls=true`, `BlockPublicPolicy=true`, `RestrictPublicBuckets=true`.
* **Server-Side Encryption:** Enforced default encryption with Amazon S3 managed keys (`AES256`).
* **Presigned URLs:** Download links for audit-ready PDF dossiers are issued as temporary presigned URLs expiring after 3600 seconds (1 hour).

### 3.2 Local Persistence Security
* The SQLite database file resides on the root EBS volume `/dev/xvda`.
* EBS volume uses gp3 with standard AWS-managed encryption.

---

## 4. Observability & Log Sanitization

* CloudWatch logging and stdout emission explicitly sanitize:
  * Authorization headers (`Bearer ***`)
  * Database connection strings
  * Raw uploaded binary images (only hashes and dimensions logged)
  * File paths containing potential username metadata
