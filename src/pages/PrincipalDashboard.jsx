import { useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import ConnectionBanner from '../components/shared/ConnectionBanner';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';
import Button from '../components/shared/Button';
import AccountsPanel from '../components/principal/AccountsPanel';
import AssistantPanel from '../components/principal/AssistantPanel';

export default function PrincipalDashboard() {
  const [semester, setSemester] = useState(5);
  const { state, loading, usingFallback } = useSyllabus();

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);

  const overview = useMemo(() => {
    if (!subjects.length) return { totalTopics: 0, coveredTopics: 0, avgCompletion: 0, atRisk: 0 };
    let totalTopics = 0, coveredTopics = 0, atRisk = 0;
    subjects.forEach((sub) => {
      const s = state[sub.code] || { coveredTopics: [] };
      const total = getTotalTopics(sub);
      const covered = (s.coveredTopics || []).length;
      totalTopics += total; coveredTopics += covered;
      if (total > 0 && Math.round((covered / total) * 100) < 60) atRisk++;
    });
    return {
      totalTopics, coveredTopics,
      avgCompletion: totalTopics ? Math.round((coveredTopics / totalTopics) * 100) : 0,
      atRisk,
    };
  }, [subjects, state]);

  return (
    <div className="principal-shell relative z-10 flex min-h-screen flex-col">
      <Header
        icon="fas fa-building-columns"
        title="Principal Dashboard"
        accent="indigo"
        semester={semester}
        onSemesterChange={setSemester}
        links={[
          { to: '/principal', label: 'Dashboard', icon: 'fa-solid fa-gauge' },
          { to: '/principal/projects', label: 'Projects', icon: 'fa-solid fa-laptop-code' },
          { to: '/principal/content', label: 'Materials', icon: 'fa-solid fa-folder-open' },
        ]}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-5 p-4 md:p-6 lg:p-8">
        <ConnectionBanner show={usingFallback} />

        {/* Hero */}
        <div className="anim-fade-in-up gradient-hero-soft rounded-[1.5rem] border border-indigo-100 p-5 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">Academic oversight</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl">Semester {semester} Overview</h1>
              <p className="mt-1 text-xs text-slate-500">Monitor syllabus health and faculty delivery across all courses</p>
            </div>
            <span className="badge badge-info">{overview.avgCompletion}% overall coverage</span>
          </div>

          {/* Overall progress bar */}
          {subjects.length > 0 && (
            <div className="mt-4">
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full transition-all duration-700 ${overview.avgCompletion < 60 ? 'bg-gradient-to-r from-amber-400 to-red-400' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'}`} style={{ width: `${overview.avgCompletion}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* KPI Tiles */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile label="Avg Completion" value={`${overview.avgCompletion}%`} hint={`${overview.coveredTopics}/${overview.totalTopics} topics`} icon="fas fa-chart-pie" tone="indigo" />
          <KpiTile label="Courses" value={String(subjects.length)} hint="Active subjects" icon="fas fa-book-open" tone="emerald" />
          <KpiTile label="At Risk" value={String(overview.atRisk)} hint="Below 60% coverage" icon="fas fa-triangle-exclamation" tone={overview.atRisk > 0 ? 'amber' : 'emerald'} pulse={overview.atRisk > 0} />
          <KpiTile label="Sync" value={loading ? '...' : 'Live'} hint={usingFallback ? 'Offline mode' : 'Real-time'} icon="fas fa-bolt" tone="violet" />
        </div>

        {/* At-risk Alert */}
        {overview.atRisk > 0 && (
          <div className="anim-fade-in-up rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <i className="fas fa-triangle-exclamation" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800">{overview.atRisk} subject{overview.atRisk > 1 ? 's' : ''} below 60% coverage</p>
                <p className="text-[11px] text-amber-600">{subjects.filter((sub) => { const s = state[sub.code]; const t = getTotalTopics(sub); const c = (s?.coveredTopics || []).length; return t > 0 && Math.round((c / t) * 100) < 60; }).map((s) => s.code).join(', ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Subject Cards Grid */}
        <div>
          <h2 className="section-label mb-3">Subject Health</h2>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
            </div>
          ) : subjects.length === 0 ? (
            <EmptyState icon="fas fa-folder-open" title="No syllabus data" description={`No courses found for Semester ${semester}.`} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {subjects.map((sub, idx) => {
                const s = state[sub.code] || { coveredTopics: [] };
                const total = getTotalTopics(sub);
                const covered = (s.coveredTopics || []).length;
                const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
                const isLow = pct < 60;

                return (
                  <div key={`${semester}-${sub.code}`} className={`anim-fade-in-up card-hover-lift metric-card rounded-xl p-5 stagger`} style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="anim-scale-in-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700" style={{ animationDelay: `${idx * 60 + 80}ms` }}>
                          <i className={sub.iconClass} />
                        </div>
                        <div>
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{sub.code}</div>
                          <div className="text-[11px] font-bold text-slate-400">{sub.type}</div>
                        </div>
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black ${isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {pct}%
                      </span>
                    </div>

                    <h3 className="mt-3 text-sm font-black text-slate-800 line-clamp-2" title={sub.title}>{sub.title}</h3>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full transition-all duration-700 ${isLow ? 'bg-gradient-to-r from-amber-400 to-red-400' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'}`} style={{ width: `${pct}%` }} />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                      <span>{covered} / {total} covered</span>
                      <span className={`flex items-center gap-1 ${isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                        <i className={isLow ? 'fas fa-triangle-exclamation' : 'fas fa-check-circle'} />
                        {isLow ? 'Needs attention' : 'On track'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <AccountsPanel />
          <AssistantPanel />
        </div>
      </main>
    </div>
  );
}

function KpiTile({ label, value, hint, icon, tone, pulse }) {
  const tones = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-600' },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className={`anim-fade-in-up metric-card rounded-xl p-4 ${pulse ? 'anim-pulse-glow' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">{hint}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${t.border} ${t.bg} ${t.text}`}>
          <i className={icon} />
        </div>
      </div>
    </div>
  );
}
