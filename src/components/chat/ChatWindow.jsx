import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from './useChatMock';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';

/* ── Typing dots for loading state ── */
function LoadingDots() {
  return (
    <div className="anim-fade-in-up flex gap-3">
      <div className="anim-fade-in-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#B24848] to-[#A52A2A] text-sm text-white shadow-md ring-1 ring-black/5">
        <i className="fas fa-sparkles" />
      </div>
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-5 py-3.5 shadow-sm"
        style={{ animationDelay: '0ms' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="chat-dot h-1.5 w-1.5 rounded-full"
            style={{ background: '#B24848', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Welcome screen ── */
function WelcomeScreen({ onSelect }) {
  return (
    <div className="anim-fade-in-up flex flex-col items-center justify-center py-16 text-center">
      <div
        className="anim-scale-in-pop mb-6 flex h-16 w-16 items-center justify-center rounded-[1.25rem] shadow-lg ring-1 ring-black/5"
        style={{ background: 'linear-gradient(135deg, #B24848, #A52A2A)' }}
      >
        <i className="fas fa-sparkles text-2xl text-white" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
        How can I help you today?
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Ask about career paths, skills, projects, or anything about your BCA
        journey.
      </p>
      <div className="mt-8 w-full max-w-lg">
        <SuggestionChips onSelect={onSelect} />
      </div>
    </div>
  );
}

/* ── Conversation sidebar ── */
function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  const formatDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <aside className="anim-slide-in-left flex w-72 shrink-0 flex-col border-r bg-white">
      {/* New chat button */}
      <div className="p-4">
        <button
          onClick={onNew}
          className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#B24848] hover:text-[#A52A2A] hover:shadow-md"
        >
          <i className="fas fa-plus text-xs" style={{ color: '#B24848' }} />
          New conversation
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-3 custom-scrollbar">
        <p
          className="section-label mb-2 px-1"
          style={{ color: '#94A3B8' }}
        >
          Recent
        </p>
        <div className="space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                onClose?.();
              }}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition"
              style={{
                background:
                  c.id === activeId
                    ? 'linear-gradient(135deg, rgba(178,72,72,0.08), rgba(165,42,42,0.04))'
                    : 'transparent',
              }}
            >
              <i
                className="fas fa-message text-xs"
                style={{
                  color:
                    c.id === activeId ? '#B24848' : '#94A3B8',
                }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[13px] font-medium"
                  style={{
                    color:
                      c.id === activeId ? '#1E293B' : '#475569',
                  }}
                >
                  {c.title}
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: '#94A3B8' }}
                >
                  {formatDate(c.updatedAt)}
                </p>
              </div>
              {hoveredId === c.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Delete conversation"
                >
                  <i className="fas fa-trash-alt text-[10px]" />
                </button>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="border-t border-slate-100 p-4"
        style={{ background: '#FAFBFC' }}
      >
        <p
          className="text-center text-[10px] font-medium text-slate-400"
        >
          <i className="fas fa-robot mr-1" />
          Nova Career Advisor · Frontend Preview
        </p>
      </div>
    </aside>
  );
}

/* ── Main ChatWindow ── */
export default function ChatWindow() {
  const {
    conversations,
    activeConversation,
    activeId,
    loading,
    setActiveId,
    sendMessage,
    startNewConversation,
    deleteConversation,
  } = useChat();

  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  const messages = activeConversation?.messages ?? [];

  // Auto-scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const val = input.trim();
      if (!val || loading) return;
      setInput('');
      sendMessage(val);
    },
    [input, loading, sendMessage],
  );

  const handleSuggestion = useCallback(
    (label) => {
      if (loading) return;
      sendMessage(label);
    },
    [loading, sendMessage],
  );

  const showWelcome = messages.length <= 1 && !loading;

  return (
    <div className="flex h-screen" style={{ background: '#F8FAFC' }}>
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-[-10%] left-[-5%] h-[45vw] w-[45vw] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, #B24848, transparent 65%)',
            filter: 'blur(80px)',
            animation: 'chatBlobDrift 25s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute bottom-[-15%] right-[-5%] h-[40vw] w-[40vw] rounded-full opacity-[0.05]"
          style={{
            background: 'radial-gradient(circle, #D4AF37, transparent 65%)',
            filter: 'blur(90px)',
            animation: 'chatBlobDrift 30s ease-in-out infinite alternate-reverse',
          }}
        />
        <div
          className="absolute top-[40%] left-[35%] h-[30vw] w-[30vw] rounded-full opacity-[0.04]"
          style={{
            background: 'radial-gradient(circle, #C46060, transparent 65%)',
            filter: 'blur(70px)',
            animation: 'chatBlobDrift 22s ease-in-out infinite alternate',
            animationDelay: '-8s',
          }}
        />
      </div>

      {/* Sidebar (desktop) */}
      {showSidebar && (
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={startNewConversation}
          onDelete={deleteConversation}
        />
      )}

      {/* Sidebar overlay (mobile) */}
      {sidebarOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setSidebarOpenMobile(false)}
          />
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              setSidebarOpenMobile(false);
            }}
            onNew={() => {
              startNewConversation();
              setSidebarOpenMobile(false);
            }}
            onDelete={deleteConversation}
          />
        </div>
      )}

      {/* Main chat area */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex shrink-0 items-center justify-between border-b px-4 py-3"
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            borderColor: '#E2E8F0',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpenMobile(!sidebarOpenMobile)}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:bg-slate-100 lg:hidden"
              style={{ color: '#64748B' }}
            >
              <i className="fas fa-bars text-sm" />
            </button>
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="hidden h-9 w-9 items-center justify-center rounded-xl transition hover:bg-slate-100 lg:flex"
                style={{ color: '#64748B' }}
              >
                <i className="fas fa-bars text-sm" />
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#B24848] to-[#A52A2A] text-sm text-white shadow-sm ring-1 ring-black/5">
              <i className="fas fa-sparkles" />
            </div>
            <div>
              <h1
                className="text-sm font-bold tracking-tight"
                style={{ color: '#1E293B' }}
              >
                Nova
              </h1>
              <p
                className="text-[10px] font-medium"
                style={{ color: '#94A3B8' }}
              >
                Career Advisor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {showSidebar && (
              <button
                onClick={() => setShowSidebar(false)}
                className="hidden h-9 w-9 items-center justify-center rounded-xl transition hover:bg-slate-100 lg:flex"
                style={{ color: '#64748B' }}
              >
                <i className="fas fa-angles-right text-xs" />
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="mx-auto max-w-3xl">
            {showWelcome && (
              <WelcomeScreen onSelect={handleSuggestion} />
            )}

            <div className="space-y-5">
              {messages.map((msg, idx) => {
                // Skip the welcome message when showing welcome screen
                if (showWelcome && msg.id === 'welcome-1') return null;
                const isLast =
                  idx === messages.length - 1 && msg.role === 'assistant';
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isLast={isLast && loading}
                  />
                );
              })}
              {loading && <LoadingDots />}
              <div ref={endRef} aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Input area */}
        <div
          className="shrink-0 border-t"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E2E8F0',
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-3xl px-4 py-4"
          >
            <div
              className="flex items-end gap-2 rounded-2xl border bg-white p-1.5 shadow-sm transition"
              style={{ borderColor: '#E2E8F0' }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    !e.metaKey &&
                    !e.ctrlKey
                  ) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask about career paths, skills, projects..."
                rows={1}
                className="min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none"
                style={{
                  color: '#1E293B',
                  maxHeight: 120,
                }}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background:
                    loading || !input.trim()
                      ? '#CBD5E1'
                      : 'linear-gradient(135deg, #B24848, #A52A2A)',
                }}
              >
                <i className="fas fa-arrow-up text-sm" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p
                className="text-center text-[10px] font-medium"
                style={{ color: '#94A3B8' }}
              >
                Press <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold">Enter</kbd> to send
                {', '}
                <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold">Shift+Enter</kbd> for new line
              </p>
              <p
                className="text-center text-[10px]"
                style={{ color: '#94A3B8' }}
              >
                <i className="fas fa-circle-info mr-1" />
                Preview mode — mock responses
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
