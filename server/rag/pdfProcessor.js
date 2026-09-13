import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

/**
 * Extract text content from a PDF buffer.
 * @param {Buffer} pdfBuffer - The PDF file as a Buffer
 * @param {string} fileName - Original filename (for metadata)
 * @returns {Promise<Array<{text: string, page: number, fileName: string}>>}
 */
export async function extractPdfText(pdfBuffer, fileName) {
  try {
    const data = await pdf(pdfBuffer, {
      max: 0, // extract all pages
      version: 'v2.0.727',
    });

    const pages = data.text.split(/\f/).filter((page) => page.trim().length > 0);

    if (pages.length === 0) {
      return [{ text: data.text, page: 1, fileName }];
    }

    return pages.map((pageText, index) => ({
      text: pageText.trim(),
      page: index + 1,
      fileName,
    }));
  } catch (error) {
    console.error(`[pdfProcessor] Failed to parse ${fileName}:`, error.message);
    throw new Error(`Failed to parse PDF: ${fileName}`);
  }
}

/**
 * Validate that a buffer looks like a PDF.
 */
export function isPdf(buffer) {
  return buffer.toString('ascii', 0, 4) === '%PDF';
}

/**
 * Clean extracted PDF text — remove extra whitespace, headers/footers artifacts.
 */
export function cleanPdfText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n\s*\n/g, '\n\n');
}
