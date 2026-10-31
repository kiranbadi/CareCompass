# CareBridge Authentication Implementation Plan

**Goal:** Deliver a runnable responsive React website and a secure Spring Boot authentication API.

**Architecture:** npm workspace frontend; independently built Maven API; PostgreSQL schema managed by Flyway. Java records and TypeScript interfaces define contracts.

**Tech Stack:** React, TypeScript, Vite, Spring Boot, Spring Security, JdbcTemplate, PostgreSQL, Flyway, JUnit, Vitest.

1. Add root workspace scripts, Maven wrapper/configuration, Docker Compose database and application configuration. Preserve existing files.
2. Write API integration tests before implementation: registration restriction/validation, bcrypt, JWT expiry/claims, lockouts, hashed refresh rotation/replay, logout, inactive accounts, CSRF, RBAC and rate limits. Run to demonstrate missing endpoints, then implement migrations, repositories, services, controllers and guards. Run tests against PostgreSQL.
3. Write frontend tests for auth forms, generic errors, role navigation and session refresh. Run before implementation; implement typed API client, auth context, forms and responsive layouts, then rerun tests.
4. Add administrator seed CLI, curl recipes, security notes, Dockerfiles, CI and startup documentation. Build both applications and review security behavior and diff.
5. Run browser checks at mobile and desktop sizes. Report verified behavior and limitations without claiming deployment or compliance certification.
