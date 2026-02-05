# Ecommerce Microservices (NestJS)

Monorepo of NestJS microservices: **gateway**, **auth-service**, **user-service**, **product-service**, **order-service**. Each service has its own database. REST-first, dockerized, with controller/service/repository structure, env config, and centralized error handling.

## Rules (learning targets)

| Rule | Implementation |
|------|----------------|
| **Each service = own DB** | auth-db, user-db, product-db, order-db in `docker-compose.yml` |
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
│   └── order-service/           # Create orders, validate user/product via HTTP (own DB)
├── docker-compose.yml
├── .env.example
└── package.json                 # npm workspaces
```

Each service follows:

- `src/main.ts` – bootstrap, global filter + ValidationPipe
- `src/app.module.ts` – ConfigModule, TypeOrmModule, feature modules
- `src/<domain>/` – controller, service, repository, entities, dto

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

3. Create a product, then create an order (order-service will validate user and product).

## Scripts

- `npm run build` – build all workspaces
- `npm run docker:up` – start stack
- `npm run docker:down` – stop stack
- `npm run docker:build` – build images

Per service: `npm run start:dev -w <gateway|auth-service|user-service|product-service|order-service>`.

## Learning notes

- **Service boundary:** Auth does not store user profile; it stores only refresh tokens and calls user-service for login/register. Order-service does not duplicate product/user data; it calls product-service and user-service over HTTP and stores only order aggregates and line items (product id, quantity, unit price).
- **DTO vs Entity:** DTOs define the API (request/response) and validation. Entities define the database schema. Never expose entities directly in API responses; map to a response DTO or plain object (e.g. strip `passwordHash`, format `price`).
- **Centralized error format:** All services use `AllExceptionsFilter` from `@ecommerce/shared`, so clients always get the same error JSON shape.
- **Logging:** Use the shared logger or Nest `Logger`; the exception filter logs failed requests with context.
