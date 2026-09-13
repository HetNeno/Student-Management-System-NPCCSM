import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import ConnectionBanner from '../components/shared/ConnectionBanner';
import ChatbotWidget from '../components/shared/ChatbotWidget';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';
import { useAuth } from '../context/AuthContext';
import { askGemini } from '../lib/chatbotApi';

const STUDENT_NOTES_KEY = 'npccsm_student_notes_v1';

// ── Helpers ─────────────────────────────────────────────────────────────────

function circleProgress(pct) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = ((pct / 100) * circ).toFixed(1);
  return { r, circ, dash };
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, sub, color, children }) {
  const colors = {
    crimson: { bg: 'bg-[#FFF1F2]', text: 'text-[#8B2635]', border: 'border-[#FECDD3]' },
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-100' },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-100' },
  };
  const c = colors[color] || colors.crimson;
  return (
    <div className="bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform duration-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-stone-400">{label}</p>
          <p className="mt-1.5 text-2xl font-black text-stone-900 tracking-tight">{value}</p>
          <p className="mt-0.5 text-[11px] font-medium text-stone-400">{sub}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${c.border} ${c.bg} ${c.text}`}>
          <i className={icon} />
        </div>
      </div>
      {children}
    </div>
  );
}

function SubjectChip({ sub, active, pct, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
        active
          ? 'border-[#8B2635]/30 bg-[#FFF1F2] text-[#8B2635] shadow-md shadow-[#8B2635]/08'
          : 'border-stone-200 bg-white text-stone-600 hover:border-[#8B2635]/20 hover:bg-[#FDF8F7]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm transition-all ${active ? 'bg-white text-[#8B2635] shadow-sm' : 'bg-stone-100 text-stone-500'}`}>
          <i className={sub.iconClass} />
        </span>
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-[0.14em]">{sub.code}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-[#8B2635] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold">{pct}%</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function UnitAccordion({ unit, subState, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const covered = unit.topics.filter((t) => subState?.coveredTopics?.includes(t)).length;
  const total = unit.topics.length;
  const pct = total ? Math.round((covered / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-stone-50 hover:bg-stone-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${open ? 'bg-[#8B2635] text-white' : 'bg-stone-200 text-stone-600'}`}>
            <i className={open ? 'fas fa-chevron-up' : 'fas fa-chevron-down'} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-stone-700 truncate">{unit.name}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">{covered}/{total} topics completed</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full rounded-full bg-[#8B2635] transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-emerald-100 text-emerald-700' : pct > 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
            {pct}%
          </span>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-stone-100 bg-white">
          {unit.topics.map((topic) => {
            const isDone = subState?.coveredTopics?.includes(topic);
            const hasNote = subState?.topicNotes?.[topic];
            const isInProgress = !isDone && hasNote;
            return (
              <div key={topic} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50/50 transition-colors">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${isDone ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300 bg-white'}`}>
                  {isDone && <i className="fas fa-check text-[9px] text-white" />}
                </div>
                <span className={`text-xs font-semibold flex-1 transition-colors ${isDone ? 'line-through text-stone-400' : 'text-stone-700'}`}>{topic}</span>
                {isDone && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Done</span>
                )}
                {isInProgress && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">In Progress</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LectureUpdatesCard({ subState, loading }) {
  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-8">
      <div className="spinner mx-auto" />
    </div>
  );

  const covered = subState?.coveredTopics || [];
  const faculty = subState?.facultyName || 'NPCCSM Faculty';
  const updated = subState?.lastUpdated || 'Recently';

  if (!covered.length) return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
      <i className="fas fa-inbox text-3xl text-stone-300 mb-2" />
      <p className="text-xs text-stone-400 font-semibold">No updates published yet</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-stone-800">{faculty}</p>
          <p className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1"><i className="far fa-calendar-alt text-[#8B2635]" /> {updated}</p>
        </div>
        <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Live</span>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {covered.slice(0, 6).map((t) => (
          <span key={t} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200">{t}</span>
        ))}
        {covered.length > 6 && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#FFF1F2] text-[#8B2635] border border-[#FECDD3]">+{covered.length - 6} more</span>
        )}
      </div>
    </div>
  );
}

function ExamFocusCard({ subState }) {
  const notes = subState?.topicNotes ? Object.entries(subState.topicNotes) : [];
  const highYield = ['JVM Architecture', 'Polymorphism', 'Exception Handling', 'Thread Lifecycle', 'HashMap vs TreeMap'];

  return (
    <div className="space-y-2">
      {notes.length > 0 ? (
        notes.slice(0, 4).map(([topic], i) => (
          <div key={topic} className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <i className="fas fa-star text-amber-500 text-xs" />
            <span className="text-[11px] font-bold text-amber-800 truncate">{topic}</span>
            <span className="ml-auto text-[9px] font-black text-amber-500">#{i + 1}</span>
          </div>
        ))
      ) : (
        highYield.slice(0, 4).map((topic, i) => (
          <div key={topic} className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
            <i className="fas fa-star text-amber-400 text-xs" />
            <span className="text-[11px] font-bold text-amber-700 truncate">{topic}</span>
            <span className="ml-auto text-[9px] font-black text-amber-400">#{i + 1}</span>
          </div>
        ))
      )}
    </div>
  );
}

function CareerCard({ onLaunch }) {
  const projects = [
    { title: 'Full-Stack Java Portal', tag: 'Web Dev', score: 82 },
    { title: 'Library Management System', tag: 'OOP', score: 75 },
  ];
  return (
    <div className="space-y-2.5">
      {projects.map((p) => (
        <div key={p.title} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-[11px] font-extrabold text-stone-800 truncate">{p.title}</p>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">{p.tag}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full rounded-full bg-[#8B2635]" style={{ width: `${p.score}%` }} />
            </div>
            <span className="text-[10px] font-extrabold text-[#8B2635]">{p.score}%</span>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onLaunch}
        className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#8B2635] text-white text-xs font-bold px-3 py-2 hover:bg-[#7a2030] transition-colors shadow-sm"
      >
        <i className="fas fa-rocket text-xs" /> Submit Project
      </button>
    </div>
  );
}

function ResourcesCard({ activeSub }) {
  const resources = [
    { label: 'Unit 1 PDF', icon: 'fas fa-file-pdf', color: 'text-red-500' },
    { label: 'Cheat Sheet', icon: 'fas fa-scroll', color: 'text-blue-500' },
    { label: 'Question Bank', icon: 'fas fa-question-circle', color: 'text-purple-500' },
    { label: 'Previous Year', icon: 'fas fa-history', color: 'text-amber-500' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {resources.map((r) => (
        <button
          key={r.label}
          type="button"
          className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 hover:bg-white hover:border-[#8B2635]/20 hover:shadow-sm transition-all group"
        >
          <i className={`${r.icon} ${r.color} text-sm group-hover:scale-110 transition-transform`} />
          <span className="text-[10px] font-extrabold text-stone-600 text-left leading-tight">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function StudentPortal() {
  const [semester, setSemester] = useState(5);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [filterTab, setFilterTab] = useState('all');
  const [assistantPrompt, setAssistantPrompt] = useState('Give me the important questions of this semester, this subject, and this unit.');
  const [assistantMessages, setAssistantMessages] = useState([
    { id: 'welcome', role: 'bot', text: 'I can summarize topics, highlight key points, generate important questions, and answer study queries for your selected subject and unit.' },
  ]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [savedNotes, setSavedNotes] = useState([]);
  const [subjectKey, setSubjectKey] = useState(0);

  const { state, loading, usingFallback } = useSyllabus();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STUDENT_NOTES_KEY}_${user?.id || 'guest'}`);
      setSavedNotes(stored ? JSON.parse(stored) : []);
    } catch { setSavedNotes([]); }
  }, [user?.id]);

  function handleSaveNote(message) {
    const note = {
      id: `${Date.now()}-${message.id}`,
      text: message.text,
      semester,
      subject: activeSub?.title || 'General syllabus',
      unit: activeSub?.units?.[0]?.name || 'General notes',
      createdAt: new Date().toISOString(),
    };
    const nextNotes = [note, ...savedNotes].slice(0, 50);
    setSavedNotes(nextNotes);
    localStorage.setItem(`${STUDENT_NOTES_KEY}_${user?.id || 'guest'}`, JSON.stringify(nextNotes));
  }

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);

  useEffect(() => {
    setSubjectIdx(0);
    setSubjectKey((k) => k + 1);
  }, [semester]);

  const activeSub = subjects[subjectIdx];
  const subState = activeSub ? state[activeSub.code] : null;
  const totalTopics = activeSub ? getTotalTopics(activeSub) : 0;
  const coveredTopics = subState?.coveredTopics?.length || 0;
  const completion = totalTopics ? Math.round((coveredTopics / totalTopics) * 100) : 0;
  const notesCount = subState?.topicNotes ? Object.keys(subState.topicNotes).length : 0;

  const { r, circ, dash } = circleProgress(completion);

  async function handleStudyAssistantSubmit(e) {
    e.preventDefault();
    const trimmedPrompt = assistantPrompt.trim();
    if (!trimmedPrompt) return;
    const userMessage = { id: `${Date.now()}-user`, role: 'user', text: trimmedPrompt };
    setAssistantMessages((prev) => [...prev, userMessage]);
    setAssistantPrompt('');
    setAssistantLoading(true);
    try {
      const unitName = activeSub?.units?.[0]?.name || 'Current unit';
      const answer = await askGemini({ prompt: trimmedPrompt, subject: activeSub, semester, unitName, knowledgeBase: state, conversation: assistantMessages });
      setAssistantMessages((prev) => [...prev, { id: `${Date.now()}-bot`, role: 'bot', text: answer }]);
    } catch {
      setAssistantMessages((prev) => [...prev, { id: `${Date.now()}-bot`, role: 'bot', text: 'I hit a temporary issue. Please try again.' }]);
    } finally {
      setAssistantLoading(false);
    }
  }

  // Filter units for the syllabus tracker
  const filteredUnits = useMemo(() => {
    if (!activeSub) return [];
    if (filterTab === 'all') return activeSub.units;
    return activeSub.units.filter((unit) => {
      const unitCovered = unit.topics.filter((t) => subState?.coveredTopics?.includes(t)).length;
      if (filterTab === 'completed') return unitCovered === unit.topics.length && unit.topics.length > 0;
      if (filterTab === 'pending') return unitCovered < unit.topics.length;
      return true;
    });
  }, [activeSub, filterTab, subState]);

  return (
    <div className="relative z-10 flex min-h-screen flex-col bg-[#FDF8F7]">
      {/* ── Header ── */}
      <Header
        icon="fas fa-user-graduate"
        title="Student Portal"
        accent="emerald"
        semester={semester}
        onSemesterChange={setSemester}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
        <ConnectionBanner show={usingFallback} />

        {/* ── Welcome Banner ── */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#8B2635] shadow-lg shadow-[#8B2635]/20">
                <i className="fas fa-user-graduate text-xl text-white" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#8B2635]">Welcome Back</p>
                <h2 className="text-xl font-black tracking-tight text-stone-900 md:text-2xl">
                  {user?.name || 'Student User'}
                </h2>
                <p className="text-xs text-stone-400 font-semibold mt-0.5">
                  BCA &middot; Semester {semester} &middot; {subjects.length} Active Courses
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/student/career')}
                className="flex items-center gap-2 rounded-xl bg-[#8B2635] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#7a2030] transition-all hover:-translate-y-0.5 shadow-[#8B2635]/20"
              >
                <i className="fas fa-rocket" /> Launch Career Advisor
              </button>
              <button
                type="button"
                onClick={() => navigate('/student/projects')}
                className="flex items-center gap-2 rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-extrabold text-stone-700 hover:bg-stone-50 transition-all"
              >
                <i className="fas fa-folder-open" /> My Projects
              </button>
            </div>
          </div>
        </div>

        {/* ── Metrics Row ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Semester Progress — circular */}
          <MetricCard icon="fas fa-chart-pie" label="Semester Progress" value={`${completion}%`} sub="Course completion status" color="crimson">
            <div className="flex items-center gap-3 mt-1">
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r={r} fill="none" stroke="#F5E0E2" strokeWidth="6" />
                <circle
                  cx="36" cy="36" r={r} fill="none"
                  stroke="#8B2635" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`}
                  strokeDashoffset={circ / 4}
                  className="transition-all duration-700"
                />
                <text x="36" y="40" textAnchor="middle" className="fill-stone-900 text-[11px] font-black" fontSize="13" fontWeight="800">{completion}%</text>
              </svg>
              <div>
                <p className="text-xs font-bold text-stone-700">{coveredTopics} of {totalTopics}</p>
                <p className="text-[10px] text-stone-400">topics covered</p>
                <span className={`mt-1.5 inline-block text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${completion < 60 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {completion < 60 ? 'At Risk' : 'On Track'}
                </span>
              </div>
            </div>
          </MetricCard>

          {/* Active Subjects */}
          <MetricCard icon="fas fa-book-open" label="Active Subjects" value={subjects.length} sub="Subjects Enrolled" color="emerald">
            <div className="flex items-center gap-1.5 mt-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-700">All courses active this semester</span>
            </div>
          </MetricCard>

          {/* Exam Notes */}
          <MetricCard icon="fas fa-lightbulb" label="Exam Notes" value={notesCount || 4} sub="Files Published" color="amber">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {['Unit PDF', 'Cheat Sheet', 'Q-Bank', 'PYQ'].map((tag) => (
                <span key={tag} className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{tag}</span>
              ))}
            </div>
          </MetricCard>
        </div>

        {/* ── Subject Selector Strip ── */}
        <div key={`selector-${semester}`} className="bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-stone-500">Select Subject</h3>
            <span className="text-[10px] font-bold text-stone-400">{subjects.length} courses</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
            {subjects.length === 0 ? (
              <span className="text-xs text-stone-400 px-2">No courses for this semester.</span>
            ) : (
              subjects.map((sub, idx) => {
                const cs = state[sub.code] || {};
                const pc = getTotalTopics(sub);
                const pct = pc ? Math.round(((cs.coveredTopics?.length || 0) / pc) * 100) : 0;
                return (
                  <SubjectChip
                    key={`${semester}-${sub.code}`}
                    sub={sub}
                    active={idx === subjectIdx}
                    pct={pct}
                    onClick={() => { setSubjectIdx(idx); setSubjectKey((k) => k + 1); }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── Main Two-Column Workspace ── */}
        {activeSub && (
          <div key={`workspace-${semester}-${activeSub.code}-${subjectKey}`} className="grid gap-6 lg:grid-cols-[55%_45%] items-start">

            {/* ── LEFT: Syllabus Tracker ── */}
            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 md:p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF1F2] text-[#8B2635]">
                      <i className="fas fa-list-check text-sm" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.12em] text-stone-800">Course Coverage &amp; Syllabus Tracker</h3>
                  </div>
                  <p className="text-[10px] text-stone-400 font-semibold ml-10">{activeSub.title} &middot; {activeSub.code}</p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 mb-4 border-b border-stone-100 pb-3">
                {['all', 'completed', 'pending'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                      filterTab === tab
                        ? 'bg-[#8B2635] text-white shadow-sm'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Units Accordion */}
              <div className="space-y-3">
                {filteredUnits.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-400 font-semibold">No units match this filter.</div>
                ) : (
                  filteredUnits.map((unit, uIdx) => (
                    <UnitAccordion
                      key={unit.name}
                      unit={unit}
                      subState={subState}
                      defaultOpen={uIdx === 0}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── RIGHT: 2×2 Grid ── */}
            <div className="grid grid-cols-2 gap-4 content-start">

              {/* TOP-LEFT: Lecture Updates */}
              <div className="col-span-1 bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <i className="fas fa-rss text-xs" />
                  </div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-stone-700">Lecture Updates</h4>
                </div>
                <LectureUpdatesCard subState={subState} loading={loading} />
              </div>

              {/* TOP-RIGHT: Exam Focus */}
              <div className="col-span-1 bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <i className="fas fa-star text-xs" />
                  </div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-stone-700">Exam Focus</h4>
                </div>
                <ExamFocusCard subState={subState} />
              </div>

              {/* BOTTOM-LEFT: Career & Projects */}
              <div className="col-span-1 bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <i className="fas fa-rocket text-xs" />
                  </div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-stone-700">Career &amp; Projects</h4>
                </div>
                <CareerCard onLaunch={() => navigate('/student/projects')} />
              </div>

              {/* BOTTOM-RIGHT: Study Resources */}
              <div className="col-span-1 bg-white rounded-2xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <i className="fas fa-book text-xs" />
                  </div>
                  <h4 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-stone-700">Study Resources</h4>
                </div>
                <ResourcesCard activeSub={activeSub} />
              </div>

            </div>
          </div>
        )}

        {/* Empty state if no subject */}
        {!activeSub && !loading && (
          <div className="bg-white rounded-2xl border border-stone-200/60 p-16 text-center">
            <i className="fas fa-books text-4xl text-stone-300 mb-3" />
            <p className="text-sm font-semibold text-stone-400">No subjects available for Semester {semester}.</p>
          </div>
        )}
      </main>

      <ChatbotWidget
        open={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        messages={assistantMessages}
        prompt={assistantPrompt}
        onPromptChange={setAssistantPrompt}
        onSubmit={handleStudyAssistantSubmit}
        loading={assistantLoading}
        subject={activeSub}
        semester={semester}
        savedNotes={savedNotes}
        onSaveNote={handleSaveNote}
      />
    </div>
  );
}
