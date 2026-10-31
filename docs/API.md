# Authentication API and curl requests

The browser uses same-origin `/api/v1` requests (Vite proxies them to port 8080 in development). JSON uses snake_case. Access JWTs expire after 15 minutes. Refresh tokens use an HttpOnly, SameSite=Strict cookie named `carebridge_refresh`, scoped to `/api/v1/auth`; they never appear in JSON. A refresh-token family has an absolute seven-day lifetime.

All POST requests require a CSRF cookie and matching header, including login and registration. Start the API using the root README, then run these commands in the same shell. These are fictional local development credentials; replace them for your own account.

## Bootstrap CSRF

Requires `curl` and `jq`. The cookie file contains credentials: keep it private and delete it when finished.

```bash
BASE=http://localhost:8080
COOKIE_JAR=$(mktemp)
chmod 600 "$COOKIE_JAR"
CSRF=$(curl --fail-with-body -sS -c "$COOKIE_JAR" \
  "$BASE/api/v1/auth/csrf" | jq -r '.token')
```

## POST /api/v1/auth/register

```bash
curl --fail-with-body -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -H "X-XSRF-TOKEN: $CSRF" \
  -d '{
    "email": "guardian@example.test",
    "password": "Demo-guardian-passphrase-2026!",
    "phone_number": "+14155550123",
    "role": "care_seeker",
    "phone_verified": false
  }'
```

Returns **201** with the user profile and role-specific navigation. Change `role` to `care_provider` for a provider. `site_admin` is rejected with **400**. `phone_verified` is accepted for compatibility but never trusted: every public account starts with `phone_verified: false` and `is_verified: false`. An OTP/verification service is not part of this MVP.

Passwords must contain 12–72 characters and no more than 72 UTF-8 bytes. Phone numbers must use international `+` notation with 8–15 digits. Email addresses are validated and normalized to lowercase. Duplicate registration returns **409** with a generic message. No public registration automatically signs the user in.

## POST /api/v1/auth/login

```bash
AUTH_JSON=$(curl --fail-with-body -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -H "X-XSRF-TOKEN: $CSRF" \
  -d '{"email":"guardian@example.test","password":"Demo-guardian-passphrase-2026!"}')
ACCESS_TOKEN=$(printf '%s' "$AUTH_JSON" | jq -r '.access_token')
printf '%s' "$AUTH_JSON" | jq '{token_type, expires_in, user}'
```

Returns **200**, sets the refresh cookie, and returns `{access_token, token_type, expires_in, user}`. JWT claims include `sub`, `role`, `email`, `is_verified`, `sid`, `iat`, `exp`, `iss`, and `aud`. Wrong passwords, unknown emails, inactive accounts, and locked accounts all return **401** with `Invalid credentials`. Five failed password attempts lock an account for 15 minutes. A successful login after the lock expires resets the counter.

## GET /api/v1/auth/me

```bash
curl --fail-with-body -sS "$BASE/api/v1/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Returns **200** with `{id, email, phone_number, role, is_active, is_verified, phone_verified, created_at, navigation}`. Each navigation item has `id` and `label`. Navigation describes the UI; backend permissions are enforced independently.

## POST /api/v1/auth/refresh

```bash
AUTH_JSON=$(curl --fail-with-body -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE/api/v1/auth/refresh" \
  -H "X-XSRF-TOKEN: $CSRF")
ACCESS_TOKEN=$(printf '%s' "$AUTH_JSON" | jq -r '.access_token')
printf '%s' "$AUTH_JSON" | jq '{token_type, expires_in, user}'
```

Returns **200** with a new access JWT and a replacement refresh cookie. The old refresh token is immediately consumed. Reusing it revokes the entire session, including already-issued access JWTs. Serialize refresh requests; the React client shares refresh promises and uses Web Locks for cross-tab coordination where available. The cookie may be renewed, but the server never extends the family's absolute seven-day deadline.

## POST /api/v1/auth/logout

```bash
curl --fail-with-body -sS -i -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE/api/v1/auth/logout" \
  -H "X-XSRF-TOKEN: $CSRF"
unset ACCESS_TOKEN AUTH_JSON CSRF
rm -f "$COOKIE_JAR"
unset COOKIE_JAR
```

Returns **204**, revokes the cookie's session, and clears the refresh cookie. No access JWT is required, so logout works after access expiry. Repeating logout is safe. JWT authentication checks the live session and account on every protected request: a logged-out or inactive account cannot continue using an otherwise unexpired JWT.

## Administrator-only audit endpoint

After seeding an administrator using the README and logging in with it:

```bash
curl --fail-with-body -sS "$BASE/api/v1/admin/audit" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Returns the newest 100 authentication events. Seekers and providers receive **403**. In Java, reuse the guard as:

```java
@PreAuthorize("@roles.requireRoles(authentication, 'site_admin')")
```

For multiple permitted roles: `@PreAuthorize("@roles.requireRoles(authentication, 'care_seeker', 'care_provider')")`.

## Error contract

Errors use `{ "code": "INVALID_CREDENTIALS", "message": "Invalid credentials" }`. Validation is **400**, authentication is **401**, missing/invalid CSRF or denied roles are **403**, duplicate registration is **409**, and authentication throttling is **429** with `Retry-After: 60`. The default throttle is 30 auth POSTs per network peer per minute, stored in PostgreSQL so it works across API instances. Unknown routes can return Spring's sanitized default error format.

Do not put passwords, JWTs, refresh cookies, or real recipient information in logs, issue reports, or committed files. The shell variables above hold credentials; avoid shell tracing (`set -x`).
