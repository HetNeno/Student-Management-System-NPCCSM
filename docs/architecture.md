# NPCCSM Portal — Architecture

Reflects the code as of 2026-11-22. The audit that led here is in [project-audit.md](project-audit.md); setup and test instructions are in [setup-and-testing.md](setup-and-testing.md).

## 1. Shape of the system

A modular monolith: one Laravel backend, one React SPA, one MySQL database.

```text
 Browser
   │  same origin (cookie session + X-XSRF-TOKEN)
   ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │ Laravel 12  (NPCCSM-PHP/)                                        │
 │                                                                  │
 │  routes/web.php  ── any non-/api path ──▶ public/spa/index.html  │  (React SPA)
 │  routes/api.php  ── JSON only                                    │
 │     middleware: cookies → session → CSRF → auth → active → role  │
 │                                                                  │
 │  Api\AuthController          signup (students), login, logout    │
 │  Api\UserManagementController principal: teachers, enable/disable│
 │  Api\AcademicController      syllabus coverage workflow          │
 │  Api\ProjectController       catalogue + student progress        │
 │  Api\RagController ─▶ Services\Rag\RagService (retrieve/ingest)  │
 │                    └▶ Services\Ai\GroqClient ──HTTPS──▶ Groq API │
 └───────────────────────────────┬──────────────────────────────────┘
                                 ▼
                          MySQL 8 · database `npccsm`
```

In development Vite serves the SPA on `:3000` and proxies `/api` to Laravel on `:8000`, so the browser still sees one origin and no CORS is involved.

**Removed or retired during the rework**

- The Blade duplicate UI (`resources/views/{auth,student,teacher,principal}`) and its controllers. React is the only UI.
- The Express server (`server/`). It is kept for reference with a `DEPRECATED.md` note, and is not run or deployed.
- Unrouted React pages, browser-side Gemini calls and the serverless `api/chat.js`.

## 2. Boundaries

| Area | Backend | Frontend |
|---|---|---|
| Authentication | `AuthController`, `LoginRequest`, `RegisterStudentRequest`, `EnsureAccountIsActive`, rate limiters in `AppServiceProvider` | `AuthContext`, `LoginPage`, `SignupPage`, `ProtectedRoute` (UX only) |
| Roles / accounts | `RoleMiddleware` (`role:`), `UserManagementController`, `npccsm:create-user` command | `components/principal/AccountsPanel` |
| Student | read endpoints + project enrolment | `StudentLayout`, `pages/student/*` |
| Teacher | coverage writes, project catalogue | `TeacherStudio`, `ProjectManager` |
| Principal | everything a teacher can do, plus accounts, project deletion and the AI knowledge base | `PrincipalDashboard`, `ProjectManager`, `AssistantPanel` |
| Projects | `ProjectController`, `Project`, `ProjectEnrollment` | `student/StudentProjects` (unified list), `ProjectManager` |
| AI | `RagController`, `RagService`, `TextChunker`, `GroqClient` | `student/StudentCareer` (Nova) |
| HTTP client | — | `src/lib/apiClient.js` (single place for fetch, CSRF and errors) |

## 3. Authentication and authorisation

**Session model.** The SPA uses Laravel's standard session cookie (HttpOnly, SameSite=Lax). The `api` middleware group is extended in `bootstrap/app.php` with `EncryptCookies`, `AddQueuedCookiesToResponse`, `StartSession` and `ValidateCsrfToken`. Every response sets an `XSRF-TOKEN` cookie, and `apiClient` echoes it back in `X-XSRF-TOKEN`. On a 419 response, the client fetches `/api/auth/csrf` and retries once.

**Signup** (`POST /api/auth/register`, 5 per minute per IP):
- Fields: name, email, semester (1–6), password plus confirmation (at least 8 characters, letters and numbers).
- Emails are lower-cased. Duplicates are blocked by validation, and the database's unique index is the final guard (a race returns 422).
- `role` and `status` are not mass-assignable on `User`. The controller sets `role = student` and `status = active` explicitly. A `role` sent by the client is ignored (covered by a test).

**Teacher and principal accounts** are never self-registered:
- Principal: `php artisan npccsm:create-user --role=principal`. This runs on the server, and the password is read from a hidden prompt.
- Teacher: the principal creates it from the dashboard (`POST /api/users/teachers`), or with the same artisan command.

**Login** (`POST /api/auth/login`):
- Email and password only. The role comes from the database and decides the redirect: student → `/student`, teacher → `/teacher`, principal → `/principal`.
- Unknown emails and wrong passwords get the same 422 message. Values that are not hashes (legacy plaintext passwords) never authenticate.
- `pending` and `disabled` accounts get a 403.
- Rate limits: 5 per minute per email+IP, and 20 per minute per IP.
- The session ID is regenerated on login. Logout invalidates the session and rotates the CSRF token.

**Authorisation** happens on the server for every request. `auth` + `active` cover all data routes, and `role:` covers role-specific ones (see the matrix below). `EnsureAccountIsActive` ends the session of an account that is disabled while it is signed in.

| Endpoint group | Student | Teacher | Principal |
|---|:-:|:-:|:-:|
| `GET /courses`, lecture updates | ✔ | ✔ | ✔ |
| `POST` lecture updates / progress / history / submissions | — | ✔ | ✔ |
| `GET /projects`, `GET /projects/{id}` | published only, own progress | all + enrolment counts and student progress | same as teacher |
| `POST/PATCH/DELETE /projects/{id}/enrollment` | ✔ | — | — |
| `POST /projects`, `PATCH /projects/{id}` | — | ✔ | ✔ |
| `DELETE /projects/{id}` | — | — | ✔ |
| `POST /rag/query` (15 per minute per user) | ✔ | ✔ | ✔ |
| `/rag/stats`, `/rag/jobs`, `/rag/ingest/*`, `/rag/reset` | — | — | ✔ |
| `/users`, `/users/teachers`, `/users/{id}/status` | — | — | ✔ |

## 4. Data model (MySQL `npccsm`)

```text
users ─┬─< project_enrollments >── projects
       ├─< chatbot_notes
       └─< projects.created_by (nullable, SET NULL)

courses                       (curriculum: semester → subject → units[] → topics[])
faculty_lecture_updates       (append-only coverage publications; source of the live syllabus view)
syllabus_progress             (latest coverage per subject_code)
syllabus_history              (audit trail)
teacher_submissions           (submission log)
rag_documents   FULLTEXT(chunk_text)
rag_ingestion_jobs, rag_query_logs
```

| Table | Key points |
|---|---|
| `users` | UUID PK, `email` UNIQUE, `username` UNIQUE (set to the email for new accounts), `role` ENUM, `status` ENUM(active, pending, disabled), `semester`, `last_login_at` |
| `projects` | `slug` UNIQUE, `difficulty` ENUM, `status` ENUM(published, draft, archived), JSON `tech`/`milestones`, index (`status`, `category`) |
| `project_enrollments` | FK project (CASCADE), FK user (CASCADE), UNIQUE (`project_id`, `user_id`), JSON `completed_milestones`, `status` ENUM(in_progress, completed) |

Migrations are additive: the two original ones plus `…000003_add_account_fields_to_users_table` and `…000004_create_projects_tables`. The seeders (`CourseSeeder`, `ProjectCatalogSeeder`) are idempotent and seed reference content only, never user accounts. JSON columns are read through Eloquent casts, so the API returns arrays and objects rather than JSON strings.

## 5. AI assistant (RAG + Groq)

```text
question ─▶ RagService::retrieve()
              1. MATCH(chunk_text) AGAINST(? IN NATURAL LANGUAGE MODE) top-k
              2. fallback: LIKE on the longest terms (short words, e.g. "OS", "C++")
          ─▶ RagController::buildMessages()
              system prompt (Nova rules) + last 6 turns + semester + numbered context
          ─▶ GroqClient::chat()  POST {GROQ_BASE_URL}/chat/completions
          ◀─ { answer, chunks[], error? }
```

- **Knowledge base.** `php artisan npccsm:rag-ingest-syllabus`, or the principal's "Re-index curriculum" button, indexes the `courses` table. Re-running replaces the old copy instead of duplicating it. The principal can also ingest PDF and text: PDFs are checked by MIME type and the `%PDF-` signature, up to 20 MB.
- **Chunking** (`TextChunker`). A multibyte-safe port of the original JS strategies: paragraphs up to 800 characters, sections for syllabus text, and 400/80 size windows for notes.
- **Ingestion** runs in a transaction. Each job row ends as `completed` or `failed` with an error message.
- **Groq.** Uses the OpenAI-compatible Chat Completions API. The key comes from `config('services.groq')` and stays on the server. Timeout is `GROQ_TIMEOUT` (default 30 s), with one retry on connection errors and 5xx responses.
- **Typed failures** (`AiUnavailableException`), returned as `error.code` + `error.message`:

  | Code | HTTP status |
  |---|---|
  | `not_configured` | 503 |
  | `auth_failed` | 503 |
  | `rate_limited` | 429 (with `retryAfter`) |
  | `timeout` | 503 |
  | `upstream_error` | 503 |

  The UI shows the real reason with a "Try again" button. The previous canned "fallback advice" that looked like an AI answer is removed.
- **Model.** `GROQ_MODEL` defaults to `openai/gpt-oss-120b`, which Groq recommends as the replacement for the retired `llama-3.3-70b-versatile`. `php artisan npccsm:groq-check` confirms the configured model is available to the key.
- Embeddings are not used. Retrieval is keyword-based, as it was in the original implementation.

## 6. Frontend

- **Routes.** `/` landing, `/login`, `/signup`, `/student/*` (sidebar layout), `/teacher`, `/teacher/projects`, `/principal`, `/principal/projects`. Unknown paths go to `/`.
- **`ProtectedRoute`.** Waits for `/api/auth/me`. Guests go to `/login`. A signed-in user who opens another role's URL is sent to their own dashboard.
- **`SyllabusContext`.** Polls lecture updates every 30 s, but only while someone is signed in.
- **Branding.** The official NPCCSM BCA (Kadi) header logo from npccsmbca.in, unmodified, in `public/branding/`. Institutional text on the landing page comes from npccsmbca.in.
- **Motion.** The existing CSS animation library plus a few additions: a section-level page transition, nested page fade, staggered list rows, chat message entry, typing dots and a floating Nova button. `prefers-reduced-motion` disables all animation and smooth scrolling.

## 7. Configuration and secrets

| Setting | Where |
|---|---|
| Database credentials, `APP_KEY`, `GROQ_API_KEY` | `NPCCSM-PHP/.env` (gitignored) |
| Templates (empty secrets) | `NPCCSM-PHP/.env.example`, `.env.example` |
| Groq config | `config/services.php` (`env()` is only read inside config files, so `config:cache` is safe) |
| Production | Set `APP_ENV=production`, `SESSION_SECURE_COOKIE=true`, serve over HTTPS, then `npm run build`, `php artisan config:cache`, `php artisan migrate --force` |

## 8. Learning content, semester lock and full RAG (added 2026-11-22)

**Semester lock.** `User::semesterScope()` returns the student's own semester (`null` for staff). Every student-facing query filters by it, whatever the client sends:

- `/courses`
- lecture updates
- `/projects` (semester-specific projects; `semester = null` means open to all)
- `/materials` and the file download
- `/notices` (own semester plus college-wide)
- AI retrieval

Only the principal can change a student's semester: `PATCH /api/users/{id}/semester`, also available from the Accounts panel. In the UI, the student portal shows a locked semester badge instead of a selector.

**Semester VI curriculum.** Transcribed from the official KSV NEP BCA Semester V & VI syllabus PDF on npccsm.in (scanned; read page by page):

| Code | Subject |
|---|---|
| CAM304-3C | Data Warehousing and Data Mining |
| CAM305-3C | Mobile Application Development |
| CAM306-3C | Network Security |
| CAE303-3C | Digital Marketing Management |
| AEC301-3C | Communication and Soft Skills for Professional Success |
| SEC351-3C | Internship |

**Faculty content** (teacher/principal, at `/teacher/content` and `/principal/content`):

| Table | Purpose |
|---|---|
| `study_materials` | Files on the private `local` disk (`storage/app/private/materials/semN`). Streamed only through `GET /api/materials/{id}/download`, after the semester check. PDF, Office, TXT and ZIP up to 20 MB; PDFs are signature-checked. |
| `notices` | Semester or college-wide notices. Priority normal / important / urgent, optional expiry. |

Only the uploader or the principal can delete an item.

**Student study tools:**
- `student_topic_progress`: "Mark revised" per syllabus topic. Only topics in the student's own semester's courses are accepted.
- Dashboard metrics are computed from real data. The previous hard-coded progress bars and the fabricated agenda are removed.
- "Revision focus" suggests the first topic covered in class but not yet revised.
- "Explain" and "Quiz me" buttons on each topic open Nova with a prepared prompt.

**RAG coverage.** `rag_documents.semester` tags every passage. Indexed automatically:

| Source | When it is indexed |
|---|---|
| curriculum (`syllabus`) | `npccsm:rag-ingest-syllabus` |
| faculty lecture coverage + mandatory notes (`lecture`) | on publish |
| notices (`notice`) | on post |
| text-based PDF/TXT materials (`material`) | on upload |

Deleting a notice or material removes its passages. Retrieval is MySQL FULLTEXT with a LIKE fallback. There is no vector embedding: Groq provides no embeddings endpoint, and adding one would need a second provider.

**Nova honesty rules** (system prompt, temperature 0.2):
- College facts come only from the retrieved context, with citations.
- It says plainly when the material doesn't contain an answer.
- General concepts are labelled "General explanation".
- If the student's message is wrong, the reply starts with "Correction:".
- It never invents sources.

Every answer in the UI is marked either "Based on NPCCSM material" (with sources) or "Not found in NPCCSM material".
