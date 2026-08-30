const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export async function askGemini({ prompt, subject, semester, unitName, knowledgeBase, conversation }) {
  const instructions = `You are Nova, a BCA career and learning advisor. Be concise, practical, and honest. No markdown formatting — use plain text only.

Context:
- Semester: ${semester || 'unknown'}
- Subject: ${subject ? `${subject.code} - ${subject.title}` : 'General'}
- Unit: ${unitName || 'General'}

Recent conversation:
${(conversation || []).slice(-4).map((m) => `${m.role === 'user' ? 'Student' : 'Nova'}: ${m.text}`).join('\n') || 'First message.'}

Student: ${prompt}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are Nova, a concise career advisor. Plain text only, no markdown.' }] },
      contents: [{ role: 'user', parts: [{ text: instructions }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200, topP: 0.85 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const data = await response.json();
  const answer = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim();
  if (!answer) throw new Error('Empty response from Gemini');
  return answer;
}
