import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getSubjectsForSemester } from '../../data/syllabusDatabase';
import { getMaterials, getNotices, materialDownloadUrl } from '../../lib/apiClient';
import NoticeList from '../../components/shared/NoticeList';

export const CATEGORY_LABELS = {
  notes: 'Lecture notes',
  assignment: 'Assignment',
  question_bank: 'Question bank',
  reference: 'Reference',
  other: 'Other',
};

const FILE_ICON = {
  pdf: 'fa-regular fa-file-pdf text-rose-600',
  doc: 'fa-regular fa-file-word text-blue-600',
  docx: 'fa-regular fa-file-word text-blue-600',
  ppt: 'fa-regular fa-file-powerpoint text-orange-600',
  pptx: 'fa-regular fa-file-powerpoint text-orange-600',
  xlsx: 'fa-regular fa-file-excel text-emerald-600',
  zip: 'fa-regular fa-file-zipper text-slate-600',
  txt: 'fa-regular fa-file-lines text-slate-600',
};

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const fileIcon = (name = '') => FILE_ICON[name.split('.').pop()?.toLowerCase()] || 'fa-regular fa-file text-slate-500';

/** Study materials uploaded by faculty for the student's semester, plus notices. */
export default function StudentResources() {
  const { semester } = useOutletContext();
  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);
  const subjectTitle = useMemo(() => Object.fromEntries(subjects.map((s) => [s.code, s.title])), [subjects]);

  const [subject, setSubject] = useState('All');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [materials, setMaterials] = useState({ loading: true, error: '', items: [] });
  const [notices, setNotices] = useState({ loading: true, error: '', items: [] });

  useEffect(() => {
    let active = true;
    setMaterials((m) => ({ ...m, loading: true, error: '' }));
    getMaterials({ subject_code: subject, category })
      .then((res) => active && setMaterials({ loading: false, error: '', items: res.data || [] }))
      .catch((err) => active && setMaterials({ loading: false, error: err.message, items: [] }));
    return () => {
      active = false;
    };
  }, [subject, category]);

  useEffect(() => {
    getNotices()
      .then((res) => setNotices({ loading: false, error: '', items: res.data || [] }))
      .catch((err) => setNotices({ loading: false, error: err.message, items: [] }));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials.items;
    return materials.items.filter((m) => `${m.title} ${m.description || ''} ${m.original_name}`.toLowerCase().includes(q));
  }, [materials.items, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8B2635]">Semester {semester}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">Study Materials &amp; Notices</h1>
        <p className="mt-1 text-sm text-stone-500">Files and announcements published by your faculty for Semester {semester}.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <section aria-labelledby="materials-heading" className="space-y-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-stone-200/70 bg-white/85 p-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials"
              aria-label="Search materials"
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-[#8B2635]/40 focus:bg-white"
            />
            <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">
              <option value="All">All subjects</option>
              {subjects.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.title}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Type" className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700">
              <option value="All">All types</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-5 py-3">
              <h2 id="materials-heading" className="text-xs font-black uppercase tracking-[0.18em] text-stone-600">Materials</h2>
              {!materials.loading && <span className="text-xs font-semibold text-stone-400">{visible.length} files</span>}
            </div>

            {materials.loading ? (
              <p className="px-5 py-10 text-center text-sm text-stone-400" role="status">Loading materials…</p>
            ) : materials.error ? (
              <p className="px-5 py-10 text-center text-sm text-rose-600" role="alert">{materials.error}</p>
            ) : !visible.length ? (
              <div className="px-5 py-12 text-center">
                <i className="fa-regular fa-folder-open text-2xl text-stone-300" />
                <p className="mt-3 text-sm font-semibold text-stone-700">No materials yet</p>
                <p className="mt-1 text-xs text-stone-500">Your faculty has not uploaded anything here yet.</p>
              </div>
            ) : (
              <ol className="divide-y divide-stone-100">
                {visible.map((m, i) => (
                  <li key={m.id} className="list-row-in flex gap-4 px-5 py-4 transition-colors hover:bg-stone-50/70" style={{ animationDelay: `${Math.min(i * 40, 280)}ms` }}>
                    <span className="w-7 shrink-0 pt-0.5 font-mono text-sm font-bold tabular-nums text-[#8B2635]/70" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <i className={`${fileIcon(m.original_name)} mt-0.5 text-xl`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-900">{m.title}</p>
                      {m.description && <p className="mt-0.5 text-sm text-stone-600">{m.description}</p>}
                      <p className="mt-1.5 text-[11px] font-semibold text-stone-500">
                        {CATEGORY_LABELS[m.category]}
                        {m.subject_code ? ` · ${m.subject_code} ${subjectTitle[m.subject_code] || ''}` : ''}
                        {` · ${formatSize(m.size_bytes)}`}
                        {m.uploaded_by ? ` · ${m.uploaded_by}` : ''}
                        {` · ${new Date(m.created_at).toLocaleDateString()}`}
                        {m.indexed_for_ai && <span className="ml-1.5 rounded bg-[#8B2635]/5 px-1.5 py-0.5 text-[#8B2635]">Nova can answer from this</span>}
                      </p>
                    </div>
                    <a
                      href={materialDownloadUrl(m)}
                      className="btn-press shrink-0 self-center rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-[#8B2635]/40 hover:text-[#8B2635]"
                      aria-label={`Download ${m.title}`}
                    >
                      <i className="fa-solid fa-download mr-1.5" />Download
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section aria-labelledby="notices-heading" className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] self-start">
          <h2 id="notices-heading" className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-stone-600">Notices &amp; instructions</h2>
          <NoticeList state={notices} />
        </section>
      </div>
    </div>
  );
}
