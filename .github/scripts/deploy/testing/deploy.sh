#!/usr/bin/env bash
set -euo pipefail

APP_ENV="testing"
AWS_REGION="eu-north-1"
APP_DIR="/opt/linklite"
GHCR_USER="raresmusea"
URL="https://staging.linklite.dev/api/app/healthz"
LOG_LEVEL=INFO
LOG_FORMAT=pretty

: "${IMAGE_TAG:?IMAGE_TAG is required}"

IMAGE_WEB_BASE="ghcr.io/${GHCR_USER}/linklite-web"
IMAGE_WORKER_BASE="ghcr.io/${GHCR_USER}/linklite-worker"
IMAGE_MIGRATE_BASE="ghcr.io/${GHCR_USER}/linklite-migrate"

REMOTE_WEB="${IMAGE_WEB_BASE}:${IMAGE_TAG}"
REMOTE_WORKER="${IMAGE_WORKER_BASE}:${IMAGE_TAG}"
REMOTE_MIGRATE="${IMAGE_MIGRATE_BASE}:${IMAGE_TAG}"

APP_COMMIT_SHA="${IMAGE_TAG#testing-}"

LOCAL_WEB_CURRENT="${IMAGE_WEB_BASE}:testing-current"
LOCAL_WEB_PREVIOUS="${IMAGE_WEB_BASE}:testing-previous"

LOCAL_WORKER_CURRENT="${IMAGE_WORKER_BASE}:testing-current"
LOCAL_WORKER_PREVIOUS="${IMAGE_WORKER_BASE}:testing-previous"

LOCAL_MIGRATE_CURRENT="${IMAGE_MIGRATE_BASE}:testing-current"
LOCAL_MIGRATE_PREVIOUS="${IMAGE_MIGRATE_BASE}:testing-previous"

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
LOG_LEVEL=${LOG_LEVEL}
LOG_FORMAT=${LOG_FORMAT}
APP_ENV=${APP_ENV}
APP_VERSION=${IMAGE_TAG}
APP_COMMIT=${APP_COMMIT_SHA}
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
      interval: 5s
      timeout: 5s
      retries: 20

  migrate:
    image: ${LOCAL_MIGRATE_CURRENT}
    restart: "no"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy

  app:
    image: ${LOCAL_WEB_CURRENT}
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      migrate:
        condition: service_completed_successfully

  domain-enrichment-worker:
    image: ${LOCAL_WORKER_CURRENT}
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      migrate:
        condition: service_completed_successfully
    command: ["node", "dist/worker/domain_enrichment/domain_enrichment_worker.js"]

  link-enrichment-worker:
    image: ${LOCAL_WORKER_CURRENT}
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      migrate:
        condition: service_completed_successfully
    command: ["node", "dist/worker/link_enrichment/link_enrichment_worker.js"]

volumes:
  pgdata:
EOF

OLD_COMMIT=""
if curl -fsS --max-time 3 "$URL" >/tmp/healthz_old.json 2>/dev/null; then
  OLD_COMMIT=$(grep -oE '"commit"\s*:\s*"[^"]+"' /tmp/healthz_old.json | head -n1 | sed -E 's/.*"commit"\s*:\s*"([^"]+)".*/\1/')
fi
echo "Old commit: ${OLD_COMMIT:-<none>}"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

# --- images (new) ---
REMOTE_WEB="${IMAGE_WEB_BASE}:${IMAGE_TAG}"
REMOTE_WORKER="${IMAGE_WORKER_BASE}:${IMAGE_TAG}"
REMOTE_MIGRATE="${IMAGE_MIGRATE_BASE}:${IMAGE_TAG}"

echo "Pulling:"
echo "  $REMOTE_WEB"
echo "  $REMOTE_WORKER"
echo "  $REMOTE_MIGRATE"

docker pull "$REMOTE_WEB"
docker pull "$REMOTE_WORKER"
docker pull "$REMOTE_MIGRATE"

tag_roll () {
  local local_current="$1"
  local local_previous="$2"
  local remote_ref="$3"

  if sudo docker image inspect "$local_current" >/dev/null 2>&1; then
    CURR_ID=$(sudo docker image inspect "$local_current" --format '{{.Id}}')
    sudo docker tag "$CURR_ID" "$local_previous" || true
    echo "Tagged previous version: $local_previous"
  fi

  sudo docker tag "$remote_ref" "$local_current"
  echo "Tagged current version: $local_current"
}

tag_roll "$LOCAL_WEB_CURRENT" "$LOCAL_WEB_PREVIOUS" "$REMOTE_WEB"
tag_roll "$LOCAL_WORKER_CURRENT" "$LOCAL_WORKER_PREVIOUS" "$REMOTE_WORKER"
tag_roll "$LOCAL_MIGRATE_CURRENT" "$LOCAL_MIGRATE_PREVIOUS" "$REMOTE_MIGRATE"

# --- bring up db ---
sudo docker-compose -f docker-compose.testing.yml up -d db

# --- run migrations (new) ---
sudo docker-compose -f docker-compose.testing.yml run --rm migrate

# --- recreate app + workers (new) ---
sudo docker-compose -f docker-compose.testing.yml up -d --no-deps --force-recreate \
  app domain-enrichment-worker link-enrichment-worker

echo "Waiting for app to respond: $URL"
SMOKE_OK="0"

for i in {1..30}; do
  NEW_COMMIT=""

  if curl -fsS --max-time 3 "$URL" >/tmp/healthz_new.json 2>/dev/null; then
    NEW_COMMIT=$(grep -oE '"commit"\s*:\s*"[^"]+"' /tmp/healthz_new.json | head -n1 | sed -E 's/.*"commit"\s*:\s*"([^"]+)".*/\1/')

    if [ -z "$OLD_COMMIT" ]; then
      echo "Smoke check OK (reachable; no old commit)"
      SMOKE_OK="1"
      break
    fi

    if [ -n "$NEW_COMMIT" ] && [ "$NEW_COMMIT" != "$OLD_COMMIT" ]; then
      echo "Smoke check OK (commit changed: $OLD_COMMIT -> $NEW_COMMIT)"
      SMOKE_OK="1"
      break
    fi

    echo "Health reachable but commit SHA not changed yet (old=$OLD_COMMIT new=${NEW_COMMIT:-<missing>})"
  fi

  sleep 2
done

if [ "$SMOKE_OK" != "1" ]; then
  echo "Smoke check FAILED"
  curl -v --max-time 10 "$URL" || true
  echo "Fetching health payload (if reachable):"
  cat /tmp/healthz_new.json 2>/dev/null || true
  exit 1
fi

cleanup_repo () {
  local image_base="$1"
  local image_tag_keep="$2" # ex: testing-<sha>

  echo "Cleaning images for: $image_base (keep current/previous + $image_tag_keep)"

  KEEP_IDS=$(sudo docker images "$image_base" --format '{{.Tag}} {{.ID}}' \
    | awk '$1=="testing-current" || $1=="testing-previous" {print $2}' \
    | sort -u)

  sudo docker images "$image_base" --format '{{.Tag}}' \
    | grep '^testing-' \
    | while read -r TAG; do
        [ "$TAG" = "testing-current" ] && continue
        [ "$TAG" = "testing-previous" ] && continue
        [ "$TAG" = "$image_tag_keep" ] && continue

        REF="${image_base}:${TAG}"
        ID=$(sudo docker image inspect "$REF" --format '{{.Id}}' 2>/dev/null || true)

        if [ -n "$ID" ] && echo "$KEEP_IDS" | grep -q "$ID"; then
          continue
        fi

        echo "Removing $REF"
        sudo docker rmi -f "$REF" || true
      done
}

cleanup_repo "$IMAGE_WEB_BASE" "$IMAGE_TAG"
cleanup_repo "$IMAGE_WORKER_BASE" "$IMAGE_TAG"
cleanup_repo "$IMAGE_MIGRATE_BASE" "$IMAGE_TAG"

# Delete caches and system data for content older than 168h (~7 days)
sudo docker builder prune -af --filter "until=168h" || true
sudo docker system prune -af --filter "until=168h" || true