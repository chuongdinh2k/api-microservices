# Ecommerce microservices - Makefile
# Run infrastructure (DBs + Redis) for local dev: make infra-up
# Run full stack in Docker: make up

COMPOSE      = docker compose
COMPOSE_INFRA = docker compose -f docker-compose.infra.yml

.PHONY: help infra-up infra-down infra-logs infra-ps up down build build-infra logs ps clean k8s-up k8s-down k8s-build k8s-push k8s-apply

help:
	@echo "Infrastructure (DBs + Redis only, for local dev):"
	@echo "  make infra-up     Start DBs (auth, user, product, order, payment, notification), Redis, RabbitMQ"
	@echo "  make infra-down   Stop and remove infra containers"
	@echo "  make infra-logs   Follow infra logs"
	@echo "  make infra-ps     List infra containers"
	@echo ""
	@echo "Full stack (apps + infra in Docker):"
	@echo "  make up           Start gateway + all services + DBs"
	@echo "  make down         Stop full stack"
	@echo "  make build        Build all service images"
	@echo "  make logs         Follow full stack logs"
	@echo "  make ps           List full stack containers"
	@echo ""
	@echo "Kubernetes (see docs/k8s.md):"
	@echo "  make k8s-build    Build all service images for k8s (ecommerce/<service>:latest)"
	@echo "  make k8s-push     Build and push images (set REGISTRY, optional TAG, PUSH=1)"
	@echo "  make k8s-apply    Apply k8s manifests (default: k8s/; set KUSTOMIZE_OVERLAY for overlays)"
	@echo "  make k8s-down     Delete k8s resources (same overlay as k8s-apply)"
	@echo ""
	@echo "Other:"
	@echo "  make clean        Remove infra volumes (data)"

# --- Infrastructure only (databases + Redis) ---
infra-up:
	$(COMPOSE_INFRA) up -d
	@echo "Infrastructure up. DBs: 5433-5438  Redis: 6379  RabbitMQ: 5672 (management: 15672)"

infra-down:
	$(COMPOSE_INFRA) down

infra-logs:
	$(COMPOSE_INFRA) logs -f

infra-ps:
	$(COMPOSE_INFRA) ps

# --- Full stack ---
up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

# --- Clean infra volumes (destroys DB/Redis data) ---
clean:
	$(COMPOSE_INFRA) down -v
	@echo "Infra volumes removed."

# --- Kubernetes ---
KUSTOMIZE_OVERLAY ?= ""
k8s-build:
	./scripts/build-push-images.sh
k8s-push:
	REGISTRY=$${REGISTRY:-ecommerce} PUSH=1 ./scripts/build-push-images.sh
k8s-apply:
ifneq ($(KUSTOMIZE_OVERLAY),)
	kubectl apply -k k8s/overlays/$(KUSTOMIZE_OVERLAY)
else
	kubectl apply -k k8s/
endif
k8s-down:
ifneq ($(KUSTOMIZE_OVERLAY),)
	kubectl delete -k k8s/overlays/$(KUSTOMIZE_OVERLAY) --ignore-not-found
else
	kubectl delete -k k8s/ --ignore-not-found
endif
