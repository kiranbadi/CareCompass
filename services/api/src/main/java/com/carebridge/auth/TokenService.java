package com.carebridge.auth;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import static com.carebridge.auth.AuthModels.*;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final AuthSettings settings;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public TokenService(JwtEncoder encoder, AuthSettings settings, Clock clock) {
        this.encoder = encoder; this.settings = settings; this.clock = clock;
    }

    public AuthResponse access(User user, UUID sessionId) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(settings.issuer()).audience(List.of(settings.audience()))
                .subject(user.id().toString()).issuedAt(now).expiresAt(now.plus(settings.accessTtl()))
                .id(UUID.randomUUID().toString()).claim("sid", sessionId.toString())
                .claim("role", user.role().name()).claim("email", user.email()).claim("is_verified", user.isVerified()).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new AuthResponse(token, "Bearer", settings.accessTtl().toSeconds(), UserProfile.from(user));
    }

    public String newRefreshToken() {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is required", impossible);
        }
    }
}
