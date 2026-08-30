import { useEffect, useMemo, useState } from 'react';
import Header from '../components/layout/Header';
import ConnectionBanner from '../components/shared/ConnectionBanner';
import Button from '../components/shared/Button';
import EmptyState from '../components/shared/EmptyState';
import { getSubjectsForSemester, getTotalTopics } from '../data/syllabusDatabase';
import { useSyllabus } from '../context/SyllabusContext';
import { useReminderScheduler } from '../hooks/useReminderScheduler';
import { useToast } from '../components/shared/Toast';

const todayISO = () => new Date().toISOString().split('T')[0];

export default function TeacherStudio() {
  const [semester, setSemester] = useState(5);
  const [subjectIdx, setSubjectIdx] = useState(0);
  const [facultyName, setFacultyName] = useState('Prof. Faculty Member');
  const [lectureDate, setLectureDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderSubject, setReminderSubject] = useState(null);
  const toast = useToast();

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

  if (!activeSub) {
    return (
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header icon="fas fa-chalkboard-teacher" title="Faculty Studio" semester={semester} onSemesterChange={setSemester} />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 md:p-6 lg:p-8">
          <ConnectionBanner show={usingFallback} />
          <EmptyState icon="fas fa-folder-open" title="No syllabus data" description={`No syllabus data for Semester ${semester}.`} />
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
      toast.error('Important notes required for all marked topics', { title: 'Missing notes' });
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
      overallNotes: 'Updated via portal.',
      lectureDate,
      facultyName: facultyName || 'Prof. Faculty Member',
    });
    setSaving(false);
    toast.success('Lecture update published successfully');
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Header icon="fas fa-chalkboard-teacher" title="Faculty Studio" semester={semester} onSemesterChange={setSemester} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-5 p-4 md:p-6 lg:p-8">
        <ConnectionBanner show={usingFallback} />

        {/* Stale Updates Alert */}
        {staleSubjects.length > 0 && (
          <div className="anim-fade-in-up rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <i className="fas fa-clock text-sm" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-800">Stale updates detected — {staleSubjects.length} subject{staleSubjects.length > 1 ? 's' : ''} not updated in 42+ hours</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {staleSubjects.map((sub) => {
                    const hours = getHoursSinceUpdate(sub);
                    return (
                      <div key={sub.code} className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 px-3 py-2">
                        <span className="text-[11px] font-bold text-slate-700">{sub.code}</span>
                        <span className="text-[10px] text-amber-600 font-medium">{hours}h ago</span>
                        <button onClick={() => handleSendReminder(sub)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
                          Send reminder
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Faculty Info */}
        <div className="anim-fade-in-up glass-panel p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="anim-fade-in-scale flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-xl text-indigo-600 shadow-sm">
                <i className="fas fa-chalkboard-teacher" />
              </div>
              <div>
                <input type="text" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} placeholder="Faculty Name" className="border-b border-indigo-200 bg-transparent pb-1 text-lg font-black text-slate-800 outline-none transition focus:border-indigo-400" />
                <p className="mt-1 text-xs text-slate-500">Department of Computer Studies &middot; BCA</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600">
                <span className="mr-2 text-indigo-500"><i className="far fa-calendar-check" /></span>
                <span className="font-bold text-slate-500">Date</span>
                <input type="date" value={lectureDate} onChange={(e) => setLectureDate(e.target.value)} className="ml-2 bg-transparent font-bold text-slate-800 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Coverage" value={`${pct}%`} hint={`${covered}/${total} topics`} icon="fas fa-chart-pie" tone="indigo" />
          <KpiCard label="Subjects" value={String(subjects.length)} hint="This semester" icon="fas fa-layer-group" tone="emerald" />
          <KpiCard label="Pending notes" value={String(notesPending)} hint={notesPending ? 'Required for covered topics' : 'All complete'} icon="fas fa-clipboard-list" tone={notesPending > 0 ? 'amber' : 'emerald'} />
          <KpiCard label="Stale" value={String(staleSubjects.length)} hint="Not updated 42h+" icon="fas fa-clock" tone={staleSubjects.length > 0 ? 'red' : 'emerald'} />
        </div>

        {/* Main Editor */}
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Subject Sidebar */}
          <div className="lg:col-span-4">
            <div className="anim-fade-in-up glass-panel p-4">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="section-label">Semester {semester} courses</h3>
                <span className="text-[10px] font-bold text-slate-400">{subjects.length}</span>
              </div>
              <div className="space-y-2 stagger">
                {subjects.map((sub, idx) => {
                  const s = state[sub.code] || { coveredTopics: [] };
                  const t = getTotalTopics(sub);
                  const c = (s.coveredTopics || []).length;
                  const p = t ? Math.round((c / t) * 100) : 0;
                  const isActive = idx === subjectIdx;
                  const hoursAgo = getHoursSinceUpdate(sub);
                  const isStale = hoursAgo > 42;

                  return (
                    <button key={`${semester}-${sub.code}`} type="button" onClick={() => setSubjectIdx(idx)} className={`anim-fade-in-up w-full rounded-xl border p-3 text-left transition-all btn-press ${isActive ? 'border-indigo-200 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-100'}`} style={{ animationDelay: `${idx * 40}ms` }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs transition ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <i className={sub.iconClass} />
                          </span>
                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{sub.code}</div>
                            <div className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">{sub.title}</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-black ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>{p}%</span>
                          {isStale && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title={`${hoursAgo}h since update`} />}
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full transition-all duration-500 ${p < 60 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} style={{ width: `${p}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Topic Editor */}
          <div className="lg:col-span-8">
            <div className="anim-fade-in-up glass-panel p-5 md:p-6">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-lg text-indigo-600">
                    <i className={activeSub.iconClass} />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">{activeSub.code}</div>
                    <h2 className="text-base font-black text-slate-800">{activeSub.title}</h2>
                  </div>
                </div>
                <span className="badge badge-info">{pct}% covered</span>
              </div>

              <div key={`progress-${activeSub.code}-${subjectKey}`} className="content-change mt-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="section-label">Progress</span>
                  <span className="text-[10px] font-bold text-slate-600">{covered}/{total} topics</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 anim-progress-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="content-change mt-6 space-y-4">
                {activeSub.units.map((unit, uIdx) => (
                  <div key={`${subjectKey}-${unit.name}`} className="anim-fade-in-up rounded-xl border border-slate-200 bg-slate-50/50 p-4" style={{ animationDelay: `${uIdx * 80}ms` }}>
                    <div className="mb-3 flex items-center gap-2.5 border-b border-slate-200 pb-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-[10px] font-black text-indigo-600">{uIdx + 1}</span>
                      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">{unit.name}</h3>
                    </div>
                    <div className="space-y-2.5 stagger">
                      {unit.topics.map((topic) => {
                        const isCovered = draft.coveredTopics.includes(topic);
                        const hasError = errors[topic];
                        return (
                          <div key={topic} className={`rounded-xl border bg-white p-3 transition-all ${hasError ? 'border-red-300 shadow-md shadow-red-100' : isCovered ? 'border-indigo-200 shadow-sm' : 'border-slate-200'}`}>
                            <label className="flex cursor-pointer items-start gap-3">
                              <input type="checkbox" checked={isCovered} onChange={() => toggleTopic(topic)} className="hidden" />
                              <div className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border text-[9px] transition-all duration-200 ${isCovered ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 bg-slate-50 text-transparent'}`}>
                                <i className="fas fa-check" />
                              </div>
                              <span className={`text-xs font-semibold transition-colors ${isCovered ? 'text-indigo-700' : 'text-slate-700'}`}>{topic}</span>
                            </label>
                            <div className="mt-2.5 pl-7">
                              <input
                                type="text"
                                value={draft.topicNotes[topic] || ''}
                                onChange={(e) => setNote(topic, e.target.value)}
                                placeholder="Add an important question or note..."
                                className={`w-full rounded-lg border px-3 py-2 text-xs outline-none transition-all duration-200 ${hasError ? 'border-red-300 bg-red-50' : isCovered ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50'}`}
                              />
                              {hasError && <p className="mt-1 text-[10px] font-bold text-red-500">Required when topic is marked covered.</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <Button type="submit" loading={saving} size="lg" icon="fas fa-cloud-arrow-up" className="w-full">
                  {saving ? 'Publishing…' : 'Publish Update'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Reminder Modal */}
      {showReminder && reminderSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowReminder(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <i className="fas fa-paper-plane" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Send Reminder</h3>
                <p className="text-[11px] text-slate-500">{reminderSubject.sub.code} — {reminderSubject.hours}h since last update</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4">Choose how to send the reminder to the faculty member:</p>
            <div className="space-y-2.5">
              <a href={reminderSubject.mailto} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-indigo-200 hover:bg-indigo-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><i className="fas fa-envelope text-sm" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Send Email</p>
                  <p className="text-[10px] text-slate-500">Opens email client with pre-filled reminder</p>
                </div>
              </a>
              <a href={reminderSubject.smsLink} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-indigo-200 hover:bg-indigo-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><i className="fas fa-comment-sms text-sm" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Send SMS</p>
                  <p className="text-[10px] text-slate-500">Opens messaging app with pre-filled text</p>
                </div>
              </a>
            </div>
            <button onClick={() => setShowReminder(false)} className="mt-4 w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint, icon, tone }) {
  const tones = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600' },
  };
  const t = tones[tone] || tones.indigo;
  return (
    <div className="anim-fade-in-up metric-card rounded-xl p-4">
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
