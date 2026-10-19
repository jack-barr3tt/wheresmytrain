#!/bin/sh
set -eu

DEPLOY_PATH="${DEPLOY_PATH:?DEPLOY_PATH is required}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
REGISTRY="${REGISTRY:-ghcr.io/jack-barr3tt}"

export REGISTRY IMAGE_TAG

cd "$DEPLOY_PATH"

docker compose -f deploy/docker-compose.yml pull
docker compose -f deploy/docker-compose.yml down --remove-orphans

# This project's `down` does not see a container started under an older
# project name. That container keeps the published host port, and the new
# one then fails with "address already in use".
for id in $(docker ps -aq); do
  image=$(docker inspect -f '{{.Config.Image}}' "$id" 2>/dev/null || true)
  case "$image" in
    "$REGISTRY/wheresmytrain:"*)
      docker rm -f "$id" >/dev/null
      ;;
  esac
done

docker compose -f deploy/docker-compose.yml up -d --remove-orphans
