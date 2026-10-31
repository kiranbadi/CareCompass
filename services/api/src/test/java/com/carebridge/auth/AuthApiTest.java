package com.carebridge.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthApiTest {
    private static final String EMAIL = "guardian@example.com";
    private static final String PASSWORD = "A-long-demo-password!";
    private static final String AUTH = "/api/v1/auth";
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @BeforeEach
    void cleanDatabase() {
        jdbc.execute("TRUNCATE refresh_tokens, auth_sessions, audit_events, auth_rate_limits, users RESTART IDENTITY CASCADE");
    }

    @Test
    void preservesMethodAndMissingResourceErrors() throws Exception {
        mvc.perform(get(AUTH + "/login")).andExpect(status().isMethodNotAllowed());
        Session session = createSession();
        mvc.perform(get("/api/v1/nonexistent").header("Authorization", "Bearer " + session.access()))
            .andExpect(status().isNotFound());
    }

    @Test
    void registersASeekerWithoutTrustingClientVerification() throws Exception {
        register(EMAIL, "care_seeker")
            .andExpect(status().isCreated())
            .andExpect(jsonPath("role").value("care_seeker"))
            .andExpect(jsonPath("phone_verified").value(false))
            .andExpect(jsonPath("is_verified").value(false))
            .andExpect(jsonPath("hashed_password").doesNotExist());
        String hash = jdbc.queryForObject("SELECT hashed_password FROM users WHERE email=?", String.class, EMAIL);
        assertThat(hash).startsWith("$2").isNotEqualTo(PASSWORD);
    }

    @Test
    void registersProviderAndNormalizesEmail() throws Exception {
        register("PROVIDER@EXAMPLE.COM", "care_provider").andExpect(status().isCreated());
        assertThat(jdbc.queryForObject("SELECT email FROM users", String.class)).isEqualTo("provider@example.com");
    }

    @Test
    void forbidsPublicAdministratorRegistration() throws Exception {
        register(EMAIL, "site_admin").andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isZero();
    }

    @Test
    void rejectsInvalidEmailAndPasswordsExceedingBcryptByteLimit() throws Exception {
        register("not-an-email", "care_seeker").andExpect(status().isBadRequest());
        mvc.perform(securedPost(AUTH + "/register").contentType("application/json")
            .content(json.writeValueAsString(java.util.Map.of("email", EMAIL, "password", "é".repeat(40),
                "phone_number", "+14155550123", "role", "care_seeker"))))
            .andExpect(status().isBadRequest());
    }

    @Test
    void handlesDuplicateRegistrationWithoutLeakingDatabaseDetails() throws Exception {
        register(EMAIL, "care_seeker").andExpect(status().isCreated());
        register(EMAIL, "care_provider").andExpect(status().isConflict())
            .andExpect(jsonPath("message").value("Unable to create account with these details"));
    }

    @Test
    void issuesFifteenMinuteJwtWithExpectedClaimsAndHttpOnlyRefreshCookie() throws Exception {
        Session session = createSession();
        String[] parts = session.access().split("\\.");
        JsonNode claims = json.readTree(Base64.getUrlDecoder().decode(parts[1]));
        assertThat(claims.get("sub").asText()).isNotEmpty();
        assertThat(claims.get("role").asText()).isEqualTo("care_seeker");
        assertThat(claims.get("email").asText()).isEqualTo(EMAIL);
        assertThat(claims.get("is_verified").asBoolean()).isFalse();
        assertThat(claims.get("exp").asLong() - claims.get("iat").asLong()).isEqualTo(900);
        assertThat(claims.get("sid").asText()).isNotEmpty();
        assertThat(session.result().getResponse().getHeader("Set-Cookie")).contains("HttpOnly", "SameSite=Strict");
        String stored = jdbc.queryForObject("SELECT token_hash FROM refresh_tokens", String.class);
        assertThat(stored).hasSize(64).doesNotContain(session.cookie().getValue());
        assertThat(session.result().getResponse().getContentAsString()).doesNotContain(session.cookie().getValue());
    }

    @Test
    void givesSameErrorForWrongUnknownInactiveAndLockedAccounts() throws Exception {
        register(EMAIL, "care_seeker");
        failedLogin(EMAIL);
        failedLogin("unknown@example.com");
        jdbc.update("UPDATE users SET is_active=false WHERE email=?", EMAIL);
        login(EMAIL, PASSWORD).andExpect(status().isUnauthorized())
            .andExpect(jsonPath("message").value("Invalid credentials"));
        jdbc.update("UPDATE users SET is_active=true, locked_until=CURRENT_TIMESTAMP + INTERVAL '1 hour' WHERE email=?", EMAIL);
        login(EMAIL, PASSWORD).andExpect(status().isUnauthorized())
            .andExpect(jsonPath("message").value("Invalid credentials"));
    }

    @Test
    void persistsLockoutAfterFiveFailedAttemptsAndResetsAfterExpiry() throws Exception {
        register(EMAIL, "care_seeker");
        for (int i = 0; i < 5; i++) failedLogin(EMAIL);
        assertThat(jdbc.queryForObject("SELECT failed_login_attempts FROM users", Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT locked_until FROM users", Instant.class)).isAfter(Instant.now());
        login(EMAIL, PASSWORD).andExpect(status().isUnauthorized());
        jdbc.update("UPDATE users SET locked_until=CURRENT_TIMESTAMP - INTERVAL '1 second'");
        login(EMAIL, PASSWORD).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT failed_login_attempts FROM users", Integer.class)).isZero();
    }

    @Test
    void returnsRoleSpecificNavigationAndBlocksAdminAccess() throws Exception {
        Session session = createSession();
        mvc.perform(get(AUTH + "/me").header("Authorization", "Bearer " + session.access()))
            .andExpect(status().isOk()).andExpect(jsonPath("navigation[1].id").value("recipients"));
        mvc.perform(get("/api/v1/admin/audit").header("Authorization", "Bearer " + session.access()))
            .andExpect(status().isForbidden());
        mvc.perform(get(AUTH + "/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanInspectRealAuditEvents() throws Exception {
        register(EMAIL, "care_seeker");
        jdbc.update("UPDATE users SET role='site_admin'::user_role");
        Session session = sessionFrom(login(EMAIL, PASSWORD).andExpect(status().isOk()).andReturn());
        mvc.perform(get("/api/v1/admin/audit").header("Authorization", "Bearer " + session.access()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].action").value("LOGIN_SUCCESS"))
            .andExpect(jsonPath("$[0].password").doesNotExist());
    }

    @Test
    void rotatesRefreshTokenAndDetectsReplayByRevokingWholeSession() throws Exception {
        Session original = createSession();
        Session rotated = sessionFrom(refresh(original.cookie()).andExpect(status().isOk()).andReturn());
        assertThat(rotated.cookie().getValue()).isNotEqualTo(original.cookie().getValue());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM refresh_tokens WHERE consumed_at IS NOT NULL", Integer.class)).isEqualTo(1);
        refresh(original.cookie()).andExpect(status().isUnauthorized());
        refresh(rotated.cookie()).andExpect(status().isUnauthorized());
        mvc.perform(get(AUTH + "/me").header("Authorization", "Bearer " + rotated.access()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void concurrentRefreshHasExactlyOneWinnerAndReplayRevokesSession() throws Exception {
        Session original = createSession();
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> attempt = () -> refresh(original.cookie()).andReturn().getResponse().getStatus();
            var results = pool.invokeAll(List.of(attempt, attempt));
            assertThat(List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(200, 401);
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM auth_sessions WHERE revoked_at IS NULL", Integer.class)).isZero();
    }

    @Test
    void logoutRevokesAccessImmediatelyAndIsIdempotent() throws Exception {
        Session session = createSession();
        mvc.perform(securedPost(AUTH + "/logout").cookie(session.cookie()))
            .andExpect(status().isNoContent()).andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(get(AUTH + "/me").header("Authorization", "Bearer " + session.access()))
            .andExpect(status().isUnauthorized());
        refresh(session.cookie()).andExpect(status().isUnauthorized());
        mvc.perform(securedPost(AUTH + "/logout")).andExpect(status().isNoContent());
    }

    @Test
    void inactiveUsersCannotUseExistingAccessOrRefreshTokens() throws Exception {
        Session session = createSession();
        jdbc.update("UPDATE users SET is_active=false");
        mvc.perform(get(AUTH + "/me").header("Authorization", "Bearer " + session.access())).andExpect(status().isUnauthorized());
        refresh(session.cookie()).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsExpiredRefreshTokensAndTamperedJwt() throws Exception {
        Session session = createSession();
        jdbc.update("UPDATE auth_sessions SET expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second'");
        refresh(session.cookie()).andExpect(status().isUnauthorized());
        String[] parts = session.access().split("\\.");
        String forged = parts[0] + "." + Base64.getUrlEncoder().withoutPadding()
            .encodeToString("{\"sub\":\"attacker\",\"role\":\"site_admin\"}".getBytes(StandardCharsets.UTF_8)) + "." + parts[2];
        mvc.perform(get(AUTH + "/me").header("Authorization", "Bearer " + forged)).andExpect(status().isUnauthorized());
    }

    @Test
    void enforcesCsrfAndBootstrapsAUsableToken() throws Exception {
        mvc.perform(post(AUTH + "/login").contentType("application/json").content("{}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("code").value("CSRF_ERROR"));
        MvcResult result = mvc.perform(get(AUTH + "/csrf")).andExpect(status().isOk()).andReturn();
        String token = json.readTree(result.getResponse().getContentAsString()).get("token").asText();
        Cookie cookie = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        mvc.perform(post(AUTH + "/login").cookie(cookie).header("X-XSRF-TOKEN", token)
            .contentType("application/json").content("{\"email\":\"unknown@example.com\",\"password\":\"wrong\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void rateLimitsAuthAttemptsByNetworkPeer() throws Exception {
        failedLogin("unknown@example.com");
        jdbc.update("UPDATE auth_rate_limits SET attempts=1000");
        login("unknown@example.com", PASSWORD).andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"));
    }

    @Test
    void doesNotTrustForwardedIpHeadersToBypassRateLimits() throws Exception {
        failedLogin("unknown@example.com");
        jdbc.update("UPDATE auth_rate_limits SET attempts=1000");
        mvc.perform(securedPost(AUTH + "/login").header("X-Forwarded-For", "198.51.100.99")
            .contentType("application/json").content("{\"email\":\"unknown@example.com\",\"password\":\"wrong\"}"))
            .andExpect(status().isTooManyRequests());
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String role) throws Exception {
        return mvc.perform(securedPost(AUTH + "/register").contentType("application/json")
            .content(json.writeValueAsString(java.util.Map.of("email", email, "password", PASSWORD,
                "phone_number", "+14155550123", "role", role, "phone_verified", true))));
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
        return mvc.perform(securedPost(AUTH + "/login").contentType("application/json")
            .content(json.writeValueAsString(java.util.Map.of("email", email, "password", password))));
    }

    private void failedLogin(String email) throws Exception {
        login(email, "incorrect-password").andExpect(status().isUnauthorized())
            .andExpect(jsonPath("message").value("Invalid credentials"));
    }

    private Session createSession() throws Exception {
        register(EMAIL, "care_seeker").andExpect(status().isCreated());
        return sessionFrom(login(EMAIL, PASSWORD).andExpect(status().isOk()).andReturn());
    }

    private org.springframework.test.web.servlet.ResultActions refresh(Cookie cookie) throws Exception {
        return mvc.perform(securedPost(AUTH + "/refresh").cookie(cookie));
    }

    private Session sessionFrom(MvcResult result) throws Exception {
        Cookie cookie = result.getResponse().getCookie("carebridge_refresh");
        assertThat(cookie).isNotNull();
        return new Session(json.readTree(result.getResponse().getContentAsString()).get("access_token").asText(), cookie, result);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder securedPost(String path) throws Exception {
        MvcResult bootstrap = mvc.perform(get(AUTH + "/csrf")).andExpect(status().isOk()).andReturn();
        JsonNode data = json.readTree(bootstrap.getResponse().getContentAsString());
        return post(path).cookie(bootstrap.getResponse().getCookie("XSRF-TOKEN"))
            .header(data.get("header_name").asText(), data.get("token").asText());
    }

    private record Session(String access, Cookie cookie, MvcResult result) {}
}
