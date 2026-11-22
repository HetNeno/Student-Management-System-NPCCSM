// ============================================================================
// API client for the Laravel backend.
//
// Requests are same-origin: in dev Vite proxies /api to Laravel (:8000), in
// production Laravel serves the built SPA. That keeps the session cookie
// first-party and avoids CORS entirely. VITE_API_URL is only needed if the
// API lives on a different origin.
// ============================================================================

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const isApiConfigured = true;

export class ApiError extends Error {
  constructor(message, { status = 0, errors = {}, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors; // { field: [messages] } for 422 responses
    this.data = data;
  }
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfCookie() {
  if (!readCookie('XSRF-TOKEN')) {
    await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include', headers: { Accept: 'application/json' } });
  }
}

const FRIENDLY = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'The requested item was not found.',
  419: 'Your session expired. Please try again.',
  429: 'Too many attempts. Please wait a minute and try again.',
  500: 'Something went wrong on the server. Please try again.',
  // 502/504 come from the Vite dev proxy when Laravel (port 8000) is not running.
  502: 'Cannot reach the portal server. Make sure the backend is running (npm run dev starts it), then try again.',
  503: 'The service is temporarily unavailable.',
  504: 'Cannot reach the portal server. Make sure the backend is running (npm run dev starts it), then try again.',
};

async function apiFetch(path, { method = 'GET', body, headers = {}, retryOnCsrf = true, ...rest } = {}) {
  const isMutation = method !== 'GET' && method !== 'HEAD';
  if (isMutation) await ensureCsrfCookie();

  const isForm = body instanceof FormData;
  const xsrf = readCookie('XSRF-TOKEN');

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
        ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      ...rest,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the backend is running and try again.', { status: 0 });
  }

  // CSRF token rotated (e.g. after login/logout): fetch a fresh one and retry once.
  if (res.status === 419 && retryOnCsrf) {
    await fetch(`${API_BASE}/api/auth/csrf`, { credentials: 'include', headers: { Accept: 'application/json' } });
    return apiFetch(path, { method, body, headers, retryOnCsrf: false, ...rest });
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errors = data?.errors || {};
    const firstFieldError = Object.values(errors)[0]?.[0];
    const message = data?.error?.message || firstFieldError || data?.message || FRIENDLY[res.status] || `Request failed (${res.status}).`;
    throw new ApiError(message, { status: res.status, errors, data });
  }

  return data;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const apiGetSession = () => apiFetch('/api/auth/me');
export const apiLogin = ({ email, password, remember = false }) =>
  apiFetch('/api/auth/login', { method: 'POST', body: { email, password, remember } });
export const apiRegister = (payload) => apiFetch('/api/auth/register', { method: 'POST', body: payload });
export const apiLogout = () => apiFetch('/api/auth/logout', { method: 'POST' });

// ── Syllabus coverage ───────────────────────────────────────────────────────
export const getLectureUpdates = () => apiFetch('/api/faculty-lecture-updates');
export const getLectureHistory = () => apiFetch('/api/faculty-lecture-updates/history');
export const insertLectureUpdate = (payload) => apiFetch('/api/faculty-lecture-updates', { method: 'POST', body: payload });
export const upsertSyllabusProgress = (payload) => apiFetch('/api/syllabus-progress', { method: 'POST', body: payload });
export const insertSyllabusHistory = (payload) => apiFetch('/api/syllabus-history', { method: 'POST', body: payload });
export const insertTeacherSubmission = (payload) => apiFetch('/api/teacher-submissions', { method: 'POST', body: payload });

// ── Projects ────────────────────────────────────────────────────────────────
export function getProjects(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v && v !== 'All'));
  const qs = params.toString();
  return apiFetch(`/api/projects${qs ? `?${qs}` : ''}`);
}
export const getProject = (id) => apiFetch(`/api/projects/${id}`);
export const createProject = (payload) => apiFetch('/api/projects', { method: 'POST', body: payload });
export const updateProject = (id, payload) => apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: payload });
export const deleteProject = (id) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
export const startProject = (id) => apiFetch(`/api/projects/${id}/enrollment`, { method: 'POST' });
export const leaveProject = (id) => apiFetch(`/api/projects/${id}/enrollment`, { method: 'DELETE' });
export const saveProjectProgress = (id, completedMilestones) =>
  apiFetch(`/api/projects/${id}/enrollment`, { method: 'PATCH', body: { completed_milestones: completedMilestones } });

// ── Study materials & notices ───────────────────────────────────────────────
export function getMaterials(filters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v && v !== 'All'));
  const qs = params.toString();
  return apiFetch(`/api/materials${qs ? `?${qs}` : ''}`);
}
export const uploadMaterial = (formData) => apiFetch('/api/materials', { method: 'POST', body: formData });
export const deleteMaterial = (id) => apiFetch(`/api/materials/${id}`, { method: 'DELETE' });
export const materialDownloadUrl = (material) => `${API_BASE}${material.download_url}`;
export const getNotices = () => apiFetch('/api/notices');
export const createNotice = (payload) => apiFetch('/api/notices', { method: 'POST', body: payload });
export const deleteNotice = (id) => apiFetch(`/api/notices/${id}`, { method: 'DELETE' });

// ── Student revision tracker ────────────────────────────────────────────────
export const getRevisions = () => apiFetch('/api/study/revisions');
export const setRevision = (subjectCode, topic, revised) =>
  apiFetch('/api/study/revisions', { method: 'POST', body: { subject_code: subjectCode, topic, revised } });

// ── Accounts (principal) ────────────────────────────────────────────────────
export const setUserSemester = (id, semester) => apiFetch(`/api/users/${id}/semester`, { method: 'PATCH', body: { semester } });
export const getUsers = (role) => apiFetch(`/api/users${role ? `?role=${role}` : ''}`);
export const createTeacher = (payload) => apiFetch('/api/users/teachers', { method: 'POST', body: payload });
export const setUserStatus = (id, status) => apiFetch(`/api/users/${id}/status`, { method: 'PATCH', body: { status } });

// ── AI assistant ────────────────────────────────────────────────────────────
export const askAssistant = ({ query, history = [], semester, topK = 5 }) =>
  apiFetch('/api/rag/query', { method: 'POST', body: { query, history, semester, topK } });
export const getRagStats = () => apiFetch('/api/rag/stats');
export const ingestSyllabus = () => apiFetch('/api/rag/ingest/syllabus', { method: 'POST' });

// ── Health ──────────────────────────────────────────────────────────────────
export const checkHealth = () => apiFetch('/api/health');
