import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { getSubjectsForSemester } from '../../data/syllabusDatabase';
import { useToast } from '../../components/shared/Toast';

export default function StudentResources() {
  const { semester } = useOutletContext();
  const { state } = useSyllabus();
  const toast = useToast();

  const subjects = useMemo(() => getSubjectsForSemester(semester), [semester]);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate resource library items dynamically from subjects and live notes
  const resourcesList = useMemo(() => {
    const list = [];

    subjects.forEach((sub) => {
      const subState = state[sub.code];

      // Unit lecture notes PDF
      sub.units.forEach((unit, uIdx) => {
        list.push({
          id: `${sub.code}-u${uIdx + 1}`,
          subjectCode: sub.code,
          subjectTitle: sub.title,
          title: `${unit.name} - Lecture Slides & Comprehensive Notes`,
          category: 'Unit Notes',
          type: 'PDF',
          size: `${(1.2 + uIdx * 0.4).toFixed(1)} MB`,
          downloads: 120 + uIdx * 25,
          faculty: subState?.facultyName || 'NPCCSM Faculty',
        });
      });

      // Quick Cheat Sheet
      list.push({
        id: `${sub.code}-cheat`,
        subjectCode: sub.code,
        subjectTitle: sub.title,
        title: `${sub.title} - Quick Syntax & Concept Cheat Sheet`,
        category: 'Cheat Sheet',
        type: 'DOC',
        size: '640 KB',
        downloads: 210,
        faculty: 'Curriculum Cell',
      });

      // Exam Question Bank
      list.push({
        id: `${sub.code}-qbank`,
        subjectCode: sub.code,
        subjectTitle: sub.title,
        title: `${sub.code} - High-Yield Exam Question Bank & Solutions`,
        category: 'Question Bank',
        type: 'PDF',
        size: '2.4 MB',
        downloads: 340,
        faculty: subState?.facultyName || 'Exam Committee',
      });

      // Previous Year Exam Paper
      list.push({
        id: `${sub.code}-pyq`,
        subjectCode: sub.code,
        subjectTitle: sub.title,
        title: `${sub.code} - University Solved Question Papers (2022-2024)`,
        category: 'Previous Papers',
        type: 'ZIP',
        size: '4.8 MB',
        downloads: 450,
        faculty: 'Academic Archive',
      });
    });

    return list;
  }, [subjects, state]);

  const filteredResources = useMemo(() => {
    return resourcesList.filter((r) => {
      const matchesSub = selectedSubject === 'All' || r.subjectCode === selectedSubject;
      const matchesCat = selectedCategory === 'All' || r.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subjectCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSub && matchesCat && matchesSearch;
    });
  }, [resourcesList, selectedSubject, selectedCategory, searchQuery]);

  const handleDownload = (resource) => {
    toast.show(`Downloading "${resource.title}" (${resource.size})...`, 'success');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ── Page Header with Glass Effect ── */}
      <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-6 md:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8B2635]">
                Academic Archive
              </span>
              <span className="rounded-full bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                Semester {semester}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-stone-900 mt-1">
              Study Resources &amp; Exam Materials
            </h1>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              Download lecture slides, high-yield question banks, cheat sheets, and university previous papers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-stone-200/80 bg-[#FAF7F5] px-4 py-2 text-center shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                Available Files
              </span>
              <p className="text-base font-black text-stone-900 mt-0.5">
                {filteredResources.length} Documents
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Strip ── */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        {/* Search input */}
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by keyword or subject code..."
            className="w-full rounded-xl border border-stone-200/90 bg-[#FAF7F5] pl-9 pr-3 py-2 text-xs font-medium text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8B2635]/50 focus:bg-white transition-all"
          />
        </div>

        {/* Subject Filter Dropdown */}
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="rounded-xl border border-stone-200/90 bg-[#FAF7F5] px-3.5 py-2 text-xs font-bold text-stone-800 outline-none focus:border-[#8B2635]/50 focus:bg-white cursor-pointer"
        >
          <option value="All">All Subjects (Semester {semester})</option>
          {subjects.map((sub) => (
            <option key={sub.code} value={sub.code}>
              {sub.code}: {sub.title}
            </option>
          ))}
        </select>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          {['All', 'Unit Notes', 'Question Bank', 'Cheat Sheet', 'Previous Papers'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#8B2635] text-white shadow-sm font-black'
                  : 'bg-[#FAF7F5] text-stone-700 hover:bg-stone-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Resources Grid ── */}
      {filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white/80 p-12 text-center text-stone-400">
          <i className="fa-solid fa-box-open text-3xl mb-2 text-stone-300" />
          <p className="text-xs font-semibold">No study resources found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => (
            <div
              key={res.id}
              className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between hover:border-stone-300 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-stone-700">
                    {res.subjectCode}
                  </span>
                  <span className="rounded-md border border-stone-200 bg-[#FAF7F5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
                    {res.type} &middot; {res.size}
                  </span>
                </div>

                <h3 className="text-sm font-black text-stone-900 group-hover:text-[#8B2635] transition-colors leading-snug">
                  {res.title}
                </h3>
                <p className="text-xs font-medium text-stone-500 mt-1 line-clamp-1">
                  {res.subjectTitle}
                </p>
                <p className="text-[11px] text-stone-400 mt-2 flex items-center gap-1.5">
                  <i className="fa-solid fa-user-tie text-[10px]" />
                  <span>Curator: {res.faculty}</span>
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1">
                  <i className="fa-solid fa-download text-[10px]" /> {res.downloads} downloads
                </span>

                <button
                  type="button"
                  onClick={() => handleDownload(res)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#8B2635] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#77212e] transition-all hover:-translate-y-0.5 shadow-[#8B2635]/20"
                >
                  <i className="fa-solid fa-file-arrow-down text-[10px]" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
