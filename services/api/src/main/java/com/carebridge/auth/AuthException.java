package com.carebridge.auth;

import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public AuthException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
    public HttpStatus status() { return status; }
    public String code() { return code; }
    public static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
    }
    public static AuthException invalidSession() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_SESSION", "Session expired. Please sign in again.");
    }
}
