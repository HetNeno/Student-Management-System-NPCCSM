# RAG Setup Guide — NPCCSM Chatbot

## What was built

A complete RAG (Retrieval-Augmented Generation) pipeline integrated into your existing NPCCSM project:

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│   PDF / DB  │───▶│   Chunker    │───▶│   Embeddings   │
│  Documents  │    │ (Smart split) │    │  (Gemini 768d) │
└─────────────┘    └──────────────┘    └───────┬────────┘
                                                 │
                                                 ▼
┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│   React UI  │◀───│   Express    │◀───│   pgvector     │
│  Chat       │    │  RAG API     │    │  (PostgreSQL)  │
└─────────────┘    └──────────────┘    └────────────────┘
        │                   │
        ▼                   ▼
   User asks         1. Embed query
   question          2. Similarity search
                     3. Retrieve top-k chunks
                     4. Generate answer with Gemini
```

## Step 1: Install pgvector on PostgreSQL

```bash
# Connect to your PostgreSQL database
psql -U postgres -d npccsm_db

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

Or run the schema file:
```bash
psql -U postgres -d npccsm_db -f database/rag_schema.sql
```

## Step 2: Configure environment

**Server** — `server/.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/npccsm_db
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_CHAT_MODEL=gemini-2.5-flash
```

**Frontend** — `.env` (already set):
```env
VITE_API_URL=http://localhost:5000
```

## Step 3: Install server dependencies

```bash
cd npccsm-react/server
npm install
```

## Step 4: Start the server

```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

## Step 5: Ingest your knowledge base

### Option A: Ingest syllabus + teacher notes from database
```bash
curl -X POST http://localhost:5000/api/rag/ingest/all
```

### Option B: Upload a PDF
```bash
curl -X POST http://localhost:5000/api/rag/ingest/pdf \
  -F "file=@path/to/your/knowledge.pdf"
```

### Option C: Ingest custom text
```bash
curl -X POST http://localhost:5000/api/rag/ingest/text \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Your knowledge base text here..."],
    "sourceName": "My Knowledge Base",
    "sourceType": "database"
  }'
```

## Step 6: Test RAG query

```bash
curl -X POST http://localhost:5000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What career paths suit BCA graduates?"}'
```

## Step 7: Start the frontend

```bash
cd npccsm-react
npm run dev
```

Navigate to `/student/career` — the chat now uses RAG with fallback to mock responses.

## API Reference

### POST /api/rag/ingest/pdf
Upload and ingest a PDF. Form-data with field `file`.
Returns: `{ success, message, chunksCreated, documentId }`

### POST /api/rag/ingest/text
Ingest text data.
Body: `{ texts: string[], sourceName: string, sourceType?: string, metadata?: object }`
Returns: `{ success, message, chunksCreated }`

### POST /api/rag/ingest/syllabus
Ingest all BCA syllabus from PostgreSQL.
Returns: `{ success, message, chunksCreated }`

### POST /api/rag/ingest/notes
Ingest teacher notes from PostgreSQL.
Returns: `{ success, message, chunksCreated }`

### POST /api/rag/ingest/all
Ingest syllabus + notes in one call.
Returns: `{ success, message, results }`

### POST /api/rag/query
Query the RAG system.
Body: `{ query: string, topK?: number, threshold?: number, sourceTypes?: string[] }`
Returns: `{ chunks: [{ text, source, similarity, metadata }], totalRetrieved }`

### GET /api/rag/stats
Get vector DB stats.
Returns: `{ totalChunks: number, sources: [{ source_type, chunk_count, doc_count }] }`

### GET /api/rag/jobs
List ingestion jobs.
Returns: Array of job records.

### DELETE /api/rag/reset
Clear all RAG data.
Returns: `{ success, message }`

## Architecture Notes

- **pgvector HNSW index** — fast approximate nearest neighbor search
- **Gemini text-embedding-004** — 768-dimensional embeddings, free
- **Chunking strategy** — PDFs by paragraph, syllabus by sections, notes by size
- **Cosine similarity threshold** — default 0.7 (adjustable per query)
- **Fallback mode** — chat works with mock data when backend is unavailable
- **Frontend-agnostic** — ragService.js in `src/services/` is reusable from any component

## When RAG is Ready vs Not Ready

| State | Behavior |
|-------|----------|
| Backend offline / no API key | Chat uses mock responses with sample data |
| Backend online, no data ingested | Chat returns "no relevant context found" |
| Backend online, data ingested | Chat retrieves relevant chunks and generates answers |

## Next Steps

1. Put your PDF in a known location
2. Run `curl -X POST http://localhost:5000/api/rag/ingest/pdf -F "file=@yourfile.pdf"`
3. Check `GET /api/rag/stats` to confirm chunks were created
4. Test with `POST /api/rag/query`
5. Chat at `/student/career` will now use your knowledge base
