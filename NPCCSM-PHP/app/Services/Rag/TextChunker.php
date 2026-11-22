<?php

namespace App\Services\Rag;

/**
 * PHP port of server/rag/chunker.js. Same strategies and limits:
 *  - pdf / general  : paragraph chunks up to 800 chars
 *  - syllabus       : section chunks, falling back to 500/100 size chunks
 *  - notes          : size chunks 400 with 80 overlap
 * Multibyte-safe (mb_*), unlike the previous byte-based substr() splitter.
 */
class TextChunker
{
    private const MIN_CHUNK = 20;

    /** @return list<string> */
    public function chunk(string $text, string $contentType = 'general'): array
    {
        $text = trim(str_replace(["\r\n", "\r"], "\n", $text));
        if ($text === '') {
            return [];
        }

        return match ($contentType) {
            'syllabus', 'structured' => $this->bySections($text),
            'notes', 'conversation' => $this->bySize($text, 400, 80),
            default => $this->byParagraphs($text),
        };
    }

    /** @return list<string> */
    public function bySize(string $text, int $size = 500, int $overlap = 100): array
    {
        $chunks = [];
        $length = mb_strlen($text);
        $start = 0;

        while ($start < $length) {
            $end = min($start + $size, $length);
            $piece = trim(mb_substr($text, $start, $end - $start));

            if ($end < $length) {
                $break = max((int) mb_strrpos($piece, '.'), (int) mb_strrpos($piece, "\n"));
                if ($break > $size * 0.5) {
                    $piece = trim(mb_substr($piece, 0, $break + 1));
                }
            }

            if (mb_strlen($piece) > self::MIN_CHUNK) {
                $chunks[] = $piece;
            }

            // The window reached the end of the text: done. (Without this the
            // tail was re-chunked one character at a time.)
            if ($end >= $length) {
                break;
            }

            // Always make real progress, even if a sentence break made the piece short.
            $start += max(mb_strlen($piece) - $overlap, (int) ($size / 2));
        }

        return $chunks;
    }

    /** @return list<string> */
    public function bySections(string $text): array
    {
        $sections = preg_split('/^(?:={3,}|-{3,}|\*{3,}|[A-Z][A-Z\s]{5,}$|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+:)/m', $text) ?: [];
        $sections = array_values(array_filter(array_map('trim', $sections), fn ($s) => mb_strlen($s) > self::MIN_CHUNK));

        return count($sections) <= 1 ? $this->bySize($text) : $sections;
    }

    /** @return list<string> */
    public function byParagraphs(string $text, int $max = 800): array
    {
        $paragraphs = array_filter(preg_split('/\n\s*\n/', $text) ?: [], fn ($p) => mb_strlen(trim($p)) > 10);

        // A PDF often has no blank lines at all; fall back to size chunks.
        if (count($paragraphs) <= 1 && mb_strlen($text) > $max) {
            return $this->bySize(preg_replace('/\s+/u', ' ', $text) ?? $text, $max, 100);
        }

        $chunks = [];
        $current = '';
        foreach ($paragraphs as $para) {
            if (mb_strlen($current) + mb_strlen($para) > $max && $current !== '') {
                $chunks[] = trim($current);
                $current = '';
            }
            $current .= $para."\n\n";
        }
        if (trim($current) !== '') {
            $chunks[] = trim($current);
        }

        return array_values(array_filter($chunks, fn ($c) => mb_strlen($c) > self::MIN_CHUNK));
    }
}
