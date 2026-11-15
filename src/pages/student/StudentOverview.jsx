import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSyllabus } from '../../context/SyllabusContext';
import { getSubjectsForSemester, getTotalTopics } from '../../data/syllabusDatabase';
import ConnectionBanner from '../../components/shared/ConnectionBanner';

export default function StudentOverview() {
  const { semester } = useOutletContext();
  const { user } = useAuth();
  const { state, loading, usingFallback } = useSyllabus();
  const navigate = useNavigate();

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);

  const stats = useMemo(() => {
    let totalAllTopics = 0;
    let coveredAllTopics = 0;
    let notesTotal = 0;

    subjects.forEach((sub) => {
      const total = getTotalTopics(sub);
      totalAllTopics += total;
      const subState = state[sub.code];
      if (subState?.coveredTopics) {
        coveredAllTopics += subState.coveredTopics.length;
      }
      if (subState?.topicNotes) {
        notesTotal += Object.keys(subState.topicNotes).length;
      }
    });

    const overallPct = totalAllTopics > 0 ? Math.round((coveredAllTopics / totalAllTopics) * 100) : 0;
    return { totalAllTopics, coveredAllTopics, notesTotal, overallPct };
  }, [subjects, state]);

  const recentUpdates = useMemo(() => {
    const list = [];
    subjects.forEach((sub) => {
      const s = state[sub.code];
      if (s?.coveredTopics && s.coveredTopics.length > 0) {
        list.push({
          subjectCode: sub.code,
          subjectTitle: sub.title,
          faculty: s.facultyName || 'Faculty',
          lastUpdated: s.lastUpdated || 'Recently',
          latestTopic: s.coveredTopics[s.coveredTopics.length - 1],
          totalCovered: s.coveredTopics.length,
          totalTopics: getTotalTopics(sub),
        });
      }
    });
    return list.slice(0, 4);
  }, [subjects, state]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ConnectionBanner show={usingFallback} />

      <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)] backdrop-blur-md md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B2635] text-xl text-white shadow-lg shadow-[#8B2635]/20">
              <i className="fa-solid fa-graduation-cap" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Academic dashboard</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Welcome back, {user?.name || 'Student'}</h1>
              <p className="mt-1 text-sm text-slate-500">Semester {semester} • BCA • {subjects.length} active subjects</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/student/syllabus')}
              className="rounded-xl bg-[#8B2635] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#77212e]"
            >
              <i className="fa-solid fa-list-check mr-2" />
              Academic Plan
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/career')}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-white"
            >
              <i className="fa-solid fa-brain mr-2 text-[#8B2635]" />
              Career Mentor
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Semester progress"
          value={`${stats.overallPct}%`}
          hint={`${stats.coveredAllTopics} / ${stats.totalAllTopics} topics`}
          icon="fa-solid fa-chart-pie"
          accent="rose"
          progress={stats.overallPct}
        />
        <MetricCard
          label="Courses"
          value={String(subjects.length)}
          hint={`Semester ${semester}`}
          icon="fa-solid fa-book-open"
          accent="slate"
          progress={60}
        />
        <MetricCard
          label="Exam notes"
          value={String(stats.notesTotal)}
          hint="Key topics published"
          icon="fa-solid fa-file-lines"
          accent="amber"
          progress={75}
        />
        <MetricCard
          label="Projects"
          value="6"
          hint="Recommended practice"
          icon="fa-solid fa-laptop-code"
          accent="emerald"
          progress={88}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Academic overview</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">Subject performance</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/student/syllabus')}
                className="text-xs font-bold text-[#8B2635] hover:underline"
              >
                View full syllabus →
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {subjects.map((sub) => {
                const subState = state[sub.code];
                const total = getTotalTopics(sub);
                const covered = subState?.coveredTopics?.length || 0;
                const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

                return (
                  <div
                    key={sub.code}
                    onClick={() => navigate('/student/syllabus')}
                    className="group cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-lg bg-[#8B2635]/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8B2635]">
                        {sub.code}
                      </span>
                      <span className="text-sm font-black text-slate-900">{pct}%</span>
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-slate-800">{sub.title}</h3>
                    <p className="mt-1 text-[11px] text-slate-500">{covered} of {total} topics covered</p>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#8B2635] to-[#b85f65] transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Quick access</h3>
                <i className="fa-solid fa-bolt text-xs text-[#8B2635]" />
              </div>

              <div className="mt-4 space-y-3">
                <QuickAction icon="fa-solid fa-brain" label="Career mentor" desc="Placement guidance" onClick={() => navigate('/student/career')} />
                <QuickAction icon="fa-solid fa-laptop-code" label="Projects" desc="Hands-on practice" onClick={() => navigate('/student/projects')} />
                <QuickAction icon="fa-solid fa-box-archive" label="Resources" desc="Notes and materials" onClick={() => navigate('/student/resources')} />
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">This week</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Agenda</span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <AgendaItem time="09:00" title="Data Structures lecture" detail="Room A-12" />
                <AgendaItem time="11:30" title="Web development lab" detail="Project work" />
                <AgendaItem time="15:00" title="Career mentorship" detail="Resume review" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Recent updates</h3>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Live</span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading updates...</div>
            ) : recentUpdates.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No academic updates yet.</div>
            ) : (
              <div className="space-y-3">
                {recentUpdates.map((item) => (
                  <div key={item.subjectCode} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{item.subjectCode}</span>
                      <span className="text-[10px] text-slate-400">{item.lastUpdated}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-800">{item.latestTopic}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{item.faculty}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-[#8B2635] to-[#A93F49] p-5 text-white shadow-[0_18px_40px_rgba(139,38,53,0.22)]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/75">Focus</p>
            <h3 className="mt-2 text-xl font-black">Strong academic momentum</h3>
            <p className="mt-2 text-sm text-white/80">Keep your syllabus coverage aligned to weekly goals and upcoming assessments.</p>
            <button
              type="button"
              onClick={() => navigate('/student/projects')}
              className="mt-4 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#8B2635]"
            >
              Continue learning
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon, accent, progress }) {
  const tones = {
    rose: { bg: 'bg-[#8B2635]/10', text: 'text-[#8B2635]' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-700' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-700' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  };

  const theme = tones[accent] || tones.rose;

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${theme.bg} ${theme.text}`}>
          <i className={icon} />
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-gradient-to-r from-[#8B2635] to-[#b85f65]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, desc, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:border-slate-300 hover:bg-white"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B2635]/10 text-[#8B2635]">
        <i className={icon} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-500">{desc}</p>
      </div>
    </button>
  );
}

function AgendaItem({ time, title, detail }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#8B2635]/10 text-[10px] font-black text-[#8B2635]">
        {time}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
