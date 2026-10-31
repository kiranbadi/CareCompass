package com.carebridge.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static com.carebridge.auth.AuthModels.*;

@Repository
public class AuthRepository {
    private final JdbcTemplate jdbc;
    private final RowMapper<User> userMapper = (rs, row) -> new User(rs.getObject("id", UUID.class),
            rs.getString("email"), rs.getString("hashed_password"), rs.getString("phone_number"),
            Role.valueOf(rs.getString("role")), rs.getBoolean("is_active"), rs.getBoolean("is_verified"),
            rs.getBoolean("phone_verified"), rs.getInt("failed_login_attempts"), instant(rs, "locked_until"), instant(rs, "created_at"));

    public AuthRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean createUser(UUID id, String email, String passwordHash, String phone, Role role, boolean verified) {
        return jdbc.update("""
            INSERT INTO users(id,email,hashed_password,phone_number,role,is_verified)
            VALUES (?,?,?,?,?::user_role,?) ON CONFLICT(email) DO NOTHING
            """, id, email, passwordHash, phone, role.name(), verified) == 1;
    }

    public Optional<User> findByEmailForUpdate(String email) {
        return jdbc.query("SELECT * FROM users WHERE email=? FOR UPDATE", userMapper, email).stream().findFirst();
    }

    public Optional<User> findById(UUID id) {
        return jdbc.query("SELECT * FROM users WHERE id=?", userMapper, id).stream().findFirst();
    }

    public void recordFailure(UUID id, int attempts, Instant lockedUntil) {
        jdbc.update("UPDATE users SET failed_login_attempts=?,locked_until=? WHERE id=?",
                attempts, timestamp(lockedUntil), id);
    }

    public void resetFailures(UUID id) {
        jdbc.update("UPDATE users SET failed_login_attempts=0,locked_until=NULL WHERE id=?", id);
    }

    public void createSession(Session session, Instant now) {
        jdbc.update("INSERT INTO auth_sessions(id,user_id,created_at,expires_at) VALUES (?,?,?,?)",
                session.id(), session.userId(), timestamp(now), timestamp(session.expiresAt()));
    }

    public void insertRefresh(String hash, UUID sessionId, Instant now, Instant expires) {
        jdbc.update("INSERT INTO refresh_tokens(token_hash,session_id,created_at,expires_at) VALUES (?,?,?,?)",
                hash, sessionId, timestamp(now), timestamp(expires));
    }

    /** Lock the family first, then read token state in a fresh READ COMMITTED statement. */
    public Optional<Session> lockSessionForRefresh(String hash) {
        return jdbc.query("""
            SELECT s.* FROM auth_sessions s JOIN refresh_tokens r ON r.session_id=s.id
            WHERE r.token_hash=? FOR UPDATE OF s
            """, (rs, row) -> new Session(rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                instant(rs, "expires_at"), instant(rs, "revoked_at")), hash).stream().findFirst();
    }

    public Optional<RefreshToken> findRefresh(String hash) {
        return jdbc.query("SELECT * FROM refresh_tokens WHERE token_hash=?",
                (rs, row) -> new RefreshToken(rs.getString("token_hash"), rs.getObject("session_id", UUID.class),
                        instant(rs, "expires_at"), instant(rs, "consumed_at")), hash).stream().findFirst();
    }

    public void consumeRefresh(String hash, Instant now) {
        jdbc.update("UPDATE refresh_tokens SET consumed_at=? WHERE token_hash=?", timestamp(now), hash);
    }

    public void revokeSession(UUID id, Instant now) {
        jdbc.update("UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id=?", timestamp(now), id);
    }

    public Optional<User> activeUser(UUID userId, UUID sessionId, Instant now) {
        return jdbc.query("""
            SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id
            WHERE u.id=? AND s.id=? AND u.is_active AND s.revoked_at IS NULL AND s.expires_at>?
            """, userMapper, userId, sessionId, timestamp(now)).stream().findFirst();
    }

    public int incrementRateWindow(String clientHash, Instant now) {
        return jdbc.queryForObject("""
            INSERT INTO auth_rate_limits(client_hash,window_start,attempts) VALUES (?,?,1)
            ON CONFLICT(client_hash) DO UPDATE SET
                attempts=CASE WHEN auth_rate_limits.window_start <= EXCLUDED.window_start - INTERVAL '1 minute'
                    THEN 1 ELSE auth_rate_limits.attempts+1 END,
                window_start=CASE WHEN auth_rate_limits.window_start <= EXCLUDED.window_start - INTERVAL '1 minute'
                    THEN EXCLUDED.window_start ELSE auth_rate_limits.window_start END
            RETURNING attempts
            """, Integer.class, clientHash, timestamp(now));
    }

    public void pruneRateWindows(Instant now) {
        jdbc.update("DELETE FROM auth_rate_limits WHERE window_start<?", timestamp(now.minusSeconds(3600)));
    }

    public void audit(UUID actor, String action) {
        jdbc.update("INSERT INTO audit_events(actor_id,action) VALUES (?,?)", actor, action);
    }

    public List<AuditEvent> auditEvents() {
        return jdbc.query("SELECT * FROM audit_events ORDER BY id DESC LIMIT 100",
                (rs, row) -> new AuditEvent(rs.getLong("id"), rs.getObject("actor_id", UUID.class),
                        rs.getString("action"), instant(rs, "created_at")));
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
    private static Timestamp timestamp(Instant value) { return value == null ? null : Timestamp.from(value); }
}
