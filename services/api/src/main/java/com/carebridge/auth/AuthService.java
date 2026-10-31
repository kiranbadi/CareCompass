package com.carebridge.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import static com.carebridge.auth.AuthModels.*;

@Service
@Transactional(noRollbackFor = AuthException.class)
public class AuthService {
    private final AuthRepository repository;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final AuthSettings settings;
    private final Clock clock;
    private final String dummyHash;

    public AuthService(AuthRepository repository, PasswordEncoder passwords, TokenService tokens, AuthSettings settings, Clock clock) {
        this.repository = repository; this.passwords = passwords; this.tokens = tokens;
        this.settings = settings; this.clock = clock;
        dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    public UserProfile register(RegisterRequest request) {
        if (request.role() == Role.site_admin || request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Check the submitted fields.");
        }
        UUID id = UUID.randomUUID();
        boolean created = repository.createUser(id, normalizeEmail(request.email()), passwords.encode(request.password()),
                request.phoneNumber(), request.role(), false);
        if (!created) throw new AuthException(HttpStatus.CONFLICT, "REGISTRATION_FAILED", "Unable to create account with these details");
        // A client-supplied verification flag never proves phone ownership.
        repository.audit(id, "REGISTERED");
        return UserProfile.from(repository.findById(id).orElseThrow(AuthException::invalidSession));
    }

    public IssuedSession login(LoginRequest request) {
        User user = repository.findByEmailForUpdate(normalizeEmail(request.email())).orElse(null);
        // Perform a bcrypt comparison even for nonexistent, inactive and locked accounts.
        boolean valid = request.password().getBytes(StandardCharsets.UTF_8).length <= 72
                && passwords.matches(request.password(), user == null ? dummyHash : user.hashedPassword());
        Instant now = clock.instant();
        if (user == null) { repository.audit(null, "LOGIN_FAILED"); throw AuthException.invalidCredentials(); }
        if (!user.isActive() || (user.lockedUntil() != null && user.lockedUntil().isAfter(now))) {
            repository.audit(user.id(), "LOGIN_FAILED"); throw AuthException.invalidCredentials();
        }
        if (!valid) {
            int previous = user.lockedUntil() == null ? user.failedLoginAttempts() : 0;
            int attempts = previous + 1;
            repository.recordFailure(user.id(), attempts,
                    attempts >= settings.maxFailedAttempts() ? now.plus(settings.lockDuration()) : null);
            repository.audit(user.id(), "LOGIN_FAILED");
            // AuthException intentionally commits lockout counters instead of rolling them back.
            throw AuthException.invalidCredentials();
        }
        repository.resetFailures(user.id());
        Session session = new Session(UUID.randomUUID(), user.id(), now.plus(settings.refreshTtl()), null);
        repository.createSession(session, now);
        repository.audit(user.id(), "LOGIN_SUCCESS");
        return issue(user, session, now);
    }

    public IssuedSession refresh(String rawToken) {
        String hash = checkedHash(rawToken);
        Session session = repository.lockSessionForRefresh(hash).orElseThrow(AuthException::invalidSession);
        RefreshToken refresh = repository.findRefresh(hash).orElseThrow(AuthException::invalidSession);
        Instant now = clock.instant();
        if (refresh.consumedAt() != null) {
            repository.revokeSession(session.id(), now);
            repository.audit(session.userId(), "REFRESH_REPLAY");
            throw AuthException.invalidSession();
        }
        if (session.revokedAt() != null || !session.expiresAt().isAfter(now) || !refresh.expiresAt().isAfter(now)) {
            throw AuthException.invalidSession();
        }
        User user = repository.findById(session.userId()).filter(User::isActive).orElseThrow(AuthException::invalidSession);
        repository.consumeRefresh(hash, now);
        repository.audit(user.id(), "TOKEN_REFRESHED");
        return issue(user, session, now);
    }

    public void logout(String rawToken) {
        if (rawToken == null || !rawToken.matches("[A-Za-z0-9_-]{43}")) return;
        repository.lockSessionForRefresh(TokenService.hash(rawToken)).ifPresent(session -> {
            repository.revokeSession(session.id(), clock.instant());
            repository.audit(session.userId(), "LOGOUT");
        });
    }

    private IssuedSession issue(User user, Session session, Instant now) {
        String refresh = tokens.newRefreshToken();
        repository.insertRefresh(TokenService.hash(refresh), session.id(), now, session.expiresAt());
        return new IssuedSession(tokens.access(user, session.id()), refresh);
    }

    private static String checkedHash(String rawToken) {
        if (rawToken == null || !rawToken.matches("[A-Za-z0-9_-]{43}")) throw AuthException.invalidSession();
        return TokenService.hash(rawToken);
    }

    public static String normalizeEmail(String email) { return email.strip().toLowerCase(Locale.ROOT); }
}
