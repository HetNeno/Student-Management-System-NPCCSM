import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useSyllabus } from '../context/SyllabusContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/shared/Toast';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import EmptyState from '../components/shared/EmptyState';
import Button from '../components/shared/Button';
import ConnectionBanner from '../components/shared/ConnectionBanner';

const STUDENT_NOTES_KEY = 'npccsm_student_notes_v1';

const PROJECTS = [
  { id: 'p1', title: 'REST API with Authentication', description: 'Build a production-ready REST API with JWT auth, CRUD operations, and input validation.', tech: ['Node.js', 'Express', 'MongoDB', 'JWT'], difficulty: 'Intermediate', hours: '20-30h', skills: ['Backend', 'API Design', 'Security'] },
  { id: 'p2', title: 'Task Management Dashboard', description: 'Create a Kanban-style task manager with drag-and-drop, filters, and team collaboration.', tech: ['React', 'TypeScript', 'CSS Grid'], difficulty: 'Intermediate', hours: '15-25h', skills: ['Frontend', 'State Management', 'UI/UX'] },
  { id: 'p3', title: 'Real-time Chat Application', description: 'Build a chat app with real-time messaging, user presence, and message history.', tech: ['React', 'Socket.io', 'Express'], difficulty: 'Advanced', hours: '25-35h', skills: ['WebSockets', 'Real-time', 'Full Stack'] },
  { id: 'p4', title: 'Expense Tracker with Analytics', description: 'Track expenses, visualize spending patterns, and generate monthly reports.', tech: ['React Native', 'SQLite', 'Chart.js'], difficulty: 'Intermediate', hours: '20-30h', skills: ['Mobile Dev', 'Data Viz', 'Charts'] },
  { id: 'p5', title: 'E-commerce Mini Store', description: 'Build a store with product catalog, cart, and simulated checkout flow.', tech: ['Next.js', 'Stripe', 'PostgreSQL'], difficulty: 'Advanced', hours: '30-40h', skills: ['Full Stack', 'Payments', 'SSR'] },
  { id: 'p6', title: 'Data Pipeline Dashboard', description: 'Connect to CSV/SQL data, transform it, and visualize insights in a dashboard.', tech: ['Python', 'Pandas', 'Chart.js', 'SQL'], difficulty: 'Beginner', hours: '10-15h', skills: ['Data Analysis', 'Python', 'ETL'] },
  { id: 'p7', title: 'URL Shortener Service', description: 'Create a URL shortener with analytics, custom aliases, and QR code generation.', tech: ['Express', 'Redis', 'PostgreSQL'], difficulty: 'Beginner', hours: '10-15h', skills: ['Backend', 'Caching', 'REST API'] },
  { id: 'p8', title: 'Portfolio Website', description: 'Build a personal portfolio with projects showcase, blog, and contact form.', tech: ['Next.js', 'Tailwind', 'Vercel'], difficulty: 'Beginner', hours: '8-12h', skills: ['Frontend', 'Deployment', 'Design'] },
];

const DIFFICULTY_COLORS = { Beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200', Intermediate: 'bg-amber-100 text-amber-700 border-amber-200', Advanced: 'bg-rose-100 text-rose-700 border-rose-200' };

export default function StudentDashboard() {
  const [semester, setSemester] = useState(5);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [savedNotes, setSavedNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [projectFilter, setProjectFilter] = useState('All');
  const [startedProjects, setStartedProjects] = useState([]);
  const location = useLocation();
  const { state, loading, usingFallback } = useSyllabus();
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    try {
      const n = localStorage.getItem(`${STUDENT_NOTES_KEY}_${user?.id || 'guest'}`);
      setSavedNotes(n ? JSON.parse(n) : []);
    } catch { setSavedNotes([]); }

    try {
      const p = localStorage.getItem(`npccsm_projects_${user?.id || 'guest'}`);
      setStartedProjects(p ? JSON.parse(p) : []);
    } catch { setStartedProjects([]); }
  }, [user?.id]);

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);
  useEffect(() => setSubjectIdx(0), [semester]);

  const activeSub = subjects[subjectIdx];
  const subState = activeSub ? state[activeSub.code] : null;

  const totalTopics = activeSub ? getTotalTopics(activeSub) : 0;
  const coveredTopics = subState?.coveredTopics?.length || 0;
  const completion = totalTopics ? Math.round((coveredTopics / totalTopics) * 100) : 0;
  const notesCount = subState?.topicNotes ? Object.keys(subState.topicNotes).length : 0;

  const overview = useMemo(() => {
    if (!subjects.length) return { avgCompletion: 0, atRisk: 0 };
    let total = 0, covered = 0, atRisk = 0;
    subjects.forEach((sub) => {
      const s = state[sub.code] || { coveredTopics: [] };
      const t = getTotalTopics(sub);
      const c = (s.coveredTopics || []).length;
      total += t; covered += c;
      if (t > 0 && Math.round((c / t) * 100) < 60) atRisk++;
    });
    return { avgCompletion: total ? Math.round((covered / total) * 100) : 0, atRisk };
  }, [subjects, state]);

  const filteredProjects = projectFilter === 'All' ? PROJECTS : PROJECTS.filter((p) => {
    if (projectFilter === 'Web') return p.tech.some((t) => ['React', 'Next.js', 'Express', 'Tailwind'].includes(t));
    if (projectFilter === 'Data') return p.tech.some((t) => ['Python', 'Pandas', 'SQL', 'Chart.js'].includes(t));
    if (projectFilter === 'Backend') return p.tech.some((t) => ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'Redis'].includes(t));
    return true;
  });

  function toggleProject(id) {
    const isCurrentlyStarted = startedProjects.includes(id);
    setStartedProjects((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(`npccsm_projects_${user?.id || 'guest'}`, JSON.stringify(next));
      return next;
    });
    const proj = PROJECTS.find((p) => p.id === id);
    toast.success(isCurrentlyStarted ? `"${proj.title}" paused` : `"${proj.title}" started! Good luck.`);
  }

  function handleSaveNote(message) {
    const note = {
      id: `${Date.now()}-${message.id}`,
      text: message.text,
      semester,
      subject: activeSub?.title || 'General',
      unit: activeSub?.units?.[0]?.name || 'General',
      createdAt: new Date().toISOString(),
    };
    const next = [note, ...savedNotes].slice(0, 50);
    setSavedNotes(next);
    localStorage.setItem(`${STUDENT_NOTES_KEY}_${user?.id || 'guest'}`, JSON.stringify(next));
    toast.success('Note saved to your collection');
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Header
        icon="fas fa-user-graduate"
        title="Student Portal"
        accent="emerald"
        semester={semester}
        onSemesterChange={setSemester}
        right={
          <div className="flex items-center gap-2">
            <Link to="/student" className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${isActive('/student') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}>
              <i className="fas fa-th-large mr-1.5" /> Dashboard
            </Link>
            <Link to="/student/career" className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${isActive('/student/career') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}>
              <i className="fas fa-robot mr-1.5" /> Career Advisor
            </Link>
            <Link to="/student/projects" className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${isActive('/student/projects') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}>
              <i className="fas fa-code mr-1.5" /> Projects
            </Link>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-5 p-4 md:p-6 lg:p-8">
        <ConnectionBanner show={usingFallback} />

        {/* Welcome Hero */}
        <div className="anim-fade-in-up gradient-hero-soft rounded-[1.5rem] border border-indigo-100 p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">Welcome back</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl">{user?.name || 'Student'}</h1>
              <p className="mt-1 text-xs text-slate-500">BCA &middot; Semester {semester} &middot; {subjects.length} active courses</p>
            </div>
            <div className="flex items-center gap-2.5">
              <Link to="/student/career">
                <Button icon="fas fa-robot" size="md">Open Career Advisor</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard label="Semester progress" value={`${overview.avgCompletion}%`} hint={`Average across ${subjects.length} subjects`} icon="fas fa-chart-pie" tone="indigo" />
          <KpiCard label="Active subjects" value={String(subjects.length)} hint={`${overview.atRisk} need attention`} icon="fas fa-book" tone="emerald" />
          <KpiCard label="Exam notes" value={String(notesCount)} hint="Published by faculty" icon="fas fa-lightbulb" tone="amber" />
        </div>

        {/* Subject Selector */}
        <div className="anim-fade-in-up glass-panel p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between px-2">
            <h3 className="section-label">Subjects — Semester {semester}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{subjects.length} courses</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {subjects.map((sub, idx) => {
              const s = state[sub.code] || { coveredTopics: [] };
              const t = getTotalTopics(sub);
              const c = (s.coveredTopics || []).length;
              const p = t ? Math.round((c / t) * 100) : 0;
              const isActive = idx === subjectIdx;
              return (
                <button
                  key={sub.code}
                  onClick={() => setSubjectIdx(idx)}
                  className={`shrink-0 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 btn-press ${isActive ? 'border-indigo-200 bg-indigo-50 shadow-sm shadow-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-100'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <i className={sub.iconClass} />
                    </span>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{sub.code}</div>
                      <div className="text-xs font-bold text-slate-700">{p}%</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          {/* Updates Feed */}
          <div className="lg:col-span-7">
            <div className="anim-fade-in-up glass-panel p-5 md:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <i className="fas fa-rss" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">Lecture Updates</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{activeSub ? activeSub.title : 'No subject'}</p>
                  </div>
                </div>
                <span className="badge badge-info">{loading ? 'Loading' : activeSub ? 'Updated' : 'Pending'}</span>
              </div>
              <div className="mt-5">
                {loading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-20 w-full" />
                  </div>
                ) : activeSub && subState?.coveredTopics?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {subState.coveredTopics.map((t, i) => (
                        <span key={t} className="anim-fade-in-up rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 stagger" style={{ animationDelay: `${i * 30}ms` }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    {subState.topicNotes && Object.keys(subState.topicNotes).length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                        <p className="section-label mb-2.5" style={{ color: '#b45309' }}><i className="fas fa-star mr-1.5" />Exam Focus</p>
                        {Object.entries(subState.topicNotes).map(([topic, note], i) => (
                          <div key={topic} className="anim-fade-in-up rounded-lg bg-white p-3 mb-2 border border-amber-100 stagger" style={{ animationDelay: `${i * 60}ms` }}>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">{topic}</span>
                            <p className="mt-1 text-xs text-slate-600">{note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState icon="fas fa-inbox" title="No updates yet" description="Faculty hasn't published lecture notes for this subject." />
                )}
              </div>
            </div>
          </div>

          {/* Coverage + Notes */}
          <div className="lg:col-span-5 space-y-5">
            <div className="anim-fade-in-up glass-panel p-5 md:p-6">
              <h3 className="section-label mb-4">Course Coverage</h3>
              {activeSub ? (
                <div className="space-y-4">
                  {activeSub.units.map((unit, uIdx) => (
                    <div key={unit.name} className="anim-fade-in-up rounded-xl border border-slate-200 bg-slate-50/60 p-3" style={{ animationDelay: `${uIdx * 80}ms` }}>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">{unit.name}</p>
                      <div className="space-y-1.5">
                        {unit.topics.map((topic) => {
                          const isDone = subState?.coveredTopics?.includes(topic);
                          return (
                            <div key={topic} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors ${isDone ? 'bg-emerald-50' : 'bg-white'}`}>
                              <i className={`fas text-[10px] ${isDone ? 'fa-circle-check text-emerald-500' : 'fa-circle text-slate-300'}`} />
                              <span className={`text-[11px] font-medium ${isDone ? 'text-emerald-700' : 'text-slate-500'}`}>{topic}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon="fas fa-book-open" title="Select a subject" description="Choose from the subject cards above." />
              )}
            </div>

            {/* Saved Notes Toggle */}
            {savedNotes.length > 0 && (
              <div className="anim-fade-in-up glass-panel p-4">
                <button onClick={() => setShowNotes((v) => !v)} className="flex w-full items-center justify-between text-left">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                    <i className="fas fa-bookmark mr-1.5" /> My Notes ({savedNotes.length})
                  </span>
                  <i className={`fas fa-chevron-${showNotes ? 'up' : 'down'} text-xs text-slate-400 transition-transform`} />
                </button>
                {showNotes && (
                  <div className="anim-slide-down mt-3 space-y-2">
                    {savedNotes.slice(0, 5).map((note) => (
                      <div key={note.id} className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Sem {note.semester} &middot; {note.subject}</p>
                        <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{note.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Projects Section */}
        <div className="anim-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">Your Projects</h2>
              <p className="text-[11px] font-medium text-slate-500">Real-world projects to build and add to your resume</p>
            </div>
            <div className="flex gap-1.5">
              {['All', 'Web', 'Backend', 'Data'].map((f) => (
                <button key={f} onClick={() => setProjectFilter(f)} className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${projectFilter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {filteredProjects.map((proj, idx) => {
              const isStarted = startedProjects.includes(proj.id);
              return (
                <div key={proj.id} className="anim-fade-in-up card-hover-lift rounded-xl border border-slate-200 bg-white p-4 stagger" style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-xs font-black text-slate-800 line-clamp-2">{proj.title}</h4>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase ${DIFFICULTY_COLORS[proj.difficulty]}`}>{proj.difficulty}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2">{proj.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {proj.tech.map((t) => (
                      <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">{proj.hours}</span>
                    <Button size="sm" variant={isStarted ? 'secondary' : 'primary'} onClick={() => toggleProject(proj.id)}>
                      {isStarted ? <><i className="fas fa-check mr-1.5" /> Started</> : <><i className="fas fa-rocket mr-1.5" /> Start</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({ label, value, hint, icon, tone }) {
  const tones = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', ring: 'ring-indigo-100' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', ring: 'ring-amber-100' },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className={`anim-fade-in-up card-hover-lift metric-card rounded-xl p-4 ${t.ring}`} style={{ animationDelay: `${Math.random() * 100}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${t.border} ${t.bg} ${t.text}`}>
          <i className={icon} />
        </div>
      </div>
    </div>
  );
}
