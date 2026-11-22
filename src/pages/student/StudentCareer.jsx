import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { askAssistant } from '../../lib/apiClient';
import NovaAvatar from '../../components/chat/NovaAvatar';
import FormattedText from '../../components/chat/FormattedText';

const SUGGESTED_PROMPTS = (semester) => [
  `Which subjects and units are in my Semester ${semester} syllabus?`,
  'What did faculty cover recently and what notes did they add?',
  'Are there any notices or deadlines I should know about?',
  'Make me a 2-week revision plan for my semester subjects',
  'What skills should I build this semester to be placement-ready?',
];

// What Nova is doing on the server, shown while waiting.
const STAGES = [
  { at: 0, text: 'Searching your Semester {s} course material…' },
  { at: 1400, text: 'Checking faculty notes and notices…' },
  { at: 3000, text: 'Writing an accurate answer…' },
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Reveals the answer progressively (instantly with reduced motion). */
function useTypewriter(fullText, enabled, onTick) {
  const [shown, setShown] = useState(enabled ? '' : fullText);
  useEffect(() => {
    if (!enabled) {
      setShown(fullText);
      return undefined;
    }
    let i = 0;
    const step = Math.max(2, Math.round(fullText.length / 180)); // ~3s max
    const id = setInterval(() => {
      i = Math.min(fullText.length, i + step);
      setShown(fullText.slice(0, i));
      onTick?.();
      if (i >= fullText.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [fullText, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

function AssistantMessage({ msg, onRetry, busy, onTick }) {
  const animate = msg.animate && !prefersReducedMotion();
  const shown = useTypewriter(msg.text, animate, onTick);
  const done = shown.length >= msg.text.length;

  return (
    <div className="chat-message-in mr-auto flex max-w-[94%] gap-3 sm:max-w-[85%]">
      <NovaAvatar size={32} />
      <div className="min-w-0">
        <div
          className={`rounded-2xl rounded-tl-none border p-4 text-[13px] leading-relaxed ${
            msg.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-stone-200/70 bg-[#FAF7F5] text-stone-800'
          }`}
        >
          {msg.error ? (
            <>
              <i className="fa-solid fa-circle-exclamation mr-1.5" />
              {msg.text}
              {msg.retryQuery && (
                <button type="button" disabled={busy} onClick={() => onRetry(msg.retryQuery)} className="mt-2 block text-[11px] font-bold text-rose-700 underline disabled:opacity-50">
                  Try again
                </button>
              )}
            </>
          ) : (
            <div className={done ? '' : 'type-caret'}>
              <FormattedText text={shown} />
            </div>
          )}

          {done && !msg.error && msg.grounded !== undefined && (
            <div className="stage-in mt-3 border-t border-stone-200/70 pt-2 text-[10px] font-semibold">
              {msg.grounded ? (
                <span className="text-emerald-700">
                  <i className="fa-solid fa-shield-halved mr-1" />
                  Based on NPCCSM material{msg.sources?.length ? `: ${msg.sources.join(' · ')}` : ''}
                </span>
              ) : (
                <span className="text-amber-700">
                  <i className="fa-solid fa-circle-info mr-1" />
                  Not found in NPCCSM material. Treat as general guidance and confirm with your faculty.
                </span>
              )}
            </div>
          )}
        </div>
        <div className="mt-1 px-1 text-[10px] font-semibold text-stone-400">{msg.timestamp}</div>
      </div>
    </div>
  );
}

function ThinkingBubble({ semester }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = STAGES.slice(1).map((s, i) => setTimeout(() => setStage(i + 1), s.at));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="chat-message-in mr-auto flex max-w-[85%] gap-3" role="status" aria-label="Nova is thinking">
      <NovaAvatar size={32} thinking />
      <div className="rounded-2xl rounded-tl-none border border-stone-200/70 bg-[#FAF7F5] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="chat-dot h-1.5 w-1.5 rounded-full bg-[#8B2635]/70" />
          <span className="chat-dot h-1.5 w-1.5 rounded-full bg-[#8B2635]/70" />
          <span className="chat-dot h-1.5 w-1.5 rounded-full bg-[#8B2635]/70" />
        </div>
        <p key={stage} className="stage-in mt-1.5 text-[11px] font-semibold text-stone-500">
          {STAGES[stage].text.replace('{s}', semester)}
        </p>
      </div>
    </div>
  );
}

export default function StudentCareer() {
  const { semester } = useOutletContext();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const welcome = () => ({
    id: 'welcome',
    role: 'assistant',
    text: `Hello ${user?.name || 'there'}! I'm **Nova**, your NPCCSM study and career assistant for **BCA Semester ${semester}**.\n- I answer syllabus, lecture, notice and material questions from your college's own data, and tell you when something isn't there.\n- If something you say is incorrect, I'll point it out and explain.`,
    timestamp: now(),
  });

  const [messages, setMessages] = useState(() => [welcome()]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const sentPrefill = useRef(false);

  const scrollToBottom = () => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(scrollToBottom, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend ?? input).trim();
    if (!query || loading) return;

    const history = messages
      .filter((m) => m.id !== 'welcome' && !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.text }));

    setMessages((prev) => [...prev, { id: `u${Date.now()}`, role: 'user', text: query, timestamp: now() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askAssistant({ query, history });
      const sources = [...new Set((res.chunks || []).map((c) => c.source))].slice(0, 3);
      setMessages((prev) => [
        ...prev,
        { id: `a${Date.now()}`, role: 'assistant', text: res.answer, sources, grounded: !!res.grounded, animate: true, timestamp: now() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `e${Date.now()}`, role: 'assistant', error: true, retryQuery: query, text: err.message || 'Nova is unavailable right now. Please try again.', timestamp: now() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // Deep links from the syllabus / dashboard: /student/career?q=...
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !sentPrefill.current) {
      sentPrefill.current = true;
      setSearchParams({}, { replace: true });
      handleSend(q);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col gap-4">
      <div className="flex shrink-0 flex-col justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/85 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-md sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          <NovaAvatar size={44} thinking={loading} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-tight text-stone-900">Nova · Study &amp; Career Assistant</h1>
              <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <span className="pulse-ring h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-stone-500">Answers from your Semester {semester} syllabus, lectures, notices and materials</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMessages([welcome()])}
          className="self-start rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 shadow-sm transition-colors hover:bg-stone-100 hover:text-stone-900 sm:self-auto"
        >
          <i className="fa-solid fa-rotate-right mr-1.5 text-[10px] text-stone-400" />
          New chat
        </button>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with Nova"
        className="custom-scrollbar flex flex-1 flex-col space-y-4 overflow-y-auto overscroll-contain rounded-2xl border border-stone-200/70 bg-white/85 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] backdrop-blur-md md:p-6"
      >
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="chat-message-in ml-auto flex max-w-[92%] flex-row-reverse gap-3 sm:max-w-[80%]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-800 text-white shadow-sm" aria-hidden="true">
                <i className="fa-solid fa-user text-[11px]" />
              </span>
              <div>
                <div className="whitespace-pre-wrap rounded-2xl rounded-tr-none bg-[#8B2635] p-4 text-[13px] font-medium leading-relaxed text-white shadow-sm">{msg.text}</div>
                <div className="mt-1 px-1 text-right text-[10px] font-semibold text-stone-400">{msg.timestamp}</div>
              </div>
            </div>
          ) : (
            <AssistantMessage key={msg.id} msg={msg} busy={loading} onRetry={handleSend} onTick={scrollToBottom} />
          )
        )}
        {loading && <ThinkingBubble semester={semester} />}
      </div>

      {messages.length <= 2 && !loading && (
        <div className="custom-scrollbar flex shrink-0 gap-2 overflow-x-auto pb-1">
          {SUGGESTED_PROMPTS(semester).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="shrink-0 rounded-xl border border-stone-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-stone-700 shadow-sm transition-all hover:border-[#8B2635] hover:text-[#8B2635]"
            >
              <i className="fa-solid fa-arrow-right-long mr-1.5 text-[10px] text-stone-400" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="chat-input-wrapper flex shrink-0 items-center gap-2 rounded-xl border border-stone-200/80 bg-white/90 p-2 shadow-sm backdrop-blur-md"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Message Nova"
          maxLength={2000}
          placeholder="Ask about a topic, a lecture, a notice, or your career…"
          className="flex-1 bg-transparent px-3 py-1.5 text-[13px] font-medium text-stone-900 outline-none placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="btn-press flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8B2635] text-white shadow-sm transition-all hover:bg-[#77212e] disabled:opacity-40"
        >
          <i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-arrow-up'} text-xs`} />
        </button>
      </form>
      <p className="-mt-2 text-center text-[10px] text-stone-400">
        Nova only states college facts that appear in NPCCSM material. AI can still make mistakes, so check important details with your faculty.
      </p>
    </div>
  );
}
