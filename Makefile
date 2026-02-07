# Ecommerce microservices - Makefile
# Run infrastructure (DBs + Redis) for local dev: make infra-up
# Run full stack in Docker: make up

COMPOSE      = docker compose
COMPOSE_INFRA = docker compose -f docker-compose.infra.yml

.PHONY: help infra-up infra-down infra-logs infra-ps up down build build-infra logs ps clean

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
