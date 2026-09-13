import { Router } from 'express';
import { listIngestionJobs, getStats, clearAllDocuments } from '../rag/vectorStore.js';
import { ingestPdf, ingestText, ingestSyllabusFromDb, ingestTeacherNotes, retrieveContext } from '../rag/index.js';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

// ── Health ──────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rag' });
});

// ── Upload & Ingest PDF ─────────────────────────────────────────────────────
router.post('/ingest/pdf', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send as multipart/form-data with field name "file".' });
    }

    const result = await ingestPdf(req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      message: `Ingested ${result.chunksCreated} chunks from ${req.file.originalname}`,
      ...result,
    });
  } catch (error) {
    console.error('[RAG /ingest/pdf]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Ingest raw text ─────────────────────────────────────────────────────────
router.post('/ingest/text', async (req, res) => {
  try {
    const { texts, sourceName, sourceType = 'database', metadata = {} } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts must be a non-empty array' });
    }

    const result = await ingestText(texts, sourceName, sourceType, metadata);
    res.json({
      success: true,
      message: `Ingested ${result.chunksCreated} chunks from ${sourceName}`,
      ...result,
    });
  } catch (error) {
    console.error('[RAG /ingest/text]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Ingest syllabus from database ───────────────────────────────────────────
router.post('/ingest/syllabus', async (req, res) => {
  try {
    const result = await ingestSyllabusFromDb();
    res.json({
      success: true,
      message: `Ingested syllabus: ${result.chunksCreated} chunks created`,
      ...result,
    });
  } catch (error) {
    console.error('[RAG /ingest/syllabus]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Ingest teacher notes from database ──────────────────────────────────────
router.post('/ingest/notes', async (req, res) => {
  try {
    const result = await ingestTeacherNotes();
    res.json({
      success: true,
      message: `Ingested teacher notes: ${result.chunksCreated} chunks created`,
      ...result,
    });
  } catch (error) {
    console.error('[RAG /ingest/notes]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Ingest everything at once ───────────────────────────────────────────────
router.post('/ingest/all', async (req, res) => {
  try {
    const results = {};

    try {
      results.syllabus = await ingestSyllabusFromDb();
    } catch (e) {
      results.syllabus = { error: e.message };
    }

    try {
      results.notes = await ingestTeacherNotes();
    } catch (e) {
      results.notes = { error: e.message };
    }

    res.json({
      success: true,
      message: 'Batch ingestion complete',
      results,
    });
  } catch (error) {
    console.error('[RAG /ingest/all]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Query / Retrieve (RAG lookup) ───────────────────────────────────────────
router.post('/query', async (req, res) => {
  try {
    const { query, topK = 5, threshold = 0.7, sourceTypes } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required (string)' });
    }

    const startTime = Date.now();
    const result = await retrieveContext(query, {
      topK,
      threshold,
      sourceTypes,
      _startTime: startTime,
    });

    res.json({
      success: true,
      query,
      ...result,
    });
  } catch (error) {
    console.error('[RAG /query]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Stats ───────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error('[RAG /stats]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Ingestion jobs ──────────────────────────────────────────────────────────
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await listIngestionJobs();
    res.json(jobs);
  } catch (error) {
    console.error('[RAG /jobs]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── Reset / Clear ───────────────────────────────────────────────────────────
router.delete('/reset', async (req, res) => {
  try {
    await clearAllDocuments();
    res.json({ success: true, message: 'All RAG data cleared' });
  } catch (error) {
    console.error('[RAG /reset]', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
