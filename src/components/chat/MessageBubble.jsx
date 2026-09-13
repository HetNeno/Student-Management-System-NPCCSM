import { useState, useRef, useEffect } from 'react';

/* ── MessageBubble ──────────────────────────────────────────────────────── */

function TypingAnimation({ text }) {
  const [visible, setVisible] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    setVisible('');
    const chars = text;
    let i = 0;
    const step = Math.max(1, Math.ceil(chars.length / 120));
    const timer = setInterval(() => {
      i += step;
      setVisible(chars.slice(0, i));
      if (i >= chars.length) clearInterval(timer);
    }, 14);
    return () => clearInterval(timer);
  }, [text]);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visible]);

  return <span ref={ref}>{visible}</span>;
}

export default function MessageBubble({ message, isLast }) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div
      className={`anim-message-in flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ animationDelay: '0ms' }}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="anim-fade-in-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B24848] to-[#A52A2A] text-sm text-white shadow-md ring-1 ring-black/5">
          <i className="fas fa-sparkles" />
        </div>
      )}

      <div className={`max-w-[78%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-tr-sm shadow-md text-white'
              : isError
                ? 'rounded-tl-sm border border-red-200 bg-red-50 text-red-700 shadow-sm'
                : 'rounded-tl-sm border border-slate-200 bg-white text-slate-700 shadow-sm'
          }`}
          style={
            isUser
              ? { background: 'linear-gradient(135deg, #B24848, #A52A2A)' }
              : {}
          }
        >
          {isUser ? (
            <span>{message.text}</span>
          ) : isLast ? (
            <TypingAnimation text={message.text} />
          ) : (
            <span>{message.text}</span>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && (
          <p
            className={`mt-1 px-1 text-[10px] ${isUser ? 'text-right' : ''}`}
            style={{ color: '#94A3B8' }}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}

        {/* Sources */}
        {!isUser && message.sources?.length > 0 && (
          <div className="anim-fade-in-up mt-2 space-y-1.5">
            {message.sources.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#D4AF37]" />
                <div>
                  <p className="text-[11px] font-bold text-slate-700">{s.title}</p>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    {s.snippet}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
