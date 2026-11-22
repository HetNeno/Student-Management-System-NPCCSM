import { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { getSubjectsForSemester, getTotalTopics } from '../../data/syllabusDatabase';
import ConnectionBanner from '../../components/shared/ConnectionBanner';
import { useRevisions } from '../../hooks/useRevisions';

export default function StudentSyllabus() {
  const { semester } = useOutletContext();
  const { state, loading, usingFallback } = useSyllabus();
  const { isRevised, toggle: toggleRevision, countFor, error: revisionError } = useRevisions();
  const navigate = useNavigate();
  const askNova = (prompt) => navigate(`/student/career?q=${encodeURIComponent(prompt)}`);

  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState(0);
  const [filterTab, setFilterTab] = useState('all'); // all, completed, pending
  const [openUnits, setOpenUnits] = useState({ 0: true });

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);

  // Keep selection bounded
  const activeSub = subjects[selectedSubjectIdx] || subjects[0] || null;
  const subState = activeSub ? state[activeSub.code] : null;

  const totalTopics = activeSub ? getTotalTopics(activeSub) : 0;
  const coveredTopics = subState?.coveredTopics?.length || 0;
  const completionPct = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;

  const toggleUnit = (idx) => {
    setOpenUnits((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Filtered unit list
  const filteredUnits = useMemo(() => {
    if (!activeSub) return [];
    if (filterTab === 'all') return activeSub.units;

    return activeSub.units.map((unit) => {
      const coveredInUnit = unit.topics.filter((t) => subState?.coveredTopics?.includes(t));
      const pendingInUnit = unit.topics.filter((t) => !subState?.coveredTopics?.includes(t));

      if (filterTab === 'completed') {
        return { ...unit, filteredTopics: coveredInUnit };
      }
      return { ...unit, filteredTopics: pendingInUnit };
    }).filter((u) => (u.filteredTopics ? u.filteredTopics.length > 0 : true));
  }, [activeSub, filterTab, subState]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ConnectionBanner show={usingFallback} />
      {revisionError && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{revisionError}</p>
      )}

      {/* ── Page Header Banner with Glass Effect ── */}
      <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-6 md:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8B2635]">
                Curriculum Tracker
              </span>
              <span className="rounded-full bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                Semester {semester}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-stone-900 mt-1">
              Course Syllabus &amp; Coverage
            </h1>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              Check unit-by-unit progress, lecture topics covered by faculty, and study notes.
            </p>
          </div>

          {activeSub && (
            <div className="flex items-center gap-3.5 rounded-xl border border-stone-200/80 bg-[#FAF7F5] p-3 shadow-sm">
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                  Course Progress
                </span>
                <p className="text-xl font-black text-stone-900 leading-tight mt-0.5">
                  {completionPct}%
                </p>
                <p className="text-[11px] font-medium text-stone-500">
                  {coveredTopics} of {totalTopics} covered in class
                </p>
                <p className="text-[11px] font-bold text-emerald-700">
                  {countFor(activeSub.code)} of {totalTopics} revised by you
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-md shadow-[#8B2635]/20">
                <i className="fa-solid fa-list-check text-base" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Course Selector Horizontal Strip ── */}
      <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-stone-400">
            Select Course &middot; Semester {semester}
          </span>
          <span className="text-[11px] font-bold text-stone-500">
            {subjects.length} Courses
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1.5 custom-scrollbar">
          {subjects.map((sub, idx) => {
            const cs = state[sub.code] || {};
            const total = getTotalTopics(sub);
            const covered = cs.coveredTopics?.length || 0;
            const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
            const isActive = idx === selectedSubjectIdx;

            return (
              <button
                key={sub.code}
                type="button"
                onClick={() => {
                  setSelectedSubjectIdx(idx);
                  setOpenUnits({ 0: true });
                }}
                className={`group shrink-0 rounded-xl border px-4 py-3 text-left transition-all duration-200 min-w-[200px] ${
                  isActive
                    ? 'border-[#8B2635] bg-[#FFF1F2]/60 text-[#8B2635] shadow-sm'
                    : 'border-stone-200/80 bg-white text-stone-700 hover:border-stone-300 hover:bg-[#FAF7F5]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#8B2635] text-white'
                        : 'bg-stone-100 text-stone-600 group-hover:bg-white group-hover:text-stone-900 shadow-sm'
                    }`}
                  >
                    <i className={`${sub.iconClass || 'fa-solid fa-book'} text-sm`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-wider">
                      {sub.code}
                    </div>
                    <div className="text-xs font-bold truncate text-stone-900 mt-0.5">
                      {sub.title}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full bg-[#8B2635]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-black">{pct}%</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Active Subject Details & Filter Strip ── */}
      {activeSub ? (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-3">
            <div>
              <h2 className="text-lg font-black text-stone-900 tracking-tight">
                {activeSub.code}: {activeSub.title}
              </h2>
              <p className="text-xs font-medium text-stone-500 mt-0.5">
                {activeSub.type || 'Major Course'} &middot; {activeSub.units?.length || 0} Units &middot; {totalTopics} Topics
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-stone-200/80 bg-white p-1 shadow-sm self-start sm:self-auto">
              {[
                { id: 'all', label: 'All Units' },
                { id: 'completed', label: 'Completed' },
                { id: 'pending', label: 'Pending' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    filterTab === tab.id
                      ? 'bg-[#8B2635] text-white shadow-sm font-black'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Units Accordion List ── */}
          <div className="space-y-4">
            {filteredUnits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-white/80 p-12 text-center text-stone-400">
                <i className="fa-solid fa-clipboard-check text-3xl mb-2 text-stone-300" />
                <p className="text-xs font-semibold">No topics match the selected filter.</p>
              </div>
            ) : (
              filteredUnits.map((unit, uIdx) => {
                const isOpen = !!openUnits[uIdx];
                const displayTopics = unit.filteredTopics || unit.topics;
                const unitCoveredCount = unit.topics.filter((t) => subState?.coveredTopics?.includes(t)).length;
                const unitTotal = unit.topics.length;
                const unitPct = unitTotal > 0 ? Math.round((unitCoveredCount / unitTotal) * 100) : 0;

                return (
                  <div
                    key={unit.name}
                    className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden"
                  >
                    {/* Unit Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleUnit(uIdx)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left bg-white/70 hover:bg-[#FAF7F5]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs transition-colors ${
                            isOpen
                              ? 'bg-[#8B2635] text-white shadow-sm'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {uIdx + 1}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-stone-900 truncate">
                            {unit.name}
                          </h3>
                          <p className="text-[11px] font-semibold text-stone-400 mt-0.5">
                            {unitCoveredCount} of {unitTotal} topics completed &middot; {unitPct}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 shrink-0">
                        <div className="hidden sm:block h-1.5 w-24 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-[#8B2635] transition-all duration-500"
                            style={{ width: `${unitPct}%` }}
                          />
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            unitPct === 100
                              ? 'bg-stone-200/80 text-stone-800'
                              : unitPct > 0
                              ? 'bg-stone-100 text-stone-700'
                              : 'bg-stone-50 text-stone-400'
                          }`}
                        >
                          {unitPct === 100 ? 'Completed' : unitPct > 0 ? 'In Progress' : 'Pending'}
                        </span>

                        <div className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400">
                          <i
                            className={`fa-solid ${
                              isOpen ? 'fa-chevron-up' : 'fa-chevron-down'
                            } text-[11px]`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Unit Topics Breakdown */}
                    {isOpen && (
                      <div className="border-t border-stone-100 divide-y divide-stone-100 bg-[#FAF7F5]/30">
                        {displayTopics.map((topic) => {
                          const isDone = subState?.coveredTopics?.includes(topic);
                          const note = subState?.topicNotes?.[topic];

                          return (
                            <div
                              key={topic}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-white transition-colors"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                                    isDone
                                      ? 'border-[#8B2635] bg-[#8B2635] text-white shadow-sm'
                                      : 'border-stone-300 bg-white'
                                  }`}
                                >
                                  {isDone && <i className="fa-solid fa-check text-[10px]" />}
                                </div>
                                <div>
                                  <p
                                    className={`text-xs font-bold leading-relaxed ${
                                      isDone ? 'text-stone-900' : 'text-stone-600'
                                    }`}
                                  >
                                    {topic}
                                  </p>

                                  {/* Faculty Notes Callout if available */}
                                  {note && (
                                    <div className="mt-2 rounded-xl border border-stone-200/90 bg-white p-3 text-[11px] text-stone-700 leading-relaxed shadow-sm">
                                      <span className="font-black flex items-center gap-1.5 text-stone-900 mb-0.5">
                                        <i className="fa-solid fa-star text-stone-400 text-[10px]" />
                                        Faculty Note &amp; Exam Focus:
                                      </span>
                                      {note}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="ml-8 flex shrink-0 flex-wrap items-center gap-1.5 sm:ml-0 sm:justify-end">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    isDone
                                      ? 'bg-stone-200/80 text-stone-800'
                                      : 'bg-stone-100 text-stone-500'
                                  }`}
                                >
                                  {isDone ? 'Covered in class' : 'Not covered yet'}
                                </span>
                                <button
                                  type="button"
                                  aria-pressed={isRevised(activeSub.code, topic)}
                                  onClick={() => toggleRevision(activeSub.code, topic)}
                                  className={`btn-press rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 transition-colors ${
                                    isRevised(activeSub.code, topic)
                                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                      : 'bg-white text-stone-500 ring-stone-200 hover:text-emerald-700 hover:ring-emerald-200'
                                  }`}
                                >
                                  <i className={`fa-solid ${isRevised(activeSub.code, topic) ? 'fa-circle-check' : 'fa-circle'} mr-1 text-[9px]`} />
                                  {isRevised(activeSub.code, topic) ? 'Revised' : 'Mark revised'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => askNova(`Explain "${topic}" from ${activeSub.title} (${activeSub.code}) in simple words with one example.`)}
                                  className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#8B2635] ring-1 ring-[#8B2635]/20 hover:bg-[#8B2635]/5"
                                >
                                  <i className="fa-solid fa-wand-magic-sparkles mr-1 text-[9px]" />Explain
                                </button>
                                <button
                                  type="button"
                                  onClick={() => askNova(`Quiz me: ask 3 multiple-choice questions on "${topic}" from ${activeSub.title}. Show the answers with a one-line reason at the end.`)}
                                  className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-stone-600 ring-1 ring-stone-200 hover:text-stone-900"
                                >
                                  <i className="fa-solid fa-circle-question mr-1 text-[9px]" />Quiz me
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200/70 bg-white/85 p-12 text-center text-stone-400">
          <p className="text-xs font-semibold">No syllabus available for this semester.</p>
        </div>
      )}
    </div>
  );
}
