package com.carebridge.auth;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import java.util.Arrays;

/** Java/Spring equivalent of require_roles(['site_admin']). */
@Component("roles")
public class RoleGuard {
    public boolean requireRoles(Authentication authentication, String... roles) {
        return authentication != null && authentication.isAuthenticated() && Arrays.stream(roles)
                .anyMatch(role -> authentication.getAuthorities().stream()
                        .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role)));
    }
}
