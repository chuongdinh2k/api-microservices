# Kubernetes Deployment

This document describes how to run the ecommerce microservices on Kubernetes using the manifests in `k8s/`.

## Prerequisites

- A Kubernetes cluster (minikube, kind, k3d, or cloud: EKS, GKE, AKS)
- `kubectl` configured for the cluster
- (Optional) Ingress controller (e.g. [ingress-nginx](https://kubernetes.github.io/ingress-nginx/deploy/)) if you want to expose the gateway via Ingress

## Image tag convention

Images are named:

- **Local / default:** `ecommerce/<service>:latest` (e.g. `ecommerce/gateway:latest`)
- **With registry:** `${REGISTRY}/<service>:${TAG}` (e.g. `myregistry.io/me/gateway:v1.0.0`)

Services: `gateway`, `auth-service`, `user-service`, `product-service`, `order-service`, `payment-service`, `notification-service`.

## Build and push images

From the repo root:

```bash
# Build only (tag as ecommerce/<service>:latest)
./scripts/build-push-images.sh

# Tag for your registry
REGISTRY=myregistry.io/yourname ./scripts/build-push-images.sh

# Build and push
REGISTRY=myregistry.io/yourname PUSH=1 ./scripts/build-push-images.sh
```

Or use the Makefile:

```bash
make k8s-build        # build images
make k8s-push         # build and push (set REGISTRY and optionally TAG)
```

For local clusters (kind, minikube) you can load images without a registry:

- **kind:** `kind load docker-image ecommerce/gateway:latest` (repeat per image, or use a script)
- **minikube:** `eval $(minikube docker-env)` then run the build script so images are built in the minikube daemon

## Apply manifests

All resources go into the `ecommerce` namespace.

**Default (base):**

```bash
kubectl apply -k k8s/
# or
kubectl apply -k k8s/base
```

**Dev overlay:**

```bash
kubectl apply -k k8s/overlays/dev
```

**Prod overlay (set images in overlay or via CI):**

```bash
kubectl apply -k k8s/overlays/prod
```

To use a custom registry/tag with Kustomize without editing files:

```bash
cd k8s/overlays/dev
kustomize edit set image ecommerce/gateway=myregistry.io/me/gateway:v1.0.0
# repeat for other services, then:
kubectl apply -k .
```

## Secrets

The base includes a **template** Secret `ecommerce-secrets` with placeholder values. For a real deploy:

1. **Dev:** Replace with safe dev values and apply, or create the secret manually:

   ```bash
   kubectl create secret generic ecommerce-secrets -n ecommerce \
     --from-literal=JWT_SECRET=dev-jwt-secret \
     --from-literal=AUTH_DB_URL=postgresql://auth:auth_secret@auth-db:5432/auth_db \
     --from-literal=USER_DB_URL=postgresql://user:user_secret@user-db:5432/user_db \
     # ... (add all keys from k8s/base/secrets.yaml)
   ```

2. **Prod:** Use sealed-secrets, external-secrets, or your cloud secret manager; do not commit real secrets.

## Get the gateway URL

After applying and installing an Ingress controller:

- **Ingress (with controller):** If your controller assigns a host or LB IP, use that (e.g. `http://localhost` for many local setups, or the controller’s default host).
- **Port-forward (no Ingress):**

  ```bash
  kubectl port-forward -n ecommerce svc/gateway 3000:3000
  ```

  Then open `http://localhost:3000`.

Check Ingress:

```bash
kubectl get ingress -n ecommerce
```

## Teardown

```bash
kubectl delete -k k8s/
# or
kubectl delete namespace ecommerce
```

Deleting the namespace removes all resources and PVCs (data is removed unless you use reclaim policy Retain).

## Layout

- `k8s/base/` – namespace, ConfigMap, Secret, Postgres (x6), RabbitMQ, app Deployments/Services, Ingress
- `k8s/overlays/dev` – dev image tags / patches
- `k8s/overlays/prod` – prod image tags / patches
- `scripts/build-push-images.sh` – build and optionally push all service images

## Optional: ELK

ELK (Elasticsearch, Kibana, Filebeat) is not included in the base manifests. To run logging on k8s, you can add Deployments/Services for Elasticsearch and Kibana and a DaemonSet or Deployment for Filebeat in a separate namespace (e.g. `ecommerce-logging`) and point Filebeat at your app logs.
