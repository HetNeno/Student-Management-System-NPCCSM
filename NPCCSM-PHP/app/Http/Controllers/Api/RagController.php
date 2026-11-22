<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Smalot\PdfParser\Parser;

class RagController extends Controller
{
    public function query(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => ['required', 'string', 'max:4000'],
            'topK' => ['nullable', 'integer', 'between:1,20'],
            'sourceTypes' => ['nullable', 'array'],
        ]);

        $query = trim($validated['query']);
        $topK = $validated['topK'] ?? 5;
        $started = microtime(true);

        $rows = collect();
        try {
            $base = DB::table('rag_documents')
                ->selectRaw(
                    'id, source_type, source_name, source_id, chunk_text, metadata,
                     MATCH(chunk_text) AGAINST(? IN NATURAL LANGUAGE MODE) AS similarity',
                    [$query]
                )
                ->whereRaw('MATCH(chunk_text) AGAINST(? IN NATURAL LANGUAGE MODE)', [$query]);

            if (! empty($validated['sourceTypes'])) {
                $base->whereIn('source_type', $validated['sourceTypes']);
            }

            $rows = $base->orderByDesc('similarity')->limit($topK)->get();
        } catch (\Throwable) {
            $rows = DB::table('rag_documents')
                ->where('chunk_text', 'LIKE', '%' . str_replace(['%', '_'], ['\\%', '\\_'], $query) . '%')
                ->limit($topK)
                ->get();
        }

        $latency = (int) round((microtime(true) - $started) * 1000);
        DB::table('rag_query_logs')->insert([
            'query_text' => $query,
            'retrieved_chunks' => json_encode($rows->pluck('id')->all()),
            'response_generated' => true,
            'latency_ms' => $latency,
            'created_at' => now(),
        ]);

        $chunks = $rows->map(fn (object $row): array => [
            'text' => $row->chunk_text,
            'source' => $row->source_name,
            'sourceType' => $row->source_type,
            'metadata' => is_string($row->metadata) ? json_decode($row->metadata, true) : $row->metadata,
            'similarity' => isset($row->similarity) ? (float) $row->similarity : 0.5,
        ]);

        $answer = $this->generateAnswer($query, $chunks->pluck('text')->take(5)->implode("\n\n"));

        return response()->json([
            'success' => true,
            'query' => $query,
            'answer' => $answer,
            'chunks' => $chunks,
            'totalRetrieved' => $chunks->count(),
            'latencyMs' => $latency,
        ]);
    }

    public function ingestText(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'texts' => ['required', 'array', 'min:1'],
            'texts.*' => ['required', 'string'],
            'sourceName' => ['required', 'string', 'max:255'],
            'sourceType' => ['nullable', 'string', 'max:50'],
            'metadata' => ['nullable', 'array'],
        ]);

        $chunks = collect($validated['texts'])
            ->flatMap(fn (string $text): array => $this->chunkText($text))
            ->filter(fn (string $chunk): bool => strlen(trim($chunk)) > 20)
            ->values();

        $count = $this->storeChunks(
            $chunks,
            $validated['sourceType'] ?? 'database',
            $validated['sourceName'],
            $validated['metadata'] ?? []
        );

        return response()->json([
            'success' => true,
            'chunksCreated' => $count,
            'sourceName' => $validated['sourceName'],
        ], 201);
    }

    public function ingestPdf(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $parser = new Parser();
        $document = $parser->parseFile($validated['file']->getRealPath());
        $chunks = $this->chunkText($document->getText());

        $count = $this->storeChunks(
            collect($chunks),
            'pdf',
            $validated['file']->getClientOriginalName(),
            ['contentType' => 'pdf']
        );

        return response()->json([
            'success' => true,
            'chunksCreated' => $count,
            'sourceName' => $validated['file']->getClientOriginalName(),
        ], 201);
    }

    public function stats(): JsonResponse
    {
        $sources = DB::table('rag_documents')
            ->selectRaw('source_type, COUNT(*) AS chunk_count, COUNT(DISTINCT source_name) AS doc_count')
            ->groupBy('source_type')
            ->orderByDesc('chunk_count')
            ->get();

        return response()->json([
            'totalChunks' => DB::table('rag_documents')->count(),
            'sources' => $sources,
        ]);
    }

    public function jobs(): JsonResponse
    {
        return response()->json(
            DB::table('rag_ingestion_jobs')->orderByDesc('created_at')->limit(20)->get()
        );
    }

    public function reset(): JsonResponse
    {
        DB::transaction(function (): void {
            DB::table('rag_query_logs')->delete();
            DB::table('rag_ingestion_jobs')->delete();
            DB::table('rag_documents')->delete();
        });

        return response()->json(['success' => true, 'message' => 'All RAG data cleared']);
    }

    private function chunkText(string $text): array
    {
        $text = preg_replace('/\s+/', ' ', trim($text)) ?? '';
        if ($text === '') {
            return [];
        }

        $chunks = [];
        $length = strlen($text);
        for ($offset = 0; $offset < $length; $offset += 800) {
            $chunks[] = substr($text, $offset, 800);
        }
        return $chunks;
    }

    private function storeChunks($chunks, string $sourceType, string $sourceName, array $metadata): int
    {
        if ($chunks->isEmpty()) {
            return 0;
        }

        $jobId = DB::table('rag_ingestion_jobs')->insertGetId([
            'source_type' => $sourceType,
            'source_name' => $sourceName,
            'status' => 'processing',
            'chunks_created' => 0,
            'started_at' => now(),
            'created_at' => now(),
        ]);

        DB::transaction(function () use ($chunks, $sourceType, $sourceName, $metadata): void {
            foreach ($chunks as $chunk) {
                DB::table('rag_documents')->insert([
                    'source_type' => $sourceType,
                    'source_name' => $sourceName,
                    'source_id' => null,
                    'chunk_text' => $chunk,
                    'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        DB::table('rag_ingestion_jobs')->where('id', $jobId)->update([
            'status' => 'completed',
            'chunks_created' => $chunks->count(),
            'completed_at' => now(),
        ]);

        return $chunks->count();
    }

    private function generateAnswer(string $query, string $context): ?string
    {
        $apiKey = (string) env('GEMINI_API_KEY');
        if ($apiKey === '' || $context === '') {
            return null;
        }

        $model = (string) env('GEMINI_CHAT_MODEL', 'gemini-2.5-flash');
        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent';
        $response = Http::withHeaders(['x-goog-api-key' => $apiKey])
            ->timeout(30)
            ->post($endpoint, [
                'contents' => [[
                    'role' => 'user',
                    'parts' => [[
                        'text' => "Answer the academic question using only this context.\n\nContext:\n" . $context . "\n\nQuestion:\n" . $query,
                    ]],
                ]],
            ]);

        if (! $response->successful()) {
            report(new \RuntimeException('Gemini RAG generation failed: ' . $response->status()));
            return null;
        }

        return data_get($response->json(), 'candidates.0.content.parts.0.text');
    }
}
