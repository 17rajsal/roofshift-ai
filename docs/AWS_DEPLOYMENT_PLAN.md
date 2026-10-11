# RoofShift AI — AWS Production Deployment & Execution Plan

**Date of Record:** October 11, 2026  
**Target Environment:** AWS EC2 Production (`i-0803fc68806367b46`, Public IP `54.252.232.247`)  
**Deployment Topology:** Option A — Full-Stack Single-Host (React SPA + Nginx Reverse Proxy + FastAPI Backend + SQLite on EBS)  
**Deployment Source:** Branch `feature/ai-model-training-integration` (Commit `549faee`)  
**Baseline Being Upgraded:** Branch `integration/master-delivery` (Commit `458de35`)

---

## 1. Architectural Topology Justification

RoofShift AI deploys as an integrated full-stack application on the existing EC2 `t3.micro` instance:
* **Same-Origin Operations:** Frontend calls `/api/v1/*` via relative paths. Nginx proxies requests to the internal FastAPI container on port 8000. Eliminates CORS failures, TLS certificate mismatches, and mixed-content blocking.
* **Persistent Local State:** Preserves the SQLite database on the 30 GB EBS gp3 volume (`vol-07406facd5e8ece12`).
* **Zero Additional Infrastructure Spend:** Reuses the existing running instance, requiring $0.00 in new compute provisioning.

---

## 2. Memory & Resource Safeguards on `t3.micro`

A `t3.micro` instance provides 1 GB of physical RAM. To guarantee memory safety during Docker container building and runtime Python execution:
1. **Swap Space:** 2.0 GB swap (`/swapfile`) was pre-configured by the CloudFormation bootstrap script.
2. **Build Isolation:** Docker builds utilize multi-stage layers and wheel caching to prevent compiler memory spikes.
3. **Model Runtime Footprint:**
   * XGBoost model artifact is lightweight (~500 KB).
   * MobileNetV3-Small weights artifact is compact (6.2 MB), using quantized PyTorch inference mode (`torch.no_grad()`).

---

## 3. End-to-End Deployment Execution Phases

### Phase 1: IAM Role & Remote Management Enablement (Pending User Approval)
1. Create `RoofShiftEC2InstanceRole` with `AmazonSSMManagedInstanceCore`.
2. Create `RoofShiftEC2InstanceProfile`.
3. Associate instance profile with EC2 `i-0803fc68806367b46`.
4. Verify SSM Agent registration via `aws ssm describe-instance-information`.

### Phase 2: Host Backup & Diagnostics
1. Execute SSM command to create point-in-time snapshot of `/opt/roofshift-ai/backend/roofshift.db` and `/opt/roofshift-ai/backend/generated_reports`.
2. Inspect disk capacity (`df -h`) and memory (`free -m`).

### Phase 3: Code Deployment & Container Rebuild
1. Pull latest commits from branch `feature/ai-model-training-integration`.
2. Update `.env` to set `AWS_REGION=ap-southeast-2` and `AWS_ENABLED=true` (when S3/CloudWatch approved).
3. Execute `docker compose up -d --build`.

### Phase 4: Production Verification
1. Verify `/api/v1/health` returns HTTP 200.
2. Verify `/api/v1/solar-intelligence/regions` returns all 36 Indian states (no longer 404).
3. Verify `/api/v1/solar-ml/dated-forecast` returns live Open-Meteo NWP forecasts (no longer 404).
4. Verify root URL `http://54.252.232.247/` renders the React UI cleanly.
