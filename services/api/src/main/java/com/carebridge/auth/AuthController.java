package com.carebridge.auth;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.UUID;
import static com.carebridge.auth.AuthModels.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    private final AuthRepository repository;
    private final AuthSettings settings;

    public AuthController(AuthService service, AuthRepository repository, AuthSettings settings) {
        this.service = service; this.repository = repository; this.settings = settings;
    }

    public record CsrfResponse(String token, String headerName) {}

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) { return new CsrfResponse(token.getToken(), token.getHeaderName()); }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserProfile register(@Valid @RequestBody RegisterRequest request) { return service.register(request); }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        IssuedSession session = service.login(request);
        setRefreshCookie(response, session.refreshToken(), settings.refreshTtl());
        return session.response();
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@CookieValue(name = "carebridge_refresh", required = false) String token,
                                HttpServletResponse response) {
        IssuedSession session = service.refresh(token);
        setRefreshCookie(response, session.refreshToken(), settings.refreshTtl());
        return session.response();
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@CookieValue(name = "carebridge_refresh", required = false) String token,
                       HttpServletResponse response) {
        service.logout(token);
        setRefreshCookie(response, "", Duration.ZERO);
    }

    @GetMapping("/me")
    public UserProfile me(@AuthenticationPrincipal Jwt token) {
        return UserProfile.from(repository.findById(UUID.fromString(token.getSubject())).orElseThrow(AuthException::invalidSession));
    }

    private void setRefreshCookie(HttpServletResponse response, String value, Duration maxAge) {
        response.addHeader(HttpHeaders.SET_COOKIE, ResponseCookie.from("carebridge_refresh", value)
                .httpOnly(true).secure(settings.cookieSecure()).sameSite("Strict")
                .path("/api/v1/auth").maxAge(maxAge).build().toString());
    }
}
