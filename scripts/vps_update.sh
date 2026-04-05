#!/bin/sh
# Usage: vps_update.sh <ghcr_owner> [tag]
OWNER=${1:manthee1}
TAG=${2:-latest}
IMAGE=ghcr.io/${OWNER}/mipstream:${TAG}

echo "Pulling $IMAGE"
docker pull "$IMAGE"

echo "Stopping existing container (if any)"
docker rm -f mipstream || true

echo "Starting container"
docker run -d --name mipstream -p 80:80 --restart unless-stopped "$IMAGE"

echo "Done"
