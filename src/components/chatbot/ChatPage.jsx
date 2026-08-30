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
  'Which subjects can I skip?',
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
    syllabus: { label: 'From Syllabus', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    industry: { label: 'From Industry', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    combined: { label: 'Syllabus + Industry', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
    error: { label: 'Error', cls: 'bg-red-100 text-red-700 border-red-200' },
    offline: { label: 'Offline Mode', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-white">
      {/* Top Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student')}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white btn-press"
          >
            <i className="fas fa-arrow-left text-sm" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <i className="fas fa-sparkles" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight">Career Advisor AI</h1>
            <p className="text-[10px] font-medium text-slate-400">Syllabus-aware + industry knowledge</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="rounded-xl bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <i className="fas fa-rotate-right mr-1.5" /> New chat
          </button>
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
          >
            <i className="fas fa-bars text-sm" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="anim-slide-in-left w-64 shrink-0 border-r border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
            <p className="section-label mb-3" style={{ color: '#94a3b8' }}>Quick actions</p>
            <div className="space-y-1.5">
              <button onClick={() => navigate('/student')} className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                <i className="fas fa-th-large mr-2 text-slate-500" /> Dashboard
              </button>
              <button onClick={() => navigate('/student/projects')} className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                <i className="fas fa-code mr-2 text-slate-500" /> Projects
              </button>
              <button onClick={() => setShowSidebar(false)} className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-left text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white">
                <i className="fas fa-robot mr-2 text-slate-500" /> Career Chat
              </button>
            </div>

            <p className="section-label mt-6 mb-3" style={{ color: '#94a3b8' }}>Your subjects</p>
            <div className="space-y-1">
              {Object.entries(state).slice(0, 8).map(([code, s]) => (
                <div key={code} className="rounded-lg bg-white/5 px-3 py-2">
                  <p className="text-[11px] font-bold text-slate-300">{code}</p>
                  <p className="text-[10px] text-slate-500 truncate">{s.title || 'Faculty update'}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-indigo-500/10 p-3 border border-indigo-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">Shortcut</p>
              <p className="text-[10px] text-slate-400">Ctrl+K to focus input</p>
            </div>
          </aside>
        )}

        {/* Chat Area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`anim-message-in flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  {/* Avatar */}
                  {msg.role !== 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs text-white shadow-md shadow-indigo-500/20">
                      <i className="fas fa-sparkles" />
                    </div>
                  )}

                  <div className={`max-w-[78%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-tr-md bg-indigo-600 text-white'
                          : 'rounded-tl-md bg-slate-800/80 text-slate-200 border border-white/10'
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xs text-white">
                    <i className="fas fa-sparkles" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-slate-800/80 px-4 py-3 border border-white/10">
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
            <div className="shrink-0 border-t border-white/10 bg-slate-900/60 px-4 py-3 backdrop-blur-sm">
              <div className="mx-auto max-w-3xl flex gap-2 overflow-x-auto custom-scrollbar">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); sendMessage(s); }}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-slate-300 transition hover:bg-indigo-500/20 hover:text-white hover:border-indigo-400/30"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t border-white/10 bg-slate-900/80 px-4 py-3.5 backdrop-blur-md">
            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl flex items-end gap-2.5 rounded-2xl border border-white/10 bg-slate-800/60 p-1.5 transition focus-within:border-indigo-400/50 focus-within:ring-2 focus-within:ring-indigo-500/20">
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
                className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none"
                style={{ maxHeight: 120 }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700"
              >
                <i className="fas fa-arrow-up text-sm" />
              </button>
            </form>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-600">
              Nova can make mistakes. Verify important career decisions with a mentor or professional.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
