package com.carebridge.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DataAccessException;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Clock;

public class AuthRateLimitFilter extends OncePerRequestFilter {
    private final AuthRepository repository;
    private final AuthSettings settings;
    private final ObjectMapper mapper;
    private final Clock clock;

    public AuthRateLimitFilter(AuthRepository repository, AuthSettings settings, ObjectMapper mapper, Clock clock) {
        this.repository = repository; this.settings = settings; this.mapper = mapper; this.clock = clock;
    }

    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getMethod().equals("POST") || !request.getRequestURI().startsWith("/api/v1/auth/");
    }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        try {
            // Forwarded headers are deliberately not trusted. Configure trusted ingress separately.
            int count = repository.incrementRateWindow(TokenService.hash(request.getRemoteAddr()), clock.instant());
            if (count > settings.rateLimit()) {
                response.setHeader("Retry-After", "60");
                ApiErrors.write(mapper, response, 429, "RATE_LIMITED", "Too many attempts. Please try again in a minute.");
                return;
            }
            if (count == 1) repository.pruneRateWindows(clock.instant());
        } catch (DataAccessException ignored) {
            ApiErrors.write(mapper, response, 503, "UNAVAILABLE", "CareBridge is temporarily unavailable. Please try again.");
            return;
        }
        chain.doFilter(request, response);
    }
}
