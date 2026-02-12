#!/usr/bin/env bash
set -euo pipefail

: "${REPO:?REPO is required}"
: "${HEAD_SHA:?HEAD_SHA is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

# For SSM sessions (avoid relying on .bashrc)
export KUBECONFIG=/home/ssm-user/.kube/config

WORKDIR="/opt/linklite"
echo "Bootstrapping repo subset into ${WORKDIR} (commit=${HEAD_SHA})"

# Stateless + deterministic: wipe previous contents
sudo rm -rf "${WORKDIR}"
sudo mkdir -p "${WORKDIR}"
sudo chown ssm-user:ssm-user "${WORKDIR}"
cd "${WORKDIR}"

export HOME=/home/ssm-user
git config --global --add safe.directory "${WORKDIR}"

git init -q
git remote add origin "https://github.com/${REPO}.git" 2>/dev/null || true
git remote set-url origin "https://github.com/${REPO}.git"

# Fetch only the target commit
git fetch -q --depth 1 origin "${HEAD_SHA}"

# Only materialize the directories you need (cone mode => directories, not files)
git sparse-checkout init --cone
git sparse-checkout set \
  ".github/scripts/deploy/preprod-k8s" \
  "deploy/k8s/preprod"

git checkout -q -f FETCH_HEAD

# Remove git metadata (keep only files)
rm -rf .git

chmod +x .github/scripts/deploy/preprod-k3s/deploy.sh
export IMAGE_TAG HEAD_SHA REPO
.github/scripts/deploy/preprod-k8s/deploy.sh
