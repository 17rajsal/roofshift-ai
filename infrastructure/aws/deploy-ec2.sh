#!/usr/bin/env bash
# Run from a reviewed checkout on Amazon Linux 2023 or Ubuntu 22.04/24.04.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
    echo "Cannot find docker-compose.yml in this checkout." >&2
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    if [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y docker.io git curl
    elif [ -f /etc/system-release ]; then
        sudo dnf install -y docker git curl
    else
        echo "Install Docker and the Docker Compose plugin before running this script." >&2
        exit 1
    fi
fi
sudo systemctl enable --now docker

if ! sudo docker compose version >/dev/null 2>&1; then
    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    sudo curl -fSL --retry 3 "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi

cd "$PROJECT_DIR"
sudo docker compose config --quiet
sudo docker compose up -d --build --wait --wait-timeout 300
curl -fsS --retry 10 --retry-delay 5 --retry-connrefused http://localhost/api/v1/health
echo
echo "RoofShift AI is running through the frontend proxy on port 80."
echo "Check service logs with: sudo docker compose logs --tail 100"
