-- Non-Embedding Full-Text Search Schema for NPCCSM Knowledge Base & Chatbot
-- Pure PostgreSQL (No pgvector or external embedding extension required)

-- Documents table: stores ingested knowledge base chunks
CREATE TABLE IF NOT EXISTS rag_documents (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,          -- 'pdf', 'database', 'syllabus', 'notes'
  source_name VARCHAR(255) NOT NULL,         -- e.g., 'BCA_Syllabus_2024.pdf'
  source_id VARCHAR(255),                    -- optional reference ID
  chunk_text TEXT NOT NULL,                   -- the actual text content
  metadata JSONB DEFAULT '{}',                -- flexible metadata (page, section, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Full-text search GIN index using PostgreSQL's built-in text search
CREATE INDEX IF NOT EXISTS rag_documents_fts_idx
  ON rag_documents
  USING gin(to_tsvector('english', chunk_text));

-- Index for filtering by source type
CREATE INDEX IF NOT EXISTS rag_documents_source_idx
  ON rag_documents(source_type);

-- Ingestion jobs table: track ingestion status
CREATE TABLE IF NOT EXISTS rag_ingestion_jobs (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  source_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',      -- 'pending', 'processing', 'completed', 'failed'
  chunks_created INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Query logs for analytics and debugging
CREATE TABLE IF NOT EXISTS rag_query_logs (
  id SERIAL PRIMARY KEY,
  query_text TEXT NOT NULL,
  retrieved_chunks INTEGER[],                -- array of document IDs
  response_generated BOOLEAN DEFAULT TRUE,
  latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS rag_documents_updated_at ON rag_documents;
CREATE TRIGGER rag_documents_updated_at
  BEFORE UPDATE ON rag_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_updated_at();
