<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Ai\AiUnavailableException;
use App\Services\Ai\GroqClient;
use App\Services\Rag\RagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Smalot\PdfParser\Parser;
use Throwable;

class RagController extends Controller
{
    public function __construct(private readonly RagService $rag, private readonly GroqClient $groq)
    {
    }

    /**
     * Retrieve context from MySQL, then generate an answer with Groq.
     * On AI failure the retrieved chunks are still returned with a typed
     * error, so the UI can show the real reason instead of a fake answer.
     */
    public function query(Request $request): JsonResponse
    {
        $data = $request->validate([
            'query' => ['required', 'string', 'min:2', 'max:2000'],
            'topK' => ['nullable', 'integer', 'between:1,10'],
            'sourceTypes' => ['nullable', 'array'],
            'sourceTypes.*' => ['string', 'max:50'],
            'semester' => ['nullable', 'integer', 'between:1,6'],
            'history' => ['nullable', 'array', 'max:12'],
            'history.*.role' => ['required_with:history', 'in:user,assistant'],
            'history.*.text' => ['required_with:history', 'string', 'max:4000'],
        ]);

        $query = trim($data['query']);
        $started = microtime(true);
        // Students are locked to their own semester; staff may pass one.
        $semester = $request->user()->semesterScope() ?? ($data['semester'] ?? null);
        $chunks = $this->rag->retrieve($query, $data['topK'] ?? 6, $data['sourceTypes'] ?? null, $semester);

        $answer = null;
        $error = null;
        try {
            $answer = $this->groq->chat($this->buildMessages($query, $chunks, $data['history'] ?? [], $semester), temperature: 0.2);
        } catch (AiUnavailableException $e) {
            $error = ['code' => $e->reason, 'message' => $e->userMessage(), 'retryAfter' => $e->retryAfter];
        }

        $latency = (int) round((microtime(true) - $started) * 1000);
        $this->rag->logQuery($query, $chunks, $answer !== null, $latency);

        return response()->json([
            'success' => $answer !== null,
            'query' => $query,
            'answer' => $answer,
            'error' => $error,
            'chunks' => $chunks,
            'totalRetrieved' => $chunks->count(),
            'grounded' => $chunks->isNotEmpty(),
            'latencyMs' => $latency,
            'model' => $this->groq->model(),
        ], $answer !== null ? 200 : ($error['code'] === AiUnavailableException::RATE_LIMITED ? 429 : 503));
    }

    public function ingestText(Request $request): JsonResponse
    {
        $data = $request->validate([
            'texts' => ['required', 'array', 'min:1', 'max:200'],
            'texts.*' => ['required', 'string', 'max:200000'],
            'sourceName' => ['required', 'string', 'max:255'],
            'sourceType' => ['nullable', 'string', 'max:50'],
            'contentType' => ['nullable', 'in:general,notes,syllabus,structured,pdf'],
            'metadata' => ['nullable', 'array'],
        ]);

        $count = $this->rag->ingest(
            $data['texts'],
            $data['sourceType'] ?? 'notes',
            $data['sourceName'],
            $data['metadata'] ?? [],
            $data['contentType'] ?? 'general',
        );

        return response()->json(['success' => true, 'chunksCreated' => $count, 'sourceName' => $data['sourceName']], 201);
    }

    public function ingestPdf(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'mimetypes:application/pdf', 'max:20480'],
        ]);

        $file = $data['file'];
        $handle = fopen($file->getRealPath(), 'rb');
        $signature = $handle ? fread($handle, 5) : '';
        if ($handle) {
            fclose($handle);
        }
        abort_unless($signature === '%PDF-', 422, 'The uploaded file is not a valid PDF.');

        try {
            $text = (new Parser())->parseFile($file->getRealPath())->getText();
        } catch (Throwable $e) {
            report($e);
            abort(422, 'The PDF could not be read. It may be scanned or encrypted.');
        }

        $name = basename($file->getClientOriginalName());
        $count = $this->rag->ingest([$text], 'pdf', $name, ['contentType' => 'pdf'], 'pdf');

        return response()->json(['success' => true, 'chunksCreated' => $count, 'sourceName' => $name], 201);
    }

    public function ingestSyllabus(): JsonResponse
    {
        return response()->json(['success' => true, 'chunksCreated' => $this->rag->ingestSyllabus()], 201);
    }

    public function stats(): JsonResponse
    {
        return response()->json([
            'totalChunks' => DB::table('rag_documents')->count(),
            'sources' => DB::table('rag_documents')
                ->selectRaw('source_type, COUNT(*) AS chunk_count, COUNT(DISTINCT source_name) AS doc_count')
                ->groupBy('source_type')->orderByDesc('chunk_count')->get(),
            'ai' => ['provider' => 'groq', 'model' => $this->groq->model(), 'configured' => $this->groq->isConfigured()],
        ]);
    }

    public function jobs(): JsonResponse
    {
        return response()->json(DB::table('rag_ingestion_jobs')->orderByDesc('created_at')->limit(20)->get());
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

    /**
     * Grounding and honesty rules for Nova. The model cannot guarantee
     * correctness, so the rules force it to (1) answer college-specific
     * questions only from retrieved NPCCSM content, (2) say plainly when that
     * content is missing, (3) correct a student's wrong premise instead of
     * agreeing, and (4) never invent facts or sources.
     */
    private function buildMessages(string $query, Collection $chunks, array $history, ?int $semester): array
    {
        $context = $chunks->values()->map(fn ($c, $i) => '['.($i + 1).'] ('.$c['source'].') '.$c['text'])->implode("\n\n");
        $semesterLine = $semester ? "The student is in BCA Semester {$semester}. Only discuss Semester {$semester} subjects, plus general skills and careers." : '';

        $system = <<<TXT
You are Nova, the academic and career assistant for students of NPCCSM (Narsinhbhai Patel College of Computer Studies and Management, Kadi), a constituent college of Kadi Sarva Vishwavidyalaya, BCA programme.
{$semesterLine}

ACCURACY RULES (follow strictly, in this order):
1. College-specific questions (syllabus, units, topics, lecture coverage, faculty notes, notices, deadlines, study materials): answer ONLY from the numbered CONTEXT and cite the source like [1]. Do not add college facts that are not in the context.
2. If the context does not contain the answer to a college-specific question, say exactly that: "I don't have this in the NPCCSM material yet — please check with your faculty." Do not guess dates, marks, names, deadlines or exam patterns.
3. General computer-science or career concepts (for example "what is normalisation"): you may explain using standard, well-established knowledge. Start that part with "General explanation:". If you are not certain about something, say you are not certain rather than guessing.
4. If the student's message contains a wrong statement, wrong assumption or wrong answer, begin your reply with "Correction:" and explain clearly and politely what is wrong and what is right. Never agree with something incorrect just to be agreeable.
5. Never invent citations, books, links, statistics or quotes.

STYLE: clear and concise; short paragraphs or bullet lists ("- "); **bold** only for key terms; no tables, no emojis.
TXT;

        $messages = [['role' => 'system', 'content' => $system]];
        foreach (array_slice($history, -6) as $turn) {
            $messages[] = ['role' => $turn['role'], 'content' => mb_substr($turn['text'], 0, 2000)];
        }
        $messages[] = [
            'role' => 'user',
            'content' => ($semester ? "Student semester: {$semester}\n\n" : '')
                ."Knowledge-base context:\n".($context !== '' ? $context : 'No relevant context found.')
                ."\n\nQuestion: {$query}",
        ];

        return $messages;
    }
}
