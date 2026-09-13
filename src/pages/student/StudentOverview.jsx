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

  // Calculate totals across all subjects in this semester
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

  // Recent lecture updates across courses
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
    return list;
  }, [subjects, state]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ConnectionBanner show={usingFallback} />

      {/* ── Welcome Banner ── */}
      <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-md shadow-[#8B2635]/20">
              <i className="fa-solid fa-graduation-cap text-xl" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-stone-900">
                Welcome back, {user?.name || 'Student'}
              </h1>
              <p className="text-xs font-medium text-stone-500 mt-0.5">
                Semester {semester} &middot; BCA &middot; {subjects.length} Subjects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/student/syllabus')}
              className="flex items-center gap-2 rounded-xl bg-[#8B2635] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#77212e] transition-all"
            >
              <i className="fa-solid fa-list-check text-xs" />
              <span>Syllabus</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/career')}
              className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 transition-all shadow-sm"
            >
              <i className="fa-solid fa-brain text-[#8B2635] text-xs" />
              <span>Advisor</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Semester Progress */}
        <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Completion
              </p>
              <p className="mt-1.5 text-2xl font-black text-stone-900">
                {stats.overallPct}%
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                {stats.coveredAllTopics} / {stats.totalAllTopics} topics
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <i className="fa-solid fa-chart-pie text-sm" />
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-[#8B2635] transition-all duration-500"
              style={{ width: `${stats.overallPct}%` }}
            />
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Courses
              </p>
              <p className="mt-1.5 text-2xl font-black text-stone-900">
                {subjects.length}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Semester {semester}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <i className="fa-solid fa-book-bookmark text-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 flex-wrap">
            {subjects.slice(0, 4).map((s) => (
              <span
                key={s.code}
                className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600"
              >
                {s.code.split('-')[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Published Exam Notes */}
        <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Exam Notes
              </p>
              <p className="mt-1.5 text-2xl font-black text-stone-900">
                {stats.notesTotal}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Key questions
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <i className="fa-solid fa-file-lines text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className="text-xs font-bold text-[#8B2635] cursor-pointer hover:underline"
              onClick={() => navigate('/student/resources')}
            >
              View notes &rarr;
            </span>
          </div>
        </div>

        {/* Practical Projects */}
        <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Projects
              </p>
              <p className="mt-1.5 text-2xl font-black text-stone-900">
                6
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Recommended
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <i className="fa-solid fa-laptop-code text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className="text-xs font-bold text-[#8B2635] cursor-pointer hover:underline"
              onClick={() => navigate('/student/projects')}
            >
              Explore &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content Columns ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Quick Course Tracker Preview */}
        <div className="space-y-5 lg:col-span-8">
          <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h2 className="text-sm font-black text-stone-900">
                Enrolled Subjects
              </h2>
              <button
                type="button"
                onClick={() => navigate('/student/syllabus')}
                className="text-xs font-bold text-[#8B2635] hover:underline"
              >
                Full Syllabus &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((sub) => {
                const subState = state[sub.code];
                const total = getTotalTopics(sub);
                const covered = subState?.coveredTopics?.length || 0;
                const pct = total > 0 ? Math.round((covered / total) * 100) : 0;

                return (
                  <div
                    key={sub.code}
                    onClick={() => navigate('/student/syllabus')}
                    className="group cursor-pointer rounded-xl border border-stone-200/70 bg-[#FAF7F5]/50 p-3.5 hover:border-stone-300 hover:bg-white transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded bg-stone-200/80 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                          {sub.code}
                        </span>
                        <span className="text-xs font-black text-stone-900">
                          {pct}%
                        </span>
                      </div>
                      <h3 className="mt-2 text-xs font-bold text-stone-900 group-hover:text-[#8B2635] transition-colors line-clamp-1">
                        {sub.title}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {covered} / {total} topics
                      </p>
                    </div>

                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80">
                      <div
                        className="h-full rounded-full bg-[#8B2635] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
                  <i className="fa-solid fa-brain text-sm" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900">Career Advisor AI</h3>
                  <p className="text-[11px] text-stone-400">Placement &amp; interview tips</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/student/career')}
                className="mt-3 text-xs font-bold text-[#8B2635] hover:underline text-left"
              >
                Open Advisor &rarr;
              </button>
            </div>

            <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
                  <i className="fa-solid fa-laptop-code text-sm" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900">Practical Projects</h3>
                  <p className="text-[11px] text-stone-400">Portfolio exercises</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/student/projects')}
                className="mt-3 text-xs font-bold text-[#8B2635] hover:underline text-left"
              >
                Open Projects &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Right: Recent Faculty Lecture Feed */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-stone-900">
                Recent Lectures
              </h2>
              <span className="text-[10px] font-bold text-stone-400">
                Live
              </span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-stone-400">Loading...</div>
            ) : recentUpdates.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                No recent updates.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentUpdates.map((item) => (
                  <div
                    key={item.subjectCode}
                    className="rounded-xl border border-stone-200/70 bg-[#FAF7F5]/50 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-600">
                        {item.subjectCode}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {item.lastUpdated}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-stone-900 line-clamp-1">
                      {item.latestTopic}
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {item.faculty}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
