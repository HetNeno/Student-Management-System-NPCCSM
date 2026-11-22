/**
 * Frontend RAG service — calls the Express backend for embeddings, retrieval, and ingestion.
 *
 * When RAG backend is not available, falls back to the mock service.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

/**
 * Query the RAG system for context.
 * @param {string} prompt - The user's question
 * @param {object} options - { topK, threshold, sourceTypes }
 * @returns {Promise<{chunks: Array, totalRetrieved: number}>}
 */
export async function retrieveContext(prompt, options = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/rag/query`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: prompt,
        topK: options.topK ?? 5,
        threshold: options.threshold ?? 0.7,
        sourceTypes: options.sourceTypes || null,
      }),
    });

    if (!response.ok) {
      throw new Error(`RAG query failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      answer: data.answer || null,
      chunks: data.chunks || [],
      totalRetrieved: data.totalRetrieved || 0,
    };
  } catch (error) {
    console.error('[RAG] Backend unavailable:', error.message);
    throw error;
  }
}

/**
 * Fallback mock context when RAG backend is unavailable.
 */
async function mockRetrieveContext(prompt, options = {}) {
  const mockResponses = [
    {
      keywords: ['career', 'path', 'job', 'become'],
      text: 'For BCA graduates, the most in-demand career paths are:\n\n1. Full Stack Developer — React + Node.js + PostgreSQL (6-8 months)\n2. Frontend Developer — React + TypeScript + Tailwind (4-6 months)\n3. Data Analyst — Python + SQL + visualization tools (3-5 months)\n4. QA Engineer — Manual + automation testing (3-4 months)\n\nStart with Full Stack if you are unsure.',
      sources: [{ title: 'Industry Hiring Trends 2025', snippet: 'Full-stack roles remain the #1 entry point for BCA graduates...' }],
    },
    {
      keywords: ['project', 'build', 'idea'],
      text: '4 resume-ready projects:\n\n1. Task Manager — React + TypeScript (state management)\n2. REST API — Node.js + Express + PostgreSQL (backend)\n3. Weather Dashboard — API + Chart.js (async)\n4. Chat App — WebSockets + React (real-time)',
      sources: [{ title: 'Project-Based Learning Guide', snippet: 'Building 3-4 full projects is more valuable than 10 tutorials...' }],
    },
    {
      keywords: ['skill', 'learn', 'semester', 'focus'],
      text: 'Priority skills:\n\nCore: JavaScript (ES6+), Git/GitHub, SQL\nFrontend: React.js, TypeScript, CSS Grid/Flexbox\nTools: VS Code, Postman, Terminal\nSkip: Legacy frameworks.',
      sources: [{ title: 'BCA Skill Roadmap', snippet: 'JavaScript mastery is the single highest-ROI skill...' }],
    },
  ];

  const lower = prompt.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  for (const r of mockResponses) {
    const score = r.keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestMatch = r; }
  }
  if (bestMatch && bestScore > 0) return { text: bestMatch.text, sources: bestMatch.sources, timestamp: Date.now() };

  return {
    text: 'That is a great question.\n\n1. Build real projects — theory alone is not enough\n2. Practice coding daily — even 30 minutes helps\n3. Learn Git and push everything to GitHub\n4. Focus on JavaScript/TypeScript\n\nWant me to elaborate?',
    sources: [{ title: 'General Career Advice', snippet: 'Consistent project building is the fastest path to employability...' }],
  };
}

/**
 * Upload a PDF for ingestion.
 * @param {File} file - The PDF file
 * @returns {Promise<{success: boolean, message: string, chunksCreated: number}>}
 */
export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/rag/ingest/pdf`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'PDF upload failed');
  }

  return response.json();
}

/**
 * Ingest syllabus data from the database.
 */
export async function ingestSyllabus() {
  const response = await fetch(`${API_BASE}/api/rag/ingest/syllabus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) throw new Error('Syllabus ingestion failed');
  return response.json();
}

/**
 * Ingest teacher notes from the database.
 */
export async function ingestNotes() {
  const response = await fetch(`${API_BASE}/api/rag/ingest/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) throw new Error('Notes ingestion failed');
  return response.json();
}

/**
 * Batch ingest everything (syllabus + notes).
 */
export async function ingestAll() {
  const response = await fetch(`${API_BASE}/api/rag/ingest/all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) throw new Error('Batch ingestion failed');
  return response.json();
}

/**
 * Get RAG system stats.
 */
export async function getRagStats() {
  try {
    const response = await fetch(`${API_BASE}/api/rag/stats`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  } catch (error) {
    console.warn('[RAG] Cannot fetch stats:', error.message);
    return null;
  }
}

/**
 * Reset all RAG data.
 */
export async function resetRag() {
  const response = await fetch(`${API_BASE}/api/rag/reset`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Reset failed');
  return response.json();
}
