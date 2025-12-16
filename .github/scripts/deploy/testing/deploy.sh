#!/usr/bin/env bash
set -euo pipefail

APP_ENV="testing"
AWS_REGION="eu-north-1"
APP_DIR="/opt/linklite"
IMAGE="ghcr.io/raresmusea/linklite:latest-testing"
GHCR_USER="raresmusea"

cd "$APP_DIR"

getp () {
  aws ssm get-parameter \
    --with-decryption \
    --region "$AWS_REGION" \
    --name "/linklite/${APP_ENV}/$1" \
    --query "Parameter.Value" \
    --output text
}

POSTGRES_USER="$(getp POSTGRES_USER)"
POSTGRES_PASSWORD="$(getp POSTGRES_PASSWORD)"
POSTGRES_DB="$(getp POSTGRES_DB)"
PRISMA_CLIENT_ENGINE_TYPE="$(getp PRISMA_CLIENT_ENGINE_TYPE)"
GHCR_TOKEN="$(getp GHCR_TOKEN)"

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public"

cat > .env <<EOF
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
DATABASE_URL=${DATABASE_URL}
PRISMA_CLIENT_ENGINE_TYPE=${PRISMA_CLIENT_ENGINE_TYPE}
EOF
chmod 600 .env

cat > docker-compose.testing.yml <<EOF
services:
  db:
    image: postgres:16
    restart: unless-stopped
    env_file:
      - .env
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]

  app:
    image: ${IMAGE}
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    command: >
      sh -lc "pnpm prisma migrate deploy && pnpm start"

volumes:
  pgdata:
EOF

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker pull "$IMAGE"

if docker compose version >/dev/null 2>&1; then
  sudo docker compose -f docker-compose.testing.yml up -d
else
  sudo docker-compose -f docker-compose.testing.yml up -d
fi
