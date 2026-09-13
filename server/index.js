// ============================================================================
// NPCCSM — Express API Server (connects React frontend to PostgreSQL)
// ============================================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ragRouter from './routes/rag.js';

const { Pool } = pg;

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Copy server/.env.example to server/.env and update it.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Verify connection on start
pool.query('SELECT NOW()')
  .then(() => console.log('✅  Connected to PostgreSQL'))
  .catch((err) => {
    console.error('❌  PostgreSQL connection failed:', err.message);
    process.exit(1);
  });

// ── Express App ─────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── File uploads ─────────────────────────────────────────────────────────────
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported'), false);
    }
  },
});

// ── RAG routes ──────────────────────────────────────────────────────────────
app.use('/api/rag', upload.single('file'), ragRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// ============================================================================
// AUTH — Login
// ============================================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const { rows } = await pool.query(
      'SELECT id, username, password, role, name, department FROM users WHERE LOWER(username) = LOWER($1) AND password = $2',
      [username.trim(), password.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = rows[0];

    if (role && user.role !== role.trim().toLowerCase()) {
      return res.status(403).json({
        error: `Permission Denied: Account '${username}' is registered as '${user.role}', not '${role}'.`,
      });
    }

    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      department: user.department,
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});


// ============================================================================
// FACULTY LECTURE UPDATES — Read all / Read history / Create
// ============================================================================
app.get('/api/faculty-lecture-updates', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM faculty_lecture_updates ORDER BY created_at DESC');
    return res.json(rows);
  } catch (err) {
    console.error('[GET /faculty-lecture-updates]', err.message);
    return res.status(500).json({ error: 'Failed to fetch lecture updates.' });
  }
});

app.get('/api/faculty-lecture-updates/history', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM faculty_lecture_updates ORDER BY created_at DESC LIMIT 50'
    );
    return res.json(rows);
  } catch (err) {
    console.error('[GET /faculty-lecture-updates/history]', err.message);
    return res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

app.post('/api/faculty-lecture-updates', async (req, res) => {
  try {
    const { subject_code, title, semester, faculty_name, lecture_date, covered_topic, mandatory_note } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO faculty_lecture_updates
         (subject_code, title, semester, faculty_name, lecture_date, covered_topic, mandatory_note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        subject_code,
        title,
        semester,
        faculty_name,
        lecture_date,
        JSON.stringify(covered_topic || []),
        JSON.stringify(mandatory_note || {}),
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /faculty-lecture-updates]', err.message);
    return res.status(500).json({ error: 'Failed to insert lecture update.' });
  }
});


// ============================================================================
// SYLLABUS PROGRESS — Upsert
// ============================================================================
app.post('/api/syllabus-progress', async (req, res) => {
  try {
    const { subject_code, title, semester, covered_topics, topic_notes, overall_notes, faculty_name, last_updated } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO syllabus_progress
         (subject_code, title, semester, covered_topics, topic_notes, overall_notes, faculty_name, last_updated, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (subject_code) DO UPDATE SET
         title          = EXCLUDED.title,
         semester       = EXCLUDED.semester,
         covered_topics = EXCLUDED.covered_topics,
         topic_notes    = EXCLUDED.topic_notes,
         overall_notes  = EXCLUDED.overall_notes,
         faculty_name   = EXCLUDED.faculty_name,
         last_updated   = EXCLUDED.last_updated,
         updated_at     = NOW()
       RETURNING *`,
      [
        subject_code,
        title,
        semester,
        JSON.stringify(covered_topics || []),
        JSON.stringify(topic_notes || {}),
        overall_notes || null,
        faculty_name || null,
        last_updated || null,
      ]
    );

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('[POST /syllabus-progress]', err.message);
    return res.status(500).json({ error: 'Failed to upsert syllabus progress.' });
  }
});


// ============================================================================
// SYLLABUS HISTORY — Insert
// ============================================================================
app.post('/api/syllabus-history', async (req, res) => {
  try {
    const { subject_code, title, semester, faculty_name, lecture_date, covered_topics, topic_notes } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO syllabus_history
         (subject_code, title, semester, faculty_name, lecture_date, covered_topics, topic_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        subject_code,
        title,
        semester,
        faculty_name || null,
        lecture_date || null,
        JSON.stringify(covered_topics || []),
        JSON.stringify(topic_notes || {}),
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /syllabus-history]', err.message);
    return res.status(500).json({ error: 'Failed to insert history.' });
  }
});


// ============================================================================
// TEACHER SUBMISSIONS — Insert
// ============================================================================
app.post('/api/teacher-submissions', async (req, res) => {
  try {
    const { subject_code, lecture_date, covered_topic, mandatory_note } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO teacher_submissions
         (subject_code, lecture_date, covered_topic, mandatory_note, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [
        subject_code,
        lecture_date || null,
        JSON.stringify(covered_topic || []),
        JSON.stringify(mandatory_note || {}),
      ]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[POST /teacher-submissions]', err.message);
    return res.status(500).json({ error: 'Failed to insert submission.' });
  }
});


// ============================================================================
// Start server
// ============================================================================
app.listen(PORT, () => {
  console.log(`🚀  NPCCSM API server running at http://localhost:${PORT}`);
});
