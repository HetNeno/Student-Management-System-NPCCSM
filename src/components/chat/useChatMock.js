import { useState, useRef, useEffect, useCallback } from 'react';
import { retrieveContext } from '../../services/ragService';

/* ── Mock responses (fallback when RAG backend is unavailable) ─────────────── */
const mockResponses = [
  {
    keywords: ['career', 'path', 'job', 'become'],
    text: 'For BCA graduates, the most in-demand career paths are:\n\n1. Full Stack Developer — React + Node.js + PostgreSQL (6-8 months)\n2. Frontend Developer — React + TypeScript + Tailwind (4-6 months)\n3. Data Analyst — Python + SQL + visualization tools (3-5 months)\n4. QA Engineer — Manual + automation testing (3-4 months)\n\nStart with Full Stack if you are unsure — it gives you the broadest foundation.',
    sources: [
      { title: 'Industry Hiring Trends 2025', snippet: 'Full-stack roles remain the #1 entry point for BCA graduates...' },
      { title: 'NPCCSM Career Guide', snippet: 'BCA curriculum aligns well with modern web development tracks...' },
    ],
  },
  {
    keywords: ['project', 'build', 'idea'],
    text: 'Here are 4 resume-ready projects ordered by difficulty:\n\n1. Task Manager — React + TypeScript (learn state management)\n2. REST API — Node.js + Express + PostgreSQL (learn backend)\n3. Weather Dashboard — API integration + Chart.js (learn async)\n4. Chat App — WebSockets + React (learn real-time)\n\nEach project takes 2-3 weeks. Push all to GitHub.',
    sources: [
      { title: 'Project-Based Learning Guide', snippet: 'Building 3-4 full projects is more valuable than 10 tutorials...' },
    ],
  },
  {
    keywords: ['skill', 'learn', 'semester', 'focus'],
    text: 'Priority skills for this semester:\n\nCore: JavaScript (ES6+), Git/GitHub, SQL\nFrontend: React.js, TypeScript basics, CSS Grid/Flexbox\nTools: VS Code, Postman, Terminal\nSoft: Writing clean READMEs, code review practice\n\nSkip: Legacy frameworks — focus on modern, widely-used tools.',
    sources: [
      { title: 'BCA Skill Roadmap', snippet: 'JavaScript mastery is the single highest-ROI skill...' },
      { title: 'Industry Expectations', snippet: 'Git proficiency is expected of every graduate...' },
    ],
  },
  {
    keywords: ['java', 'python', 'subject', 'useful'],
    text: 'Both Java and Python remain highly relevant, but for different reasons:\n\nPython: Data science, ML, scripting, backend (Django/FastAPI). Easier to learn, more versatile.\nJava: Enterprise backend (Spring Boot), Android, large systems. Steeper learning curve but very stable career path.\n\nRecommendation: Learn Python first for versatility, then Java if you target enterprise roles.',
    sources: [
      { title: 'Language Comparison 2025', snippet: 'Python dominates data/ML while Java leads enterprise...' },
    ],
  },
  {
    keywords: ['ready', 'prepare', 'interview'],
    text: 'To be job-ready by graduation:\n\nMust have (non-negotiable):\n- 3+ projects on GitHub with READMEs\n- DSA practice (150+ LeetCode problems)\n- Comfortable with Git branching and PRs\n- One deployment experience (Vercel/Render)\n\nNice to have:\n- TypeScript experience\n- Docker basics\n- One open-source contribution\n\nStart now — 1 focused hour daily beats 7 hours on Sunday.',
    sources: [
      { title: 'Graduate Readiness Checklist', snippet: 'GitHub portfolio with real projects is the #1 hiring signal...' },
    ],
  },
];

function findBestResponse(input) {
  const lower = input.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const r of mockResponses) {
    const score = r.keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = r;
    }
  }

  if (bestMatch && bestScore > 0) return bestMatch;

  // Fallback
  return {
    text: 'That is a great question. Here is my advice:\n\n1. Build real projects — theory alone is not enough\n2. Practice coding daily — even 30 minutes helps\n3. Learn Git and push everything to GitHub\n4. Focus on JavaScript/TypeScript — they open the most doors\n\nWant me to elaborate on any of these?',
    sources: [
      { title: 'General Career Advice', snippet: 'Consistent project building is the fastest path to employability...' },
    ],
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ── Simulated RAG service (fallback) ── */
async function mockQueryRag({ prompt, conversationHistory }) {
  await delay(600 + Math.random() * 800);
  const match = findBestResponse(prompt);
  return {
    text: match.text,
    sources: match.sources,
    timestamp: Date.now(),
  };
}

/* ── RAG service interface ──
   Tries backend first, falls back to mock.
   When RAG is ready, the backend call will work automatically. */
export async function queryRagService({ prompt, conversationHistory }) {
  try {
    const result = await retrieveContext(prompt, { topK: 5, threshold: 0.7 });
    if (result.chunks.length > 0) {
      const contextText = result.chunks
        .map((c, i) => `[${i + 1}] ${c.text}`)
        .join('\n\n');
      const sources = result.chunks.map((c) => ({
        title: c.source,
        snippet: c.text.slice(0, 120) + (c.text.length > 120 ? '...' : ''),
        similarity: c.similarity,
      }));
      return {
        text: contextText,
        sources,
        timestamp: Date.now(),
      };
    }
  } catch { /* backend unavailable — use mock */ }

  return mockQueryRag({ prompt, conversationHistory });
}

/* ── Chat state hook ─────────────────────────────────────────────────────── */

const STORAGE_KEY = 'nova-chat-history';

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [
    {
      id: 'welcome',
      title: 'New conversation',
      messages: [
        {
          id: 'welcome-1',
          role: 'assistant',
          text: 'Hi! I\'m Nova, your career and learning advisor.\n\nAsk me about career paths, industry skills, projects to build, or whether a subject is worth focusing on. I\'ll give you honest, actionable advice.',
          timestamp: Date.now(),
          sources: [],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

function saveConversations(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function useChat() {
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(() => conversations[0]?.id ?? null);
  const [loading, setLoading] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  // Persist
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  const sendMessage = useCallback(
    async (prompt) => {
      if (!activeId) return;

      const userMsg = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: prompt,
        timestamp: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                title: c.messages.length <= 1 ? prompt.slice(0, 40) : c.title,
                messages: [...c.messages, userMsg],
                updatedAt: Date.now(),
              }
            : c,
        ),
      );

      setLoading(true);

      try {
        const convo = conversations.find((c) => c.id === activeId);
        const history = convo?.messages ?? [];

        const response = await queryRagService({
          prompt,
          conversationHistory: history,
        });

        const botMsg = {
          id: `b-${Date.now()}`,
          role: 'assistant',
          text: response.text,
          timestamp: response.timestamp,
          sources: response.sources ?? [],
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? { ...c, messages: [...c.messages, botMsg], updatedAt: Date.now() }
              : c,
          ),
        );
      } catch {
        const errorMsg = {
          id: `b-${Date.now()}`,
          role: 'assistant',
          text: 'Something went wrong. Please try again.',
          timestamp: Date.now(),
          sources: [],
          isError: true,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId
              ? { ...c, messages: [...c.messages, errorMsg] }
              : c,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [activeId, conversations],
  );

  const startNewConversation = useCallback(() => {
    const newConvo = {
      id: `c-${Date.now()}`,
      title: 'New conversation',
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          text: 'New conversation started. What would you like to explore?',
          timestamp: Date.now(),
          sources: [],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveId(newConvo.id);
  }, []);

  const deleteConversation = useCallback((id) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh = [
          {
            id: `c-${Date.now()}`,
            title: 'New conversation',
            messages: [
              {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                text: 'Hi! I\'m Nova, your career and learning advisor. Ask me anything about your BCA journey.',
                timestamp: Date.now(),
                sources: [],
              },
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];
        setActiveId(fresh[0].id);
        return fresh;
      }
      if (id === activeId) {
        setActiveId(remaining[0].id);
      }
      return remaining;
    });
  }, [activeId]);

  return {
    conversations,
    activeConversation,
    activeId,
    loading,
    setActiveId,
    sendMessage,
    startNewConversation,
    deleteConversation,
  };
}
