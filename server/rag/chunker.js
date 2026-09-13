/**
 * Smart text chunking strategies for different content types.
 * Produces overlapping chunks for better retrieval.
 */

/**
 * Split text into overlapping chunks.
 * @param {string} text - The text to chunk
 * @param {number} chunkSize - Target characters per chunk (default 500)
 * @param {number} overlap - Overlap between chunks (default 100)
 * @returns {Array<{text: string, index: number}>}
 */
export function chunkBySize(text, chunkSize = 500, overlap = 100) {
  if (!text || text.trim().length === 0) return [];

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunkText = text.slice(start, end).trim();

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastNewline = chunkText.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > chunkSize * 0.5) {
        chunkText = chunkText.slice(0, breakPoint + 1).trim();
      }
    }

    if (chunkText.length > 20) {
      chunks.push({ text: chunkText, index: index++ });
    }

    start += chunkText.length - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Split text into semantic chunks (by headers/sections).
 * Best for structured documents like syllabi.
 * @param {string} text
 * @returns {Array<{text: string, index: number, heading?: string}>}
 */
export function chunkBySections(text) {
  if (!text || text.trim().length === 0) return [];

  // Split on common section headers (ALL CAPS, Title Case lines, etc.)
  const sectionPattern = /^(={3,}|-{3,}|\*{3,}|[A-Z][A-Z\s]{5,}$|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+:)/gm;
  const sections = text.split(sectionPattern).filter((s) => s.trim().length > 0);

  if (sections.length <= 1) {
    // Fall back to size-based chunking
    return chunkBySize(text);
  }

  return sections
    .filter((s) => s.trim().length > 20)
    .map((text, index) => ({ text: text.trim(), index }));
}

/**
 * Chunk a PDF page by natural paragraph breaks.
 */
export function chunkByParagraphs(text, maxChunkSize = 800) {
  if (!text || text.trim().length === 0) return [];

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 10);
  const chunks = [];
  let current = '';
  let index = 0;

  for (const para of paragraphs) {
    if (current.length + para.length > maxChunkSize && current.length > 0) {
      chunks.push({ text: current.trim(), index: index++ });
      current = para + '\n\n';
    } else {
      current += para + '\n\n';
    }
  }

  if (current.trim().length > 0) {
    chunks.push({ text: current.trim(), index: index++ });
  }

  return chunks;
}

/**
 * Main chunking dispatcher — picks the best strategy based on content type.
 */
export function chunkDocument(text, contentType = 'general') {
  switch (contentType) {
    case 'pdf':
      return chunkByParagraphs(text);
    case 'syllabus':
    case 'structured':
      return chunkBySections(text);
    case 'notes':
    case 'conversation':
      return chunkBySize(text, 400, 80);
    default:
      return chunkByParagraphs(text);
  }
}
