# NPCCSM Architecture

The maintained architecture document is **[../docs/architecture.md](../docs/architecture.md)**.

Related:
- [../docs/project-audit.md](../docs/project-audit.md) — the audit: bugs found, their root causes, and how each was resolved
- [../docs/setup-and-testing.md](../docs/setup-and-testing.md) — local setup, accounts, and how to run the tests

Summary: Laravel 12 is the only backend (session + CSRF JSON API) on MySQL 8 (`npccsm`). The React SPA is the only UI and is served by Laravel in production. The AI assistant uses MySQL FULLTEXT retrieval and Groq on the server. Earlier drafts of this file described Gemini and a PostgreSQL migration; both are superseded.
