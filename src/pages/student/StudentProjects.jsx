import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/shared/Toast';

const PROJECTS_DATA = [
  {
    id: 'p1',
    title: 'Enterprise Java Management Portal',
    description: 'Build a production-ready Java application using OOP principles, JDBC, and relational database management.',
    category: 'Backend',
    difficulty: 'Intermediate',
    hours: '25-35 hrs',
    tech: ['Java', 'JDBC', 'MySQL', 'OOP'],
    milestones: [
      'Design relational schema with normalization (1NF, 2NF, 3NF)',
      'Implement DAO layer and connection pooling',
      'Create CRUD controllers with validation and exception handling',
      'Add role-based authentication and audit logging',
    ],
  },
  {
    id: 'p2',
    title: 'Full-Stack Student Portfolio & Task Hub',
    description: 'Create a responsive web application with dynamic state management, Kanban boards, and clean API integration.',
    category: 'Web',
    difficulty: 'Intermediate',
    hours: '20-30 hrs',
    tech: ['React', 'Tailwind CSS', 'REST API', 'JavaScript'],
    milestones: [
      'Set up component hierarchy and Tailwind design tokens',
      'Implement local storage and backend sync for tasks',
      'Add filterable categories and drag-and-drop state updates',
      'Deploy application on Vercel or Netlify',
    ],
  },
  {
    id: 'p3',
    title: 'Secure Authentication & Microservice API',
    description: 'Design and deploy a backend REST API with JWT tokens, password hashing, and role middleware.',
    category: 'Backend',
    difficulty: 'Advanced',
    hours: '30-40 hrs',
    tech: ['Node.js', 'Express', 'JWT', 'PostgreSQL'],
    milestones: [
      'Initialize Express app with security headers and CORS',
      'Configure PostgreSQL models and migrations',
      'Implement JWT token refresh rotation and bcrypt hashing',
      'Write integration tests and API documentation',
    ],
  },
  {
    id: 'p4',
    title: 'Student Analytics & Performance Dashboard',
    description: 'Connect to database records, transform aggregate academic metrics, and render interactive charts.',
    category: 'Data',
    difficulty: 'Beginner',
    hours: '15-20 hrs',
    tech: ['Python', 'Pandas', 'SQL', 'Chart.js'],
    milestones: [
      'Extract CSV and database records using SQL queries',
      'Compute aggregate statistics (mean, percentiles, distribution)',
      'Render SVG/Canvas visualization charts',
      'Export formatted reports as PDF',
    ],
  },
  {
    id: 'p5',
    title: 'Mobile Attendance & Syllabus Companion',
    description: 'Build a cross-platform mobile companion app for tracking lecture attendance and topic coverage.',
    category: 'Mobile',
    difficulty: 'Advanced',
    hours: '35-45 hrs',
    tech: ['React Native', 'SQLite', 'Mobile UI'],
    milestones: [
      'Configure mobile navigation and tab layout',
      'Store offline attendance records in SQLite database',
      'Implement push reminders and syllabus checklist',
      'Build native bundle for Android testing',
    ],
  },
  {
    id: 'p6',
    title: 'Personal Developer Portfolio & Blog',
    description: 'Showcase your BCA coursework, projects, resume, and tech articles with a fast, modern static site.',
    category: 'Web',
    difficulty: 'Beginner',
    hours: '10-15 hrs',
    tech: ['HTML5', 'Tailwind', 'JavaScript', 'Git'],
    milestones: [
      'Design clean, accessible layout with semantic tags',
      'Add interactive project showcase and resume preview',
      'Implement contact form with client validation',
      'Connect custom domain and GitHub Pages deployment',
    ],
  },
];

export default function StudentProjects() {
  const { semester } = useOutletContext();
  const { user } = useAuth();
  const toast = useToast();

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);
  const [startedProjects, setStartedProjects] = useState([]);
  const [checklist, setChecklist] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`npccsm_projects_${user?.id || 'guest'}`);
      if (saved) setStartedProjects(JSON.parse(saved));
    } catch {}

    try {
      const savedChecks = localStorage.getItem(`npccsm_proj_checks_${user?.id || 'guest'}`);
      if (savedChecks) setChecklist(JSON.parse(savedChecks));
    } catch {}
  }, [user?.id]);

  const handleToggleStart = (proj) => {
    const isStarted = startedProjects.includes(proj.id);
    let next;
    if (isStarted) {
      next = startedProjects.filter((id) => id !== proj.id);
      toast.show('Project removed from in-progress list.', 'info');
    } else {
      next = [...startedProjects, proj.id];
      toast.show(`Started "${proj.title}"! Track your milestones below.`, 'success');
      setSelectedProject(proj);
    }
    setStartedProjects(next);
    localStorage.setItem(`npccsm_projects_${user?.id || 'guest'}`, JSON.stringify(next));
  };

  const handleToggleMilestone = (projId, mIdx) => {
    setChecklist((prev) => {
      const current = prev[projId] || {};
      const updated = { ...prev, [projId]: { ...current, [mIdx]: !current[mIdx] } };
      localStorage.setItem(`npccsm_proj_checks_${user?.id || 'guest'}`, JSON.stringify(updated));
      return updated;
    });
  };

  const filteredProjects = useMemo(() => {
    return PROJECTS_DATA.filter((p) => {
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter;
      return matchesCat && matchesDiff;
    });
  }, [categoryFilter, difficultyFilter]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Page Header with Glass Effect ── */}
      <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-6 md:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8B2635]">
                Portfolio Hub
              </span>
              <span className="rounded-full bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                Semester {semester}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-stone-900 mt-1">
              Practical Projects &amp; Resume Exercises
            </h1>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              Bridge academic theory with industry portfolio projects. Start building to demonstrate skills to recruiters.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-stone-200/80 bg-[#FAF7F5] px-4 py-2 text-center shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                In Progress
              </span>
              <p className="text-base font-black text-stone-900 mt-0.5">
                {startedProjects.length} Projects
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 mr-1 hidden md:inline">
            Category:
          </span>
          {['All', 'Backend', 'Web', 'Data', 'Mobile'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                categoryFilter === cat
                  ? 'bg-[#8B2635] text-white shadow-sm font-black'
                  : 'bg-[#FAF7F5] text-stone-700 hover:bg-stone-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] font-black uppercase tracking-wider text-stone-400 mr-1 hidden md:inline">
            Difficulty:
          </span>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => setDifficultyFilter(diff)}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                difficultyFilter === diff
                  ? 'border border-[#8B2635] bg-[#FFF1F2] text-[#8B2635] font-black'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Projects Grid & Milestone Drawer ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Project Cards List */}
        <div className={`space-y-4 ${selectedProject ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProjects.map((proj) => {
              const isStarted = startedProjects.includes(proj.id);
              const isSelected = selectedProject?.id === proj.id;
              const checks = checklist[proj.id] || {};
              const checkedCount = Object.values(checks).filter(Boolean).length;
              const progressPct = Math.round((checkedCount / proj.milestones.length) * 100);

              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#8B2635] bg-[#FFF1F2]/50 ring-1 ring-[#8B2635]'
                      : 'border-stone-200/70 bg-white/85 backdrop-blur-md hover:border-stone-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                        {proj.category}
                      </span>
                      <span className="rounded-md border border-stone-200 bg-[#FAF7F5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                        {proj.difficulty}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-sm font-black text-stone-900 group-hover:text-[#8B2635] transition-colors leading-snug">
                      {proj.title}
                    </h3>
                    <p className="mt-1 text-xs text-stone-500 leading-relaxed line-clamp-2">
                      {proj.description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {proj.tech.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-[#FAF7F5] border border-stone-200/60 px-2 py-0.5 text-[10px] font-medium text-stone-600"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                      <i className="fa-regular fa-clock text-[10px]" /> {proj.hours}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStart(proj);
                      }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        isStarted
                          ? 'bg-stone-800 text-white shadow-sm'
                          : 'bg-[#8B2635] text-white shadow-sm hover:bg-[#77212e]'
                      }`}
                    >
                      {isStarted ? (
                        <>
                          <i className="fa-solid fa-check mr-1 text-[10px]" />
                          <span>{progressPct}% Done</span>
                        </>
                      ) : (
                        <span>Start Project</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Project Milestone Drawer */}
        {selectedProject && (
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
                <div>
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-stone-700">
                    {selectedProject.category} &middot; {selectedProject.difficulty}
                  </span>
                  <h2 className="text-base font-black text-stone-900 tracking-tight mt-1.5 leading-snug">
                    {selectedProject.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                >
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </div>

              <p className="text-xs text-stone-600 mt-2.5 leading-relaxed">
                {selectedProject.description}
              </p>

              {/* Milestone Checklist */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-stone-700">
                    Milestone Tasks
                  </h3>
                  <span className="text-[10px] font-bold text-stone-400">
                    Click to check off
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedProject.milestones.map((step, sIdx) => {
                    const isChecked = !!checklist[selectedProject.id]?.[sIdx];
                    return (
                      <div
                        key={step}
                        onClick={() => handleToggleMilestone(selectedProject.id, sIdx)}
                        className={`group cursor-pointer flex items-start gap-3 rounded-xl border p-3 transition-all ${
                          isChecked
                            ? 'border-stone-300 bg-[#FAF7F5]'
                            : 'border-stone-200/70 bg-white/90 hover:border-stone-300'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 ${
                            isChecked
                              ? 'border-[#8B2635] bg-[#8B2635] text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <i className="fa-solid fa-check text-[9px]" />}
                        </div>
                        <p
                          className={`text-xs font-semibold leading-relaxed ${
                            isChecked ? 'line-through text-stone-400' : 'text-stone-800'
                          }`}
                        >
                          {step}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => handleToggleStart(selectedProject)}
                  className={`w-full rounded-xl py-2.5 text-xs font-bold transition-all ${
                    startedProjects.includes(selectedProject.id)
                      ? 'border border-stone-300 text-stone-700 hover:bg-stone-50'
                      : 'bg-[#8B2635] text-white shadow-sm hover:bg-[#77212e]'
                  }`}
                >
                  {startedProjects.includes(selectedProject.id)
                    ? 'Remove from Active'
                    : 'Mark as In-Progress'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
