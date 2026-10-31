package com.carebridge.auth;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AuthModels {
    private AuthModels() {}

    public enum Role { site_admin, care_seeker, care_provider }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 12, max = 72) String password,
            @NotBlank @Pattern(regexp = "\\+[1-9][0-9]{7,14}") String phoneNumber,
            @NotNull Role role,
            Boolean phoneVerified) {
        @Override public String toString() { return "RegisterRequest[redacted]"; }
    }

    public record LoginRequest(@NotBlank @Email @Size(max = 254) String email,
                               @NotBlank @Size(max = 72) String password) {
        @Override public String toString() { return "LoginRequest[redacted]"; }
    }

    public record User(UUID id, String email, @JsonIgnore String hashedPassword, String phoneNumber,
                       Role role, boolean isActive, boolean isVerified, boolean phoneVerified,
                       int failedLoginAttempts, Instant lockedUntil, Instant createdAt) {
        @Override public String toString() { return "User[id=" + id + ", role=" + role + "]"; }
    }

    public record NavigationItem(String id, String label) {}

    public record UserProfile(UUID id, String email, String phoneNumber, Role role, boolean isActive,
                              boolean isVerified, boolean phoneVerified, Instant createdAt,
                              List<NavigationItem> navigation) {
        public static UserProfile from(User user) {
            List<NavigationItem> items = switch (user.role()) {
                case site_admin -> List.of(new NavigationItem("overview", "Overview"),
                        new NavigationItem("verification", "Verification queue"),
                        new NavigationItem("users", "User management"), new NavigationItem("audit", "Audit log"));
                case care_seeker -> List.of(new NavigationItem("overview", "Overview"),
                        new NavigationItem("recipients", "Care recipients"), new NavigationItem("sessions", "Sessions"),
                        new NavigationItem("messages", "Messages"));
                case care_provider -> List.of(new NavigationItem("overview", "Overview"),
                        new NavigationItem("credentials", "Credentials & checks"),
                        new NavigationItem("availability", "Availability"), new NavigationItem("rates", "Hourly rates"));
            };
            return new UserProfile(user.id(), user.email(), user.phoneNumber(), user.role(), user.isActive(),
                    user.isVerified(), user.phoneVerified(), user.createdAt(), items);
        }
    }

    public record AuthResponse(String accessToken, String tokenType, long expiresIn, UserProfile user) {
        @Override public String toString() { return "AuthResponse[redacted]"; }
    }

    public record IssuedSession(AuthResponse response, String refreshToken) {
        @Override public String toString() { return "IssuedSession[redacted]"; }
    }

    public record Session(UUID id, UUID userId, Instant expiresAt, Instant revokedAt) {}
    public record RefreshToken(String hash, UUID sessionId, Instant expiresAt, Instant consumedAt) {}
    public record AuditEvent(long id, UUID actorId, String action, Instant createdAt) {}
}
