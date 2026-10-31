# CareBridge

A responsive caregiving website with a React/TypeScript frontend and a Spring Boot authentication API backed by PostgreSQL and **JdbcTemplate**. This monorepo contains no iOS application.

## Start locally

Requires **Node 22.12+**, **Java 21+**, Docker Compose, and Python 3 for local secret generation. Maven is provided by the checked-in wrapper. Initial dependency downloads require internet access.

```bash
npm ci
npm run setup           # creates ignored .env with a random JWT signing key
npm run db:up           # local PostgreSQL on 127.0.0.1:55433
npm run dev:api         # terminal 1: API on http://localhost:8080
```

In another terminal:

```bash
npm run dev             # website on http://127.0.0.1:5173
```

The website opens on a public landing page with care seeker/provider sections, About Us, one shared registration form, and shared login. Home links to public previews of both role modules. Create a care seeker or care provider account, then sign in to enter the protected workspace. Use a fictional international phone number for hackathon demos. Phone verification starts pending; there is no fake OTP or verification bypass.

## Home and natural-language demo search

Home and module previews work even if the API is offline. Browser hash routes provide shareable entry points: `/#/`, `/#/login`, `/#/register`, `/#/care-seeker`, `/#/care-provider`, and `/#/workspace`. Role-specific registration links preselect a role on the same form; visitors can change it before registering. Authentication and role checks still use the real backend.

Try a home-page request such as **“Weekend care for a child with autism under $30 an hour”** or **“A companion for my dad in Austin on weekdays.”** The local search recognizes common care concepts and synonyms, then filters six fictional provider profiles by support needs, location, schedule, and maximum hourly rate. Results show the interpreted constraints. Supported demo locations are Austin, Seattle, New York/NYC, and Boston; unsupported locations and requests with no matches show an explicit empty state.

This is an MVP approximation of semantic search using a curated concept dictionary. It does not use a language model, learned embeddings, a real provider directory, or live availability. Complex phrasing, negation, disjunctions, precise dates/distances, and arbitrary locations are not fully understood. No search text is sent to the backend or persisted. A future Spring AI/embedding implementation can replace the local matcher without changing the public experience.

`npm run setup` generates `.env` directly with **local-only** database credentials and a random JWT signing key; no template file is needed. Port 55433 avoids common local PostgreSQL conflicts. Setup will never overwrite an existing `.env`. To change the database port, update both `POSTGRES_PORT` and `DB_URL` in `.env`. API and frontend ports can be changed with `PORT` and Vite's `--port` option; update the Vite proxy if the API port changes.

## What works

- Public registration for `care_seeker` and `care_provider`; public admin creation is rejected.
- bcrypt passwords (cost 12), email validation/normalization and international phone validation.
- 15-minute signed JWTs with role/verification claims, plus hashed, rotating refresh tokens in HttpOnly cookies.
- Session restoration, automatic access refresh, serialized cookie rotation, CSRF protection, safe errors, disabled submit states, and password visibility controls.
- Database-backed rate limiting, account lockouts, refresh replay detection, immediate logout/disabled-account enforcement, and reusable server-side RBAC.
- Role-specific navigation and an administrator-only live authentication audit log.
- Responsive layouts with labeled inputs, keyboard focus indicators, reduced-motion support, and mobile navigation.

Care profiles, booking, messaging, license uploads, background checks, availability, hourly-rate editing, admin verification approval, and user-management controls are explicitly labeled **MVP previews**. They are not operational care workflows. Authentication uses the real API; there is no fake login mode or hardcoded admin password. Password recovery, SMS/email verification and MFA are not implemented. Spring AI is outside this auth module and remains pending provider selection.

## Structure

```text
apps/web/                 React, TypeScript, Vite, Vitest
services/api/             Spring Boot 3.5, Java 21, Spring Security, JdbcTemplate
  src/main/resources/db/  PostgreSQL Flyway migrations
docs/API.md               Curl requests for every endpoint and response contracts
docs/SECURITY.md          Security behavior, deployment and privacy limitations
scripts/                  Local setup, API startup, and API smoke test
compose.yaml              Isolated development/test PostgreSQL services
```

The pre-existing nested `CareCompass/` repository is left untouched; it is not part of the web application.

## API requests

See **[docs/API.md](docs/API.md)** for copyable curl commands covering CSRF bootstrap, registration, login, `/me`, refresh, logout, and admin audit access. An executable end-to-end check is also available:

```bash
bash scripts/smoke-auth.sh
```

It creates a uniquely named fictional demo account in your local development database and verifies registration, login, profile access, refresh, forbidden admin access, and logout revocation. It never prints passwords or tokens.

## Create an administrator through the CLI

Only a trusted operator with database access should run this command. It **only creates** a new administrator and refuses to overwrite or promote an existing account. Use private environment variables rather than committed credentials or command-line password arguments.

```bash
set -a
source .env
set +a
read -r -p 'Administrator email: ' ADMIN_EMAIL
read -r -p 'International phone number: ' ADMIN_PHONE_NUMBER
read -r -s -p 'Administrator password (12+ characters): ' ADMIN_PASSWORD
printf '\n'
export ADMIN_EMAIL ADMIN_PHONE_NUMBER ADMIN_PASSWORD
cd services/api
./mvnw compile exec:java -Dexec.mainClass=com.carebridge.auth.AdminSeedCommand
unset ADMIN_PASSWORD ADMIN_EMAIL ADMIN_PHONE_NUMBER
```

Sign in through the normal login form. The CLI records an audit event. Administrative identity is trusted by the operator; the phone remains unverified. CLI access is an operational privilege, not a public endpoint.

## Verify

```bash
npm test                  # frontend form and auth-client tests
npm run build             # TypeScript check and production frontend bundle
npm run db:test            # isolated, disposable PostgreSQL on port 55432
npm run test:api           # real PostgreSQL integration tests, not H2
cd services/api && ./mvnw package
```

Backend tests reset **only** the `carebridge_test` database. Never point `TEST_DB_URL` at a database containing data you want to keep. Tests cover JWT claims/expiry, bcrypt, input validation, public-admin rejection, generic credential errors, lockouts, CSRF cookie/header exchange, refresh rotation/replay/concurrency, logout revocation, inactive accounts, RBAC, rate limits and forwarded-header spoofing. CI runs PostgreSQL as a service.

## Deployment

The frontend production output is `apps/web/dist`; the API is `services/api/target/carebridge-api-0.1.0-SNAPSHOT.jar`. Dockerfiles are supplied for both. The nginx frontend config proxies `/api` to the API service for same-origin cookies. For a local container demo:

```bash
docker compose --profile app up --build -d
# http://localhost:8088
```

For a real deployment, terminate HTTPS at a trusted ingress, set `SPRING_PROFILES_ACTIVE=prod` so cookies are Secure, supply your own database and random JWT secret through a secret manager, and prevent direct public database access. Configure trusted proxy boundaries and edge throttling; do not blindly trust forwarded IP headers. Read [docs/SECURITY.md](docs/SECURITY.md) before storing real personal or health information. This hackathon module is not a claim of production security certification or HIPAA compliance.

## License

Apache 2.0. See [LICENSE](LICENSE).
