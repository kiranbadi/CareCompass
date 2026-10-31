#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -e .env ]]; then
  echo '.env already exists; leaving it unchanged.'
  exit 0
fi
umask 077
python3 - <<'PY'
import base64, os, pathlib, secrets
content = pathlib.Path('.env.example').read_text().replace('AUTH_JWT_SECRET=\n', 'AUTH_JWT_SECRET=' + base64.b64encode(secrets.token_bytes(48)).decode() + '\n')
with open('.env', 'x') as target:
    target.write(content)
print('Created local .env with a random JWT signing secret. No secret values were printed.')
PY
