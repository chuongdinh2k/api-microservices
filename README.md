# Ecommerce Microservices (NestJS)

Monorepo of NestJS microservices: **gateway**, **auth-service**, **user-service**, **product-service**, **order-service**, **payment-service**, **notification-service**. Each service has its own database. REST-first + async (RabbitMQ), dockerized, with controller/service/repository structure, env config, and centralized error handling.

## Rules (learning targets)

| Rule | Implementation |
|------|----------------|
| **Each service = own DB** | auth-db, user-db, product-db, order-db, payment-db, notification-db in `docker-compose.yml` |
| **Dockerized** | Each service has a `Dockerfile`; run stack with `docker-compose up` |
| **REST first** | All APIs are REST (JSON); no gRPC or GraphQL |
| **Controller / Service / Repo** | NestJS modules: Controller → Service → Repository; entities in `entities/` |
| **Env config** | `@nestjs/config` and `process.env`; `.env.example` at root |
| **Error handling** | `@ecommerce/shared`: `AllExceptionsFilter` + `AppException`, `NotFoundException`, etc. |
| **Service boundary** | Auth owns tokens; User owns users; Product owns products; Order owns orders and calls User/Product for validation |
| **DTO vs Entity** | DTOs in `dto/` (API contract, validation); Entities in `entities/` (TypeORM, DB shape) |
| **Centralized error format** | Same JSON shape: `statusCode`, `error`, `message`, `timestamp`, `path` |
| **Logging structure** | `@ecommerce/shared` `PinoLoggerService` (structured logs); exception filter logs errors |

## Stack

- **Runtime:** Node 20
- **Framework:** NestJS 10
- **ORM:** TypeORM
- **DB:** PostgreSQL 16 (one per service)
- **Validation:** class-validator + ValidationPipe
- **Auth:** JWT (auth-service); refresh tokens stored in auth DB
- **Async:** RabbitMQ (topic exchange `ecommerce.events`); order-service publishes `order.created`; payment-service and notification-service consume with **retry**, **ack**, **dead-letter queue**, **idempotency**

## Project structure

```
├── packages/
│   └── shared/                 # @ecommerce/shared
│       └── src/
│           ├── errors/         # AppException, AllExceptionsFilter, ErrorResponse
│           └── logger/         # PinoLoggerService
├── services/
│   ├── gateway/                 # API gateway (proxies to services)
│   ├── auth-service/            # login, register, refresh
│   ├── user-service/            # CRUD users (own DB)
│   ├── product-service/        # CRUD products (own DB)
│   └── order-service/           # Create orders, publish order.created (own DB)
│   ├── payment-service/        # Consumes order.created, payment + idempotency (own DB)
│   └── notification-service/   # Consumes order.created, send email (own DB)
├── docker-compose.yml
├── .env.example
└── package.json                 # npm workspaces
```

Each service follows:

- `src/main.ts` – bootstrap, global filter + ValidationPipe
- `src/app.module.ts` – ConfigModule, TypeOrmModule, feature modules
- `src/<domain>/` – controller, service, repository, entities, dto

## Makefile & infrastructure

- **`make infra-up`** – Start only infrastructure (PostgreSQL ×4 + Redis). Use this when running app services locally (`npm run start:dev -w <service>`). DBs: `localhost:5433`, `5434`, `5435`, `5436`; Redis: `localhost:6379`.
- **`make infra-down`** – Stop infra containers.
- **`make up`** – Start full stack (gateway + all services + DBs) in Docker.
- **`make down`** – Stop full stack.
- **`make build`** – Build all service images.
- **`make help`** – List all commands.

When using `make infra-up`, set `DATABASE_URL` per service (e.g. for auth-service: `DATABASE_URL=postgresql://auth:auth_secret@localhost:5433/auth_db`) or use a `.env` with the URLs from `.env.example` (use the same host/ports: 5433=auth, 5434=user, 5435=product, 5436=order).

## Quick start

### Prerequisites

- Node 20+, npm
- Docker & Docker Compose (for full stack)

### Local (without Docker)

1. Copy env and install:

   ```bash
   cp .env.example .env
   npm install
   ```

2. Build shared then run a service:

   ```bash
   npm run build -w @ecommerce/shared
   npm run start:dev -w user-service
   ```

   Or run multiple terminals (each service needs its own DB URL; use local Postgres or Docker-only DBs).

### Full stack with Docker

1. Create `.env` from `.env.example` (optional; defaults work for docker-compose).

2. Build and start:

   ```bash
   docker-compose up -d --build
   ```

3. Gateway: `http://localhost:3000`

   - `GET /health` – gateway health
   - `GET /auth/*`, `POST /auth/login`, etc. – auth-service
   - `GET /users/*`, `POST /users`, etc. – user-service
   - `GET /products/*`, `POST /products`, etc. – product-service
   - `GET /orders/*`, `POST /orders`, etc. – order-service

### Development with Docker (live reload)

To run the full stack with your local source mounted so code changes reload in the container:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Repo root is mounted at `/app`; each app service runs `nest start --watch`.
- Edit code locally; the service in the container will recompile and restart.
- Dependencies are installed once in a shared volume (`app_node_modules`); rebuild with `--build` if you change `package.json` or add workspaces.

Script: `npm run docker:dev` (see Scripts below).

### Example flow

1. Create a user (via gateway or directly on user-service):

   ```bash
   curl -X POST http://localhost:3000/users -H "Content-Type: application/json" \
     -d '{"email":"u@example.com","password":"secret123","name":"User"}'
   ```

2. Register / login (auth-service):

   ```bash
   curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" \
     -d '{"email":"u@example.com","password":"secret123","name":"User"}'
   ```

3. Create a product, then create an order (order-service will validate user and product). Order-service publishes `order.created` to RabbitMQ; **payment-service** and **notification-service** consume it (payment records in DB, notification logs “email” mock).

### Async flow (RabbitMQ)

- **Create order** → order-service saves order and publishes `OrderCreatedPayload` to exchange `ecommerce.events`, routing key `order.created`.
- **Payment-service** consumes from queue `payment.orders`: **idempotency** (by `eventId`), process payment, **ack**; on failure **retry** (republish with `x-retry-count`), after 3 retries **nack** → **dead-letter queue** `payment.dlq`.
- **Notification-service** consumes from queue `notification.orders`: same **idempotency**, **retry**, **ack**, **DLQ**; sends order confirmation (mock email log).

## Scripts

- `npm run build` – build all workspaces
- `npm run docker:up` – start stack
- `npm run docker:down` – stop stack
- `npm run docker:build` – build images
- `npm run docker:dev` – start stack with live reload (docker-compose + docker-compose.dev.yml)

Per service: `npm run start:dev -w <gateway|auth-service|user-service|product-service|order-service|payment-service|notification-service>`.

## Learning notes

- **Service boundary:** Auth does not store user profile; it stores only refresh tokens and calls user-service for login/register. Order-service does not duplicate product/user data; it calls product-service and user-service over HTTP and stores only order aggregates and line items (product id, quantity, unit price).
- **DTO vs Entity:** DTOs define the API (request/response) and validation. Entities define the database schema. Never expose entities directly in API responses; map to a response DTO or plain object (e.g. strip `passwordHash`, format `price`).
- **Centralized error format:** All services use `AllExceptionsFilter` from `@ecommerce/shared`, so clients always get the same error JSON shape.
- **Logging:** Use the shared logger or Nest `Logger`; the exception filter logs failed requests with context.
