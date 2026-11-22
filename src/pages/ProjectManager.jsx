import { useCallback, useEffect, useState } from 'react';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { createProject, deleteProject, getProject, getProjects, updateProject } from '../lib/apiClient';

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Web',
  difficulty: 'Beginner',
  estimated_hours: '',
  tech: '',
  milestones: '',
  semester: '',
  status: 'published',
};

const STATUS_STYLE = {
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  draft: 'bg-amber-50 text-amber-700 ring-amber-200',
  archived: 'bg-stone-100 text-stone-500 ring-stone-200',
};

const input = 'w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#8B2635]/40 focus:bg-white focus:ring-4 focus:ring-[#8B2635]/10';

function ProjectForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          ...initial,
          estimated_hours: initial.estimated_hours || '',
          tech: (initial.tech || []).join(', '),
          milestones: (initial.milestones || []).join('\n'),
          semester: initial.semester ?? '',
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError('');
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      difficulty: form.difficulty,
      estimated_hours: form.estimated_hours.trim() || null,
      tech: form.tech.split(',').map((t) => t.trim()).filter(Boolean),
      milestones: form.milestones.split('\n').map((m) => m.trim()).filter(Boolean),
      semester: form.semester === '' ? null : Number(form.semester),
      status: form.status,
    };
    try {
      const res = initial ? await updateProject(initial.id, payload) : await createProject(payload);
      onSaved(res.data);
    } catch (err) {
      const fieldErrors = Object.fromEntries(Object.entries(err.errors || {}).map(([k, v]) => [k.split('.')[0], v[0]]));
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const err = (k) => errors[k] && <p className="mt-1 text-xs font-semibold text-rose-600">{errors[k]}</p>;

  return (
    <form onSubmit={submit} className="anim-slide-down space-y-4 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-black uppercase tracking-wider text-stone-600">{initial ? 'Edit project' : 'New project'}</h2>
      {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="pf-title" className="mb-1 block text-xs font-bold text-stone-500">Title</label>
          <input id="pf-title" className={input} value={form.title} onChange={set('title')} required />
          {err('title')}
        </div>
        <div className="md:col-span-2">
          <label htmlFor="pf-desc" className="mb-1 block text-xs font-bold text-stone-500">Short description</label>
          <textarea id="pf-desc" rows={2} className={input} value={form.description} onChange={set('description')} required />
          {err('description')}
        </div>
        <div>
          <label htmlFor="pf-cat" className="mb-1 block text-xs font-bold text-stone-500">Category</label>
          <input id="pf-cat" className={input} value={form.category} onChange={set('category')} list="pf-categories" required />
          <datalist id="pf-categories">
            {['Web', 'Backend', 'Data', 'Mobile'].map((c) => <option key={c} value={c} />)}
          </datalist>
          {err('category')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pf-diff" className="mb-1 block text-xs font-bold text-stone-500">Difficulty</label>
            <select id="pf-diff" className={input} value={form.difficulty} onChange={set('difficulty')}>
              {['Beginner', 'Intermediate', 'Advanced'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pf-hours" className="mb-1 block text-xs font-bold text-stone-500">Estimated time</label>
            <input id="pf-hours" className={input} value={form.estimated_hours} onChange={set('estimated_hours')} placeholder="20-30 hrs" />
          </div>
        </div>
        <div>
          <label htmlFor="pf-tech" className="mb-1 block text-xs font-bold text-stone-500">Technologies (comma separated)</label>
          <input id="pf-tech" className={input} value={form.tech} onChange={set('tech')} placeholder="PHP, MySQL" />
          {err('tech')}
        </div>
        <div>
          <label htmlFor="pf-sem" className="mb-1 block text-xs font-bold text-stone-500">For semester</label>
          <select id="pf-sem" className={input} value={form.semester} onChange={set('semester')}>
            <option value="">All semesters</option>
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Semester {n} only</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pf-status" className="mb-1 block text-xs font-bold text-stone-500">Visibility</label>
          <select id="pf-status" className={input} value={form.status} onChange={set('status')}>
            <option value="published">Published (visible to students)</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="pf-ms" className="mb-1 block text-xs font-bold text-stone-500">Milestones (one per line)</label>
          <textarea id="pf-ms" rows={4} className={input} value={form.milestones} onChange={set('milestones')} required />
          {err('milestones')}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-press rounded-lg border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50">Cancel</button>
        <button type="submit" disabled={saving} className="btn-press rounded-lg bg-[#8B2635] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#7a1f2d] disabled:opacity-50">
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Publish project'}
        </button>
      </div>
    </form>
  );
}

function StudentProgress({ projectId }) {
  const [state, setState] = useState({ loading: true, error: '', students: [] });

  useEffect(() => {
    let active = true;
    getProject(projectId)
      .then((res) => active && setState({ loading: false, error: '', students: res.data.students || [] }))
      .catch((err) => active && setState({ loading: false, error: err.message, students: [] }));
    return () => {
      active = false;
    };
  }, [projectId]);

  if (state.loading) return <p className="mt-3 text-xs text-stone-400">Loading student progress…</p>;
  if (state.error) return <p role="alert" className="mt-3 text-xs text-rose-600">{state.error}</p>;
  if (!state.students.length) return <p className="mt-3 text-xs text-stone-500">No students have started this project yet.</p>;

  return (
    <div className="anim-slide-down mt-3 overflow-x-auto rounded-xl border border-stone-200/80">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead className="bg-stone-50 text-[10px] font-black uppercase tracking-wider text-stone-500">
          <tr>
            <th className="px-3 py-2">Student</th>
            <th className="px-3 py-2">Sem</th>
            <th className="px-3 py-2">Progress</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {state.students.map((row) => (
            <tr key={row.student?.id}>
              <td className="px-3 py-2">
                <div className="font-bold text-stone-800">{row.student?.name}</div>
                <div className="text-stone-400">{row.student?.email}</div>
              </td>
              <td className="px-3 py-2 text-stone-600">{row.student?.semester ?? '—'}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
                    <div className="h-full rounded-full bg-[#8B2635]" style={{ width: `${row.progress}%` }} />
                  </div>
                  <span className="font-bold text-stone-600">{row.progress}%</span>
                </div>
              </td>
              <td className="px-3 py-2 font-semibold capitalize text-stone-600">{row.status.replace('_', ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjectManager() {
  const { user } = useAuth();
  const isPrincipal = user?.role === 'principal';
  const base = isPrincipal ? '/principal' : '/teacher';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | project
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getProjects();
      setProjects(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSaved = (project) => {
    setEditing(null);
    setNotice(`Saved "${project.title}".`);
    load();
  };

  const setStatus = async (project, status) => {
    setNotice('');
    try {
      await updateProject(project.id, { status });
      setNotice(`"${project.title}" is now ${status}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (project) => {
    if (!window.confirm(`Delete "${project.title}" permanently? All student progress on it will also be deleted. Archiving keeps the history.`)) return;
    try {
      await deleteProject(project.id);
      setNotice(`Deleted "${project.title}".`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-[#FDF8F7]">
      <Header
        icon={isPrincipal ? 'fas fa-building-columns' : 'fa-solid fa-chalkboard-user'}
        title="Student Projects"
        subtitle="Publish project briefs and follow student progress"
        links={[
          { to: base, label: isPrincipal ? 'Dashboard' : 'Studio', icon: 'fa-solid fa-gauge' },
          { to: `${base}/projects`, label: 'Projects', icon: 'fa-solid fa-laptop-code' },
          { to: `${base}/content`, label: 'Materials', icon: 'fa-solid fa-folder-open' },
        ]}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 p-4 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900">Project catalogue</h1>
            <p className="mt-1 text-sm text-stone-500">Published projects appear in every student's Project List.</p>
          </div>
          {!editing && (
            <button type="button" onClick={() => setEditing('new')} className="btn-press rounded-xl bg-[#8B2635] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#7a1f2d]">
              <i className="fa-solid fa-plus mr-1.5" />New project
            </button>
          )}
        </div>

        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p>}
        {error && !loading && projects.length > 0 && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

        {editing && <ProjectForm initial={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSaved={onSaved} />}

        <section aria-label="Project list" className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-5 py-3 sm:px-7">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-stone-600">Project list</h2>
            {!loading && <span className="text-xs font-semibold text-stone-400">{projects.length} total</span>}
          </div>

          {loading ? (
            <p className="px-7 py-10 text-sm text-stone-400" role="status">Loading projects…</p>
          ) : error && !projects.length ? (
            <div className="px-6 py-12 text-center" role="alert">
              <p className="text-sm font-semibold text-stone-700">Could not load projects</p>
              <p className="mt-1 text-xs text-stone-500">{error}</p>
              <button type="button" onClick={load} className="mt-4 rounded-lg bg-[#8B2635] px-4 py-2 text-xs font-bold text-white">Try again</button>
            </div>
          ) : !projects.length ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-stone-700">No projects yet</p>
              <p className="mt-1 text-xs text-stone-500">Create the first project brief for your students.</p>
            </div>
          ) : (
            <ol className="divide-y divide-stone-100">
              {projects.map((p, i) => (
                <li key={p.id} className="list-row-in px-5 py-5 transition-colors hover:bg-stone-50/70 sm:px-7" style={{ animationDelay: `${Math.min(i * 40, 280)}ms` }}>
                  <div className="flex gap-4 sm:gap-6">
                    <span className="w-8 shrink-0 pt-0.5 font-mono text-lg font-bold tabular-nums text-[#8B2635]/70" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="text-base font-bold text-stone-900">{p.title}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ring-1 ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-stone-600">{p.description}</p>
                      <p className="mt-2 text-[11px] font-semibold text-stone-500">
                        {p.semester ? `Semester ${p.semester}` : 'All semesters'} · {p.category} · {p.difficulty} · {p.milestones.length} milestones · {p.enrollments_count ?? 0} started · {p.completed_count ?? 0} completed
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold">
                        <button type="button" aria-expanded={openId === p.id} onClick={() => setOpenId(openId === p.id ? null : p.id)} className="text-[#8B2635] hover:underline">
                          {openId === p.id ? 'Hide student progress' : 'Student progress'}
                        </button>
                        <button type="button" onClick={() => { setEditing(p); window.scrollTo({ top: 0 }); }} className="text-stone-600 hover:text-stone-900">Edit</button>
                        {p.status === 'published' ? (
                          <button type="button" onClick={() => setStatus(p, 'archived')} className="text-stone-600 hover:text-stone-900">Archive</button>
                        ) : (
                          <button type="button" onClick={() => setStatus(p, 'published')} className="text-emerald-700 hover:text-emerald-900">Publish</button>
                        )}
                        {isPrincipal && (
                          <button type="button" onClick={() => remove(p)} className="text-rose-600 hover:text-rose-800">Delete</button>
                        )}
                      </div>
                      {openId === p.id && <StudentProgress projectId={p.id} />}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
