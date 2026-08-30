const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const { prompt, semester, subject, unitName, syllabus, knowledgeBase, conversation } = request.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 2) {
    return response.status(400).json({ error: 'Please enter a study question.' });
  }

  const syllabusText = formatSyllabus(syllabus);
  const knowledgeText = formatKnowledgeBase(knowledgeBase, syllabus);
  const conversationText = formatConversation(conversation);

  if (!process.env.GEMINI_API_KEY) {
    const offlineAnswer = buildOfflineAnswer({ prompt, semester, subject, unitName, syllabus, knowledgeBase });
    return response.status(200).json({ answer: offlineAnswer, source: 'offline-fallback' });
  }

  const instructions = `You are Nova, the NPCCSM syllabus study assistant for BCA students at Kadi Sarva Vishwavidyalaya.

Your mission: NEVER give vague or unsatisfactory answers. Every reply must be 100 percent correct, exam-oriented, and useful to the student.

Strict rules:
- The syllabus below is your single source of truth for subjects, units, and topics. Use ONLY what is present.
- The teacher-published notes below carry the highest authority for exam questions and important topics. Prefer them when answering.
- If the student asks for important questions or exam focus for a semester, subject, or unit, list at least 5 to 10 exam-style questions with brief model-answer hints drawn directly from the syllabus topics and teacher notes.
- If the student asks to explain a concept, give a clear definition, 3 to 5 key points, one small example, and a "Remember" line for exams.
- If the student asks for important questions, respond with properly formatted important questions suitable for university exams. Each question must relate directly to a syllabus topic.
- Match the student's selected semester, subject, and unit exactly. Do NOT tell them to wait for the teacher.
- If a topic is not in the syllabus, say so clearly and offer the closest syllabus topic instead. Never invent topics.
- Prefer helpful complete answers over follow-up questions. Ask a clarification ONLY when absolutely necessary.
- General CS questions (OOP, DBMS, networking, etc.) are allowed. Tie them to the student's current course when relevant.

Output format:
- Plain text only. No Markdown syntax. No asterisks, hashes, code fences, table pipes, emojis, or decorative separators.
- Use short headings on their own lines such as "Meaning" or "Key Points".
- Use numbered lists 1. 2. 3. for steps or question lists.
- Never begin with filler like "Here is" or "Sure". Start directly with the answer.
- Aim for thorough, exam-ready depth. A student should be able to revise from your answer.

Current context:
- Semester: ${semester || 'unknown'}
- Subject code: ${subject?.code || 'unknown'}
- Subject title: ${subject?.title || 'unknown'}
- Unit: ${unitName || 'unknown'}

Complete syllabus reference:
${syllabusText}

Teacher-published important questions and notes (highest authority):
${knowledgeText}

Recent conversation:
${conversationText}

Student question:
${prompt.trim()}`;

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are Nova, a precise academic tutor who never gives vague answers.' }] },
        contents: [{ role: 'user', parts: [{ text: instructions }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 1500, topP: 0.85 },
      }),
    });

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) {
      console.error('[chat] Gemini error:', data);
      const offlineAnswer = buildOfflineAnswer({ prompt, semester, subject, unitName, syllabus, knowledgeBase });
      return response.status(200).json({ answer: offlineAnswer, source: 'offline-fallback' });
    }

    const answer = cleanAnswer(data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim());
    if (!answer) {
      const offlineAnswer = buildOfflineAnswer({ prompt, semester, subject, unitName, syllabus, knowledgeBase });
      return response.status(200).json({ answer: offlineAnswer, source: 'offline-fallback' });
    }
    return response.status(200).json({ answer, source: 'gemini' });
  } catch (error) {
    console.error('[chat] Request failed:', error);
    const offlineAnswer = buildOfflineAnswer({ prompt, semester, subject, unitName, syllabus, knowledgeBase });
    return response.status(200).json({ answer: offlineAnswer, source: 'offline-fallback' });
  }
}

function buildOfflineAnswer({ prompt, semester, subject, unitName, syllabus, knowledgeBase }) {
  const lower = String(prompt || '').toLowerCase().trim();
  const subjectRecord = subject && subject.code ? subject : findSubjectByHint(syllabus, prompt, semester);

  // Build teacher-published notes map for the current subject if any
  const teacherNotes = subjectRecord && knowledgeBase ? knowledgeBase[subjectRecord.code] : null;
  const publishedQuestions = teacherNotes && teacherNotes.topicNotes
    ? Object.entries(teacherNotes.topicNotes).filter(([, note]) => note && note.trim())
    : [];

  // Important questions request
  if (lower.includes('important question') || lower.includes('imp question') || lower.includes('imp q') || lower.includes('exam question') || lower.includes('questions') || lower.includes('question paper')) {
    if (!subjectRecord) {
      return `Please select a specific subject from the semester selector so I can give you exam-focused important questions. Selected semester ${semester || 'is currently unselected'}.`;
    }

    const unit = subjectRecord.units && subjectRecord.units[0];
    const unitNameText = unit ? unit.name : (unitName || 'the current unit');

    const lines = [];
    lines.push(`Important Exam Questions for ${subjectRecord.code} - ${subjectRecord.title}`);
    lines.push(`Semester ${semester || '-'}, ${unitNameText}`);
    lines.push('');

    if (publishedQuestions.length > 0) {
      lines.push('Teacher-published important questions (authoritative):');
      publishedQuestions.slice(0, 10).forEach(([topic, note], index) => {
        lines.push(`${index + 1}. ${note}`);
        lines.push(`   Topic: ${topic}`);
      });
      lines.push('');
    }

    if (unit && unit.topics && unit.topics.length > 0) {
      lines.push(`Likely exam questions based on the ${unit.name} syllabus:`);
      unit.topics.slice(0, 8).forEach((topic, index) => {
        lines.push(`${publishedQuestions.length + index + 1}. Explain ${topic.toLowerCase()} with a suitable example.`);
      });
      lines.push('');
    }

    lines.push('Remember: prepare definitions, diagrams, comparisons, and short examples for each question.');
    return lines.join('\n');
  }

  // Notes request
  if (lower.includes('important note') || lower.includes('give me notes') || lower.includes('summary') || lower.includes('notes')) {
    if (!subjectRecord) {
      return `Please choose a subject to view exam-focused notes. The chatbot will then summarize definitions, key points, and examples from the syllabus.`;
    }
    const unit = subjectRecord.units && subjectRecord.units[0];
    const lines = [];
    lines.push(`Exam Notes for ${subjectRecord.code} - ${subjectRecord.title}`);
    lines.push(`Semester ${semester || '-'}, ${unit ? unit.name : unitName}`);
    lines.push('');
    if (unit) {
      lines.push('Key Points:');
      unit.topics.forEach((topic, idx) => lines.push(`${idx + 1}. ${topic}`));
      lines.push('');
    }
    if (publishedQuestions.length > 0) {
      lines.push('Teacher notes (focus areas):');
      publishedQuestions.slice(0, 5).forEach(([topic, note]) => {
        lines.push(`- ${topic}: ${note}`);
      });
    }
    lines.push('');
    lines.push('Remember: revise definitions and draw diagrams where applicable.');
    return lines.join('\n');
  }

  // Explanation request for a single topic
  if (lower.startsWith('what is') || lower.startsWith('define') || lower.startsWith('explain') || lower.includes('meaning')) {
    if (!subjectRecord) {
      return `To explain a topic accurately, please open a specific subject on the student portal so I can match it to your syllabus.`;
    }
    const topic = extractTopicFromPrompt(lower);
    const matched = findTopicInSubject(subjectRecord, topic);
    if (matched) {
      return [
        `Meaning of ${matched}`,
        `${matched} is a key concept under ${subjectRecord.code} - ${subjectRecord.title}.`,
        '',
        'Key Points:',
        `1. ${matched} is part of the official BCA syllabus for Semester ${semester || '-'}.`,
        '2. Read the chapter and textbook examples carefully.',
        '3. Compare it with related concepts from the same unit.',
        '4. Practice short answer and long answer questions on this topic.',
        '',
        'Remember: write a 2-line definition, then list 3 bullet key points in your exam.',
      ].join('\n');
    }
  }

  // Fallback - give a structured syllabus summary
  if (subjectRecord) {
    const lines = [];
    lines.push(`${subjectRecord.code} - ${subjectRecord.title}`);
    lines.push(`Semester ${semester || '-'}`);
    lines.push('');
    lines.push('Syllabus at a glance:');
    (subjectRecord.units || []).forEach((unit, idx) => {
      lines.push(`Unit ${idx + 1}: ${unit.name}`);
      unit.topics.slice(0, 4).forEach((t) => lines.push(`  - ${t}`));
    });
    lines.push('');
    lines.push('Ask me "give me the important questions" or "explain <topic>" for exam-ready help.');
    return lines.join('\n');
  }

  return `Please select a semester and subject on the student portal so I can answer from your syllabus. Your question: "${prompt.trim()}".`;
}

function findSubjectByHint(syllabus, prompt, semester) {
  if (!syllabus) return null;
  const lower = String(prompt || '').toLowerCase();
  const list = semester && syllabus[semester] ? syllabus[semester] : Object.values(syllabus).flat();
  return list.find((sub) => lower.includes(sub.code.toLowerCase()) || lower.includes(sub.title.toLowerCase())) || null;
}

function extractTopicFromPrompt(lower) {
  const prefixes = ['what is', 'define', 'explain', 'meaning of'];
  let cleaned = lower;
  prefixes.forEach((prefix) => {
    if (cleaned.includes(prefix)) cleaned = cleaned.split(prefix).pop();
  });
  return cleaned.replace(/[?.!,]/g, '').trim();
}

function findTopicInSubject(subject, hint) {
  if (!subject || !hint) return null;
  const haystack = subject.units.flatMap((u) => u.topics).join(' ').toLowerCase();
  const words = hint.split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    if (haystack.includes(word)) {
      return subject.units.flatMap((u) => u.topics).find((t) => t.toLowerCase().includes(word));
    }
  }
  return null;
}

function formatSyllabus(syllabus) {
  if (!syllabus || typeof syllabus !== 'object') return 'No syllabus data was provided.';

  return Object.entries(syllabus).map(([semester, subjects]) => {
    const courses = (subjects || []).map((course) => {
      const units = (course.units || []).map((unit) => `${unit.name}: ${unit.topics.join('; ')}`).join(' | ');
      return `${course.code} - ${course.title} [${units}]`;
    }).join('\n');
    return `Semester ${semester}:\n${courses}`;
  }).join('\n\n');
}

function formatKnowledgeBase(knowledgeBase, syllabus) {
  if (!knowledgeBase || typeof knowledgeBase !== 'object') return 'No teacher updates have been published yet.';

  const entries = Object.values(knowledgeBase).filter(Boolean).map((entry) => {
    const notes = Object.entries(entry.topicNotes || {})
      .filter(([, note]) => note && note.trim())
      .map(([topic, note]) => `${topic}: ${note}`)
      .join(' | ');
    return `${entry.code || 'Subject'} - ${entry.title || ''}; Covered topics: ${(entry.coveredTopics || []).join(', ')}; Teacher notes: ${notes || 'None'}`;
  });
  return entries.length ? entries.join('\n') : 'No teacher updates have been published yet.';
}

function formatConversation(conversation) {
  if (!Array.isArray(conversation) || conversation.length === 0) return 'This is the first message.';
  return conversation.slice(-10).map((message) => `${message.role === 'user' ? 'Student' : 'Nova'}: ${cleanAnswer(message.text || '')}`).join('\n');
}

function cleanAnswer(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''))
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/\/\*|\*\//g, '')
    .replace(/[|*_~`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}