// ============================================================================
// API Client — Connects to the Express backend (replaces Supabase SDK)
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Whether the backend API is configured (has a non-empty URL).
 * Used by components to show online/offline status.
 */
export const isApiConfigured = Boolean(API_BASE);

/**
 * Generic JSON fetch wrapper with error handling.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
}

// ── Auth ────────────────────────────────────────────────────────────────────

/**
 * Login against the PostgreSQL users table via the Express backend.
 * @returns {{ id, username, role, name, department }}
 */
export async function apiLogin({ username, password, role }) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });
}

// ── Faculty Lecture Updates ─────────────────────────────────────────────────

/**
 * Fetch all lecture updates (source of truth for syllabus state).
 */
export async function getLectureUpdates() {
  return apiFetch('/api/faculty-lecture-updates');
}

/**
 * Insert a new lecture update row.
 */
export async function insertLectureUpdate(payload) {
  return apiFetch('/api/faculty-lecture-updates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch the last 50 lecture updates, ordered by created_at DESC.
 */
export async function getLectureHistory() {
  return apiFetch('/api/faculty-lecture-updates/history');
}

// ── Syllabus Progress ───────────────────────────────────────────────────────

/**
 * Upsert (insert or update) the live syllabus progress for a subject.
 */
export async function upsertSyllabusProgress(payload) {
  return apiFetch('/api/syllabus-progress', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Syllabus History ────────────────────────────────────────────────────────

/**
 * Insert an audit-log row into syllabus_history.
 */
export async function insertSyllabusHistory(payload) {
  return apiFetch('/api/syllabus-history', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Teacher Submissions ─────────────────────────────────────────────────────

/**
 * Insert a teacher submission log row.
 */
export async function insertTeacherSubmission(payload) {
  return apiFetch('/api/teacher-submissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Health ───────────────────────────────────────────────────────────────────

/**
 * Check if the backend API is reachable.
 */
export async function checkHealth() {
  return apiFetch('/api/health');
}
