package com.carebridge.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.*;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.Clock;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(AuthSettings.class)
public class SecurityConfig {
    @Bean Clock clock() { return Clock.systemUTC(); }
    @Bean PasswordEncoder passwordEncoder(AuthSettings settings) { return new BCryptPasswordEncoder(settings.bcryptStrength()); }

    @Bean SecretKey jwtKey(AuthSettings settings) {
        try {
            byte[] bytes = Base64.getDecoder().decode(settings.jwtSecret());
            if (bytes.length < 32) throw new IllegalArgumentException();
            return new SecretKeySpec(bytes, "HmacSHA256");
        } catch (IllegalArgumentException | NullPointerException ignored) {
            throw new IllegalStateException("AUTH_JWT_SECRET must be a Base64-encoded random secret of at least 32 bytes");
        }
    }

    @Bean JwtEncoder jwtEncoder(SecretKey key) { return new NimbusJwtEncoder(new ImmutableSecret<>(key)); }

    @Bean JwtDecoder jwtDecoder(SecretKey key, AuthSettings settings) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains(settings.audience())
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(settings.issuer()), audience));
        return decoder;
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, JwtDecoder decoder, AuthRepository repository,
            AuthSettings settings, ObjectMapper mapper, Clock clock) throws Exception {
        CookieCsrfTokenRepository csrf = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrf.setCookieCustomizer(cookie -> cookie.path("/").sameSite("Strict").secure(settings.cookieSecure()));
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .requestCache(cache -> cache.disable())
            .csrf(config -> config.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .authorizeHttpRequests(requests -> requests
                .requestMatchers("/api/v1/auth/csrf", "/api/v1/auth/register", "/api/v1/auth/login",
                        "/api/v1/auth/refresh", "/api/v1/auth/logout", "/error").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, error) ->
                    ApiErrors.write(mapper, response, 401, "UNAUTHORIZED", "Authentication required"))
                .accessDeniedHandler((request, response, error) -> {
                    boolean csrfError = error instanceof CsrfException;
                    ApiErrors.write(mapper, response, 403, csrfError ? "CSRF_ERROR" : "FORBIDDEN",
                            csrfError ? "Security token expired. Please retry." : "Access denied");
                }))
            .oauth2ResourceServer(oauth -> oauth
                .authenticationEntryPoint((request, response, error) ->
                    ApiErrors.write(mapper, response, 401, "INVALID_SESSION", "Session expired. Please sign in again."))
                .jwt(jwt -> jwt.decoder(decoder).jwtAuthenticationConverter(token -> authenticate(token, repository, clock))))
            .addFilterAfter(new AuthRateLimitFilter(repository, settings, mapper, clock), CsrfFilter.class);
        return http.build();
    }

    private AbstractAuthenticationToken authenticate(Jwt token, AuthRepository repository, Clock clock) {
        try {
            UUID userId = UUID.fromString(token.getSubject());
            UUID sessionId = UUID.fromString(token.getClaimAsString("sid"));
            AuthModels.User user = repository.activeUser(userId, sessionId, clock.instant())
                    .orElseThrow(() -> new OAuth2AuthenticationException(new OAuth2Error("invalid_token")));
            if (!user.role().name().equals(token.getClaimAsString("role"))) {
                throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
            }
            return new JwtAuthenticationToken(token, List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name())));
        } catch (IllegalArgumentException | NullPointerException ignored) {
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
        }
    }
}
