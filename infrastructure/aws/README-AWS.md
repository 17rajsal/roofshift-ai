# RoofShift AI — AWS deployment

The reviewed application can run as the existing Nginx frontend and FastAPI backend containers on EC2. Engine changes should be integrated from `codex/advanced-engines` before choosing the deployment ref; see `ENGINE_HANDOFF.md`.

## Local container verification

```bash
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 300
curl -f http://localhost/api/v1/health
```

Open `http://localhost` and verify projects, maps, optimization, and PDF downloads. API traffic uses the same-origin Nginx `/api/` proxy. The backend's published port is restricted to loopback for local diagnostics; no public port 8000 ingress is required. CSV requests are allowed up to 10 MB at the proxy, and long-running engine requests have a 180-second proxy timeout.

## EC2 checkout deployment

Use Amazon Linux 2023 or Ubuntu 22.04/24.04 with a reviewed checkout. The deployment script locates that checkout rather than assuming a separately populated `/opt/roofshift-ai` directory.

```bash
chmod +x infrastructure/aws/deploy-ec2.sh
./infrastructure/aws/deploy-ec2.sh
```

The script installs Docker and Compose when missing, validates Compose, starts both services, waits for container health, and checks the public application proxy. It uses `sudo docker` so a freshly changed group membership is unnecessary.

## CloudFormation bootstrap

`cloudformation-template.yaml` provisions a VPC, public subnet, routes, security group, and x86 EC2 instance using the matching Amazon Linux 2023 x86 AMI. Supply an HTTPS Git repository reachable without private credentials and a reviewed branch or tag. Do not put credentials in the repository URL or template parameters.

```bash
aws cloudformation create-stack \
  --stack-name roofshift-ai-stack \
  --template-body file://infrastructure/aws/cloudformation-template.yaml \
  --parameters \
    ParameterKey=InstanceType,ParameterValue=t3.small \
    ParameterKey=RepositoryUrl,ParameterValue=https://github.com/YOUR-ORG/YOUR-REPO.git \
    ParameterKey=RepositoryRef,ParameterValue=YOUR-REVIEWED-BRANCH
```

Bootstrap clones the selected ref, builds and launches the application, and checks health through Nginx. Bootstrap output is recorded at `/var/log/roofshift-bootstrap.log`. Stack creation confirms infrastructure provisioning; verify application health and the browser journey separately after startup. This template configures HTTP on port 80. HTTPS requires an additional TLS termination configuration.

## Durable application data

The existing named volumes are retained:

- `backend_data` mounts at `/data`. SQLite uses `/data/roofshift.db`, and meter uploads use `/data/uploaded_demand`.
- `reports_data` retains its mount at `/app/generated_reports`.

Previously `backend_data` mounted on `/app`, covering application code. The new mount exposes the same volume's existing database file at `/data/roofshift.db` while allowing updated image code to run. Do not delete or rename the existing volumes when updating. Back up the database and reports before a release. Volumes persist through container updates, but the EC2 root disk is configured for deletion when the instance is terminated; external backups remain necessary for that operation. See the [Docker volume documentation](https://docs.docker.com/engine/storage/volumes/).

Container build contexts exclude local databases, reports, uploaded meter files, dependency folders, and environment files. Optional cloud services still use the project's existing settings and fallback adapters; this stack does not provision every advertised integration.

## Separately hosted frontend

For Amplify or another frontend host, set `VITE_API_BASE_URL=https://YOUR-API-HOST/api/v1` before building. The API must allow that frontend's origin. Relative report download URLs resolve against the configured API host. Configure SPA rewrites to serve `index.html` for frontend routes. Same-origin Nginx and local Vite deployments need no frontend API environment variable.

## Validation and costs

Check Compose configuration and frontend/backend tests before release. Validate the template with `aws cloudformation validate-template` in the target account before creating a stack. Local YAML checks do not verify AWS account permissions, regional availability, bootstrap network access, or a successful deployment.

Estimate EC2, EBS, transfer, and any optional services for your region and account in the [AWS Pricing Calculator](https://calculator.aws/). No free-tier eligibility or fixed monthly cost is assumed here. No cloud resources are created by the local application checks.
