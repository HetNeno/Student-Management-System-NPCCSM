import { pool, findSimilarChunks } from './vectorStore.js';
import { chunkDocument } from './chunker.js';
import { extractPdfText, cleanPdfText, isPdf } from './pdfProcessor.js';

/**
 * Main RAG service — orchestrates ingestion and retrieval.
 */

// ── Ingestion ──────────────────────────────────────────────────────────────

/**
 * Ingest a PDF file into the vector store.
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 */
export async function ingestPdf(fileBuffer, fileName) {
  if (!isPdf(fileBuffer)) {
    throw new Error('File is not a valid PDF');
  }

  const pages = await extractPdfText(fileBuffer, fileName);
  const chunks = [];

  for (const page of pages) {
    const cleaned = cleanPdfText(page.text);
    const pageChunks = chunkDocument(cleaned, 'pdf');
    for (const chunk of pageChunks) {
      chunks.push({
        text: chunk.text,
        metadata: {
          page: page.page,
          fileName: page.fileName,
          contentType: 'pdf',
        },
      });
    }
  }

  return await storeChunks(chunks, 'pdf', fileName);
}

/**
 * Ingest text data (e.g., from database) into the vector store.
 * @param {string[]} texts - Array of text passages
 * @param {string} sourceName - Identifier for this data source
 * @param {string} sourceType - 'syllabus' | 'database' | 'notes'
 * @param {object} baseMetadata - Additional metadata to attach to all chunks
 */
export async function ingestText(texts, sourceName, sourceType = 'database', baseMetadata = {}) {
  const chunks = texts.map((text) => ({
    text: text.trim(),
    metadata: { ...baseMetadata, contentType: sourceType },
  })).filter((c) => c.text.length > 20);

  return await storeChunks(chunks, sourceType, sourceName);
}

/**
 * Ingest all BCA syllabus data from the database.
 */
export async function ingestSyllabusFromDb() {
  const { rows } = await pool.query(`
    SELECT c.subject_code, c.title, c.semester, c.units,
           sp.covered_topics, sp.topic_notes, sp.overall_notes, sp.faculty_name
    FROM courses c
    LEFT JOIN syllabus_progress sp ON c.subject_code = sp.subject_code
    ORDER BY c.semester, c.subject_code
  `);

  const texts = [];
  for (const row of rows) {
    const units = typeof row.units === 'string' ? JSON.parse(row.units) : row.units;
    const unitTexts = (units || []).map((u) => {
      const topics = Array.isArray(u.topics) ? u.topics.join(', ') : '';
      return `Unit: ${u.name || ''}. Topics: ${topics}`;
    }).join('\n');

    const covered = Array.isArray(row.covered_topics)
      ? row.covered_topics.join(', ')
      : '';
    const notes = typeof row.topic_notes === 'object' ? JSON.stringify(row.topic_notes) : '';

    texts.push(
      `Subject: ${row.title} (${row.subject_code}) — Semester ${row.semester}\n` +
      `${unitTexts}\n` +
      `Covered Topics: ${covered || 'Not yet covered'}\n` +
      `Faculty Notes: ${notes || 'No notes'}\n` +
      `Overall: ${row.overall_notes || 'No overall notes'}\n` +
      `Faculty: ${row.faculty_name || 'Not assigned'}`
    );
  }

  return await ingestText(texts, 'BCA_Syllabus', 'syllabus', {
    totalCourses: rows.length,
  });
}

/**
 * Ingest teacher notes from the database.
 */
export async function ingestTeacherNotes() {
  const { rows } = await pool.query(`
    SELECT subject_code, faculty_name, lecture_date,
           covered_topic, mandatory_note
    FROM faculty_lecture_updates
    ORDER BY lecture_date DESC
  `);

  const texts = rows.map((row) => {
    const covered = Array.isArray(row.covered_topic)
      ? row.covered_topic.join(', ')
      : '';
    const mandatory = typeof row.mandatory_note === 'object'
      ? JSON.stringify(row.mandatory_note)
      : row.mandatory_note || '';

    return (
      `Lecture Notes — ${row.subject_code}\n` +
      `Faculty: ${row.faculty_name} | Date: ${row.lecture_date}\n` +
      `Topics Covered: ${covered || 'None specified'}\n` +
      `Mandatory Notes: ${mandatory || 'None'}`
    );
  });

  if (texts.length === 0) return { chunksCreated: 0, documentId: null };

  return await ingestText(texts, 'Teacher_Lecture_Notes', 'notes', {
    totalLectures: rows.length,
  });
}

// ── Retrieval ──────────────────────────────────────────────────────────────

/**
 * Store an array of chunk objects in the database (no embeddings needed).
 * @private
 */
async function storeChunks(chunks, sourceType, sourceName) {
  if (chunks.length === 0) {
    return { chunksCreated: 0, documentId: null };
  }

  const insertedIds = [];
  for (let i = 0; i < chunks.length; i++) {
    const id = await pool.query(
      `INSERT INTO rag_documents (source_type, source_name, chunk_text, metadata)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        sourceType,
        sourceName,
        chunks[i].text,
        JSON.stringify(chunks[i].metadata || {}),
      ]
    );
    insertedIds.push(id.rows[0].id);
  }

  await pool.query(
    `INSERT INTO rag_ingestion_jobs (source_type, source_name, chunks_created, status, completed_at)
     VALUES ($1, $2, $3, 'completed', NOW())`,
    [sourceType, sourceName, chunks.length]
  );

  return { chunksCreated: chunks.length, documentId: insertedIds[0], chunkIds: insertedIds };
}

/**
 * Retrieve relevant chunks for a user query using native text search.
 * This is the main function the chat will call.
 */
export async function retrieveContext(userQuery, options = {}) {
  const topK = options.topK || 5;
  const sourceType = options.sourceTypes?.[0] || null;

  // Step 1: Find relevant chunks using PostgreSQL full-text search
  const rows = await findSimilarChunks(userQuery, {
    topK,
    sourceType,
  });

  // Step 2: Log the query for analytics
  if (options.logQuery !== false) {
    try {
      await pool.query(
        'INSERT INTO rag_query_logs (query_text, retrieved_chunks, latency_ms) VALUES ($1, $2, $3)',
        [
          userQuery,
          rows.map((r) => r.id),
          options._startTime ? Date.now() - options._startTime : 0,
        ]
      );
    } catch {
      // Non-critical query log failure
    }
  }

  return {
    chunks: rows.map((r) => ({
      text: r.chunk_text,
      source: r.source_name,
      sourceType: r.source_type,
      metadata: r.metadata,
      similarity: Number(r.similarity) || 0.8,
    })),
    totalRetrieved: rows.length,
  };
}

export { pool };
