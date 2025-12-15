#!/usr/bin/env bash
set -euo pipefail

REPO="$(echo "ghcr.io/${GITHUB_REPOSITORY}" | tr '[:upper:]' '[:lower:]')"

# branch/tag detection
if [[ "${GITHUB_REF}" == refs/tags/* ]]; then
  VERSION="${GITHUB_REF#refs/tags/}"
  TAGS="${REPO}:${VERSION}
${REPO}:${GITHUB_SHA}"
else
  BRANCH="${GITHUB_REF#refs/heads/}"
  BRANCH="$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | tr '/' '-' | sed 's/[^a-z0-9_.-]/-/g')"

  case "$BRANCH" in
    develop) ENV_SUFFIX="testing" ;;
    main)    ENV_SUFFIX="prod" ;;
    *)       ENV_SUFFIX="dev" ;;
  esac

  TAGS="${REPO}:${BRANCH}-${ENV_SUFFIX}
${REPO}:${GITHUB_SHA}-${ENV_SUFFIX}
${REPO}:latest-${ENV_SUFFIX}"
fi

echo "tags<<EOF"
echo "$TAGS"
echo "EOF"