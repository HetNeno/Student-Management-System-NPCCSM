# NPCCSM Migration Analysis

## Scope and source

The workspace is the original NPCCSM source tree; no source ZIP or existing Laravel application is present. The source project is React 18/Vite with an Express/PostgreSQL server, static academic data, API/serverless chat implementations, and a separate PostgreSQL RAG schema. The PHP application is planned for `NPCCSM-PHP\`; original source files are to remain unchanged for comparison.

## Existing architecture and active routes

- `src/main.jsx` mounts `src/App.jsx`; `App.jsx` uses React Router `HashRouter`, `AuthProvider`, `SyllabusProvider`, and `ProtectedRoute`.
- Routes currently mounted: `/login`; `/principal` (principal role); `/teacher` (teacher role); and `/student` with overview, syllabus, career, projects, and resources child routes (student role).
- The student layout has a persisted semester selector (defaults to 5), collapsible/mobile sidebar, route navigation, and sign-out.
- `StudentOverview` calculates course/topic coverage and recent updates from the static syllabus plus `SyllabusContext`. `StudentSyllabus` shows course, unit, topic, coverage, and all/completed/pending filters. `StudentCareer` provides an AI chat. `StudentProjects` has six static project cards and localStorage-based started/checklist state. `StudentResources` generates placeholder resource cards and its download action only displays a toast; it does not download stored files.
- `TeacherStudio` selects semester/subject, edits covered topics and topic notes, records faculty/date, validates that every marked topic has a note, and publishes updates. It also exposes stale-subject email/SMS link reminders based on a 42-hour threshold.
- `PrincipalDashboard` calculates semester completion and subjects below 60% from the syllabus state; it does not currently use the SQL reporting views.
- Other files are present but not routed by `App.jsx`: `StudentPortal.jsx` (older portal and another direct Gemini academic chat), `StudentDashboard.jsx`, `ChatPage.jsx`, and `src/components/chat/ChatWindow.jsx`. `src/pages/StudentProjects.jsx` duplicates an older projects page; the routed page is `src/pages/student/StudentProjects.jsx`. `api/chat.js`, `src/api/careerChat.js`, and `server/rag/generation.js` are separate implementations and must not be conflated.

## API inventory and contracts

`server/index.js` exposes the following Express endpoints without authentication or role checks:

| Method and path | Current behavior |
| --- | --- |
| `GET /api/health` | Returns `{ status: "ok", timestamp }`. |
| `POST /api/auth/login` | Finds a user by case-insensitive username and exact stored password; optional role comparison. Returns identity fields or `{ error }`. |
| `GET /api/faculty-lecture-updates` | Returns all rows newest first. |
| `GET /api/faculty-lecture-updates/history` | Returns 50 newest rows. |
| `POST /api/faculty-lecture-updates` | Inserts subject/title/semester/faculty/date, `covered_topic` JSONB and `mandatory_note` JSONB; returns the inserted row. |
| `POST /api/syllabus-progress` | Upserts by `subject_code`, replacing coverage/notes/faculty/date fields; returns the row. |
| `POST /api/syllabus-history` | Appends a history row. |
| `POST /api/teacher-submissions` | Appends a submission row. |

`src/lib/apiClient.js` calls these endpoints at `VITE_API_URL` (defaults to `http://localhost:5000`). Existing responses are raw arrays/rows or endpoint-specific `{ error }`, not a common envelope. Preserve required browser workflows while validating every field and enforcing server-side roles in Laravel.

`server/routes/rag.js` is mounted at `/api/rag` and exposes `GET health`, `POST ingest/pdf`, `POST ingest/text`, `POST ingest/syllabus`, `POST ingest/notes`, `POST ingest/all`, `POST query`, `GET stats`, `GET jobs`, and `DELETE reset`. Upload middleware limits files to 20 MiB and checks the MIME type; the PDF service also checks the `%PDF` signature. No route currently checks authorization. Batch ingestion can return success when an individual source fails; ingestion jobs are only recorded as completed after inserts.

## Database inventory and compatibility

`database/init.sql` defines:

- `courses`: serial `id`, unique `subject_code`, semester, course metadata, JSONB `units`, and `created_at`; bundled curriculum is seeded into this table.
- `users`: UUID `id`, unique `username`, text `password`, checked `role` (`student`, `teacher`, `principal`), profile fields, and `created_at`. The schema comment and seed rows show passwords are currently plaintext.
- `syllabus_progress`: `subject_code` primary key (not Laravel `id`), JSONB coverage and topic notes, overall notes, faculty, `last_updated`, and `updated_at`.
- `syllabus_history`: identity `BIGINT` key, subject/syllabus snapshots, JSONB coverage/topic notes, and timestamps.
- `teacher_submissions` and `faculty_lecture_updates`: UUID primary keys, JSONB topic/note data, and timestamps; lecture updates are the current source for the live syllabus view.
- `chatbot_notes`: UUID key, user UUID FK with cascade delete, subject and JSONB notes, created/updated timestamps, and a unique user/subject index. It is not currently used by routed UI.
- Views: `v_subject_latest`, `v_subject_completion`, and `v_semester_progress`.

`database/rag_schema.sql` defines serial-keyed `rag_documents`, `rag_ingestion_jobs`, and `rag_query_logs`, a GIN full-text index and source-type index, plus the `update_rag_updated_at()` function and update trigger. RAG schema is applied separately from `init.sql`.

`supabase/schema.sql` repeats the seven academic tables and three views with `public` qualification and enables Supabase RLS/policies; it seeds demo users and courses. It has no RAG schema in the object inventory. The standalone schema has no Supabase policies. Phase implementation must compare both definitions before mapping, preserve UUIDs/JSONB/identity keys/views, and must not copy permissive RLS policies into Laravel authorization.

The existing server expects one `DATABASE_URL`; `.env.example` contains only Vite API/Gemini settings, while `server/.env.example` contains `DATABASE_URL` and `PORT`. The Laravel app should use `DB_CONNECTION=pgsql` and standard `DB_*` values and keep Gemini credentials server-side.

## Authentication and security findings

- `AuthContext.jsx` stores the authenticated identity in localStorage, supports local demo credentials, and treats an API failure as a reason to try that fallback. The Express login compares supplied and stored plaintext passwords and does not create a server session.
- Existing UI route protection is client-side only. Express academic and RAG write/reset operations are public.
- `src/lib/chatbotApi.js` reads `VITE_GEMINI_API_KEY` and calls Gemini directly from the browser; it is used by routed `StudentCareer` and by the legacy `StudentPortal`. This key must not be carried into the new frontend.
- Supabase schema opens read/write policies for multiple tables; role enforcement must move to Laravel middleware/policies, not depend on these policies.
- Existing user data must be put through a mandatory password-reset flow before Laravel login, per the confirmed requirement. Do not migrate, verify, seed, or expose legacy plaintext credentials in Laravel.
- File uploads must be stored privately, and reset/ingestion operations require administrator authorization, CSRF protection for browser requests, validation, and rate limits.

## RAG, PDF, and retrieval behavior

- `server/rag/index.js` currently ingests PDF pages independently; PDF text is cleaned then chunked with `chunkDocument(..., "pdf")`. Text ingestion trims content and drops passages of 20 characters or fewer.
- `chunker.js` dispatches PDF/general text to paragraph chunks capped at 800 characters, syllabus/structured text to section chunks with size-based fallback (500/100), and notes/conversation to size chunks (400/80). Retain per-content strategy and chunk ordering.
- `vectorStore.js` uses PostgreSQL full-text search (`to_tsvector`, `plainto_tsquery`, `ts_rank_cd`) combined with `ILIKE` matching and a wordwise `to_tsquery` fallback. This is the active retrieval implementation, not vector similarity. It returns source metadata and an approximate similarity score.
- `index.js` logs query IDs/latency but suppresses query-log write failures. Ingestion inserts chunks one by one and writes only completed jobs; errors can leave partial data. New implementation should use transactions/job failure status and explicitly report failures.
- `embeddings.js` defines Gemini embedding helpers but repository references show no caller; embeddings are not stored or used by the active retriever.
- `generation.js` contains RAG and direct Gemini generation functions but they are not called from the current React routes or Express routes. `api/chat.js` and `src/api/careerChat.js` are serverless-style handlers with distinct prompts/fallbacks and are likewise not referenced by the mounted app. Current routed chat uses the browser-side `askGemini` from `src/lib/chatbotApi.js`, which is a career-oriented Nova prompt; the legacy, unrouted `StudentPortal` separately uses it with syllabus state.
- `src/services/ragService.js` and `useChatMock.js` call the Express RAG service, but their `ChatWindow` UI is not connected to `App.jsx`. Preserve and expose this RAG capability through the new Laravel chat flow rather than treating current embedding code as active.

## Frontend, dependency, and migration mapping

| Existing source | Laravel target |
| --- | --- |
| `src/App.jsx`, `ProtectedRoute.jsx` | `routes/web.php`, role middleware, route controllers |
| `LoginPage.jsx`, `AuthContext.jsx` | `resources/views/auth/login.blade.php`, Laravel session authentication |
| `StudentLayout.jsx`, `Header.jsx`, shared components | Blade layout/components and static CSS/JS |
| `StudentOverview.jsx`, `StudentSyllabus.jsx`, `StudentCareer.jsx`, `StudentProjects.jsx`, `StudentResources.jsx` | Student controllers/services and `resources/views/student/*` |
| `TeacherStudio.jsx`, `PrincipalDashboard.jsx` | Role-specific controllers/services and `resources/views/teacher/*`, `resources/views/principal/*` |
| `syllabusDatabase.js`, `SyllabusContext.jsx` | Existing PostgreSQL `courses` and `syllabus_progress` as source of truth; retain syllabus fidelity during mapping |
| `apiClient.js`, `server/index.js` | Laravel API routes/controllers, Form Requests, Eloquent/Query Builder, authorization |
| `ragService.js`, `server/rag/*`, `server/routes/rag.js` | PHP RAG/PDF/chunking/retrieval services and Laravel API controllers |
| `chatbotApi.js`, `api/chat.js`, `careerChat.js`, `generation.js` | Server-side Gemini service plus distinct academic/career services and Laravel chat endpoints |
| `useReminderScheduler.js` | UI stale-data check and mail/SMS links; only add Laravel Scheduler if an actual server-side schedule is configured |

Frontend dependencies are React, React DOM, React Router, Motion, Vite, Tailwind, PostCSS, and Autoprefixer. Express dependencies are `pg`, `multer`, `pdf-parse`, `cors`, and `dotenv`. The PHP app should not require React, Node, Express, Vite, or browser Gemini requests at runtime. PDF extraction will use a Composer library; PostgreSQL PDF and JSONB operations remain server-side.

## Laravel implementation progress

- Session login and logout are wired through `AuthenticatedSessionController`; login validates the selected role, compares usernames case-insensitively, checks only recognized password hashes, and regenerates the session after authentication. Existing plaintext passwords are rejected.
- A complete mandatory password-reset/enrollment flow has not been implemented. Legacy users cannot log in until that flow provisions a new hashed password.
- Dashboard controllers/views and end-to-end authentication tests are still outstanding. PHP and Composer are unavailable in this environment, so Laravel tests and PHP linting could not be run.

## Known blockers and validation baseline

- PHP and Composer are not installed/on `PATH`, and Docker is installed but its daemon is unavailable. Laravel generation, PHP linting, and Laravel tests cannot run until a PHP/Composer runtime is available.
- The original frontend build was attempted; it could not start because Vite is not installed (`'vite' is not recognized`). No claim is made that the original build passes.
- No local database credentials or database copy are present in the workspace; database integration tests and backup/cutover require a user-provided test PostgreSQL instance.
- Production Gemini model availability, credentials, PDF edge cases, and deployment host remain environment-dependent.
