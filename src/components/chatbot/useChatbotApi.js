import { useState, useCallback } from 'react';
import { askGemini } from '../../lib/chatbotApi';

export function useChatbotApi(subject, semester) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hi! I\'m Nova, your career and learning advisor. Ask me about career paths, industry skills, projects to build, or whether a subject is worth learning. I\'ll give you honest, actionable advice.',
      source: 'welcome',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState('welcome');

  const sendMessage = useCallback(async (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);
    setSource('thinking');

    try {
      const unitName = subject?.units?.[0]?.name || 'General';
      const answer = await askGemini({
        prompt: trimmed,
        subject,
        semester,
        unitName,
        knowledgeBase: {},
        conversation: messages,
      });

      const sourceTag = answer.includes('[From Syllabus]') ? 'syllabus'
        : answer.includes('[From Industry]') ? 'industry'
        : answer.includes('[Combined]') ? 'combined' : 'combined';

      const clean = answer.replace(/\[From Syllabus\]/g, '').replace(/\[From Industry\]/g, '').replace(/\[Combined\]/g, '').trim();

      setSource(sourceTag);
      setMessages((p) => [...p, { id: `b-${Date.now()}`, role: 'bot', text: clean, source: sourceTag }]);
    } catch {
      setSource('error');
      setMessages((p) => [
        ...p,
        { id: `b-${Date.now()}`, role: 'bot', text: 'I hit a temporary issue. Please try again in a moment.', source: 'error' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [subject, semester, messages]);

  const reset = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'bot',
        text: 'Hi! I\'m Nova, your career and learning advisor. Ask me about career paths, industry skills, projects to build, or whether a subject is worth learning.',
        source: 'welcome',
      },
    ]);
    setSource('welcome');
  }, []);

  return { messages, loading, source, sendMessage, reset };
}
