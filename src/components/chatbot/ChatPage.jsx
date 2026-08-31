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

/* ── Nova Bot Logo ── */
function NovaLogo({ size = 40 }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-2xl shadow-md"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #A52A2A 0%, #B24848 100%)',
      }}
    >
      <i className="fas fa-sparkles text-white" style={{ fontSize: size * 0.4 }} />
      <div
        className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white"
        style={{ background: '#D4AF37' }}
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
    syllabus: { label: 'From Syllabus', cls: 'badge-primary' },
    industry: { label: 'From Industry', cls: 'badge-success' },
    combined: { label: 'Syllabus + Industry', cls: 'badge-violet' },
    error: { label: 'Error', cls: 'badge-danger' },
    offline: { label: 'Offline Mode', cls: 'badge-warning' },
  };

  return (
    <div className="flex h-screen flex-col relative" style={{ background: '#F8FAFC' }}>
      {/* Wave + Blur Background */}
      <div className="chat-wave-bg">
        <div className="chat-wave-blob chat-wave-blob-1" />
        <div className="chat-wave-blob chat-wave-blob-2" />
        <div className="chat-wave-blob chat-wave-blob-3" />

        {/* SVG wave layer */}
        <svg
          className="absolute bottom-0 left-0 right-0 w-full opacity-[0.03]"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          style={{ height: '35%' }}
        >
          <path fill="#A52A2A" d="M0,128L48,122.7C96,117,192,107,288,117.3C384,128,480,160,576,165.3C672,171,768,149,864,128C960,107,1056,85,1152,90.7C1248,96,1344,128,1392,144L1440,160L1440,200L1392,200C1344,200,1248,200,1152,200C1056,200,960,200,864,200C768,200,672,200,576,200C480,200,384,200,288,200C192,200,96,200,48,200L0,200Z" />
        </svg>
      </div>

      {/* Top Bar */}
      <header
        className="relative z-20 flex shrink-0 items-center justify-between border-b px-4 py-3"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(226, 232, 240, 1)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student')}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-opacity-80"
            style={{ background: '#F1F5F9', color: '#64748B' }}
          >
            <i className="fas fa-arrow-left text-sm" />
          </button>
          <NovaLogo size={36} />
          <div>
            <h1 className="text-sm font-bold tracking-tight" style={{ color: '#1E293B' }}>Career Advisor AI</h1>
            <p className="text-[10px] font-medium" style={{ color: '#94A3B8' }}>Syllabus-aware · powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition hover:bg-opacity-80"
            style={{ background: '#F1F5F9', color: '#64748B' }}
          >
            <i className="fas fa-rotate-right mr-1.5" /> New chat
          </button>
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-opacity-80"
            style={{ background: '#F1F5F9', color: '#64748B' }}
          >
            <i className="fas fa-bars text-sm" />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside
            className="anim-slide-in-left w-64 shrink-0 border-r p-4 backdrop-blur-sm"
            style={{
              background: 'rgba(248, 250, 252, 0.95)',
              borderColor: 'rgba(226, 232, 240, 1)',
            }}
          >
            <p className="section-label mb-3" style={{ color: '#94A3B8' }}>Quick actions</p>
            <div className="space-y-1.5">
              <button onClick={() => navigate('/student')} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-medium border transition hover:bg-opacity-80" style={{ color: '#475569', borderColor: '#E2E8F0' }}>
                <i className="fas fa-th-large mr-2" style={{ color: '#94A3B8' }} /> Dashboard
              </button>
              <button onClick={() => navigate('/student/projects')} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-medium border transition hover:bg-opacity-80" style={{ color: '#475569', borderColor: '#E2E8F0' }}>
                <i className="fas fa-code mr-2" style={{ color: '#94A3B8' }} /> Projects
              </button>
              <button onClick={() => setShowSidebar(false)} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-medium border transition hover:bg-opacity-80" style={{ color: '#475569', borderColor: '#E2E8F0' }}>
                <i className="fas fa-robot mr-2" style={{ color: '#94A3B8' }} /> Career Chat
              </button>
            </div>

            <p className="section-label mt-6 mb-3" style={{ color: '#94A3B8' }}>Your subjects</p>
            <div className="space-y-1">
              {Object.entries(state).slice(0, 8).map(([code, s]) => (
                <div key={code} className="rounded-lg bg-white px-3 py-2 border" style={{ borderColor: '#E2E8F0' }}>
                  <p className="text-[11px] font-bold" style={{ color: '#475569' }}>{code}</p>
                  <p className="text-[10px] truncate" style={{ color: '#94A3B8' }}>{s.title || 'Faculty update'}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl p-3 border" style={{ background: 'rgba(178, 72, 72, 0.06)', borderColor: 'rgba(178, 72, 72, 0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#B24848' }}>Shortcut</p>
              <p className="text-[10px]" style={{ color: '#64748B' }}>Ctrl+K to focus input</p>
            </div>
          </aside>
        )}

        {/* Chat Area */}
        <main className="flex flex-1 flex-col overflow-hidden" style={{ background: 'transparent' }}>
          <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            <div className="mx-auto max-w-3xl space-y-5">
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="flex gap-3 pt-8 anim-fade-in-up">
                  <NovaLogo size={40} />
                  <div className="max-w-[80%]">
                    <div
                      className="rounded-2xl rounded-tl-sm px-5 py-4 text-sm leading-relaxed shadow-sm"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(226, 232, 240, 1)',
                        color: '#475569',
                      }}
                    >
                      Hi there! I'm <strong style={{ color: '#B24848' }}>Nova</strong>, your career advisor.
                      I can help you explore career paths, suggest skills to learn, recommend projects, and guide your BCA journey.
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
                          ? 'rounded-tr-sm shadow-md text-white'
                          : 'rounded-tl-sm shadow-sm'
                      }`}
                      style={
                        msg.role === 'user'
                          ? { background: '#A52A2A', color: '#FFFFFF' }
                          : { background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 1)', color: '#475569' }
                      }
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
                  <div
                    className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm"
                    style={{ background: '#FFFFFF', border: '1px solid rgba(226, 232, 240, 1)' }}
                  >
                    <span className="chat-dot h-1.5 w-1.5 rounded-full" style={{ background: '#B24848' }} />
                    <span className="chat-dot h-1.5 w-1.5 rounded-full" style={{ background: '#B24848' }} />
                    <span className="chat-dot h-1.5 w-1.5 rounded-full" style={{ background: '#B24848' }} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && !loading && (
            <div
              className="shrink-0 border-t px-4 py-3"
              style={{ background: 'rgba(248, 250, 252, 0.8)', borderColor: 'rgba(226, 232, 240, 1)' }}
            >
              <div className="mx-auto max-w-3xl flex gap-2 overflow-x-auto custom-scrollbar">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); sendMessage(s); }}
                    className="shrink-0 rounded-xl border bg-white px-3 py-2 text-[11px] font-medium transition hover:border-opacity-60"
                    style={{ color: '#475569', borderColor: '#E2E8F0' }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = '#B24848';
                      e.target.style.color = '#A52A2A';
                      e.target.style.background = 'rgba(178, 72, 72, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#E2E8F0';
                      e.target.style.color = '#475569';
                      e.target.style.background = '#FFFFFF';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t px-4 py-3.5" style={{ background: 'rgba(255, 255, 255, 0.95)', borderColor: 'rgba(226, 232, 240, 1)' }}>
            <form onSubmit={handleSubmit} className="mx-auto max-w-3xl flex items-end gap-2.5 rounded-2xl border p-2 transition"
              style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
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
                className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none"
                style={{ color: '#1E293B', maxHeight: 120 }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition shadow-sm"
                style={{ background: loading || !input.trim() ? '#CBD5E1' : 'linear-gradient(135deg, #A52A2A, #B24848)' }}
              >
                <i className="fas fa-arrow-up text-sm" />
              </button>
            </form>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px]" style={{ color: '#94A3B8' }}>
              Nova can make mistakes. Verify important career decisions with a mentor or professional.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
