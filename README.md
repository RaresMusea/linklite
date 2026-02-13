# LinkLite

LinkLite is a Next.js + Prisma URL shortener project with:

- a web app/API (`/api/shorten`, health/readiness endpoints),
- PostgreSQL storage,
- background workers for domain/link enrichment,
- containerized runtime (Docker Compose),
- Kubernetes manifests for preprod deployment.

## Current Capabilities

- Short URL creation via `POST /api/shorten`.
- Validation and persistence with Prisma/PostgreSQL.
- Background enrichment workers:
  - domain enrichment (RDAP/WHOIS based metadata),
  - link enrichment (redirect probing + shortener inference).
- Operational endpoints:
  - `GET /api/app/healthz`
  - `GET /api/app/readyz`

## Stack

- Next.js 16 (App Router)
- TypeScript
- PostgreSQL 16
- Prisma ORM
- Vitest (unit, integration, UI)
- Docker + Docker Compose
- Kubernetes manifests (`deploy/k8s/preprod`)
- GitHub Actions (CI + image publish + deployment)

## Local Development

### Prerequisites

- Node.js 20+
- `pnpm` (via Corepack recommended)
- Docker Desktop (for local DB or full stack)
- `whois` CLI if you run domain enrichment locally outside containers

### Environment

Project includes environment files:

- `.env.local` for app/dev
- `.env.test` for tests
- `.env.docker` for Docker Compose

Core variables used by the app/services:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `PRISMA_CLIENT_ENGINE_TYPE`
- `APP_ENV`, `APP_VERSION`, `APP_COMMIT`
- `LOG_LEVEL`, `LOG_FORMAT`

### Option A: Run Full Stack with Docker Compose

This starts:

- `db` (Postgres),
- `migrate` (Prisma migrate deploy),
- `app` (Next.js production server),
- `domain-enrichment-worker`,
- `link-enrichment-worker`.

```bash
docker compose --env-file .env.docker up --build
```

App is exposed on `http://localhost:3000`.

### Option B: Run App Locally, DB in Docker

```bash
corepack enable
pnpm install --frozen-lockfile
docker compose --env-file .env.docker up -d db
pnpm prisma migrate deploy
pnpm prisma generate
pnpm dev
```

### Run Workers Locally

```bash
pnpm build:workers
pnpm start:domain-enrichment-worker-local
pnpm start:link-enrichment-worker-local
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm build:workers
pnpm start:domain-enrichment-worker
pnpm start:link-enrichment-worker

pnpm lint
pnpm typecheck

pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:ui
```

## Docker

The `Dockerfile` is multi-stage with dedicated targets:

- `run`: web app runtime image
- `worker-run`: worker runtime image
- `migrate`: migration job image

`docker-compose.yml` orchestrates these services and runs migrations before app/workers start.

## Kubernetes (Preprod)

Kubernetes manifests are under `deploy/k8s/preprod`:

- namespace/config/secrets
- app deployment + service + ingress
- domain/link worker deployments
- postgres service + statefulset

The GitHub Actions flow builds/pushes images to GHCR, then deploys to preprod via SSM and applies these manifests. Migrations are run as a Kubernetes Job during deployment.

### Manual Apply (if needed)

```bash
kubectl apply -f deploy/k8s/preprod/namespace.yaml
kubectl apply -f deploy/k8s/preprod/postgres/db-service.yaml
kubectl apply -f deploy/k8s/preprod/postgres/stateful-set.yaml
kubectl apply -f deploy/k8s/preprod/configmap.yaml
kubectl apply -f deploy/k8s/preprod/app-service.yaml
kubectl apply -f deploy/k8s/preprod/ingress.yaml
kubectl apply -f deploy/k8s/preprod/app-deployment.yaml
kubectl apply -f deploy/k8s/preprod/domain-enrichment-worker-deployment.yaml
kubectl apply -f deploy/k8s/preprod/link-enrichment-worker-deployment.yaml
```

## Health and Readiness

- Health: `GET /api/app/healthz`
- Readiness: `GET /api/app/readyz`

These are used by container/Kubernetes probes and deployment smoke checks.

## Links

- Preproduction app: [https://preprod.linklite.dev](https://preprod.linklite.dev)
- Preproduction health: [https://preprod.linklite.dev/api/app/healthz](https://preprod.linklite.dev/api/app/healthz)
- Preproduction readiness: [https://preprod.linklite.dev/api/app/readyz](https://preprod.linklite.dev/api/app/readyz)
