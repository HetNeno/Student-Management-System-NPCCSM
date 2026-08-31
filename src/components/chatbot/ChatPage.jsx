import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSyllabus } from '../../context/SyllabusContext';
import { useChatbotApi } from './useChatbotApi';

const SUGGESTIONS = [
  'What career path fits my BCA?',
  'Give me real-world projects to build',
  'Is Java useful in modern industry?',
  'What skills should I learn this semester?',
  'Am I ready for a software developer job?',
  'Which subjects can I focus on?',
];

function cleanText(value) {
  return String(value || '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/[|*_~`]/g, '')
    .replace(/\/\*|\*\//g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function TypingText({ text }) {
  const [visible, setVisible] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    setVisible('');
    const clean = cleanText(text);
    let i = 0;
    const step = Math.max(1, Math.ceil(clean.length / 140));
    const timer = setInterval(() => {
      i += step;
      setVisible(clean.slice(0, i));
      if (i >= clean.length) clearInterval(timer);
    }, 14);
    return () => clearInterval(timer);
  }, [text]);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visible]);

  return <span className="whitespace-pre-line">{visible}</span>;
}

/* ── Bot Logo Component ── */
function NovaLogo({ size = 40 }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-2xl shadow-md"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      }}
    >
      {/* Bot icon — stylized sparkles / sparkle-ai */}
      <i className="fas fa-sparkles text-white" style={{ fontSize: size * 0.4 }} />
      {/* small accent dot */}
      <div
        className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white"
        style={{ background: '#10B981' }}
      />
    </div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { state } = useSyllabus();
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const inputRef = useRef(null);
  const endRef = useRef(null);
  const { messages, loading, source, sendMessage, reset } = useChatbotApi(null, null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val || loading) return;
    setInput('');
    sendMessage(val);
  };

  const sourceBadge = {
    welcome: null,
    thinking: null,
    syllabus: { label: 'From Syllabus', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    industry: { label: 'From Industry', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    combined: { label: 'Syllabus + Industry', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    error: { label: 'Error', cls: 'bg-red-50 text-red-700 border-red-200' },
    offline: { label: 'Offline Mode', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  return (
    <div className="flex h-screen flex-col bg-white text-slate-800">
      {/* Top Bar — Gemini-style minimal header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <i className="fas fa-arrow-left text-sm" />
          </button>
          <NovaLogo size={36} />
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Career Advisor AI</h1>
            <p className="text-[10px] font-medium text-slate-400">Syllabus-aware · powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="rounded-xl bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <i className="fas fa-rotate-right mr-1.5" /> New chat
          </button>
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          >
            <i className="fas fa-bars text-sm" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="anim-slide-in-left w-64 shrink-0 border-r border-slate-200 bg-slate-50/80 p-4 backdrop-blur-sm">
            <p className="section-label mb-3" style={{ color: '#94a3b8' }}>Quick actions</p>
            <div className="space-y-1.5">
              <button onClick={() => navigate('/student')} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-medium text-slate-600 border border-slate-200 transition hover:bg-slate-100 hover:text-slate-800">
                <i className="fas fa-th-large mr-2 text-slate-400" /> Dashboard
              </button>
              <button onClick={() => navigate('/student/projects')} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-medium text-slate-600 border border-slate-200 transition hover:bg-slate-100 hover:text-slate-800">
                <i className="fas fa-code mr-2 text-slate-400" /> Projects
              </button>
              <button onClick={() => setShowSidebar(false)} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-medium text-slate-600 border border-slate-200 transition hover:bg-slate-100 hover:text-slate-800">
                <i className="fas fa-robot mr-2 text-slate-400" /> Career Chat
              </button>
            </div>

            <p className="section-label mt-6 mb-3" style={{ color: '#94a3b8' }}>Your subjects</p>
            <div className="space-y-1">
              {Object.entries(state).slice(0, 8).map(([code, s]) => (
                <div key={code} className="rounded-lg bg-white px-3 py-2 border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-700">{code}</p>
                  <p className="text-[10px] text-slate-400 truncate">{s.title || 'Faculty update'}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-indigo-50 p-3 border border-indigo-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">Shortcut</p>
              <p className="text-[10px] text-slate-500">Ctrl+K to focus input</p>
            </div>
          </aside>
        )}

        {/* Chat Area */}
        <main className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            <div className="mx-auto max-w-3xl space-y-5">
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="flex gap-3 pt-8 anim-fade-in-up">
                  <NovaLogo size={36} />
                  <div className="max-w-[80%]">
                    <div className="rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-200 px-5 py-4 text-sm leading-relaxed text-slate-700 shadow-sm">
                      Hi there! I'm <strong>Nova</strong>, your career advisor. I can help you explore career paths,
                      suggest skills to learn, recommend projects, and guide your BCA journey.
                      <br /><br />
                      What would you like to know about?
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`anim-message-in flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  {/* Bot Avatar */}
                  {msg.role !== 'user' && <NovaLogo size={36} />}

                  <div className={`max-w-[78%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-tr-sm bg-slate-900 text-white shadow-md'
                          : 'rounded-tl-sm bg-slate-50 border border-slate-200 text-slate-700 shadow-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        cleanText(msg.text)
                      ) : (
                        <TypingText text={msg.text} />
                      )}
                    </div>

                    {/* Source badge */}
                    {msg.role !== 'user' && msg.source && sourceBadge[msg.source] && (
                      <div className="anim-fade-in-up mt-1.5">
                        <span className={`badge ${sourceBadge[msg.source].cls}`}>{sourceBadge[msg.source].label}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="anim-fade-in-up flex gap-3">
                  <NovaLogo size={36} />
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-200 px-4 py-3 shadow-sm">
                    <span className="chat-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span className="chat-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span className="chat-dot h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && !loading && (
            <div className="shrink-0 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="mx-auto max-w-3xl flex gap-2 overflow-x-auto custom-scrollbar">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); sendMessage(s); }}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 hover:shadow-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input — Gemini style */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3.5">
            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl flex items-end gap-2.5 rounded-2xl border border-slate-300 bg-slate-50 p-2 transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:bg-white">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask about career paths, skills, projects, or industry advice..."
                rows={1}
                className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                style={{ maxHeight: 120 }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm"
              >
                <i className="fas fa-arrow-up text-sm" />
              </button>
            </form>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-400">
              Nova can make mistakes. Verify important career decisions with a mentor or professional.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
