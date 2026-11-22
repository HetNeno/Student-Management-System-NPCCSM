# NPCCSM Portal — Setup and Testing

## Prerequisites (Windows)

- PHP 8.3 with `pdo_mysql` enabled (`php -m` should list `pdo_mysql`)
- MySQL 8 (service `MySQL80`)
- Node.js 18+

## First-time setup

```bash
# 1. Backend config
cd NPCCSM-PHP
copy .env.example .env          # then fill DB_USERNAME, DB_PASSWORD, GROQ_API_KEY
php artisan key:generate        # only if APP_KEY is empty

# 2. Database (non-destructive; creates tables that don't exist yet)
#    CREATE DATABASE npccsm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
php artisan migrate
php artisan db:seed             # curriculum + project catalogue (idempotent, no users)
php artisan npccsm:rag-ingest-syllabus

# 3. First principal account (password is prompted, hidden)
php artisan npccsm:create-user --role=principal --email=principal@example.com --name="Principal Name"

# 4. Check Groq
php artisan npccsm:groq-check

# 5. Frontend deps
cd ..
npm install
```

Teacher accounts are then created by the principal from the dashboard (**Accounts → Add teacher**). Students register at `/signup`.

## Running

| Mode | Command | URL |
|---|---|---|
| Development | `npm run dev` (starts Laravel on :8000 with a 20 MB upload limit **and** Vite on :3000) | http://localhost:3000 |
| Production-like | `npm run build`, then `cd NPCCSM-PHP && php artisan serve` | http://127.0.0.1:8000 |

> If you ever run `php artisan config:cache`, re-run it after every `.env` change (or use `php artisan config:clear`). A stale cache was one of the original bugs.

## Automated tests

```bash
cd NPCCSM-PHP
php vendor/bin/phpunit           # or: npm run test:api from the repo root
```

- The tests run against a **separate** database, `npccsm_test`. `phpunit.xml` forces it, and `tests/TestCase::createApplication()` refuses to run against any other database, so `RefreshDatabase` can never touch `npccsm`.
- Create it once: `CREATE DATABASE npccsm_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
- Groq calls are faked with `Http::fake()`. No real key is needed and no quota is used.

| Suite | Covers |
|---|---|
| `AuthTest` | signup stores a bcrypt hash; client-sent `role` ignored; duplicate email (case-insensitive); invalid data; login, redirect per role; generic invalid-credential message; disabled account; legacy plaintext never authenticates; logout; JSON 401 for guests; login rate limit; session + CSRF middleware on the API |
| `RoleAccessTest` | student blocked from teacher/principal endpoints; teacher blocked from principal endpoints; lecture JSON round-trip; principal creates/disables teachers; principals not disable-able via API; disabled user's live session is ended |
| `ProjectTest` | only published projects for students; empty state; filters and search; start → milestones → completed; idempotent start; invalid milestone index; teacher creates a project and sees student progress; delete is principal-only; drafts hidden from students |
| `RagTest` | syllabus ingestion and re-ingestion without duplicates; retrieval + Groq request shape (server-side bearer key, model, system prompt, context); 429 rate limit; 503 outage; missing key; auth required |
| `TextChunkerTest` | bounded chunk count (regression for the tail-loop bug), UTF-8 safety, edge cases |

| `SemesterLockTest` | Sem-5 student gets only Sem-5 courses/lectures/projects/materials/notices/AI passages even when asking for Sem 6; Sem-6 curriculum present; guarded downloads; subject/semester mismatch rejected; students cannot upload/post; lecture notes and notices become searchable; only principal changes a student's semester; revision tracker accepts only own-semester syllabus topics |

Last run: **45 tests, 226 assertions, all passing.**

## End-to-end smoke test (real HTTP, real MySQL)

Run against `php artisan serve` with the built SPA. These were checked with `curl` and a cookie jar, using real session and CSRF:

| Check | Result |
|---|---|
| `/`, `/student/projects` deep link and the logo asset are served by Laravel | 200 |
| `/api/auth/me` as guest | 401 JSON |
| POST without CSRF token | **419** |
| Invalid signup | 422 |
| Signup with `"role":"principal"` in the body | 201, role = **student** |
| Student calls a teacher endpoint, `/api/users`, `/api/rag/reset` | 403 / 403 / 403 |
| Student project list (6 projects from MySQL), start project, save a milestone | 200 / 201 / 200 |
| AI query with no Groq key | 503 `not_configured`, while still retrieving 3 curriculum passages (top: CAM210-2C Operating System) |
| Logout, then `/api/auth/me` and `/api/projects` | 401 / 401 |
| Wrong password, then correct password (different letter case) | 422, then 200 with `redirect: /student` |
| Progress persists across sessions | in_progress, milestone [0], 25% |

The temporary account `smoke-test@npccsm.local` was deleted afterwards.

## Manual browser checklist

1. Open `/`: the logo shows, the three portals are listed, and both "Sign in" and "Create an account" work.
2. Sign up as a student, which lands you on `/student`. Open **Projects**: one numbered list in a single container. Start a project and tick milestones, then reload; progress is kept.
3. Open `/teacher` or `/principal` as that student: you are sent back to `/student`.
4. Sign in as the principal. **Accounts → Add teacher**. Check that the AI panel shows "key configured".
5. Sign in as the teacher. **Student projects** shows enrolment counts and student progress.
6. Ask Nova a syllabus question. You should see the typing dots, the answer and a "Sources" line. Then remove the Groq key and confirm a clear error with "Try again" appears.
7. Turn on *Reduce motion* in the OS: transitions should stop.
