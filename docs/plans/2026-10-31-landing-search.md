# CareBridge landing page and natural-language demo search

**Goal:** Add the requested public landing page, common registration/login entry points, care seeker/provider module previews and About Us, plus natural-language search over fictional provider data.

**Architecture:** Preserve existing React auth and Spring Boot APIs. Use lightweight hash navigation for public pages and the authenticated workspace, without adding a router dependency. Public content stays available during backend loading or failure. Both registration entry points use the same form, with the role optionally preselected. Backend authorization remains authoritative.

**Search scope:** Local concept/synonym matching over a typed static provider catalog, with location, schedule and maximum-rate filters. This is explicitly an MVP approximation of semantic search, not a learned embedding model or live provider directory. All profiles, service descriptions and availability are fictional. Avoid invented trust metrics and real health information. Search works without network/API keys; real embedding search and Spring AI remain future work.

**Implementation and verification:**
1. Add search and landing navigation tests before implementation; verify failures.
2. Implement typed sample data and deterministic natural-language matching, including unsupported-query and zero-results handling.
3. Add public home, role-module preview pages, shared registration/login routing and home links in the authenticated workspace.
4. Add responsive styling matching the green/cream brand. Preserve existing auth tests; verify the public home renders when the backend is unavailable.
5. Run frontend tests and production build, then inspect desktop/mobile layouts and browser navigation. Update README with demo search limitations.
