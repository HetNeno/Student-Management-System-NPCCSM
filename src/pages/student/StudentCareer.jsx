import { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSyllabus } from '../../context/SyllabusContext';
import { getSubjectsForSemester } from '../../data/syllabusDatabase';
import { askGemini } from '../../lib/chatbotApi';

const SUGGESTED_PROMPTS = [
  'Recommend the best resume project for BCA Semester 5',
  'What are the most frequent technical interview questions for Java & OOP?',
  'How do I prepare for Database & SQL coding rounds?',
  'What skills should I learn this semester to be placement-ready?',
  'Give me a 30-day study plan for my current semester subjects',
];

export default function StudentCareer() {
  const { semester } = useOutletContext();
  const { user } = useAuth();
  const { state } = useSyllabus();

  const subjects = getSubjectsForSemester(semester);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${user?.name || 'there'}! I'm Nova, your NPCCSM Career & Learning Advisor. Ask me anything about project ideas, interview preparation, BCA placement strategies, or topics in your Semester ${semester} syllabus.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: String(Date.now()),
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const activeSubject = subjects[0] || null;
      const botAnswer = await askGemini({
        prompt: query,
        subject: activeSubject,
        semester,
        unitName: 'Career & Curriculum Advisor',
        knowledgeBase: state,
        conversation: messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'bot',
          text: m.text,
        })),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: botAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      // Clean, structured guidance
      let fallbackText = `Tailored advice for BCA Semester ${semester}:

1. Practical Application: Build end-to-end applications demonstrating clean OOP principles and database integrations.
2. Core Theory: Master Relational Modeling, Indexing, and Transaction management (ACID properties).
3. Portfolio Setup: Document every project on GitHub with architectural diagrams and a clear README.`;

      if (query.toLowerCase().includes('project')) {
        fallbackText = `Recommended Projects for Semester ${semester}:

• Enterprise Management System (Java + MySQL): Demonstrates schema design, JDBC, and transaction handling.
• Full-Stack API Service (Node.js/Express + PostgreSQL): Demonstrates JWT authentication, CORS, and role security.
• Interactive Data Analytics Dashboard (Python + SQL): Demonstrates query optimization and analytics reporting.`;
      } else if (query.toLowerCase().includes('interview') || query.toLowerCase().includes('question')) {
        fallbackText = `Key Technical Interview Questions for your semester:

• OOP: Explain Abstraction vs. Interface with real-world scenarios. How does Runtime Polymorphism work?
• Java: What is the difference between Heap and Stack memory? How does Garbage Collection function?
• DBMS: Explain B-Tree Indexing and why Primary Keys enforce clustered index order.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="mx-auto max-w-4xl h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* ── Top Advisor Header with Glassmorphism ── */}
      <div className="rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B2635] text-white shadow-md shadow-[#8B2635]/20">
            <i className="fa-solid fa-brain text-base" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-stone-900 tracking-tight">
                Nova &middot; Career &amp; Academic Advisor
              </h1>
              <span className="rounded-full bg-stone-100 border border-stone-200/80 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                AI Active
              </span>
            </div>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              Personalized for BCA Semester {semester} curriculum &middot; Ask about placements, projects, or concepts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                text: `Conversation reset. How can I assist your career or studies in Semester ${semester} today?`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }}
          className="self-start sm:self-auto rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors shadow-sm"
        >
          <i className="fa-solid fa-rotate-right mr-1.5 text-stone-400 text-[10px]" />
          Reset Chat
        </button>
      </div>

      {/* ── Chat Messages Stream Container ── */}
      <div className="flex-1 rounded-2xl border border-stone-200/70 bg-white/85 backdrop-blur-md p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-y-auto custom-scrollbar flex flex-col space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-sm ${
                  isUser
                    ? 'bg-stone-800 text-white'
                    : 'bg-[#8B2635] text-white shadow-[#8B2635]/20'
                }`}
              >
                {isUser ? <i className="fa-solid fa-user text-[11px]" /> : <i className="fa-solid fa-brain text-[11px]" />}
              </div>

              <div>
                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#8B2635] text-white rounded-tr-none shadow-sm font-medium'
                      : 'bg-[#FAF7F5] border border-stone-200/70 text-stone-800 rounded-tl-none font-medium'
                  }`}
                >
                  {msg.text}
                </div>
                <div
                  className={`text-[10px] font-semibold text-stone-400 mt-1 px-1 ${
                    isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-[80%]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8B2635] text-white shadow-sm">
              <i className="fa-solid fa-brain text-[11px]" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-stone-200/70 bg-[#FAF7F5] p-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-500 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-stone-500 animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-stone-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested Prompt Chips ── */}
      {messages.length <= 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar shrink-0">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              className="shrink-0 rounded-xl border border-stone-200 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-stone-700 hover:border-[#8B2635] hover:text-[#8B2635] transition-all shadow-sm"
            >
              <i className="fa-solid fa-arrow-right-long mr-1.5 text-stone-400 text-[10px]" />
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Box ── */}
      <div className="rounded-xl border border-stone-200/80 bg-white/90 backdrop-blur-md p-2 shadow-sm flex items-center gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Nova about career paths, interview questions, or projects..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs font-medium text-stone-900 outline-none placeholder:text-stone-400"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8B2635] text-white shadow-sm hover:bg-[#77212e] transition-all disabled:opacity-40"
        >
          <i className="fa-solid fa-arrow-up text-xs" />
        </button>
      </div>
    </div>
  );
}
