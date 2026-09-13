import { useRef, useEffect, useState } from 'react';

/* ── SuggestionChips ───────────────────────────────────────────────────── */

const SUGGESTIONS = [
  {
    label: 'Career paths for BCA',
    icon: 'fa-route',
  },
  {
    label: 'Real-world project ideas',
    icon: 'fa-rocket',
  },
  {
    label: 'Skills to focus this semester',
    icon: 'fa-bullseye',
  },
  {
    label: 'Am I job-ready?',
    icon: 'fa-graduation-cap',
  },
  {
    label: 'Is Java still worth learning?',
    icon: 'fa-code',
  },
  {
    label: 'How to build a GitHub portfolio',
    icon: 'fa-github',
  },
];

export default function SuggestionChips({ onSelect, disabled }) {
  return (
    <div className="anim-fade-in-up space-y-2">
      <p className="section-label" style={{ color: '#94A3B8' }}>
        Quick start
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={s.label}
            disabled={disabled}
            onClick={() => onSelect(s.label)}
            className="anim-fade-in-up suggestion-chip group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-medium text-slate-700 transition hover:border-[#B24848] hover:bg-[#B24848]/5 hover:text-[#A52A2A] hover:shadow-sm disabled:opacity-50"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <i
              className={`fas ${s.icon} text-[10px] opacity-70 transition group-hover:opacity-100`}
              style={{ color: '#B24848' }}
            />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
