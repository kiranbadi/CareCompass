CREATE TYPE user_role AS ENUM ('site_admin', 'care_seeker', 'care_provider');

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) UNIQUE NOT NULL CHECK (email = lower(email)),
    hashed_password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(16) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);

CREATE TABLE refresh_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES auth_sessions(id),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ
);
CREATE INDEX refresh_tokens_session_idx ON refresh_tokens(session_id);

CREATE TABLE auth_rate_limits (
    client_hash CHAR(64) PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL
);

CREATE TABLE audit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_events_created_idx ON audit_events(created_at DESC);
