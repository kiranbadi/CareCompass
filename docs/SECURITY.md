# CareBridge security and privacy notes

## Implemented controls

- Passwords use bcrypt with cost 12. Public passwords require 12+ characters and at most 72 UTF-8 bytes. Raw passwords and tokens are never deliberately logged. Request records redact their `toString()` output; hash-bearing user records also redact sensitive fields.
- Signed HS256 JWTs expire after 15 minutes, with standard validator clock-skew tolerance. The API validates the signing algorithm, signature, issuer, audience and expiry. The signing key must be Base64-encoded random material of at least 32 bytes; startup fails for missing/short keys. Rotate the secret to invalidate all outstanding access JWTs.
- Refresh credentials contain 256 random bits and are stored only as SHA-256 digests. Hashing is appropriate for uniformly random high-entropy credentials; user passwords require the slower bcrypt hash. Cookies are HttpOnly, SameSite=Strict and host-only, with a narrow auth path; Secure is on except in the explicit local profile.
- Database row locks serialize refresh-family rotation. Consumed token hashes are retained for replay detection. Replay revokes the whole session and commits that revocation even when returning 401. Families have a seven-day absolute lifetime.
- Every protected request checks the live session and account. Logout and disabling a user therefore invalidate issued access credentials immediately. Role changes invalidate JWTs carrying the previous role. Role checks are independent of frontend navigation. Default policy denies unauthenticated access.
- Spring Security requires CSRF cookie/header pairs on writes, including login/refresh/logout. Tokens come from `/auth/csrf`; there is no wildcard CORS policy. Production should serve frontend and `/api` from the same origin.
- PostgreSQL stores rate-limit windows, allowing multiple API instances to share a budget. Five failed password attempts lock an account for 15 minutes. Unknown, disabled, locked and incorrect-password logins have the same public error. Dummy bcrypt work is performed for unknown accounts. Avoid treating these controls as a replacement for MFA and edge abuse prevention.
- Authentication audit events contain actor UUID, an action code and timestamp; they exclude email, phone, passwords, token values, request bodies and care recipient information. The admin endpoint returns the latest 100 events. Database privileges must protect audit records from unauthorized mutation.

## Honest MVP boundaries

This code is a hackathon foundation, not a certified production identity provider. No MFA, SMS/email verification, password reset, compromised-password screening, operator approval workflow, immutable external audit sink, session management UI, consent management or abuse monitoring is implemented. A trusted operator creates administrators through the CLI; public registration never grants administrator status. The accepted phone verification flag is ignored rather than allowing users to self-verify. Professional and phone verification remain separate booleans.

Registration conflicts use generic text but the status can still reveal whether an address is registered. A production service should evaluate a uniform asynchronous signup/email verification flow. Account lockout can be abused to inconvenience known users; tune thresholds and add risk-based controls. bcrypt's 72-byte input boundary is enforced rather than silently truncating passphrases.

The client uses an in-memory access token and no local/session storage for credentials. Web Locks coordinate refresh across tabs when available; older browsers without that API may sign out after concurrent refresh replay detection. A response lost during rotation may require signing in again. No cross-tab logout broadcast is implemented; the API still rejects the revoked credentials on the next protected request.

This module handles authentication data only. Dashboard care-management panels are static previews. Do not enter real recipient health information into the MVP.

## Deployment and HIPAA considerations

Authentication controls alone do not establish HIPAA compliance. Before using regulated health information, obtain qualified privacy/security review, determine organizational obligations, perform a risk analysis, and establish appropriate vendor agreements and operational safeguards. See the [HHS Security Rule overview](https://www.hhs.gov/hipaa/for-professionals/security/index.html).

Use TLS end to end where appropriate; encrypt database volumes and backups; isolate the database; use least-privilege database roles; separate migration privileges from runtime access; secure secret storage; define key rotation, backup/restore, data retention and deletion, audit access review, incident response and monitoring. Do not log request bodies, cookies, Authorization headers or sensitive response bodies at ingress, application, APM or analytics layers. Disable debug logging in production and audit the logging configuration of the deployment stack.

The local compose passwords are intentionally development-only. Never expose development database ports to the internet. `prod` must use secure cookies and an HTTPS ingress. Add a Content Security Policy and security response headers to the frontend edge; a sample nginx configuration is supplied. Review CSP changes when adding third-party scripts or fonts. Dependency versions are locked; run dependency scanning regularly.

The rate limiter uses the actual servlet peer IP, not caller-supplied `X-Forwarded-For`. Behind the supplied nginx proxy, traffic shares the proxy's budget: configure an IP limiter at the trusted ingress and an explicitly validated proxy-IP resolution strategy before scaling. IPv6 rotation, credential stuffing and distributed attacks require stronger controls. Expired rate-window rows are pruned opportunistically. Schedule retention/deletion of expired session/token families and audit records according to your policy; retain token hashes until the family's expiry for replay detection.

Design references: [Spring Security CSRF integration](https://docs.spring.io/spring-security/reference/6.5/servlet/exploits/csrf.html), [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP refresh-token protections](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html).
