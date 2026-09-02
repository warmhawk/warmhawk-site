#!/usr/bin/env bash
# Companion teardown for scripts/e2e-docker-up.sh. Safe to run even if nothing is up — always the
# last step of `npm run test:e2e:docker` (success or failure, see that script in package.json) and
# also exposed standalone as `npm run test:e2e:docker:down` for manual cleanup.
set -uo pipefail

CONTAINER_NAME="warmhawk-site-e2e"

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
echo "[e2e-docker] ${CONTAINER_NAME} removed (or was already not running)."
