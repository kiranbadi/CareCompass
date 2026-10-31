package com.carebridge.auth;

import jakarta.validation.Validation;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Explicit CLI only. This class is intentionally not a Spring component or HTTP endpoint. */
public final class AdminSeedCommand {
    private AdminSeedCommand() {}

    public static void main(String[] args) {
        String email = required("ADMIN_EMAIL");
        String password = required("ADMIN_PASSWORD");
        String phone = required("ADMIN_PHONE_NUMBER");
        var request = new AuthModels.RegisterRequest(email, password, phone, AuthModels.Role.site_admin, false);
        try (var validation = Validation.buildDefaultValidatorFactory()) {
            if (!validation.getValidator().validate(request).isEmpty()
                    || password.getBytes(StandardCharsets.UTF_8).length > 72) {
                throw new IllegalArgumentException("Administrator details do not satisfy registration validation");
            }
        }
        var dataSource = new DriverManagerDataSource(required("DB_URL"), required("DB_USERNAME"), required("DB_PASSWORD"));
        Flyway.configure().dataSource(dataSource).load().migrate();
        var repository = new AuthRepository(new JdbcTemplate(dataSource));
        var transaction = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        transaction.executeWithoutResult(status -> {
            UUID id = UUID.randomUUID();
            if (!repository.createUser(id, AuthService.normalizeEmail(email), new BCryptPasswordEncoder(12).encode(password),
                    phone, AuthModels.Role.site_admin, true)) {
                throw new IllegalStateException("Account already exists; no account or permission was changed");
            }
            repository.audit(id, "ADMIN_CREATED_VIA_CLI");
        });
        System.out.println("Administrator created. No credentials were printed.");
    }

    private static String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Required environment variable is missing: " + name);
        return value;
    }
}
