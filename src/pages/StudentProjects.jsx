import { useMemo, useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import { useAuth } from '../context/AuthContext';

const PROJECTS = [
  { id: 'p1', title: 'REST API with Authentication', description: 'Build a production-ready REST API with JWT auth, user CRUD, and input validation. Use Postman for testing.', tech: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Postman'], difficulty: 'Intermediate', hours: '20-30h', skills: ['Backend', 'API Design', 'Security'] },
  { id: 'p2', title: 'Task Management Dashboard', description: 'Create a Kanban-style task manager with drag-and-drop, filters, labels, and team collaboration features.', tech: ['React', 'TypeScript', 'CSS Grid', 'DnD Kit'], difficulty: 'Intermediate', hours: '15-25h', skills: ['Frontend', 'State Management', 'UI/UX'] },
  { id: 'p3', title: 'Real-time Chat Application', description: 'Build a chat app with real-time messaging, user presence indicators, and persistent message history.', tech: ['React', 'Socket.io', 'Express', 'MongoDB'], difficulty: 'Advanced', hours: '25-35h', skills: ['WebSockets', 'Real-time', 'Full Stack'] },
  { id: 'p4', title: 'Expense Tracker with Analytics', description: 'Track expenses, visualize spending patterns with charts, and generate monthly financial reports.', tech: ['React Native', 'SQLite', 'Chart.js'], difficulty: 'Intermediate', hours: '20-30h', skills: ['Mobile Dev', 'Data Viz', 'Charts'] },
  { id: 'p5', title: 'E-commerce Mini Store', description: 'Full-stack store with product catalog, shopping cart, and simulated checkout with Stripe integration.', tech: ['Next.js', 'Stripe', 'PostgreSQL', 'Tailwind'], difficulty: 'Advanced', hours: '30-40h', skills: ['Full Stack', 'Payments', 'SSR'] },
  { id: 'p6', title: 'Data Pipeline Dashboard', description: 'Connect to CSV/SQL data, transform it with Python, and visualize insights in an interactive dashboard.', tech: ['Python', 'Pandas', 'Chart.js', 'SQL'], difficulty: 'Beginner', hours: '10-15h', skills: ['Data Analysis', 'Python', 'ETL'] },
  { id: 'p7', title: 'URL Shortener Service', description: 'Create a URL shortener with analytics, custom aliases, QR code generation, and click tracking.', tech: ['Express', 'Redis', 'PostgreSQL'], difficulty: 'Beginner', hours: '10-15h', skills: ['Backend', 'Caching', 'REST API'] },
  { id: 'p8', title: 'Portfolio Website', description: 'Build a personal portfolio with projects showcase, blog with markdown, and working contact form.', tech: ['Next.js', 'Tailwind', 'Vercel', 'Framer Motion'], difficulty: 'Beginner', hours: '8-12h', skills: ['Frontend', 'Deployment', 'Design'] },
  { id: 'p9', title: 'Quiz Application', description: 'Build a timed quiz app with multiple question types, scoring, leaderboard, and admin panel.', tech: ['React', 'Firebase', 'Tailwind'], difficulty: 'Intermediate', hours: '15-20h', skills: ['Frontend', 'BaaS', 'Forms'] },
  { id: 'p10', title: 'Weather Forecast Dashboard', description: 'Build a weather app with geolocation, 7-day forecast, and interactive charts using public APIs.', tech: ['React', 'OpenWeather API', 'Chart.js'], difficulty: 'Beginner', hours: '8-12h', skills: ['API Integration', 'Async', 'Data Viz'] },
];

const DIFFICULTY_COLORS = { Beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200', Intermediate: 'bg-amber-100 text-amber-700 border-amber-200', Advanced: 'bg-rose-100 text-rose-700 border-rose-200' };

export default function StudentProjects() {
  const [semester] = useState(5);
  const [filter, setFilter] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);
  const [startedProjects, setStartedProjects] = useState([]);
  const [checklist, setChecklist] = useState({});
  const { user } = useAuth();

  const { state, loading } = useSyllabus();
  const subjects = getSubjectsForSemester(semester);

  const userSkills = useMemo(() => {
    const skills = new Set();
    subjects.forEach((sub) => {
      const s = state[sub.code];
      (s?.coveredTopics || []).forEach((t) => {
        if (t.toLowerCase().includes('react')) skills.add('React');
        if (t.toLowerCase().includes('node')) skills.add('Node.js');
        if (t.toLowerCase().includes('python')) skills.add('Python');
        if (t.toLowerCase().includes('database') || t.toLowerCase().includes('sql')) skills.add('SQL');
        if (t.toLowerCase().includes('api')) skills.add('REST API');
        if (t.toLowerCase().includes('git')) skills.add('Git');
      });
    });
    return skills;
  }, [subjects, state]);

  useEffect(() => {
    try {
      const p = localStorage.getItem(`npccsm_projects_${user?.id || 'guest'}`);
      if (p) setStartedProjects(JSON.parse(p));
    } catch {}
  }, [user?.id]);

  function handleStart(proj) {
    const next = startedProjects.includes(proj.id) ? startedProjects.filter((x) => x !== proj.id) : [...startedProjects, proj.id];
    setStartedProjects(next);
    localStorage.setItem(`npccsm_projects_${user?.id || 'guest'}`, JSON.stringify(next));
    if (!startedProjects.includes(proj.id)) {
      setChecklist((c) => ({ ...c, [proj.id]: {} }));
      setSelectedProject(proj);
    }
  }

  function toggleCheck(projId, stepIdx) {
    setChecklist((prev) => {
      const projChecks = prev[projId] || {};
      const next = { ...prev, [projId]: { ...projChecks, [stepIdx]: !projChecks[stepIdx] } };
      return next;
    });
  }

  const filtered = filter === 'All' ? PROJECTS : PROJECTS.filter((p) => {
    if (filter === 'Web') return p.tech.some((t) => ['React', 'Next.js', 'Tailwind', 'TypeScript'].includes(t));
    if (filter === 'Backend') return p.tech.some((t) => ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Redis'].includes(t));
    if (filter === 'Data') return p.tech.some((t) => ['Python', 'Pandas', 'SQL', 'Chart.js'].includes(t));
    if (filter === 'Mobile') return p.tech.some((t) => ['React Native', 'Flutter', 'iOS', 'Android'].includes(t));
    return true;
  });

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Header icon="fas fa-code" title="My Projects" accent="indigo" semester={semester} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-5 p-4 md:p-6 lg:p-8">
        <div className="anim-fade-in-up gradient-hero-soft rounded-[1.5rem] border border-indigo-100 p-5 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">Resume builder</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 md:text-2xl">Real-world projects to build</h1>
              <p className="mt-1 text-xs text-slate-500">Industry-ready projects that prove your skills to employers</p>
            </div>
            <div className="flex items-center gap-2">
              {startedProjects.length > 0 && (
                <span className="badge badge-success"><i className="fas fa-check mr-1" />{startedProjects.length} started</span>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="anim-fade-in-up flex gap-2">
          {['All', 'Web', 'Backend', 'Data', 'Mobile'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition btn-press ${filter === f ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          {/* Project List */}
          <div className={`space-y-4 ${selectedProject ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
            {filtered.map((proj, idx) => {
              const isStarted = startedProjects.includes(proj.id);
              return (
                <div key={proj.id} className={`anim-fade-in-up card-hover-lift rounded-xl border bg-white p-5 cursor-pointer stagger ${isStarted ? 'border-indigo-300 shadow-sm shadow-indigo-100' : 'border-slate-200'}`} style={{ animationDelay: `${idx * 50}ms` }} onClick={() => setSelectedProject(proj)}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${isStarted ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <i className={isStarted ? 'fas fa-check' : 'fas fa-code'} />
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-800">{proj.title}</h3>
                        <p className="text-[10px] text-slate-500">{proj.hours} &middot; {proj.difficulty}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase ${DIFFICULTY_COLORS[proj.difficulty]}`}>{proj.difficulty}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{proj.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {proj.tech.map((t) => (
                      <span key={t} className={`rounded-md px-2 py-0.5 text-[9px] font-bold ${userSkills.has(t) ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                        {userSkills.has(t) ? <i className="fas fa-check mr-0.5" /> : null}{t}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Skills: {proj.skills.join(', ')}</span>
                    <Button size="sm" variant={isStarted ? 'secondary' : 'primary'} onClick={(e) => { e.stopPropagation(); handleStart(proj); }}>
                      {isStarted ? <><i className="fas fa-pause mr-1.5" />Pause</> : <><i className="fas fa-rocket mr-1.5" />Start</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Detail / Workspace */}
          {selectedProject && (
            <div className="lg:col-span-7 anim-slide-in-right">
              <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900">{selectedProject.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{selectedProject.description}</p>
                  </div>
                  <button onClick={() => setSelectedProject(null)} className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                    <i className="fas fa-xmark text-xs" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedProject.tech.map((t) => (
                    <span key={t} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${userSkills.has(t) ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                      {userSkills.has(t) ? '✓ ' : ''}{t}
                    </span>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 mb-4">
                  <p className="section-label mb-3">Implementation Checklist</p>
                  {(() => {
                    const steps = generateSteps(selectedProject);
                    const checks = checklist[selectedProject.id] || {};
                    const done = Object.values(checks).filter(Boolean).length;
                    return (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-slate-500">Progress</span>
                          <span className="text-[10px] font-bold text-indigo-600">{done}/{steps.length} steps</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 mb-4">
                          <div className="h-full rounded-full bg-indigo-600 anim-progress-fill" style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }} />
                        </div>
                        <div className="space-y-2">
                          {steps.map((step, i) => (
                            <label key={i} className="flex items-start gap-2.5 rounded-lg bg-white px-3 py-2.5 border border-slate-200 cursor-pointer hover:border-indigo-200 transition">
                              <input type="checkbox" checked={!!checks[i]} onChange={() => toggleCheck(selectedProject.id, i)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                              <span className={`text-xs font-medium ${checks[i] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{step}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="section-label mb-2" style={{ color: '#b45309' }}>Tips for this project</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-xs text-slate-600">
                      <i className="fas fa-lightbulb text-amber-500 mt-0.5" />
                      Push your code to GitHub with a proper README from day one.
                    </li>
                    <li className="flex items-start gap-2 text-xs text-slate-600">
                      <i className="fas fa-lightbulb text-amber-500 mt-0.5" />
                      Write clean, commented code. Future you and interviewers will thank you.
                    </li>
                    <li className="flex items-start gap-2 text-xs text-slate-600">
                      <i className="fas fa-lightbulb text-amber-500 mt-0.5" />
                      Deploy to Vercel or Render so it has a live URL for your resume.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function generateSteps(proj) {
  const steps = {
    p1: ['Initialize Node.js project with Express', 'Set up MongoDB connection', 'Create user authentication middleware (JWT)', 'Build CRUD endpoints for resources', 'Add input validation and error handling', 'Write tests with Jest', 'Deploy to Render/Railway'],
    p2: ['Set up React + TypeScript project', 'Create board and column layout', 'Implement drag-and-drop functionality', 'Add task creation and editing', 'Build filter and search features', 'Style with Tailwind CSS', 'Deploy to Vercel'],
    p3: ['Set up React frontend + Express backend', 'Implement Socket.io connection', 'Build chat message component', 'Add user presence indicators', 'Implement message history with MongoDB', 'Add emoji reactions', 'Deploy backend and frontend'],
    p4: ['Initialize React Native project', 'Build expense entry form', 'Create SQLite database schema', 'Implement chart visualizations', 'Add monthly/yearly reports', 'Export data to CSV', 'Publish to Expo/App Store'],
    p5: ['Set up Next.js with TypeScript', 'Build product catalog with images', 'Implement shopping cart state', 'Add Stripe payment integration', 'Create order management system', 'Add admin dashboard', 'Deploy to Vercel'],
    p6: ['Set up Python environment with Pandas', 'Connect to data source (CSV/SQL)', 'Build data transformation pipeline', 'Create visualization charts', 'Build interactive dashboard UI', 'Add export functionality', 'Write documentation'],
    p7: ['Initialize Express project', 'Set up PostgreSQL database', 'Create URL shortening logic', 'Add Redis caching for performance', 'Build analytics tracking', 'Generate QR codes', 'Deploy to Railway'],
    p8: ['Initialize Next.js + Tailwind', 'Build hero and about sections', 'Create projects showcase grid', 'Add blog with MDX support', 'Build contact form with email', 'Add Framer Motion animations', 'Deploy to Vercel'],
    p9: ['Set up React + Firebase', 'Build quiz question component', 'Implement timer and scoring', 'Create leaderboard feature', 'Build admin panel for questions', 'Add different question types', 'Deploy to Netlify'],
    p10: ['Set up React project', 'Integrate weather API', 'Build 7-day forecast component', 'Create interactive charts', 'Add geolocation support', 'Add city search feature', 'Deploy to Vercel'],
  };
  return steps[proj.id] || ['Research the technology stack', 'Set up project structure', 'Build core features', 'Add styling and polish', 'Write tests', 'Deploy and document'];
}
