const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const INDUSTRY_KNOWLEDGE = `
INDUSTRY KNOWLEDGE BASE:
========================
IN-DEMAND SKILLS FOR BCA GRADUATES:
- Frontend: React.js, Next.js, TypeScript, Tailwind CSS, HTML/CSS
- Backend: Node.js, Express, Python/Django, Java/Spring, REST APIs
- Database: PostgreSQL, MongoDB, Redis, Prisma ORM
- DevOps: Git/GitHub, Docker, CI/CD, AWS/Vercel basics, Linux
- Data: Python, Pandas, NumPy, SQL, PowerBI/Tableau basics
- Mobile: React Native, Flutter basics
- CS Fundamentals: DSA, OOP, DBMS, OS, Networks (still tested in interviews)

CAREER PATHS:
1. Full Stack Developer: Learn React + Node.js + PostgreSQL. 6-8 months.
2. Frontend Developer: Master React + TypeScript + CSS. 4-6 months.
3. Backend Developer: Node.js/Express or Python/Django + DB design. 5-7 months.
4. Data Analyst: Python + SQL + Excel/Tableau. 3-5 months.
5. DevOps Engineer: Linux + Docker + AWS + CI/CD. 6-9 months.
6. Mobile Developer: React Native or Flutter. 4-6 months.
7. QA/Testing: Manual + Automation (Selenium, Cypress). 3-4 months.
8. Cybersecurity: Networks + Linux + Security tools. 6+ months.

PROJECT IDEAS (Real-world, resume-ready):
1. E-commerce API: REST API with auth, products, orders (Node.js + Express + MongoDB)
2. Blog Platform: Next.js + Markdown + PostgreSQL (learn SSR, routing)
3. Task Manager: React + TypeScript + Drag-drop (learn state management)
4. Chat Application: WebSockets + React (learn real-time)
5. Expense Tracker: React Native + SQLite (learn mobile dev)
6. Weather Dashboard: API integration + Chart.js (learn async + viz)
7. URL Shortener: Express + Redis + PostgreSQL (learn caching)
8. Portfolio Website: Next.js + Tailwind (learn deployment)
9. Quiz App: React + Firebase (learn BaaS)
10. Data Pipeline: Python + Pandas + SQL (learn ETL basics)

REAL-WORLD TOOLS USED IN 2024-2025:
- Code editors: VS Code (industry standard)
- Version control: Git + GitHub/GitLab
- Communication: Slack, Discord
- Design: Figma (for understanding UI)
- APIs: Postman, Insomnia
- Deployment: Vercel, Netlify, Render, Railway

HIRING REALITY:
- Companies value BUILD experience over theory
- GitHub portfolio with 3+ real projects is minimum
- System design basics expected for mid-level roles
- Communication and problem-solving matter as much as coding
`;

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

function formatSyllabus(syllabus) {
  if (!syllabus || typeof syllabus !== 'object') return '';
  return Object.entries(syllabus).map(([semester, subjects]) => {
    const courses = (subjects || []).map((course) => {
      const units = (course.units || []).map((u) => u.topics.join('; ')).join(' | ');
      return `${course.code} - ${course.title}: ${units}`;
    }).join('\n');
    return `Semester ${semester}:\n${courses}`;
  }).join('\n\n');
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Only POST requests are supported.' });
  }

  const { prompt, semester, subject, unitName, syllabus, knowledgeBase, conversation } = request.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 2) {
    return response.status(400).json({ error: 'Please enter a question.' });
  }

  const syllabusText = formatSyllabus(syllabus);
  const subjectInfo = subject ? `${subject.code} - ${subject.title}` : 'No subject selected';

  const instructions = `You are the NPCCSM Career & Learning Advisor — a trusted, industry-savvy mentor for BCA students.

You have TWO knowledge bases:
1. SYLLABUS — the official NPCCSM BCA curriculum
2. INDUSTRY — real-world software industry expectations, tools, and career paths

${INDUSTRY_KNOWLEDGE}

RULES:
- Every answer must be accurate, actionable, and professional. Never give vague advice.
- When asked about a syllabus subject:
  - If RELEVANT to modern industry (DBMS, Python, Web Tech, SE, OS, Networks, DSA): explain how it maps to real jobs, what tools they'll use, and why it matters. Tag [From Syllabus] [Combined].
  - If NOT RELEVANT or obsolete (legacy COBOL, outdated hardware basics etc.): say so directly. "This topic is mostly academic and not widely used in modern industry. Focus on [relevant modern alternative] instead." Tag [From Industry].
- Career path questions: Give a concrete 6-month and 1-year roadmap with exact tools and project milestones.
- Project suggestions: Give 3-5 real-world project ideas. Include tech stack and what skill each proves.
- Skills gap: Compare their syllabus with what top companies hire for. Be direct and honest.
- NEVER be vague. Never say "it depends" without giving a recommendation.
- Cite sources: [From Syllabus], [From Industry], or [Combined].

OUTPUT FORMAT:
- Plain text only. No Markdown, asterisks, code fences, table pipes, emojis.
- Short headings on their own lines.
- Numbered lists for steps or questions.
- Never begin with filler like "Here is" or "Sure". Start directly.

Current context:
- Semester: ${semester || 'unknown'}
- Subject: ${subjectInfo}
- Unit: ${unitName || 'unknown'}

SYLLABUS REFERENCE:
${syllabusText || 'No syllabus loaded.'}

Recent conversation:
${(conversation || []).slice(-6).map((m) => `${m.role === 'user' ? 'Student' : 'Nova'}: ${cleanAnswer(m.text || '')}`).join('\n') || 'First message.'}

Student question:
${prompt.trim()}`;

  try {
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are Nova, a precise career advisor who never gives vague answers.' }] },
        contents: [{ role: 'user', parts: [{ text: instructions }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1800, topP: 0.85 },
      }),
    });

    const data = await geminiResponse.json();
    if (!geminiResponse.ok) {
      console.error('[careerChat] Gemini error:', data);
      return response.status(200).json({ answer: offlineCareerAnswer(prompt, subject, semester, syllabus), source: 'offline' });
    }

    const answer = cleanAnswer(data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim());
    if (!answer) {
      return response.status(200).json({ answer: offlineCareerAnswer(prompt, subject, semester, syllabus), source: 'offline' });
    }
    return response.status(200).json({ answer, source: 'gemini' });
  } catch (error) {
    console.error('[careerChat] Request failed:', error);
    return response.status(200).json({ answer: offlineCareerAnswer(prompt, subject, semester, syllabus), source: 'offline' });
  }
}

function offlineCareerAnswer(prompt, subject, semester, syllabus) {
  const lower = String(prompt || '').toLowerCase();

  if (lower.includes('career') || lower.includes('path') || lower.includes('become')) {
    return `Career Path Recommendation for BCA Graduate
Semester: ${semester || 'current'}

Recommended Path: Full Stack Developer

6-month roadmap:
1. Master HTML, CSS, JavaScript (ES6+) — 4 weeks
2. Learn React.js with hooks and routing — 6 weeks
3. Build Node.js + Express backend with REST APIs — 6 weeks
4. Learn PostgreSQL and database design — 3 weeks
5. Master Git, GitHub, and deployment (Vercel/Render) — 3 weeks
6. Build 3 real projects and push to GitHub — 4 weeks
7. Practice DSA (Arrays, Strings, Trees, Graphs) — 6 weeks

1-year goal: Contribute to open source, build a portfolio of 5+ projects, and be job-ready.

Tools to install now: VS Code, Git, Node.js, PostgreSQL.

[From Industry]`;

  }

  if (lower.includes('project') || lower.includes('build')) {
    const subjectCode = subject?.code || '';
    const lines = [
      `Recommended Projects for Your Learning`,
      `Based on your BCA syllabus and current Semester ${semester || '-'}`,
      '',
      '1. REST API with Authentication',
      '   Tech: Node.js, Express, MongoDB, JWT',
      '   Skill: Backend API design, security',
      '',
      '2. Task Management Dashboard',
      '   Tech: React, TypeScript, CSS Grid',
      '   Skill: Frontend state management, UI/UX',
      '',
      '3. Data Visualization Dashboard',
      '   Tech: Python, Pandas, Chart.js, PostgreSQL',
      '   Skill: Data analysis, reporting',
      '',
      '4. Real-time Chat Application',
      '   Tech: React, Socket.io, Express',
      '   Skill: WebSockets, real-time systems',
      '',
      '5. E-commerce Mini Store',
      '   Tech: Next.js, Stripe, PostgreSQL',
      '   Skill: Full stack, payments integration',
      '',
      'Build these in order. Each project should take 2-4 weeks. Push all to GitHub with a README.',
      '[From Industry] [From Syllabus]',
    ];
    return lines.join('\n');
  }

  if (lower.includes('important') || lower.includes('useful') || lower.includes('worth')) {
    const sub = subject;
    if (sub) {
      return `Subject Analysis: ${sub.code} - ${sub.title}

INDUSTRY RELEVANCE: HIGH

Why this matters:
- ${sub.title} concepts are directly used in modern software development.
- Topics from your syllabus align with skills tested in technical interviews.
- Practical application: You will use these concepts in almost every development job.

What to focus on:
1. Understand the core concepts deeply (not just for exams).
2. Build a small project that uses these concepts.
3. Practice writing clean code with these principles.

[From Syllabus] [From Industry]`;
    }
    return `Please select a subject from your dashboard so I can analyze its industry relevance.`;
  }

  const lines = [
    `Here is my advice:`,
    ``,
    `1. Focus on practical skills: React, Node.js, PostgreSQL, Git.`,
    `2. Build 3+ real projects and put them on GitHub.`,
    `3. Practice DSA every day (1-2 hours minimum).`,
    `4. Learn TypeScript — it is becoming the industry standard.`,
    `5. Deploy at least one project to Vercel or Render.`,
    ``,
    `Your BCA syllabus gives you the foundation. The projects and extra skills make you employable.`,
    `[From Industry]`,
  ];
  return lines.join('\n');
}
