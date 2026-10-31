package com.carebridge.auth;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AuthRepository repository;
    public AdminController(AuthRepository repository) { this.repository = repository; }

    @GetMapping("/audit")
    @PreAuthorize("@roles.requireRoles(authentication, 'site_admin')")
    public List<AuthModels.AuditEvent> audit() { return repository.auditEvents(); }
}
