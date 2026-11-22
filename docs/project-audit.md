# NPCCSM Portal — Project Audit

Audit date: 2026-11-22. Scope: the whole repository (`src/`, `NPCCSM-PHP/`, `server/`, `api/`, `database/`, `supabase/`).

Each bug below states how it was verified:
- **[R]** reproduced against the running app (`php artisan serve`, `curl`, PHP/PDO probes).
- **[C]** confirmed by reading the code path end to end. These are bugs where the code has no path that could work (for example, a feature that does not exist).

---

## 1. What the portal is

An academic portal for NPCCSM's BCA programme with three roles:

| Role | What it does today |
|---|---|
| Student | Semester dashboard, syllabus coverage per subject/unit/topic, project ideas with milestone tracking, resource centre, AI "career mentor" chat |
| Teacher (shown as "Faculty") | Picks semester + subject, marks covered topics with a mandatory note per topic, publishes a lecture update; stale-subject reminders |
| Principal | Semester completion overview and subjects below 60% coverage |

The syllabus structure (6 semesters, subjects, units, topics) is a bundled JS module (`src/data/syllabusDatabase.js`). Coverage changes are published by teachers into the database.

## 2. Existing architecture (as found)

```text
                 Browser
                    |
   React 18 + Vite SPA (src/, port 3000)          Blade views (NPCCSM-PHP/resources/views)
     - BrowserRouter, AuthContext, SyllabusContext   - a second, partial UI on the same routes
     - fetch() to VITE_API_URL (default :8000)
                    |
                    v
   Laravel 12 (NPCCSM-PHP/, port 8000)  <-- intended primary backend, half-ported
     - routes/web.php : Blade login + role dashboards (session auth)
     - routes/api.php : JSON API for React (auth, lecture updates, progress, RAG)
     - RagController  : MySQL FULLTEXT retrieval + Gemini generation
                    |
                    v
   Configured DB: PostgreSQL (DB_CONNECTION=pgsql)  -- migrations target MySQL

   Legacy, still in repo:
     server/ (Express + pg)  : old API + RAG, no auth, plaintext passwords
     api/chat.js, src/api/careerChat.js : serverless chat handlers, unused
     supabase/schema.sql     : old Supabase schema with permissive RLS
```

Key facts:
- **Laravel is the intended single backend.** `NPCCSM-PHP/ARCHITECTURE.md` says so, and React's `vite.config.js` proxies `/api` to `:8000`.
- **React is the real UI.** The Blade views are a parallel partial port that duplicates the React screens.
- **Express (`server/`) is not used by the React app any more.** `apiClient.js` and `ragService.js` both point at Laravel. Laravel's `RagController` already covers query, text/PDF ingest, stats, jobs and reset.

## 3. Environment status

| Item | Status |
|---|---|
| PHP | 8.3.33 installed (WinGet). `artisan` runs, Laravel 12.73.0 |
| Composer | Not on PATH (`vendor/` already installed) |
| MySQL | Service `MySQL80` **running**, listening on 3306 |
| PostgreSQL | Service `postgresql-x64-18` running on 5432 |
| `pdo_mysql` PHP extension | **Not enabled.** `php_pdo_mysql.dll` ships with PHP, but `extension=pdo_mysql` is commented out in `php.ini` |
| Laravel `.env` | `DB_CONNECTION=pgsql`, port 5432, Postgres credentials. **No MySQL credentials present** |
| Existing Postgres `npccsm_db` | Reachable. Contains only an empty `migrations` table: **no users, courses or any app data** |
| Laravel config cache | `bootstrap/cache/config.php` exists and pins `pgsql` + old CORS origins |
| `GEMINI_API_KEY` | Empty |
| Groq configuration | None |
| Frontend build (`npm run build`) | Passes |
| Laravel tests | None exist (no `tests/`, no `phpunit.xml`); PHPUnit is in `vendor/` |

## 4. Verified bugs

| # | Bug | Evidence | Root cause | Affected files |
|---|---|---|---|---|
| B1 | React login/logout through the API returns **500 "Session store not set on request"** | [R] `POST /api/auth/logout` → 500, logged `RuntimeException: Session store not set on request` | `routes/api.php` runs in Laravel's stateless `api` middleware group (no `StartSession`, no cookies). `Auth::login()` + `$request->session()->regenerate()` cannot work there | `NPCCSM-PHP/routes/api.php`, `NPCCSM-PHP/bootstrap/app.php` |
| B2 | Login returns **500 "relation users does not exist"** | [R] `POST /api/auth/login` → 500, `SQLSTATE[42P01]` | `.env` points at Postgres `npccsm_db`, where migrations were never run. The migrations are written for MySQL anyway (`FULLTEXT`, `ALTER TABLE … ADD FULLTEXT`) | `NPCCSM-PHP/.env`, `database/migrations/*` |
| B3 | Every React API call is **blocked by CORS** in dev | [R] Preflight from `Origin: http://localhost:3000` returns 204 with **no** `Access-Control-Allow-Origin` | `apiClient.js`/`ragService.js` default to absolute `http://localhost:8000` (cross-origin), while `config/cors.php` only allows `:5173`. The Vite proxy that would make requests same-origin is bypassed | `src/lib/apiClient.js`, `src/services/ragService.js`, `NPCCSM-PHP/config/cors.php` |
| B4 | **`.env` changes are ignored** | [R] `bootstrap/cache/config.php` has `database.default = pgsql`, CORS `:5173` | A stale `php artisan config:cache` result was left in the tree | `NPCCSM-PHP/bootstrap/cache/config.php` |
| B5 | AI answers are **never generated**, even with a key set | [R]+[C] Config is cached (B4), and `RagController::generateAnswer()` calls `env('GEMINI_API_KEY')` directly. With a cached config `env()` returns `null`, so the method always returns `null` | `env()` used outside `config/` files; provider is Gemini, not Groq | `NPCCSM-PHP/app/Http/Controllers/Api/RagController.php` |
| B6 | Validation and auth errors reach React as **HTML redirects, not JSON** | [R] `POST /api/auth/login` with `{}` and no `Accept` header → **302** to `/`. `GET /api/auth/me` → **302** to `/login` | `apiFetch()` does not send `Accept: application/json`, so Laravel treats requests as browser navigations. `res.json()` then throws on HTML, and the user sees a parse error instead of the message | `src/lib/apiClient.js` |
| B7 | **No signup exists** | [C] No register route in `web.php`/`api.php`, no React page, no `email` column on `users` | Feature never built | `routes/*`, `src/pages/*`, migrations |
| B8 | **No way to create any account** (not even teacher/principal) | [C] No seeder, no artisan command, no admin UI. `ARCHITECTURE.md` says legacy plaintext users are intentionally not imported | Provisioning never built | `database/`, `routes/console.php` |
| B9 | Login identifies users by **username + a role chosen in the UI**; there is no email login | [C] `AuthenticatedSessionController@store` and `api.php` filter `where('role', $request->role)` | Design: the role picker is part of the credential. Not a privilege-escalation hole (a wrong role simply fails), but it is not the required email/password flow | `AuthenticatedSessionController.php`, `api.php`, `LoginPage.jsx` |
| B10 | `/api/auth/login` has **no rate limiting** | [R] `route:list` shows `throttle:5,1` only on web `POST /login` | Missing middleware | `routes/api.php` |
| B11 | Student **projects are hard-coded** and progress lives in **localStorage** | [C] `PROJECTS_DATA` constant in `src/pages/student/StudentProjects.jsx`; `localStorage.setItem('npccsm_projects_…')` | Never connected to the backend; progress is lost per browser and invisible to teachers | `src/pages/student/StudentProjects.jsx` |
| B12 | Project list uses a **grid of separate cards** | [C] `grid sm:grid-cols-2` with one card per project | Design choice, conflicts with the requirement | same |
| B13 | AI provider is **Gemini**, the requirement is **Groq** | [C] `generateAnswer()` posts to `generativelanguage.googleapis.com` | — | `RagController.php`, `.env.example` |
| B14 | The **RAG store is empty** and there is no way to ingest the syllabus from Laravel | [C] Express had `POST /api/rag/ingest/syllabus`; the Laravel port has text/PDF only. `rag_documents` has never been populated | Incomplete port | `RagController.php`, `routes/api.php` |
| B15 | RAG chunker **can split UTF-8 characters** | [C] `chunkText()` uses byte-based `substr($text, $offset, 800)` | Should use `mb_*` functions | `RagController.php` |
| B16 | No AI **timeout/rate-limit/error** reporting to the user | [C] HTTP failures return `answer: null`; the UI then dumps raw chunks or "No academic answer…" | Missing error contract | `RagController.php`, `src/lib/chatbotApi.js` |
| B17 | `/api/rag/stats` and `/api/rag/jobs` are readable by **students** | [C] Only ingest/reset carry `role:principal` | Missing authorization | `routes/api.php` |
| B18 | Blade UI and React UI **both own the same URLs** (`/login`, `/student`, …) | [R] `GET /student` on `:8000` serves Blade (redirect to Blade login), while React serves the same paths on `:3000` | Two frontends were kept during the port | `routes/web.php`, `resources/views/*` |

### Legacy-code issues (not on the live path, documented for completeness)

- `server/index.js` (Express): every endpoint is unauthenticated. Login compares **plaintext** passwords. `database/init.sql` seeds plaintext demo users.
- `supabase/schema.sql`: permissive RLS policies.
- Unused/duplicate components: `src/pages/StudentPortal.jsx`, `src/pages/StudentDashboard.jsx`, `src/pages/StudentProjects.jsx` (older copy), `src/components/chat/*`, `src/components/chatbot/*`, `api/chat.js`, `src/api/careerChat.js`.

## 5. Role analysis

- Roles are stored as `users.role ENUM('student','teacher','principal')`.
- **Backend enforcement:** `RoleMiddleware` (`role:` alias) is applied correctly to web and API groups. Teacher/principal write endpoints are protected.
- **Frontend:** `ProtectedRoute` checks `user.role` from `/api/auth/me`. That is UX only, which is correct as long as the backend enforces access, and it does.
- **Gap:** there is no account lifecycle (status, activation, creation). Nobody can be a teacher or principal because nobody can be created at all (B8).

## 6. Project management analysis

- There is no project data model. Six project ideas are a JS constant; "start project" and milestone checkboxes go to `localStorage`.
- Teachers and principal have no visibility into student projects.
- Filters exist (category, difficulty) and must be preserved.

## 7. AI / RAG analysis

| Piece | Status |
|---|---|
| Retrieval | Laravel `RagController::query`: MySQL `FULLTEXT MATCH … AGAINST`, with a `LIKE` fallback. Works only once data is in MySQL |
| Ingestion | Text and PDF (smalot/pdfparser) into `rag_documents`, with job rows in `rag_ingestion_jobs`. Syllabus ingestion was not ported |
| Embeddings | `server/rag/embeddings.js` exists but is never called. Retrieval is keyword-based, not vector |
| Generation | Gemini via `env()` (broken, B5). Must move to Groq |
| Chat UI | Routed page `/student/career` (`StudentCareer.jsx`) calls `askGemini()`, which calls `/api/rag/query`. `ChatbotWidget.jsx` is only used by the unrouted `StudentPortal.jsx` |
| Chat history | Kept only in component state; `rag_query_logs` records queries |

## 8. Proposed fixes (summary — the full plan is in section 10)

1. **Database:** switch Laravel to MySQL, enable `pdo_mysql`, clear the stale config cache, and run the existing migrations plus new additive ones. Postgres holds no data, so nothing needs migrating.
2. **Auth:** give the API stateful session + CSRF middleware (SPA cookie auth, no tokens in localStorage). Add an `email` and `status` to users. Add public **student-only** signup. Log in by email + password, with the role coming from the database rather than the UI. Rate-limit login and signup.
3. **Provisioning:** an artisan command to create the first principal. A principal-only API/UI to create teacher accounts. Never accept `role` from the public form.
4. **API client:** relative URLs through the Vite proxy (same-origin, no CORS), `Accept: application/json`, `X-XSRF-TOKEN`, and robust error parsing.
5. **Projects:** `projects` + `project_enrollments` tables. The current six projects are seeded as the initial catalogue. Students start and track progress in MySQL; teachers and the principal manage the catalogue. The UI becomes one numbered list in a single container.
6. **AI:** a `GroqService` with server-side key, timeout, retry, rate-limit handling and a typed error contract. Syllabus ingestion is ported to Laravel. Retrieval is preserved.
7. **Frontend boundary:** React is the only UI. Laravel's Blade pages are retired from the router, and Laravel serves the built SPA in production. Express is marked legacy and not started.
8. **Tests:** Laravel feature tests for signup, login, roles, projects and RAG (with Groq faked), plus the frontend build.

## 9. Missing requirements / open questions

| Item | Needed from the owner |
|---|---|
| MySQL credentials | User and password for the local MySQL80 server (entered into `NPCCSM-PHP/.env` by the owner; never committed) |
| Enable `pdo_mysql` | One-line change in the PHP install's `php.ini` (outside the repo) |
| Groq API key | `GROQ_API_KEY` in `NPCCSM-PHP/.env` |
| First principal account | Created by the owner with `php artisan npccsm:create-user --role=principal` |

## 10. Implementation plan and affected files

| Priority | Work | Files |
|---|---|---|
| P1 MySQL | `.env`/`.env.example`, clear config cache, new additive migrations (users email/status, sessions, projects) | `NPCCSM-PHP/.env*`, `bootstrap/cache/config.php` (deleted — generated file), `database/migrations/*` |
| P2 Auth | Session+CSRF on API, `RegisteredUserController`, `AuthController` (API), Form Requests, `CreateUser` artisan command, React `SignupPage`, `LoginPage` (email), `AuthContext`, `apiClient` | `bootstrap/app.php`, `routes/api.php`, `routes/web.php`, `routes/console.php`, `app/Http/Controllers/Auth/*`, `app/Http/Requests/*`, `app/Models/User.php`, `src/pages/*`, `src/context/AuthContext.jsx`, `src/lib/apiClient.js`, `src/App.jsx` |
| P3 Roles | Controllers out of route closures, principal teacher-management endpoint, RAG stats/jobs restricted | `app/Http/Controllers/Api/*`, `routes/api.php`, `src/pages/PrincipalDashboard.jsx` |
| P4 Projects | Models, controller, seeder, unified list UI | `app/Models/Project*.php`, `app/Http/Controllers/Api/ProjectController.php`, `database/seeders/*`, `src/pages/student/StudentProjects.jsx` |
| P5 Groq | `config/services.php`, `app/Services/Ai/GroqClient.php`, `app/Services/Rag/*`, chat UI animations | `RagController.php`, `src/pages/student/StudentCareer.jsx`, `src/lib/chatbotApi.js` |
| P6 Branding | Official logo asset, landing content from npccsm.in | `public/` asset, `src/pages/LandingPage.jsx`, `LoginPage.jsx`, `StudentLayout.jsx` |
| P7 UI | Transitions, reduced motion, states | `src/index.css`, shared components |
| P8 Tests/docs | `phpunit.xml`, `tests/Feature/*`, `docs/architecture.md` | `NPCCSM-PHP/tests/*`, `docs/*` |

---

## 11. Resolution log

Implemented on 2026-11-22. Verified by 35 Laravel feature tests and an HTTP smoke test against the real MySQL database (see [setup-and-testing.md](setup-and-testing.md)). Design: [architecture.md](architecture.md).

| # | Status | Fix |
|---|---|---|
| B1 | Fixed | `api` group now has cookies, session and CSRF (`bootstrap/app.php`) |
| B2 | Fixed | `.env` → MySQL `npccsm`; `pdo_mysql` enabled in php.ini (backup `php.ini.bak-npccsm`); migrations and seeders run |
| B3 | Fixed | SPA uses same-origin relative URLs (Vite proxy in dev, Laravel-served in prod) |
| B4 | Fixed | Stale config cache cleared |
| B5 | Fixed | No runtime `env()`; Groq config is in `config/services.php` |
| B6 | Fixed | `apiClient` sends `Accept: application/json`; API errors are always JSON (`shouldRenderJsonWhen`) |
| B7 | Fixed | Student signup (`/signup`, `POST /api/auth/register`) |
| B8 | Fixed | `php artisan npccsm:create-user`; principal creates teachers in the dashboard |
| B9 | Fixed | Email + password login; role taken from the DB; redirect per role |
| B10 | Fixed | `throttle:login` (5/min per email+IP, 20/min per IP), `throttle:register`, `throttle:ai` |
| B11/B12 | Fixed | `projects` + `project_enrollments` tables; one numbered list in a single container |
| B13 | Fixed | `GroqClient` (model `openai/gpt-oss-120b`) |
| B14 | Fixed | `POST /api/rag/ingest/syllabus` and `npccsm:rag-ingest-syllabus` (59 passages) |
| B15 | Fixed | `TextChunker` uses `mb_*` |
| B16 | Fixed | Typed AI errors (429/503 + `error.code`), shown in the chat UI |
| B17 | Fixed | RAG stats/jobs are principal-only |
| B18 | Fixed | Blade duplicate UI removed; Laravel serves the SPA |

### Additional bugs found and fixed during implementation

| # | Bug | Evidence | Fix |
|---|---|---|---|
| B19 | Lecture-update JSON columns returned as **strings** (`DB::table`), so the SPA's `Array.isArray(row.covered_topic)` failed and coverage showed as empty | Regression test `test_teacher_publishes_lecture_update_and_json_columns_round_trip_as_arrays` | `AcademicController` uses the Eloquent models with array casts |
| B20 | RAG chunker re-chunked the tail of every document one character at a time (1,316 passages for 21 subjects; the same flaw exists in `server/rag/chunker.js`) | Observed on the first real ingest | Loop stops at the end of the text; `TextChunkerTest` |
| B21 | Chat showed **canned advice presented as an AI answer** whenever the AI failed | `StudentCareer.jsx` catch block | Real error message plus "Try again" |
| B22 | Logout race: `logout(); navigate('/login')` bounced the user back to the dashboard once logout became async | Code path | State is cleared before the request |
| B23 | Wrong-role URL redirected to `/login`, which bounced back and lost the message | Code path | Redirect straight to the user's own dashboard |
| B24 | Lecture updates were polled every 30 s on public pages, producing 401s | Code path | Poll only while signed in |
| B25 | `PageTransitions` keyed on the full pathname remounted the whole student layout on every sub-page click | Code path | Keyed on the top-level section; nested pages animate inside the layout |

### Removed
- Blade UI and its controllers.
- Unrouted React pages and components: `StudentPortal`, `StudentDashboard`, old `pages/StudentProjects`, `components/chat*`, `ChatbotWidget`.
- Browser and serverless Gemini code: `chatbotApi.js`, `ragService.js`, `src/api/careerChat.js`, `api/chat.js`.

All of these can be recovered from git history. `server/` (Express) is kept but marked `DEPRECATED.md`.

### Found and fixed on 2026-11-22 (second round)

| # | Issue | Fix |
|---|---|---|
| B26 | Semester 6 had **no subjects** (`6: []`), so the dashboard showed 0 courses | Official KSV NEP Semester VI curriculum added (6 subjects) |
| B27 | Dashboard progress bars were **hard-coded** (60%, 75%, 88%) and the Projects count was always "6" | Values computed from coverage, revisions, notes and the projects API |
| B28 | "This week" agenda was **fabricated** (fixed times and rooms) | Replaced with real faculty notices |
| B29 | Resources page listed **invented files**, sizes and download counts | Replaced with real faculty uploads |
| B30 | Students could switch to any semester | Semester locked server-side to the account |
| B31 | PHP upload limit was 2 MB | Dev server starts PHP with a 20 MB limit (`npm run dev:api`) |
