# RoofShift AI — AWS Production Rollback & Disaster Recovery Plan

**Date of Record:** October 11, 2026  
**Target Environment:** AWS EC2 Production (`i-0803fc68806367b46`, Public IP `54.252.232.247`)  
**Active Baseline Commit:** `458de35485ddc7b93461e50423def37a81e4ef82` (Branch `integration/master-delivery`)  
**Deployment Candidate Commit:** `549faee` (Branch `feature/ai-model-training-integration`)

---

## 1. Pre-Deployment Data Backup Procedure

Before executing any code update or Docker build on the EC2 host:

```bash
# 1. Create timestamped backup directory on the host EBS volume
BACKUP_DIR="/opt/roofshift-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 2. Consistent SQLite database backup using SQLite online backup or copy
if [ -f "/opt/roofshift-ai/backend/roofshift.db" ]; then
    cp "/opt/roofshift-ai/backend/roofshift.db" "$BACKUP_DIR/roofshift.db"
elif [ -f "/opt/roofshift-ai/roofshift.db" ]; then
    cp "/opt/roofshift-ai/roofshift.db" "$BACKUP_DIR/roofshift.db"
fi

# 3. Backup generated PDF reports and uploaded assets
if [ -d "/opt/roofshift-ai/backend/generated_reports" ]; then
    cp -r "/opt/roofshift-ai/backend/generated_reports" "$BACKUP_DIR/"
fi

# 4. Record currently running container IDs and image tags
docker ps --format "{{.ID}}: {{.Image}} ({{.Status}})" > "$BACKUP_DIR/running_containers.txt"
git -C /opt/roofshift-ai rev-parse HEAD > "$BACKUP_DIR/git_commit.txt"

echo "Backup complete at $BACKUP_DIR"
```

---

## 2. Fast Rollback Procedure (Code & Containers)

If the deployment exhibits runtime crashes, memory exhaustion on `t3.micro`, or unexpected regression:

```bash
cd /opt/roofshift-ai

# Step 1: Revert Git repository to the previous working commit
git checkout 458de35485ddc7b93461e50423def37a81e4ef82

# Step 2: Restore database if schema changes were applied
if [ -f "$BACKUP_DIR/roofshift.db" ]; then
    cp "$BACKUP_DIR/roofshift.db" backend/roofshift.db
fi

# Step 3: Rebuild and restart containers
docker compose down
docker compose up -d --build

# Step 4: Verify health
curl -fsS http://localhost/api/v1/health
```

**Estimated Rollback Time:** Under 3 minutes.

---

## 3. AWS Infrastructure Rollback Procedure

If provisioned AWS resources must be dismantled without affecting the core web server:

### 3.1 IAM Instance Profile Rollback
```bash
# 1. Identify association ID
ASSOC_ID=$(aws ec2 describe-iam-instance-profile-associations \
  --filters "Name=instance-id,Values=i-0803fc68806367b46" \
  --region ap-southeast-2 \
  --query "IamInstanceProfileAssociations[0].AssociationId" \
  --output text)

# 2. Disassociate instance profile (zero instance downtime)
aws ec2 disassociate-iam-instance-profile --association-id "$ASSOC_ID" --region ap-southeast-2

# 3. Clean up IAM profile and role
aws iam remove-role-from-instance-profile --instance-profile-name RoofShiftEC2InstanceProfile --role-name RoofShiftEC2InstanceRole
aws iam delete-instance-profile --instance-profile-name RoofShiftEC2InstanceProfile
aws iam detach-role-policy --role-name RoofShiftEC2InstanceRole --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam delete-role --role-name RoofShiftEC2InstanceRole
```

### 3.2 Amazon S3 Bucket Rollback
```bash
# Empty and delete the reports bucket
aws s3 rm s3://roofshift-reports-191611156592-syd --recursive --region ap-southeast-2
aws s3api delete-bucket --bucket roofshift-reports-191611156592-syd --region ap-southeast-2
```

### 3.3 Amazon CloudWatch Log Group Rollback
```bash
aws logs delete-log-group --log-group-name /roofshift/production/backend --region ap-southeast-2
```
