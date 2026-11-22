# NPCCSM Target Architecture

## 1. Architecture Summary

The system uses a modular monolith:

```text
React/Vite Browser
        |
        | JSON + HTTP session
        v
Laravel 12 Application
        |
        +-- Authentication and Role Middleware
        +-- Academic Controllers and Form Requests
        +-- RAG and Gemini Services
        +-- Eloquent/Query Builder
        v
MySQL 8
```

Laravel is the sole application backend. The existing Express server is retained only as legacy reference code and will not be used by the React UI or deployed. This avoids split authentication, duplicate business rules, and divergent database behavior.

## 2. Component Responsibilities

| Component | Responsibility |
----------------|----------------|
| React SPA | Role dashboards, navigation, forms, client validation, and presentation |
| Laravel Web/API | Session authentication, role authorization, validation, business workflows |
| Academic Services | Syllabus, lecture, progress, history, and submission operations |
| RAG Services | PDF/text ingestion, chunking, MySQL full-text retrieval, and Gemini generation |
| MySQL | Users, curriculum, progress, audit history, RAG chunks/jobs/logs |

## 3. Frontend Architecture

- HashRouter is replaced with BrowserRouter for clean public and role URLs.
- The public landing page is `/`.
- Authentication belongs to a Laravel session; localStorage does not grant authorization.
- Role routes are `/student/*`, `/teacher/*`, and `/principal/*`.
- `ProtectedRoute` remains a UX guard only. Laravel middleware and policies are the security boundary.
- Shared API access is centralized in `src/lib/apiClient.js`.
- Demo credentials and fallback writes are removed.
- Route and component transitions use a small shared React transition wrapper.

## 4. Backend Module Organization

```text
app/
  Http/
    Controllers/
      Auth/
      Student/
      Teacher/
      Principal/
      Api/
    Middleware/
    Requests/
  Models/
  Policies/
  Services/
    Academic/
    Rag/
database/
  migrations/
```

Controllers remain thin. Form Requests validate input. Services own multi-table publication and RAG transactions. Policies enforce ownership and role access.

## 5. Authentication and Authorization

- Passwords are Laravel `Hash::make` hashes.
- Login requires username, password, and selected role.
- Laravel regenerates the session after login and rotates the CSRF token.
- Logout invalidates the session and regenerates the token.
- Roles: `student`, `teacher`, `principal`.
- `RoleMiddleware` prevents cross-role route access.
- Controllers additionally enforce policies for object actions.
- Legacy plaintext PostgreSQL accounts are not copied or imported. A mandatory reset/provisioning process is required before legacy identities can authenticate.

### Permission Matrix

| Operation | Student | Teacher | Principal |
|---|---:|---:|---:|
| View own dashboard and learning data | Yes | No | No |
| View syllabus coverage | Yes | Yes | Yes |
| Publish lecture updates | No | Yes | Yes |
| View academic history | Yes | Yes | Yes |
| View institutional analytics | No | Limited | Yes |
| Manage RAG documents/jobs | No | No | Yes |

## 6. API Architecture

All API responses use JSON:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/faculty-lecture-updates`
- `POST /api/faculty-lecture-updates`
- `POST /api/syllabus-progress`
- `POST /api/syllabus-history`
- `POST /api/teacher-submissions`
- `POST /api/rag/query`
- `POST /api/rag/ingest/pdf`
- `POST /api/rag/ingest/text`
- `POST /api/rag/ingest/syllabus`
- `GET /api/rag/stats`
- `GET /api/rag/jobs`
- `DELETE /api/rag/reset`

Browser mutations require CSRF protection. Sensitive RAG ingestion/reset operations require the `principal` role. Requests and responses use Laravel validation and consistent error payloads.

## 7. MySQL Data Model

Primary tables:

- `users`
- `courses`
- `syllabus_progress`
- `syllabus_history`
- `faculty_lecture_updates`
- `teacher_submissions`
- `chatbot_notes`
- `rag_documents`
- `rag_ingestion_jobs`
- `rag_query_logs`

MySQL-compatible JSON columns replace PostgreSQL `JSONB`. UUID values remain CHAR(36) or UUID-compatible binary strings. Identity and foreign-key relationships remain explicit. Indexes are added for role, subject, semester, source type, and timestamps.

MySQL full-text search replaces PostgreSQL `ts_vector`/GIN retrieval:

- `rag_documents.chunk_text` is indexed with MySQL `FULLTEXT`.
- Retrieval first uses `MATCH AGAINST ... AGAINST IN NATURAL LANGUAGE MODE`.
- Fallback uses `LIKE` matching for short or non-indexed queries.
- Results are scored without pretending to be vector similarity.

## 8. RAG and AI Flow

```text
PDF/Text/Syllabus/Notes
        |
        v
Chunking Service
        |
        v
rag_documents (MySQL)
        |
        v
Full-text retrieval
        |
        v
Server-side Gemini generation
        |
        v
Authenticated React chat
```

Gemini credentials remain server-side. PDF upload is private, size-limited, and MIME/signature validated. Ingestion uses database transactions and records terminal job status.

## 9. Data and Migration Workflow

The original PostgreSQL database is never modified or dropped. PostgreSQL-to-MySQL migration is explicit and reversible:

1. Export/backup PostgreSQL.
2. Map UUID, JSONB, identity, boolean, date, and timestamp types.
3. Transform JSONB into valid JSON text.
4. Insert into MySQL transactionally.
5. Verify counts, foreign keys, and curriculum samples.
6. Switch Laravel `DB_CONNECTION=mysql` only after verification.

## 10. Error Handling and Observability

- Laravel Form Requests validate all mutating inputs.
- The application uses structured log channels and avoids exposing credentials or stack traces.
- Upload, query, and ingestion failures return stable JSON errors.
- Health checks verify application responsiveness.
- Database and external AI failures are logged with a correlation-safe message.

## 11. Deployment

```text
Internet
   |
   v
Web server / reverse proxy
   |
   +-- Laravel public directory
   +-- React static assets
   |
   v
MySQL 8
```

Environment-specific secrets live in `.env`, not source control. Production uses HTTPS, secure cookies, strict CORS, rate limits, queued ingestion, scheduled backups, and log rotation.
