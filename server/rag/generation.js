import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set in server/.env');
}

/**
 * Generate a chat response using Gemini with RAG context.
 * @param {string} userQuery - The user's question
 * @param {Array} contextChunks - Retrieved document chunks from RAG
 * @param {Array} conversationHistory - Recent conversation history
 * @returns {Promise<string>} - The generated answer
 */
export async function generateRagResponse(userQuery, contextChunks = [], conversationHistory = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const contextText = contextChunks
    .map((c, i) => `[${i + 1}] ${c.text}`)
    .join('\n\n');

  const sourcesList = contextChunks
    .map((c) => `[${c.source}]`)
    .join(' ');

  const historyText = (conversationHistory || [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Nova'}: ${m.text}`)
    .join('\n');

  const systemPrompt = `You are Nova, a BCA career and learning advisor. Answer questions based ONLY on the provided context from the knowledge base.

RULES:
- Use ONLY the context below to answer. If the context doesn't contain relevant information, say so honestly.
- Be concise, practical, and actionable.
- Reference sources using the [Source Name] format when quoting facts.
- If the question is about career paths, projects, or skills and context is sparse, provide general industry knowledge marked as [General Advice].
- Never make up information not in the context.
- Plain text only, no markdown, no code fences, no emojis.`;

  const userPrompt = `Context from knowledge base:
${contextText || 'No relevant context found.'}

${historyText ? `Recent conversation:\n${historyText}\n` : ''}

Student question: ${userQuery}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
          topP: 0.85,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();

  if (!answer) {
    throw new Error('Empty response from Gemini');
  }

  return answer;
}

/**
 * Generate a response without RAG (pure LLM mode).
 */
export async function generateDirectResponse(userQuery, conversationHistory = []) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const historyText = (conversationHistory || [])
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Nova'}: ${m.text}`)
    .join('\n');

  const systemPrompt = `You are Nova, a BCA career and learning advisor. Be concise, practical, and honest.
- Plain text only, no markdown, no code fences, no emojis.
- Keep answers focused and actionable.
- If you don't know something, say so.`;

  const userPrompt = `${historyText ? `Recent conversation:\n${historyText}\n\n` : ''}Student: ${userQuery}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1500,
          topP: 0.85,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
}
