# Deprecated: legacy Express + PostgreSQL server

This folder is kept for reference only. It is **not** started by any npm script and
is **not** used by the React app.

Everything it did now lives in the Laravel app (`NPCCSM-PHP/`), backed by MySQL:

| Express (legacy)                         | Laravel (current)                              |
|------------------------------------------|------------------------------------------------|
| `POST /api/auth/login` (plaintext passwords, no session) | `POST /api/auth/login` (bcrypt, session, CSRF, rate limit) |
| lecture updates / progress / history     | `App\Http\Controllers\Api\AcademicController`   |
| `server/rag/*` (pg full-text + Gemini)   | `App\Services\Rag\*` (MySQL FULLTEXT) + `App\Services\Ai\GroqClient` |

Do not deploy it: its endpoints have no authentication. See `docs/architecture.md`.
