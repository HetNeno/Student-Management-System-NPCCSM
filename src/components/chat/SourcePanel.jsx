import { useState } from 'react';

/**
 * SourcePanel — displays retrieved RAG sources in the chat.
 * Used by MessageBubble when a bot message has source citations.
 */

export default function SourcePanel({ sources, expanded = false }) {
  const [isOpen, setIsOpen] = useState(expanded);

  if (!sources || sources.length === 0) return null;

  const totalSources = sources.length;

  return (
    <div className="anim-fade-in-up mt-2 space-y-1.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition hover:opacity-80"
        style={{ color: '#D4AF37' }}
      >
        <i className="fas fa-book-open text-[9px]" />
        {isOpen ? 'Hide' : 'Show'} {totalSources} source{totalSources > 1 ? 's' : ''}
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-[8px] transition-transform`} />
      </button>

      {isOpen && (
        <div className="anim-slide-down space-y-1.5">
          {sources.map((source, i) => (
            <div
              key={i}
              className="source-card flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2"
            >
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-amber-900 truncate">
                  {source.title || 'Unknown source'}
                </p>
                <p className="text-[10px] leading-relaxed text-amber-700/80 line-clamp-2">
                  {source.snippet || ''}
                </p>
                {source.similarity && (
                  <p className="mt-1 text-[9px] font-mono text-amber-600">
                    Relevance: {(source.similarity * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
