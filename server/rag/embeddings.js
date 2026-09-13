import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set — embeddings will fail');
}

/**
 * Generate embeddings using Gemini's text-embedding-004 model.
 * Returns a 768-dimensional vector.
 */
export async function generateEmbedding(text) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured in server/.env');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: {
          parts: [{ text: text.slice(0, 8000) }], // truncate to stay within limits
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini embedding error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.embedding.values; // array of floats (768 dimensions)
}

/**
 * Batch generate embeddings for multiple texts.
 * Uses a small delay between calls to respect rate limits.
 */
export async function generateEmbeddingsBatch(texts, batchSize = 10, delayMs = 200) {
  const results = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await Promise.all(batch.map((text) => generateEmbedding(text)));
    results.push(...embeddings);

    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
