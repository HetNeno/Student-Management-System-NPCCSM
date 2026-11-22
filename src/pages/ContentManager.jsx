import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/layout/Header';
import NoticeList from '../components/shared/NoticeList';
import { useAuth } from '../context/AuthContext';
import { getSubjectsForSemester } from '../data/syllabusDatabase';
import { createNotice, deleteMaterial, deleteNotice, getMaterials, getNotices, materialDownloadUrl, uploadMaterial } from '../lib/apiClient';
import { CATEGORY_LABELS, fileIcon, formatSize } from './student/StudentResources';

const SEMESTERS = [1, 2, 3, 4, 5, 6];
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.txt,.xlsx,.zip';
const MAX_BYTES = 20 * 1024 * 1024;
const input = 'w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none transition focus:border-[#8B2635]/40 focus:bg-white focus:ring-4 focus:ring-[#8B2635]/10';

function errorsOf(err) {
  return Object.fromEntries(Object.entries(err.errors || {}).map(([k, v]) => [k, v[0]]));
}

function UploadForm({ onUploaded }) {
  const [form, setForm] = useState({ title: '', description: '', semester: 5, subject_code: '', category: 'notes' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const subjects = useMemo(() => getSubjectsForSemester(form.semester), [form.semester]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'semester' ? { subject_code: '' } : {}) }));

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.title.trim().length < 3) next.title = 'Enter a title (at least 3 characters).';
    if (!file) next.file = 'Choose a file to upload.';
    else if (file.size > MAX_BYTES) next.file = 'Files must be 20 MB or smaller.';
    setErrors(next);
    if (Object.keys(next).length) return;

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v !== '' && fd.append(k, v));
    fd.append('file', file);
    setSaving(true);
    try {
      const res = await uploadMaterial(fd);
      setForm((f) => ({ ...f, title: '', description: '' }));
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onUploaded(res.data);
    } catch (err) {
      const fe = errorsOf(err);
      setErrors(Object.keys(fe).length ? fe : { _: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {errors._ && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{errors._}</p>}
      <div>
        <label htmlFor="m-title" className="mb-1 block text-[11px] font-bold text-stone-500">Title</label>
        <input id="m-title" className={input} value={form.title} onChange={set('title')} placeholder="e.g. Unit II notes: Dimensional Modeling" />
        {errors.title && <p className="mt-1 text-[11px] text-rose-600">{errors.title}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="m-sem" className="mb-1 block text-[11px] font-bold text-stone-500">Semester</label>
          <select id="m-sem" className={input} value={form.semester} onChange={set('semester')}>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="m-cat" className="mb-1 block text-[11px] font-bold text-stone-500">Type</label>
          <select id="m-cat" className={input} value={form.category} onChange={set('category')}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="m-sub" className="mb-1 block text-[11px] font-bold text-stone-500">Subject (optional)</label>
        <select id="m-sub" className={input} value={form.subject_code} onChange={set('subject_code')}>
          <option value="">General (whole semester)</option>
          {subjects.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.title}</option>)}
        </select>
        {errors.subject_code && <p className="mt-1 text-[11px] text-rose-600">{errors.subject_code}</p>}
      </div>
      <div>
        <label htmlFor="m-desc" className="mb-1 block text-[11px] font-bold text-stone-500">Short description / instructions (optional)</label>
        <textarea id="m-desc" rows={2} className={input} value={form.description} onChange={set('description')} />
      </div>
      <div>
        <label htmlFor="m-file" className="mb-1 block text-[11px] font-bold text-stone-500">File (PDF, Word, PowerPoint, Excel, TXT, ZIP · max 20 MB)</label>
        <input
          id="m-file"
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-xs text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#8B2635]/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#8B2635] hover:file:bg-[#8B2635]/15"
        />
        {file && <p className="mt-1 text-[11px] text-stone-500">{file.name} · {formatSize(file.size)}</p>}
        {errors.file && <p className="mt-1 text-[11px] text-rose-600">{errors.file}</p>}
        <p className="mt-1 text-[10px] text-stone-400">Text-based PDFs and TXT files are also indexed so Nova can answer questions from them.</p>
      </div>
      <button type="submit" disabled={saving} className="btn-press w-full rounded-xl bg-[#8B2635] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#7a1f2d] disabled:opacity-50">
        {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1.5" />Uploading…</> : <><i className="fa-solid fa-cloud-arrow-up mr-1.5" />Upload for students</>}
      </button>
    </form>
  );
}

function NoticeForm({ onPosted }) {
  const [form, setForm] = useState({ title: '', body: '', semester: '', subject_code: '', priority: 'normal', expires_at: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const subjects = useMemo(() => (form.semester ? getSubjectsForSemester(Number(form.semester)) : []), [form.semester]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'semester' ? { subject_code: '' } : {}) }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await createNotice({
        title: form.title.trim(),
        body: form.body.trim(),
        semester: form.semester ? Number(form.semester) : null,
        subject_code: form.subject_code || null,
        priority: form.priority,
        expires_at: form.expires_at || null,
      });
      setForm((f) => ({ ...f, title: '', body: '', expires_at: '' }));
      onPosted();
    } catch (err) {
      const fe = errorsOf(err);
      setErrors(Object.keys(fe).length ? fe : { _: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {errors._ && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{errors._}</p>}
      <div>
        <label htmlFor="n-title" className="mb-1 block text-[11px] font-bold text-stone-500">Title</label>
        <input id="n-title" className={input} value={form.title} onChange={set('title')} placeholder="e.g. Internal test on Monday" required />
        {errors.title && <p className="mt-1 text-[11px] text-rose-600">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="n-body" className="mb-1 block text-[11px] font-bold text-stone-500">Notice / instructions</label>
        <textarea id="n-body" rows={3} className={input} value={form.body} onChange={set('body')} required />
        {errors.body && <p className="mt-1 text-[11px] text-rose-600">{errors.body}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="n-sem" className="mb-1 block text-[11px] font-bold text-stone-500">Audience</label>
          <select id="n-sem" className={input} value={form.semester} onChange={set('semester')}>
            <option value="">All semesters</option>
            {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="n-pri" className="mb-1 block text-[11px] font-bold text-stone-500">Priority</label>
          <select id="n-pri" className={input} value={form.priority} onChange={set('priority')}>
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="n-sub" className="mb-1 block text-[11px] font-bold text-stone-500">Subject (optional)</label>
          <select id="n-sub" className={input} value={form.subject_code} onChange={set('subject_code')} disabled={!form.semester}>
            <option value="">—</option>
            {subjects.map((s) => <option key={s.code} value={s.code}>{s.code}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="n-exp" className="mb-1 block text-[11px] font-bold text-stone-500">Hide after (optional)</label>
          <input id="n-exp" type="date" className={input} value={form.expires_at} onChange={set('expires_at')} />
          {errors.expires_at && <p className="mt-1 text-[11px] text-rose-600">{errors.expires_at}</p>}
        </div>
      </div>
      <button type="submit" disabled={saving} className="btn-press w-full rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
        {saving ? 'Posting…' : <><i className="fa-solid fa-bullhorn mr-1.5" />Post notice</>}
      </button>
    </form>
  );
}

export default function ContentManager() {
  const { user } = useAuth();
  const isPrincipal = user?.role === 'principal';
  const base = isPrincipal ? '/principal' : '/teacher';
  const [semFilter, setSemFilter] = useState('All');
  const [materials, setMaterials] = useState({ loading: true, error: '', items: [] });
  const [notices, setNotices] = useState({ loading: true, error: '', items: [] });
  const [flash, setFlash] = useState('');

  const loadMaterials = useCallback(() => {
    setMaterials((m) => ({ ...m, loading: true }));
    getMaterials({ semester: semFilter })
      .then((res) => setMaterials({ loading: false, error: '', items: res.data || [] }))
      .catch((err) => setMaterials({ loading: false, error: err.message, items: [] }));
  }, [semFilter]);

  const loadNotices = useCallback(() => {
    getNotices()
      .then((res) => setNotices({ loading: false, error: '', items: res.data || [] }))
      .catch((err) => setNotices({ loading: false, error: err.message, items: [] }));
  }, []);

  useEffect(loadMaterials, [loadMaterials]);
  useEffect(loadNotices, [loadNotices]);

  const removeMaterial = async (m) => {
    if (!window.confirm(`Delete "${m.title}"? Students will no longer see it.`)) return;
    try {
      await deleteMaterial(m.id);
      loadMaterials();
    } catch (err) {
      setFlash(err.message);
    }
  };

  const removeNotice = async (n) => {
    if (!window.confirm(`Delete notice "${n.title}"?`)) return;
    try {
      await deleteNotice(n.id);
      loadNotices();
    } catch (err) {
      setFlash(err.message);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-[#FDF8F7]">
      <Header
        icon={isPrincipal ? 'fas fa-building-columns' : 'fa-solid fa-chalkboard-user'}
        title="Materials & Notices"
        subtitle="Published directly to the student portal"
        links={[
          { to: base, label: isPrincipal ? 'Dashboard' : 'Studio', icon: 'fa-solid fa-gauge' },
          { to: `${base}/projects`, label: 'Projects', icon: 'fa-solid fa-laptop-code' },
          { to: `${base}/content`, label: 'Materials', icon: 'fa-solid fa-folder-open' },
        ]}
      />

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 p-4 md:p-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <section aria-labelledby="up-h" className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h2 id="up-h" className="mb-3 text-sm font-black text-stone-900"><i className="fa-solid fa-file-arrow-up mr-2 text-[#8B2635]" />Upload study material</h2>
            <UploadForm onUploaded={(m) => { setFlash(`Uploaded "${m.title}"${m.indexed_for_ai ? ' and indexed for Nova' : ''}.`); loadMaterials(); }} />
          </section>
          <section aria-labelledby="no-h" className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h2 id="no-h" className="mb-3 text-sm font-black text-stone-900"><i className="fa-solid fa-bullhorn mr-2 text-[#8B2635]" />Post a notice or instruction</h2>
            <NoticeForm onPosted={() => { setFlash('Notice posted to the student portal.'); loadNotices(); }} />
          </section>
        </div>

        <div className="space-y-5">
          {flash && (
            <p role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
              {flash}
              <button type="button" onClick={() => setFlash('')} aria-label="Dismiss" className="text-emerald-700"><i className="fa-solid fa-xmark" /></button>
            </p>
          )}

          <section aria-labelledby="ml-h" className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-5 py-3">
              <h2 id="ml-h" className="text-xs font-black uppercase tracking-[0.18em] text-stone-600">Uploaded materials</h2>
              <select value={semFilter} onChange={(e) => setSemFilter(e.target.value)} aria-label="Filter by semester" className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold">
                <option value="All">All semesters</option>
                {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            {materials.loading ? (
              <p className="px-5 py-8 text-center text-sm text-stone-400">Loading…</p>
            ) : materials.error ? (
              <p className="px-5 py-8 text-center text-sm text-rose-600" role="alert">{materials.error}</p>
            ) : !materials.items.length ? (
              <p className="px-5 py-10 text-center text-sm text-stone-500">Nothing uploaded yet.</p>
            ) : (
              <ol className="divide-y divide-stone-100">
                {materials.items.map((m, i) => (
                  <li key={m.id} className="list-row-in flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50/70" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
                    <i className={`${fileIcon(m.original_name)} text-lg`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-900">{m.title}</p>
                      <p className="text-[11px] text-stone-500">
                        Sem {m.semester}{m.subject_code ? ` · ${m.subject_code}` : ''} · {CATEGORY_LABELS[m.category]} · {formatSize(m.size_bytes)} · {m.uploaded_by}
                        {m.indexed_for_ai ? ' · indexed for Nova' : ''}
                      </p>
                    </div>
                    <a href={materialDownloadUrl(m)} className="text-xs font-bold text-stone-600 hover:text-[#8B2635]">Open</a>
                    {m.can_delete && <button type="button" onClick={() => removeMaterial(m)} className="text-xs font-bold text-rose-600 hover:text-rose-800">Delete</button>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="nl-h" className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm">
            <h2 id="nl-h" className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-stone-600">Posted notices</h2>
            <NoticeList state={notices} onDelete={removeNotice} />
          </section>
        </div>
      </main>
    </div>
  );
}
