#!/usr/bin/env bash
set -euo pipefail
export KUBECONFIG=/home/ssm-user/.kube/config

SSM_ENV="testing"
NAMESPACE="linklite-preprod"
APP_ENV="preprod"
AWS_REGION="eu-north-1"

: "${IMAGE_TAG:?IMAGE_TAG is required}"
: "${HEAD_SHA:?HEAD_SHA is required}"

GHCR_USER="raresmusea"

IMAGE_WEB_BASE="ghcr.io/${GHCR_USER}/linklite-app"
IMAGE_WORKER_BASE="ghcr.io/${GHCR_USER}/linklite-worker"
IMAGE_MIGRATE_BASE="ghcr.io/${GHCR_USER}/linklite-migrate"

REMOTE_WEB="${IMAGE_WEB_BASE}:${IMAGE_TAG}"
REMOTE_WORKER="${IMAGE_WORKER_BASE}:${IMAGE_TAG}"
REMOTE_MIGRATE="${IMAGE_MIGRATE_BASE}:${IMAGE_TAG}"


APP_DEPLOYMENT="linklite-app"
WORKER_DOMAIN_DEPLOYMENT="linklite-domain-enrichment-worker"
WORKER_LINK_DEPLOYMENT="linklite-link-enrichment-worker"

BASE_URL="https://preprod.linklite.dev"
HEALTH_PROBE_ENDPOINT="${BASE_URL}/api/app/healthz"
HEALTH_URL="${BASE_URL}/api/app/readyz"

getp() {
  aws ssm get-parameter \
      --with-decryption \
      --region "$AWS_REGION" \
      --name "/linklite/${SSM_ENV}/$1" \
      --query "Parameter.Value" \
      --output text
}

echo "Deploying images:"
echo "  WEB:    ${REMOTE_WEB}"
echo "  WORKER: ${REMOTE_WORKER}"
echo "  MIGRATE:${REMOTE_MIGRATE}"
echo "Namespace: ${NAMESPACE}"

POSTGRES_USER="$(getp POSTGRES_USER)"
POSTGRES_PASSWORD="$(getp POSTGRES_PASSWORD)"
POSTGRES_DB="$(getp POSTGRES_DB)"
PRISMA_CLIENT_ENGINE_TYPE="$(getp PRISMA_CLIENT_ENGINE_TYPE)"
APP_COMMIT_SHA="${IMAGE_TAG#testing-}"
IP_HASH_SALT="$(getp IP_HASH_SALT)"
REDIS_PASSWORD="$(getp REDIS_PASSWORD)"

DB_HOST="db"
DB_PORT="5432"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_HOST}:${DB_PORT}/${POSTGRES_DB}?schema=public"
MANIFESTS_DIR="deploy/k8s/preprod"

kubectl apply -f ${MANIFESTS_DIR}/namespace.yaml || true

kubectl -n "${NAMESPACE}" create secret generic linklite-secrets \
  --from-literal=POSTGRES_USER="${POSTGRES_USER}" \
  --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
  --from-literal=POSTGRES_DB="${POSTGRES_DB}" \
  --from-literal=PRISMA_CLIENT_ENGINE_TYPE="${PRISMA_CLIENT_ENGINE_TYPE}" \
  --from-literal=DATABASE_URL="${DATABASE_URL}" \
  --from-literal=APP_ENV="${APP_ENV}" \
  --from-literal=APP_COMMIT="${APP_COMMIT_SHA}" \
  --from-literal=APP_VERSION="${IMAGE_TAG}" \
  --from-literal=IP_HASH_SALT="${IP_HASH_SALT}" \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secrets synced."

# ----------------------------------------------------------------
# Apply db manifests
# ----------------------------------------------------------------
kubectl apply -f ${MANIFESTS_DIR}/postgres/db-service.yaml
kubectl apply -f ${MANIFESTS_DIR}/postgres/stateful-set.yaml
kubectl -n "${NAMESPACE}" rollout status statefulset/postgres --timeout=300s

# ----------------------------------------------------------------
# Apply stable manifests (configmap/service/ingress) — idempotent
# ----------------------------------------------------------------
kubectl apply -f ${MANIFESTS_DIR}/configmap.yaml
kubectl apply -f ${MANIFESTS_DIR}/app-service.yaml
kubectl apply -f ${MANIFESTS_DIR}/ingress.yaml

kubectl apply -f ${MANIFESTS_DIR}/app-deployment.yaml
kubectl apply -f ${MANIFESTS_DIR}/domain-enrichment-worker-deployment.yaml
kubectl apply -f ${MANIFESTS_DIR}/link-enrichment-worker-deployment.yaml

# ------------------------------------------------------------
# Migrations Job
# ------------------------------------------------------------
JOB_NAME="linklite-migrate-${HEAD_SHA}"

cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: ${JOB_NAME}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/name: linklite
    app.kubernetes.io/component: migrate
    app.kubernetes.io/environment: preprod
spec:
  backoffLimit: 1
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        app.kubernetes.io/name: linklite
        app.kubernetes.io/component: migrate
        app.kubernetes.io/environment: preprod
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: ${REMOTE_MIGRATE}
          imagePullPolicy: IfNotPresent
          envFrom:
            - configMapRef:
                name: linklite-config
            - secretRef:
                name: linklite-secrets
EOF

echo "Waiting for migrations job..."
kubectl -n "${NAMESPACE}" wait --for=condition=complete job/"${JOB_NAME}" --timeout=300s || {
  echo "Migrations failed. Logs:"
  kubectl -n "${NAMESPACE}" logs job/"${JOB_NAME}" --all-containers=true || true
  exit 1
}

echo "Updating deployments..."

kubectl -n "${NAMESPACE}" set image deployment/${APP_DEPLOYMENT} app="${REMOTE_WEB}"
kubectl -n "${NAMESPACE}" set image deployment/${WORKER_DOMAIN_DEPLOYMENT} domain-enrichment-worker="${REMOTE_WORKER}"
kubectl -n "${NAMESPACE}" set image deployment/${WORKER_LINK_DEPLOYMENT} link-enrichment-worker="${REMOTE_WORKER}"

echo "Waiting for rollout..."

kubectl -n "${NAMESPACE}" rollout status deployment/${APP_DEPLOYMENT} --timeout=300s
kubectl -n "${NAMESPACE}" rollout status deployment/${WORKER_DOMAIN_DEPLOYMENT} --timeout=300s
kubectl -n "${NAMESPACE}" rollout status deployment/${WORKER_LINK_DEPLOYMENT} --timeout=300s

echo "Running smoke check..."

curl -fsS --max-time 5 "${HEALTH_PROBE_ENDPOINT}" | jq .
curl -fsS --max-time 5 "${HEALTH_URL}" | jq .

echo "Deployment successful"