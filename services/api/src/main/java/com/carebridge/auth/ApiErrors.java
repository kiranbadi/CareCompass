package com.carebridge.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.ErrorResponse;
import java.io.IOException;

@RestControllerAdvice
public class ApiErrors {
    public record ErrorBody(String code, String message) {}

    public static void write(ObjectMapper mapper, HttpServletResponse response, int status,
                             String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setHeader("Cache-Control", "no-store");
        mapper.writeValue(response.getOutputStream(), new ErrorBody(code, message));
    }

    @ExceptionHandler(AuthException.class)
    ResponseEntity<ErrorBody> auth(AuthException error) {
        return ResponseEntity.status(error.status()).body(new ErrorBody(error.code(), error.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<ErrorBody> validation(Exception ignored) {
        return ResponseEntity.badRequest().body(new ErrorBody("VALIDATION_ERROR", "Check the submitted fields."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorBody> forbidden(AccessDeniedException ignored) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorBody("FORBIDDEN", "Access denied"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ErrorBody> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(new ErrorBody("REQUEST_ERROR", "Unable to complete request"));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorBody> unexpected(Exception ignored) {
        if (ignored instanceof ErrorResponse framework) {
            return ResponseEntity.status(framework.getStatusCode()).headers(framework.getHeaders())
                    .body(new ErrorBody("REQUEST_ERROR", "Unable to complete request"));
        }
        // Never echo SQL errors, credentials, token values or request bodies.
        return ResponseEntity.internalServerError().body(new ErrorBody("INTERNAL_ERROR", "Unable to complete request. Please try again."));
    }
}
