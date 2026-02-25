#!/usr/bin/env bash
# Build and optionally push Docker images for all ecommerce services.
# Tag convention: ${REGISTRY}/<service>:${TAG}
# Usage:
#   ./scripts/build-push-images.sh              # build only, tag as ecommerce/<service>:latest
#   REGISTRY=myregistry.io/me ./scripts/build-push-images.sh   # build and tag for registry
#   REGISTRY=myregistry.io/me PUSH=1 ./scripts/build-push-images.sh   # build and push

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REGISTRY="${REGISTRY:-ecommerce}"
TAG="${TAG:-latest}"
PUSH="${PUSH:-0}"

SERVICES=(gateway auth-service user-service product-service order-service payment-service notification-service)

for svc in "${SERVICES[@]}"; do
  echo "Building $svc..."
  docker build -t "${REGISTRY}/${svc}:${TAG}" -f "services/${svc}/Dockerfile" .
  if [[ "$PUSH" == "1" ]]; then
    echo "Pushing ${REGISTRY}/${svc}:${TAG}..."
    docker push "${REGISTRY}/${svc}:${TAG}"
  fi
done

echo "Done. Images tagged as ${REGISTRY}/<service>:${TAG}"
if [[ "$PUSH" != "1" ]]; then
  echo "To push, run with PUSH=1 (and set REGISTRY if needed)."
fi
