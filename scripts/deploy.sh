#!/bin/sh
set -eu

DEPLOY_PATH="${DEPLOY_PATH:?DEPLOY_PATH is required}"
IMAGE_TAG="${IMAGE_TAG:?IMAGE_TAG is required}"
REGISTRY="${REGISTRY:-ghcr.io/jack-barr3tt}"

export REGISTRY IMAGE_TAG

cd "$DEPLOY_PATH"

docker compose -f deploy/docker-compose.yml pull

# Drop this bot's container from the old shared "deploy" project so it
# releases the host port. Do not `compose down`: deploy_default still has
# the other apps attached.
old=$(docker ps -aq \
  --filter label=com.docker.compose.project=deploy \
  --filter label=com.docker.compose.service=bot)
for id in $old; do
  image=$(docker inspect -f '{{.Config.Image}}' "$id" 2>/dev/null || true)
  case "$image" in
    "$REGISTRY/wheresmytrain:"*)
      docker rm -f "$id" >/dev/null
      ;;
  esac
done

docker compose -f deploy/docker-compose.yml up -d
