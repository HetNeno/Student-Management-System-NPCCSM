import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionBanner from '../components/shared/ConnectionBanner';
import EmptyState from '../components/shared/EmptyState';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';
import { useAuth } from '../context/AuthContext';
import { useReminderScheduler } from '../hooks/useReminderScheduler';
import { useToast } from '../components/shared/Toast';

const todayISO = () => new Date().toISOString().split('T')[0];

const SEMESTERS = [
  { id: 1, label: 'Semester 1' },
  { id: 2, label: 'Semester 2' },
  { id: 3, label: 'Semester 3' },
  { id: 4, label: 'Semester 4' },
  { id: 5, label: 'Semester 5' },
  { id: 6, label: 'Semester 6' },
];

export default function TeacherStudio() {
  const [semester, setSemester] = useState(5);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [facultyName, setFacultyName] = useState('Prof. Faculty Member');
  const [lectureDate, setLectureDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderSubject, setReminderSubject] = useState(null);
  const [semDropdownOpen, setSemDropdownOpen] = useState(false);

  const toast = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { state, loading, usingFallback, publishUpdate } = useSyllabus();

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);
  useEffect(() => setSubjectIdx(0), [semester]);

  const activeSub = subjects[subjectIdx];
  const savedState = activeSub ? state[activeSub.code] : null;

  const { staleSubjects, getHoursSinceUpdate, sendReminder } = useReminderScheduler(subjects, state);

  const [draft, setDraft] = useState({ coveredTopics: [], topicNotes: {} });
  const [errors, setErrors] = useState({});
  const [subjectKey, setSubjectKey] = useState(0);

  useEffect(() => {
    setDraft({
      coveredTopics: savedState?.coveredTopics ? [...savedState.coveredTopics] : [],
      topicNotes: savedState?.topicNotes ? { ...savedState.topicNotes } : {},
    });
    setErrors({});
    setSubjectKey((k) => k + 1);
  }, [activeSub?.code, loading]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!activeSub) {
    return (
      <div className="min-h-screen bg-[#FDF8F7] text-stone-800">
        <header className="sticky top-0 z-30 h-16 border-b border-stone-200/70 bg-white/80 backdrop-blur-xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B2635] text-white">
              <i className="fa-solid fa-chalkboard-user text-sm" />
            </div>
            <h1 className="text-base font-black text-stone-900">Faculty Studio</h1>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-stone-500 hover:text-stone-800">
            Sign out
          </button>
        </header>
        <main className="mx-auto max-w-7xl p-8">
          <ConnectionBanner show={usingFallback} />
          <EmptyState icon="fa-solid fa-folder-open" title="No syllabus data" description={`No courses found for Semester ${semester}.`} />
        </main>
      </div>
    );
  }

  const total = getTotalTopics(activeSub);
  const covered = draft.coveredTopics.length;
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const notesPending = draft.coveredTopics.filter((t) => !draft.topicNotes[t]?.trim()).length;

  function toggleTopic(topic) {
    setDraft((prev) => {
      const isChecked = prev.coveredTopics.includes(topic);
      const coveredTopics = isChecked ? prev.coveredTopics.filter((t) => t !== topic) : [...prev.coveredTopics, topic];
      return { ...prev, coveredTopics };
    });
    setErrors((prev) => ({ ...prev, [topic]: false }));
  }

  function setNote(topic, value) {
    setDraft((prev) => ({ ...prev, topicNotes: { ...prev.topicNotes, [topic]: value } }));
    if (value.trim()) setErrors((prev) => ({ ...prev, [topic]: false }));
  }

  function handleSendReminder(sub) {
    const { mailto, smsLink, hours } = sendReminder(sub);
    setReminderSubject({ sub, mailto, smsLink, hours });
    setShowReminder(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const missing = draft.coveredTopics.filter((t) => !draft.topicNotes[t]?.trim());
    if (missing.length > 0) {
      const nextErrors = {};
      missing.forEach((t) => (nextErrors[t] = true));
      setErrors(nextErrors);
      toast.error('Important note/question required for all marked topics', { title: 'Missing notes' });
      return;
    }

    const topicNotes = {};
    draft.coveredTopics.forEach((t) => { topicNotes[t] = draft.topicNotes[t]; });

    setSaving(true);
    await publishUpdate({
      subjectCode: activeSub.code,
      title: activeSub.title,
      semester,
      coveredTopics: draft.coveredTopics,
      topicNotes,
      overallNotes: 'Updated via Faculty Studio.',
      lectureDate,
      facultyName: facultyName || 'Prof. Faculty Member',
    });
    setSaving(false);
    toast.success('Syllabus & lecture update published successfully');
  }

  return (
    <div className="min-h-screen bg-[#FDF8F7] text-stone-800 font-sans antialiased">
      {/* ── Sticky Glass Header ── */}
      <header className="sticky top-0 z-40 h-16 border-b border-stone-200/70 bg-white/85 backdrop-blur-xl px-6 md:px-10 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-md shadow-[#8B2635]/20">
            <i className="fa-solid fa-chalkboard-user text-base" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8B2635]">
                Faculty Command
              </span>
              <span className="text-stone-300">&bull;</span>
              <span className="text-[11px] font-bold text-stone-500">
                Semester {semester}
              </span>
            </div>
            <h1 className="text-base font-black text-stone-900 tracking-tight leading-tight">
              Curriculum Studio &amp; Syllabus Manager
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Semester Dropdown Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSemDropdownOpen(!semDropdownOpen)}
              className="flex items-center gap-2 rounded-xl border border-stone-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-stone-800 hover:border-stone-300 shadow-sm transition-all"
            >
              <i className="fa-regular fa-calendar text-stone-400 text-[11px]" />
              <span>Semester {semester}</span>
              <i className={`fa-solid fa-chevron-down text-[10px] text-stone-400 transition-transform ${semDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {semDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-stone-200/80 bg-white/95 backdrop-blur-xl p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="space-y-0.5">
                  {SEMESTERS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSemester(s.id);
                        setSemDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        s.id === semester ? 'bg-[#8B2635] text-white shadow-sm font-black' : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>{s.label}</span>
                      {s.id === semester && <i className="fa-solid fa-check text-[10px]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Signout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-xs text-stone-400" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main className="mx-auto max-w-7xl p-5 md:p-8 space-y-6">
        <ConnectionBanner show={usingFallback} />

        {/* ── Top Overview & Faculty Identity Banner ── */}
        <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
                <i className="fa-solid fa-user-tie text-xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#8B2635]">
                    Instructor Profile
                  </span>
                  <span className="text-stone-300">&bull;</span>
                  <span className="text-[11px] text-stone-500 font-medium">BCA Department</span>
                </div>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="Enter Faculty Name"
                  className="mt-0.5 border-b border-transparent bg-transparent text-base md:text-lg font-black text-stone-900 outline-none hover:border-stone-300 focus:border-[#8B2635] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-stone-200/90 bg-[#FAF7F5] px-3.5 py-2 text-xs font-bold text-stone-700 shadow-sm">
                <i className="fa-regular fa-calendar-check text-stone-400 text-xs" />
                <span className="text-stone-400 uppercase text-[10px]">Lecture Date:</span>
                <input
                  type="date"
                  value={lectureDate}
                  onChange={(e) => setLectureDate(e.target.value)}
                  className="bg-transparent font-black text-stone-900 outline-none cursor-pointer text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 4 KPI Metric Cards (Monochrome Simple Icons) ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Course Coverage</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{pct}%</p>
                <p className="text-xs text-stone-500 mt-0.5">{covered} / {total} topics</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <i className="fa-solid fa-chart-pie text-sm" />
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-[#8B2635] transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Courses</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{subjects.length}</p>
                <p className="text-xs text-stone-500 mt-0.5">Semester {semester} syllabus</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <i className="fa-solid fa-book-bookmark text-sm" />
              </div>
            </div>
            <div className="mt-3 text-[11px] font-bold text-stone-400">
              Active curriculum modules
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Pending Notes</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{notesPending}</p>
                <p className="text-xs text-stone-500 mt-0.5">{notesPending > 0 ? 'Action needed' : 'All topics noted'}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <i className="fa-solid fa-clipboard-check text-sm" />
              </div>
            </div>
            <div className="mt-3 text-[11px] font-bold text-stone-400">
              {notesPending > 0 ? 'Fill notes before publishing' : 'Ready to publish'}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Update Health</p>
                <p className="mt-1 text-2xl font-black text-stone-900">{staleSubjects.length === 0 ? 'Optimal' : `${staleSubjects.length} Stale`}</p>
                <p className="text-xs text-stone-500 mt-0.5">{staleSubjects.length > 0 ? 'Not updated in 42h+' : 'All current'}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <i className="fa-solid fa-clock text-sm" />
              </div>
            </div>
            <div className="mt-3 text-[11px] font-bold text-stone-400">
              Automated reminders active
            </div>
          </div>
        </div>

        {/* ── Main Two-Column Balanced Workspace ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Course Selector & Stale Reminders (4 cols) */}
          <div className="space-y-5 lg:col-span-4">
            {/* Course Selector */}
            <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-stone-900">
                  Semester {semester} Courses
                </h2>
                <span className="text-[10px] font-bold text-stone-400">
                  {subjects.length} subjects
                </span>
              </div>

              <div className="space-y-2">
                {subjects.map((sub, idx) => {
                  const s = state[sub.code] || { coveredTopics: [] };
                  const t = getTotalTopics(sub);
                  const c = (s.coveredTopics || []).length;
                  const p = t ? Math.round((c / t) * 100) : 0;
                  const isActive = idx === subjectIdx;
                  const hoursAgo = getHoursSinceUpdate(sub);
                  const isStale = hoursAgo > 42;

                  return (
                    <button
                      key={sub.code}
                      type="button"
                      onClick={() => setSubjectIdx(idx)}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 flex flex-col justify-between ${
                        isActive
                          ? 'border-[#8B2635] bg-[#FFF1F2]/60 shadow-sm'
                          : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-[#FAF7F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                            {sub.code}
                          </span>
                          <h3 className="mt-1 text-xs font-bold text-stone-900 truncate">
                            {sub.title}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-stone-900">{p}%</span>
                          {isStale && (
                            <span className="block text-[9px] font-bold text-amber-600 mt-0.5">
                              {hoursAgo}h ago
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/70">
                        <div
                          className="h-full rounded-full bg-[#8B2635] transition-all duration-500"
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stale Updates & Reminders Box (Setup empty space) */}
            {staleSubjects.length > 0 && (
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-900">
                  <i className="fa-solid fa-triangle-exclamation text-xs text-amber-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Stale Lecture Notice
                  </h3>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {staleSubjects.length} course{staleSubjects.length > 1 ? 's have' : ' has'} not had lecture updates logged in over 42 hours.
                </p>
                <div className="space-y-1.5">
                  {staleSubjects.map((sub) => (
                    <div key={sub.code} className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-amber-200/70 shadow-sm">
                      <div>
                        <span className="text-xs font-bold text-stone-800">{sub.code}</span>
                        <span className="ml-2 text-[10px] text-stone-400">{getHoursSinceUpdate(sub)}h ago</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSendReminder(sub)}
                        className="text-[11px] font-bold text-[#8B2635] hover:underline"
                      >
                        Remind &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Syllabus Upgrade Editor (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              {/* Course Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4 mb-5">
                <div>
                  <span className="rounded bg-[#8B2635]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#8B2635]">
                    {activeSub.code} &middot; {activeSub.type || 'Major Course'}
                  </span>
                  <h2 className="text-lg font-black text-stone-900 tracking-tight mt-1">
                    {activeSub.title}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400">Coverage</span>
                    <p className="text-sm font-black text-stone-900">{pct}% Complete</p>
                  </div>
                </div>
              </div>

              {/* Syllabus Upgrade Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeSub.units.map((unit, uIdx) => (
                  <div
                    key={`${subjectKey}-${unit.name}`}
                    className="rounded-xl border border-stone-200/70 bg-[#FAF7F5]/40 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-stone-200 text-[10px] font-black text-stone-700">
                          {uIdx + 1}
                        </span>
                        <h3 className="text-xs font-black uppercase tracking-wider text-stone-800">
                          {unit.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold text-stone-400">
                        {unit.topics.length} topics
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {unit.topics.map((topic) => {
                        const isCovered = draft.coveredTopics.includes(topic);
                        const hasError = errors[topic];

                        return (
                          <div
                            key={topic}
                            className={`rounded-xl border p-3 transition-all duration-200 ${
                              hasError
                                ? 'border-red-300 bg-red-50/40 shadow-sm'
                                : isCovered
                                ? 'border-stone-300 bg-white shadow-sm'
                                : 'border-stone-200/70 bg-white/70'
                            }`}
                          >
                            <label className="flex cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isCovered}
                                onChange={() => toggleTopic(topic)}
                                className="hidden"
                              />
                              <div
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                                  isCovered
                                    ? 'border-[#8B2635] bg-[#8B2635] text-white'
                                    : 'border-stone-300 bg-white'
                                }`}
                              >
                                {isCovered && <i className="fa-solid fa-check text-[9px]" />}
                              </div>
                              <span
                                className={`text-xs font-semibold leading-relaxed ${
                                  isCovered ? 'text-stone-900' : 'text-stone-600'
                                }`}
                              >
                                {topic}
                              </span>
                            </label>

                            {/* Inline Note Input for covered topics */}
                            <div className="mt-2.5 pl-7">
                              <input
                                type="text"
                                value={draft.topicNotes[topic] || ''}
                                onChange={(e) => setNote(topic, e.target.value)}
                                placeholder="Add key exam question or lecture summary note..."
                                className={`w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition-all ${
                                  hasError
                                    ? 'border-red-300 bg-red-50 text-red-900 placeholder:text-red-300'
                                    : isCovered
                                    ? 'border-stone-200 bg-[#FAF7F5] text-stone-800 focus:border-[#8B2635]'
                                    : 'border-stone-200/60 bg-stone-50/50 text-stone-600 focus:bg-white'
                                }`}
                              />
                              {hasError && (
                                <p className="mt-1 text-[10px] font-bold text-red-600">
                                  Required: Add exam note before publishing covered topic.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Publish Action Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8B2635] py-3 text-xs font-black text-white shadow-sm hover:bg-[#77212e] transition-all hover:-translate-y-0.5 shadow-[#8B2635]/20 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin text-xs" />
                        <span>Publishing Updates...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up text-xs" />
                        <span>Publish Syllabus &amp; Lecture Updates</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* ── Reminder Modal with Clean Styling ── */}
      {showReminder && reminderSubject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-sm p-4"
          onClick={() => setShowReminder(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <i className="fa-solid fa-paper-plane text-sm" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900">Send Lecture Reminder</h3>
                <p className="text-xs text-stone-500">
                  {reminderSubject.sub.code} &middot; {reminderSubject.hours}h since last update
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Notify the faculty member assigned to this course to update lecture notes:
            </p>

            <div className="space-y-2">
              <a
                href={reminderSubject.mailto}
                className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:bg-[#FAF7F5] transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                  <i className="fa-solid fa-envelope text-xs" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Send Email Notification</p>
                  <p className="text-[10px] text-stone-400">Pre-filled reminder draft</p>
                </div>
              </a>

              <a
                href={reminderSubject.smsLink}
                className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 hover:border-stone-300 hover:bg-[#FAF7F5] transition-all"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                  <i className="fa-solid fa-comment-sms text-xs" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Send SMS Notification</p>
                  <p className="text-[10px] text-stone-400">Direct mobile alert</p>
                </div>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowReminder(false)}
              className="w-full rounded-xl border border-stone-200 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
