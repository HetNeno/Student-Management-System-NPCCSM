import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  getLectureUpdates,
  insertLectureUpdate,
  upsertSyllabusProgress,
  insertSyllabusHistory,
  insertTeacherSubmission,
  getLectureHistory,
} from '../lib/apiClient';
import { useAuth } from './AuthContext';

const POLL_INTERVAL_MS = 30_000; // Poll every 30 seconds (replaces Supabase Realtime)
const SyllabusContext = createContext(null);

const normalizeLectureRow = (row) => ({
  code: row.subject_code,
  title: row.title || 'Faculty Lecture Update',
  semester: row.semester,
  coveredTopics: Array.isArray(row.covered_topic) ? row.covered_topic : row.covered_topics || [],
  topicNotes: row.mandatory_note && typeof row.mandatory_note === 'object' ? row.mandatory_note : row.topic_notes || {},
  overallNotes: row.overall_notes || '',
  facultyName: row.faculty_name || 'NPCCSM Faculty',
  lastUpdated: row.lecture_date || row.last_updated,
  createdAt: row.created_at,
});

/**
 * Loads/saves per-subject progress state ({ [subjectCode]: { coveredTopics, topicNotes, ... } }).
 * The Laravel API backed by MySQL is the source of truth.
 */
export function SyllabusProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [state, setState] = useState({});
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await getLectureUpdates();

      const byCode = {};
      for (const row of data) {
        const normalized = normalizeLectureRow(row);
        const existing = byCode[normalized.code];

        if (!existing || new Date(normalized.createdAt || 0) > new Date(existing.createdAt || 0)) {
          byCode[normalized.code] = normalized;
        }
      }

      setState(byCode);
      setUsingFallback(false);
    } catch (err) {
      console.error('[SyllabusContext] Backend read failed:', err.message);
      setState({});
      setUsingFallback(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling, only while signed in (the API requires a session).
  useEffect(() => {
    if (!userId) {
      setState({});
      setLoading(false);
      return undefined;
    }
    refresh();

    // Poll for changes every POLL_INTERVAL_MS
    pollRef.current = setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh, userId]);

  const publishUpdate = useCallback(
    async ({ subjectCode, title, semester, coveredTopics, topicNotes, overallNotes, lectureDate, facultyName }) => {
      try {
        // 1. Insert into faculty_lecture_updates
        await insertLectureUpdate({
          subject_code: subjectCode,
          title,
          semester,
          faculty_name: facultyName,
          lecture_date: lectureDate,
          covered_topic: coveredTopics,
          mandatory_note: topicNotes,
        });

        // 2. Upsert syllabus_progress
        try {
          await upsertSyllabusProgress({
            subject_code: subjectCode,
            title,
            semester,
            covered_topics: coveredTopics,
            topic_notes: topicNotes,
            overall_notes: overallNotes,
            faculty_name: facultyName,
            last_updated: lectureDate,
          });
        } catch (progressErr) {
          console.warn('[SyllabusContext] syllabus_progress sync warning:', progressErr.message);
        }

        // 3. Insert into syllabus_history
        try {
          await insertSyllabusHistory({
            subject_code: subjectCode,
            title,
            semester,
            faculty_name: facultyName,
            lecture_date: lectureDate,
            covered_topics: coveredTopics,
            topic_notes: topicNotes,
          });
        } catch (historyErr) {
          console.warn('[SyllabusContext] syllabus_history sync warning:', historyErr.message);
        }

        // 4. Insert into teacher_submissions
        try {
          await insertTeacherSubmission({
            subject_code: subjectCode,
            lecture_date: lectureDate,
            covered_topic: coveredTopics,
            mandatory_note: topicNotes,
          });
        } catch (submissionErr) {
          console.warn('[SyllabusContext] teacher_submissions insert warning:', submissionErr.message);
        }

        await refresh();
        return { ok: true, fallback: false };
      } catch (err) {
        console.error('[SyllabusContext] Backend write failed:', err.message);
        throw err;
      }
    },
    [refresh]
  );

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getLectureHistory();
      return data.map((log) => ({
        code: log.subject_code,
        title: log.title || 'Faculty Lecture Update',
        semester: log.semester,
        faculty: log.faculty_name || 'NPCCSM Faculty',
        date: log.lecture_date,
      }));
    } catch (err) {
      console.error('[SyllabusContext] Failed to load history:', err.message);
      return [];
    }
  }, []);

  const value = {
    state,
    loading,
    usingFallback,
    refresh,
    publishUpdate,
    fetchHistory,
  };

  return <SyllabusContext.Provider value={value}>{children}</SyllabusContext.Provider>;
}

export function useSyllabus() {
  const ctx = useContext(SyllabusContext);
  if (!ctx) throw new Error('useSyllabus must be used within a SyllabusProvider');
  return ctx;
}
