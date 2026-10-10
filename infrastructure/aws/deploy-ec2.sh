#!/usr/bin/env bash
# ==============================================================================
# RoofShift AI — AWS EC2 One-Click Deployment Script
# Team DRX — Environmental Hacks 2026 (WeMakeDevs x AWS)
# Supported OS: Amazon Linux 2023, Ubuntu 22.04 LTS, Ubuntu 24.04 LTS
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting RoofShift AI Deployment on AWS EC2"
echo "=========================================================="

# 1. Update system packages
if [ -f /etc/debian_version ]; then
    echo "--> Detected Debian/Ubuntu system"
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose git curl
elif [ -f /etc/system-release ]; then
    echo "--> Detected Amazon Linux / RHEL system"
    sudo dnf update -y
    sudo dnf install -y docker git
    # Install docker compose plugin
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

# 2. Start and enable Docker service
sudo systemctl enable --now docker
sudo usermod -aG docker $USER || true

# 3. Create deployment directory
DEPLOY_DIR="/opt/roofshift-ai"
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR

# 4. Copy or clone project files
echo "--> Setting up application files in $DEPLOY_DIR"
cd $DEPLOY_DIR

# 5. Build and launch containers
echo "--> Building and running RoofShift AI containers with Docker Compose..."
docker compose up -d --build

# 6. Verify health
echo "--> Verifying application health..."
sleep 10
curl -f http://localhost:8000/api/v1/health || {
    echo "Backend health check failed. Viewing container logs..."
    docker compose logs backend
    exit 1
}

echo "=========================================================="
echo " RoofShift AI is successfully running on AWS!"
echo " Frontend Web: http://$(curl -s http://checkip.amazonaws.com)"
echo " API Docs:     http://$(curl -s http://checkip.amazonaws.com):8000/docs"
echo " Health Check: http://$(curl -s http://checkip.amazonaws.com):8000/api/v1/health"
echo "=========================================================="
