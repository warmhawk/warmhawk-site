#!/usr/bin/env bash
# Builds and runs this repo's own docker/Dockerfile.web as a throwaway container for
# `npm run test:e2e:docker` — see playwright.config.ts's header comment: that config expects an
# already-running container on port 4801, not something Playwright launches itself. Plain
# `docker build`/`docker run` rather than a new compose file: this repo has exactly one stateless
# service and no database (see docker/docker-compose.deploy.yml's own header comment on why that
# file has none of the multi-service concerns a compose file would justify — the same reasoning
# applies here, more so for a throwaway test container).
set -euo pipefail

CONTAINER_NAME="warmhawk-site-e2e"
IMAGE_TAG="warmhawk-site:e2e"
HOST_PORT=4801
HEALTH_URL="http://localhost:${HOST_PORT}/"
TIMEOUT_SECONDS=90

cd "$(dirname "$0")/.."

echo "[e2e-docker] Building ${IMAGE_TAG} (build-time Stripe placeholders — same defaults as the"
echo "[e2e-docker] Dockerfile's own ARG STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET; this tier tests"
echo "[e2e-docker] the app's own rendering/routing, not live Stripe — that's tests/human-journeys)."
docker build -f docker/Dockerfile.web -t "$IMAGE_TAG" .

echo "[e2e-docker] Removing any leftover ${CONTAINER_NAME} container..."
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "[e2e-docker] Starting ${CONTAINER_NAME} on host port ${HOST_PORT} -> container port 4600"
echo "[e2e-docker] (per the Dockerfile's EXPOSE 4600, matching tests/e2e/*.spec.ts's and"
echo "[e2e-docker] playwright.config.ts's default baseURL)."
# .env/.env.local already carries this repo's full set of local-dev placeholder values (test
# license keypair, SMTP placeholders, NEXT_PUBLIC_* pointed at the mapped ports) — its own header
# comment documents this exact `docker run --env-file` use case.
#
# Docker's own --env-file parser (unlike dotenv/bash `source`) reads one KEY=value pair per line
# and has no concept of a quoted multi-line value, so LICENSE_SIGNING_PRIVATE_KEY's real-newline
# PEM block breaks it ("variable '...' contains whitespaces"). Strip that one var out of what
# --env-file sees, then pass it separately via -e from a real shell `source` (which parses the
# quoted multi-line value correctly and keeps the real newlines createSign() needs).
ENV_FILE_FILTERED="$(mktemp)"
trap 'rm -f "$ENV_FILE_FILTERED"' EXIT
awk '
  /^LICENSE_SIGNING_PRIVATE_KEY=/ { skip=1 }
  skip { if ($0 ~ /-----END PRIVATE KEY-----"$/) skip=0; next }
  { print }
' .env/.env.local > "$ENV_FILE_FILTERED"

set -a
source .env/.env.local
set +a

docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:4600" \
  --env-file "$ENV_FILE_FILTERED" \
  -e "LICENSE_SIGNING_PRIVATE_KEY=${LICENSE_SIGNING_PRIVATE_KEY}" \
  "$IMAGE_TAG" >/dev/null

echo "[e2e-docker] Waiting for ${HEALTH_URL} to respond 200 (timeout ${TIMEOUT_SECONDS}s)..."
elapsed=0
until curl -sf -o /dev/null "$HEALTH_URL"; do
  sleep 2
  elapsed=$((elapsed + 2))
  if [ "$elapsed" -ge "$TIMEOUT_SECONDS" ]; then
    echo "[e2e-docker] Timed out waiting for ${HEALTH_URL}. Container logs:" >&2
    docker logs "$CONTAINER_NAME" >&2 || true
    exit 1
  fi
done

echo "[e2e-docker] Container is up and healthy at ${HEALTH_URL}."
