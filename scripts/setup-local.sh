#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -e .env ]]; then
  echo '.env already exists; leaving it unchanged.'
  exit 0
fi
umask 077
python3 - <<'PY'
import base64
import secrets

settings = {
    'POSTGRES_DB': 'carebridge',
    'POSTGRES_USER': 'carebridge',
    'POSTGRES_PASSWORD': 'carebridge-local-only',
    'POSTGRES_PORT': '55433',
    'DB_URL': 'jdbc:postgresql://localhost:55433/carebridge',
    'DB_USERNAME': 'carebridge',
    'DB_PASSWORD': 'carebridge-local-only',
    'AUTH_JWT_SECRET': base64.b64encode(secrets.token_bytes(48)).decode(),
    'SPRING_PROFILES_ACTIVE': 'local',
}
with open('.env', 'x') as target:
    target.write('# Local development settings. Do not commit this file.\n')
    target.writelines(f'{name}={value}\n' for name, value in settings.items())
print('Created local .env with a random JWT signing secret. No secret values were printed.')
PY
