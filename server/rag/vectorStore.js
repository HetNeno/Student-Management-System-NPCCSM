import dotenv from 'dotenv';
dotenv.config();

const pool = new (await import('pg')).Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_TOP_K = 5;

/**
 * Insert a document chunk into PostgreSQL (non-embedding / text search mode).
 */
export async function upsertChunk({ sourceType, sourceName, sourceId, chunkText, metadata = {} }) {
  const query = `
    INSERT INTO rag_documents (source_type, source_name, source_id, chunk_text, metadata)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const { rows } = await pool.query(query, [
    sourceType,
    sourceName,
    sourceId || null,
    chunkText,
    JSON.stringify(metadata),
  ]);
  return rows[0].id;
}

/**
 * Find relevant chunks using PostgreSQL native Full-Text Search and ILIKE ranking.
 * No vector extension or embedding model required.
 */
export async function findSimilarChunks(searchQuery, options = {}) {
  const topK = options.topK || DEFAULT_TOP_K;
  const sourceTypeFilter = options.sourceType || null;
  const cleanQuery = (searchQuery || '').trim();

  if (!cleanQuery) return [];

  // Query using full-text search ts_rank_cd combined with ILIKE keyword presence
  let query = `
    SELECT id, source_type, source_name, source_id, chunk_text, metadata,
           ROUND(
             GREATEST(
               COALESCE(ts_rank_cd(to_tsvector('english', chunk_text), plainto_tsquery('english', $1)), 0),
               CASE WHEN chunk_text ILIKE ('%' || $1 || '%') THEN 0.85 ELSE 0 END
             )::numeric, 2
           ) AS similarity
    FROM rag_documents
    WHERE (
      to_tsvector('english', chunk_text) @@ plainto_tsquery('english', $1)
      OR chunk_text ILIKE ('%' || $1 || '%')
    )
  `;

  const params = [cleanQuery];

  if (sourceTypeFilter) {
    query += ` AND source_type = $${params.length + 1}`;
    params.push(sourceTypeFilter);
  }

  query += `
    ORDER BY similarity DESC, id DESC
    LIMIT $${params.length + 1}
  `;
  params.push(topK);

  const { rows } = await pool.query(query, params);

  // If strict match gave no results, do a broader word-by-word search fallback
  if (rows.length === 0) {
    const words = cleanQuery.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      const fallbackTsQuery = words.join(' | ');
      let fallbackSql = `
        SELECT id, source_type, source_name, source_id, chunk_text, metadata,
               ROUND(COALESCE(ts_rank(to_tsvector('english', chunk_text), to_tsquery('english', $1)), 0.5)::numeric, 2) AS similarity
        FROM rag_documents
        WHERE to_tsvector('english', chunk_text) @@ to_tsquery('english', $1)
      `;
      const fallbackParams = [fallbackTsQuery];
      if (sourceTypeFilter) {
        fallbackSql += ` AND source_type = $2`;
        fallbackParams.push(sourceTypeFilter);
      }
      fallbackSql += ` ORDER BY similarity DESC LIMIT $${fallbackParams.length + 1}`;
      fallbackParams.push(topK);

      try {
        const fallbackRes = await pool.query(fallbackSql, fallbackParams);
        return fallbackRes.rows;
      } catch {
        // Fall through to empty if tsquery had invalid syntax
      }
    }
  }

  return rows;
}

/**
 * Get document chunks by source name.
 */
export async function getChunksBySource(sourceName) {
  const { rows } = await pool.query(
    'SELECT id, chunk_text, metadata, created_at FROM rag_documents WHERE source_name = $1',
    [sourceName]
  );
  return rows;
}

/**
 * Get ingestion job status.
 */
export async function getIngestionJob(jobId) {
  const { rows } = await pool.query(
    'SELECT * FROM rag_ingestion_jobs WHERE id = $1',
    [jobId]
  );
  return rows[0];
}

/**
 * List all ingestion jobs.
 */
export async function listIngestionJobs() {
  const { rows } = await pool.query(
    'SELECT * FROM rag_ingestion_jobs ORDER BY created_at DESC LIMIT 20'
  );
  return rows;
}

/**
 * Delete all chunks for a source (for re-ingestion).
 */
export async function deleteChunksBySource(sourceName) {
  const { rowCount } = await pool.query(
    'DELETE FROM rag_documents WHERE source_name = $1',
    [sourceName]
  );
  return rowCount;
}

/**
 * Get total chunk count and source breakdown.
 */
export async function getStats() {
  const totalResult = await pool.query('SELECT COUNT(*) as total FROM rag_documents');

  const sourcesResult = await pool.query(`
    SELECT source_type, COUNT(*) as chunk_count, COUNT(DISTINCT source_name) as doc_count
    FROM rag_documents
    GROUP BY source_type
    ORDER BY chunk_count DESC
  `);

  return {
    totalChunks: parseInt(totalResult.rows[0].total, 10),
    sources: sourcesResult.rows,
  };
}

/**
 * Clear all RAG documents (for reset/rebuild).
 */
export async function clearAllDocuments() {
  await pool.query('DELETE FROM rag_documents');
  await pool.query('DELETE FROM rag_ingestion_jobs');
  await pool.query('DELETE FROM rag_query_logs');
}

export { pool };
