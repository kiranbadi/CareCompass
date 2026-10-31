# CareBridge responsive web authentication

The user corrected the scope to a responsive website only. Use `apps/web` for React/TypeScript and `services/api` for Spring Boot/JdbcTemplate/PostgreSQL. Leave the existing nested CareCompass repository untouched. No iOS application is included.

Use bcrypt password hashing, 15-minute signed access JWTs in browser memory, and 256-bit random refresh tokens stored only as SHA-256 hashes in PostgreSQL. Refresh credentials live in a SameSite=Strict HttpOnly cookie. Rotation uses database locks and token-family replay detection. Access JWTs carry a session ID; each request checks the live user and session for immediate logout/ban enforcement. All writes require Spring Security CSRF tokens obtained from a bootstrap endpoint. Vite proxies `/api` for same-origin development.

Expose public seeker/provider registration, login, refresh, logout and authenticated `/me`. Keep phone verification false regardless of client input; professional verification and phone verification are separate. Seed administrators only through an explicit CLI mode. Use centralized role guards, database-backed IP throttling, account lockout, and sanitized errors. No credentials or token values enter logs. Audit events record IDs and action codes only.

Create accessible responsive sign-in and registration screens, plus role-specific navigation with clearly labeled sample workspace data. Authentication itself always uses the real backend. Backend tests exercise real PostgreSQL SQL, refresh reuse, JWT claims, lockout and RBAC. Frontend tests verify form behavior and session handling. Include executable curl recipes and privacy/deployment limits; do not claim HIPAA certification.
