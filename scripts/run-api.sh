#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi
: "${AUTH_JWT_SECRET:?Run npm run setup first or supply AUTH_JWT_SECRET in the environment}"
cd services/api
exec ./mvnw spring-boot:run
