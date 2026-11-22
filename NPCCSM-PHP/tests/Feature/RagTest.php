<?php

namespace Tests\Feature;

use App\Services\Rag\RagService;
use Database\Seeders\CourseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * FULLTEXT indexes are not visible to uncommitted rows in InnoDB, so the
 * retrieval assertions here rely on the LIKE fallback path; the FULLTEXT
 * path is exercised by the end-to-end smoke test against the real database.
 */
class RagTest extends TestCase
{
    use RefreshDatabase;

    public function test_syllabus_ingestion_creates_chunks_and_a_completed_job(): void
    {
        $this->seed(CourseSeeder::class);
        $this->actingAs($this->makeUser('principal'));

        $created = $this->postJson('/api/rag/ingest/syllabus')->assertCreated()->json('chunksCreated');

        $this->assertGreaterThan(20, $created);
        $this->assertSame(0, DB::table('rag_ingestion_jobs')->where('status', '!=', 'completed')->count());

        // Re-running replaces instead of duplicating.
        $this->postJson('/api/rag/ingest/syllabus')->assertCreated();
        $this->assertSame($created, DB::table('rag_documents')->count());
    }

    public function test_query_retrieves_context_and_calls_groq_with_server_side_key(): void
    {
        Http::fake([
            'api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => 'Paging divides memory into frames [1].']]]]),
        ]);
        app(RagService::class)->ingest(['Swapping & Paging: paging divides physical memory into fixed-size frames.'], 'syllabus', 'CAM210-2C Operating System', [], 'notes');
        $this->actingAs($this->makeUser('student'));

        $res = $this->postJson('/api/rag/query', [
            'query' => 'Explain paging',
            'history' => [['role' => 'user', 'text' => 'hi'], ['role' => 'assistant', 'text' => 'Hello!']],
        ]);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('answer', 'Paging divides memory into frames [1].')
            ->assertJsonPath('chunks.0.source', 'CAM210-2C Operating System');

        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://api.groq.com/openai/v1/chat/completions'
                && $request->hasHeader('Authorization', 'Bearer test-key')
                && $request['model'] === 'openai/gpt-oss-120b'
                && $request['messages'][0]['role'] === 'system'
                && str_contains(end($request->data()['messages'])['content'], 'paging divides physical memory');
        });
        $this->assertSame(1, DB::table('rag_query_logs')->count());
        $this->assertStringNotContainsString('test-key', $res->getContent());
    }

    public function test_groq_rate_limit_is_reported_as_429_with_typed_error(): void
    {
        Http::fake(['api.groq.com/*' => Http::response(['error' => ['message' => 'Rate limit']], 429, ['retry-after' => '7'])]);
        $this->actingAs($this->makeUser('student'));

        $this->postJson('/api/rag/query', ['query' => 'What is a JVM?'])
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'rate_limited')
            ->assertJsonPath('error.retryAfter', 7)
            ->assertJsonPath('answer', null);
    }

    public function test_groq_outage_returns_503_not_a_fake_answer(): void
    {
        Http::fake(['api.groq.com/*' => Http::response('bad gateway', 502)]);
        $this->actingAs($this->makeUser('student'));

        $this->postJson('/api/rag/query', ['query' => 'What is a JVM?'])
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'upstream_error');
    }

    public function test_missing_api_key_is_reported(): void
    {
        config(['services.groq.api_key' => null]);
        $this->actingAs($this->makeUser('student'));

        $this->postJson('/api/rag/query', ['query' => 'What is a JVM?'])
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'not_configured');
    }

    public function test_query_requires_authentication(): void
    {
        $this->postJson('/api/rag/query', ['query' => 'x y'])->assertUnauthorized();
    }
}
