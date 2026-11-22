import { useCallback, useEffect, useState } from 'react';
import { getRevisions, setRevision } from '../lib/apiClient';

/**
 * The signed-in student's revised topics ({ [subjectCode]: string[] }),
 * stored in MySQL. Toggles are optimistic and rolled back on failure.
 */
export function useRevisions() {
  const [revisions, setRevisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getRevisions()
      .then((res) => active && setRevisions(res.data || {}))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const isRevised = useCallback((code, topic) => (revisions[code] || []).includes(topic), [revisions]);

  const toggle = useCallback(async (code, topic) => {
    const previous = revisions;
    const current = revisions[code] || [];
    const next = current.includes(topic) ? current.filter((t) => t !== topic) : [...current, topic];
    setRevisions({ ...revisions, [code]: next });
    setError('');
    try {
      const res = await setRevision(code, topic, !current.includes(topic));
      setRevisions(res.data || {});
    } catch (err) {
      setRevisions(previous);
      setError(err.message);
    }
  }, [revisions]);

  const countFor = useCallback((code) => (revisions[code] || []).length, [revisions]);

  return { revisions, loading, error, isRevised, toggle, countFor };
}
