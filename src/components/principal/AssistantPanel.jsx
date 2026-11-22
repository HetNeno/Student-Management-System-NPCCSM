import { useCallback, useEffect, useState } from 'react';
import { getRagStats, ingestSyllabus } from '../../lib/apiClient';

/** Principal-only: AI configuration status and knowledge-base indexing. */
export default function AssistantPanel() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      setStats(await getRagStats());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reindex = async () => {
    setBusy(true);
    setNotice('');
    try {
      const res = await ingestSyllabus();
      setNotice(`Indexed the curriculum into ${res.chunksCreated} searchable passages.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="assistant-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="assistant-heading" className="text-base font-black text-slate-900">AI assistant (Nova)</h2>
          <p className="text-xs text-slate-500">Answers students using the curriculum knowledge base and Groq.</p>
        </div>
        <button type="button" disabled={busy} onClick={reindex} className="btn-press rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#8B2635]/40 hover:text-[#8B2635] disabled:opacity-50">
          <i className={`fa-solid fa-rotate mr-1.5 ${busy ? 'animate-spin' : ''}`} />
          {busy ? 'Indexing…' : 'Re-index curriculum'}
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}

      {stats && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Provider</dt>
            <dd className="mt-1 text-sm font-bold text-slate-800">
              Groq ·{' '}
              {stats.ai?.configured ? (
                <span className="text-emerald-700">key configured</span>
              ) : (
                <span className="text-amber-700">key missing</span>
              )}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Model</dt>
            <dd className="mt-1 break-all font-mono text-xs font-bold text-slate-800">{stats.ai?.model}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Knowledge base</dt>
            <dd className="mt-1 text-sm font-bold text-slate-800">{stats.totalChunks} passages</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
