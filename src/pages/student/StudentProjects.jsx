import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getProjects, leaveProject, saveProjectProgress, startProject } from '../../lib/apiClient';

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const DIFFICULTY_STYLE = {
  Beginner: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Intermediate: 'bg-amber-50 text-amber-700 ring-amber-200',
  Advanced: 'bg-rose-50 text-rose-700 ring-rose-200',
};

function StatusBadge({ enrollment }) {
  if (!enrollment) {
    return <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-500 ring-1 ring-stone-200">Not started</span>;
  }
  if (enrollment.status === 'completed') {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
        <i className="fa-solid fa-check mr-1" />Completed
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#8B2635]/5 px-2.5 py-0.5 text-[11px] font-bold text-[#8B2635] ring-1 ring-[#8B2635]/20">
      In progress · {enrollment.progress}%
    </span>
  );
}

function SkeletonRows() {
  return (
    <ul aria-hidden="true" className="divide-y divide-stone-100">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex gap-5 px-5 py-6 sm:px-7">
          <div className="h-6 w-8 animate-pulse rounded bg-stone-100" />
          <div className="flex-1 space-y-2.5">
            <div className="h-4 w-1/2 animate-pulse rounded bg-stone-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-stone-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProjectDetails({ project, busy, onStart, onLeave, onToggleMilestone }) {
  const enrollment = project.enrollment;
  const done = new Set(enrollment?.completed_milestones || []);

  return (
    <div id={`project-${project.id}-details`} className="mt-4 anim-slide-down rounded-xl border border-stone-200/80 bg-stone-50/70 p-4 sm:p-5">
      <div className="grid gap-5 md:grid-cols-[1fr_auto]">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-stone-500">Milestones</h4>
          <ol className="mt-3 space-y-2">
            {project.milestones.map((step, idx) => {
              const checked = done.has(idx);
              return (
                <li key={idx}>
                  <label
                    className={`flex items-start gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      enrollment ? 'cursor-pointer hover:bg-white' : 'cursor-default'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#8B2635] disabled:opacity-40"
                      checked={checked}
                      disabled={!enrollment || busy}
                      onChange={() => onToggleMilestone(project, idx)}
                    />
                    <span className={checked ? 'text-stone-400 line-through' : 'text-stone-700'}>{step}</span>
                  </label>
                </li>
              );
            })}
          </ol>
          {!enrollment && <p className="mt-3 text-xs text-stone-500">Start the project to track your milestones.</p>}
        </div>

        <div className="flex flex-row gap-2 md:flex-col md:items-stretch md:min-w-[160px]">
          {enrollment ? (
            <>
              <div className="flex-1 md:flex-none">
                <div className="mb-1 flex justify-between text-[11px] font-bold text-stone-500">
                  <span>Progress</span>
                  <span>{enrollment.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={enrollment.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${project.title} progress`}>
                  <div className="h-full rounded-full bg-[#8B2635] transition-[width] duration-500" style={{ width: `${enrollment.progress}%` }} />
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onLeave(project)}
                className="btn-press rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-600 hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
              >
                Leave project
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStart(project)}
              className="btn-press rounded-lg bg-[#8B2635] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#7a1f2d] disabled:opacity-50"
            >
              {busy ? 'Starting…' : 'Start project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentProjects() {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const res = await getProjects({ category, difficulty, search: debouncedSearch });
      if (id !== requestId.current) return; // a newer request superseded this one
      setProjects(res.data || []);
      setCategories(res.categories || []);
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [category, difficulty, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceProject = (updated) => setProjects((list) => list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));

  const runAction = async (project, fn) => {
    setBusyId(project.id);
    setActionError('');
    try {
      const res = await fn();
      replaceProject(res.data);
    } catch (err) {
      replaceProject(project); // undo any optimistic change
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleStart = (project) => runAction(project, () => startProject(project.id));
  const handleLeave = (project) => {
    if (!window.confirm(`Leave "${project.title}"? Your milestone progress for it will be removed.`)) return;
    runAction(project, () => leaveProject(project.id));
  };
  const handleToggleMilestone = (project, idx) => {
    const current = new Set(project.enrollment?.completed_milestones || []);
    current.has(idx) ? current.delete(idx) : current.add(idx);
    const next = [...current].sort((a, b) => a - b);
    // Optimistic update; runAction restores `project` if the save fails.
    const total = project.milestones.length || 1;
    replaceProject({
      ...project,
      enrollment: { ...project.enrollment, completed_milestones: next, progress: Math.round((next.length / total) * 100) },
    });
    runAction(project, () => saveProjectProgress(project.id, next));
  };

  const summary = useMemo(() => {
    const started = projects.filter((p) => p.enrollment).length;
    const completed = projects.filter((p) => p.enrollment?.status === 'completed').length;
    return { started, completed };
  }, [projects]);

  const filtersActive = category !== 'All' || difficulty !== 'All' || debouncedSearch !== '';

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8B2635]">Portfolio builder</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">Project List</h1>
          <p className="mt-1 text-sm text-stone-500">Practical projects published by your faculty. Start one and track each milestone.</p>
        </div>
        {!loading && !error && (
          <p className="text-xs font-semibold text-stone-500">
            {summary.started} started · {summary.completed} completed
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/70 bg-white/85 p-3 backdrop-blur sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#8B2635]/40 focus:bg-white focus:ring-4 focus:ring-[#8B2635]/10"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-700 outline-none focus:border-[#8B2635]/40"
        >
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          aria-label="Filter by difficulty"
          className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm font-semibold text-stone-700 outline-none focus:border-[#8B2635]/40"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d === 'All' ? 'All levels' : d}</option>
          ))}
        </select>
      </div>

      {actionError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span><i className="fa-solid fa-circle-exclamation mr-2" />{actionError}</span>
          <button type="button" onClick={() => { setActionError(''); load(); }} className="text-xs font-bold underline">Refresh</button>
        </div>
      )}

      {/* ONE unified container for the whole list */}
      <section aria-labelledby="project-list-heading" className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/60 px-5 py-3 sm:px-7">
          <h2 id="project-list-heading" className="text-xs font-black uppercase tracking-[0.18em] text-stone-600">Project list</h2>
          {!loading && !error && <span className="text-xs font-semibold text-stone-400">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>}
        </div>

        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <div className="px-6 py-14 text-center" role="alert">
            <i className="fa-solid fa-triangle-exclamation text-2xl text-rose-400" />
            <p className="mt-3 text-sm font-semibold text-stone-700">Could not load projects</p>
            <p className="mt-1 text-xs text-stone-500">{error}</p>
            <button type="button" onClick={load} className="btn-press mt-4 rounded-lg bg-[#8B2635] px-4 py-2 text-xs font-bold text-white">Try again</button>
          </div>
        ) : projects.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <i className="fa-solid fa-folder-open text-2xl text-stone-300" />
            <p className="mt-3 text-sm font-semibold text-stone-700">{filtersActive ? 'No projects match your filters' : 'No projects published yet'}</p>
            <p className="mt-1 text-xs text-stone-500">
              {filtersActive ? 'Try a different search or clear the filters.' : 'Your faculty will publish projects here.'}
            </p>
            {filtersActive && (
              <button type="button" onClick={() => { setSearch(''); setCategory('All'); setDifficulty('All'); }} className="mt-4 text-xs font-bold text-[#8B2635] underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ol className="divide-y divide-stone-100">
            {projects.map((project, index) => {
              const open = openId === project.id;
              return (
                <li key={project.id} className="list-row-in group px-5 py-5 transition-colors duration-200 hover:bg-stone-50/70 sm:px-7" style={{ animationDelay: `${Math.min(index * 40, 280)}ms` }}>
                  <div className="flex gap-4 sm:gap-6">
                    <span className="w-8 shrink-0 pt-0.5 font-mono text-lg font-bold tabular-nums text-[#8B2635]/70 transition-colors group-hover:text-[#8B2635]" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h3 className="text-base font-bold text-stone-900">{project.title}</h3>
                        <StatusBadge enrollment={project.enrollment} />
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-stone-600">{project.description}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-stone-500">
                        <span className="rounded-md bg-stone-100 px-2 py-0.5">{project.category}</span>
                        <span className={`rounded-md px-2 py-0.5 ring-1 ${DIFFICULTY_STYLE[project.difficulty] || ''}`}>{project.difficulty}</span>
                        {project.estimated_hours && <span><i className="fa-regular fa-clock mr-1" />{project.estimated_hours}</span>}
                        {project.tech?.length > 0 && <span className="text-stone-400">· {project.tech.join(' · ')}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : project.id)}
                        aria-expanded={open}
                        aria-controls={`project-${project.id}-details`}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#8B2635] hover:underline"
                      >
                        {open ? 'Hide details' : 'View details'}
                        <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <ProjectDetails
                          project={project}
                          busy={busyId === project.id}
                          onStart={handleStart}
                          onLeave={handleLeave}
                          onToggleMilestone={handleToggleMilestone}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
