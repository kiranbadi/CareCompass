package com.carebridge.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.time.Duration;

@ConfigurationProperties(prefix = "auth")
public record AuthSettings(String jwtSecret, String issuer, String audience, boolean cookieSecure,
        Duration accessTtl, Duration refreshTtl, Duration lockDuration, int maxFailedAttempts,
        int rateLimit, int bcryptStrength) {}
