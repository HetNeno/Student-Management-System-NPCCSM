<?php

namespace Tests\Feature;

use App\Services\Rag\TextChunker;
use PHPUnit\Framework\TestCase;

class TextChunkerTest extends TestCase
{
    public function test_size_chunks_are_bounded_and_cover_the_text(): void
    {
        $text = implode("\n", array_map(fn ($i) => "- Topic number {$i} about operating systems and paging.", range(1, 60)));
        $chunks = (new TextChunker())->bySize($text, 400, 80);

        // ~3.3k chars at a ~320-char stride: a handful of chunks, not hundreds.
        $this->assertGreaterThanOrEqual(8, count($chunks));
        $this->assertLessThanOrEqual(14, count($chunks));
        foreach ($chunks as $c) {
            $this->assertLessThanOrEqual(400, mb_strlen($c));
        }
        $this->assertStringContainsString('Topic number 1 ', $chunks[0]);
        $this->assertStringContainsString('Topic number 60', end($chunks));
    }

    public function test_multibyte_text_is_never_split_inside_a_character(): void
    {
        $text = str_repeat('કર ભલા, હોગા ભલા. ', 80);
        foreach ((new TextChunker())->bySize($text, 120, 20) as $c) {
            $this->assertTrue(mb_check_encoding($c, 'UTF-8'));
        }
    }

    public function test_short_text_yields_single_chunk_and_empty_yields_none(): void
    {
        $chunker = new TextChunker();
        $this->assertCount(1, $chunker->chunk('A short note about the JVM architecture.', 'notes'));
        $this->assertSame([], $chunker->chunk('   ', 'notes'));
    }
}
