#!/usr/bin/env bash
set -euo pipefail
umask 077
BASE=${BASE_URL:-http://localhost:8080}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
EMAIL="smoke-$(date +%s)-${RANDOM}@example.test"
CSRF=$(curl --fail-with-body -sS -c "$TMP/cookies" "$BASE/api/v1/auth/csrf" | jq -er '.token')

curl --fail-with-body -sS -b "$TMP/cookies" -c "$TMP/cookies" \
  -H "X-XSRF-TOKEN: $CSRF" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Demo-smoke-passphrase-2026!\",\"phone_number\":\"+14155550123\",\"role\":\"care_seeker\",\"phone_verified\":true}" \
  "$BASE/api/v1/auth/register" > "$TMP/profile.json"
jq -e '.role == "care_seeker" and .phone_verified == false and .is_verified == false' "$TMP/profile.json" >/dev/null

curl --fail-with-body -sS -b "$TMP/cookies" -c "$TMP/cookies" \
  -H "X-XSRF-TOKEN: $CSRF" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Demo-smoke-passphrase-2026!\"}" \
  "$BASE/api/v1/auth/login" > "$TMP/session.json"
ACCESS=$(jq -er '.access_token' "$TMP/session.json")
curl --fail-with-body -sS -H "Authorization: Bearer $ACCESS" "$BASE/api/v1/auth/me" > "$TMP/profile.json"
jq -e '.role == "care_seeker" and .navigation[1].id == "recipients"' "$TMP/profile.json" >/dev/null
CODE=$(curl -sS -o "$TMP/error.json" -w '%{http_code}' -H "Authorization: Bearer $ACCESS" "$BASE/api/v1/admin/audit")
[[ "$CODE" == 403 ]] || { echo "Expected forbidden admin access; got HTTP $CODE"; exit 1; }

curl --fail-with-body -sS -b "$TMP/cookies" -c "$TMP/cookies" \
  -H "X-XSRF-TOKEN: $CSRF" -X POST "$BASE/api/v1/auth/refresh" > "$TMP/session.json"
ACCESS=$(jq -er '.access_token' "$TMP/session.json")
curl --fail-with-body -sS -b "$TMP/cookies" -c "$TMP/cookies" \
  -H "X-XSRF-TOKEN: $CSRF" -X POST "$BASE/api/v1/auth/logout" > /dev/null
CODE=$(curl -sS -o "$TMP/error.json" -w '%{http_code}' -H "Authorization: Bearer $ACCESS" "$BASE/api/v1/auth/me")
[[ "$CODE" == 401 ]] || { echo "Expected revoked access after logout; got HTTP $CODE"; exit 1; }
echo 'PASS: register, login, me, RBAC, refresh rotation, logout and immediate access revocation.'
