<?php

namespace App\Services\Rag;

use App\Models\Course;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Retrieval + ingestion over MySQL (FULLTEXT on rag_documents.chunk_text).
 * Keyword retrieval, as in the original PostgreSQL implementation; the
 * embedding helpers in server/rag/embeddings.js were never wired up.
 */
class RagService
{
    public function __construct(private readonly TextChunker $chunker)
    {
    }

    /**
     * @return Collection<int, array{id:int,text:string,source:string,sourceType:string,metadata:mixed,similarity:float}>
     */
    public function retrieve(string $query, int $topK = 5, ?array $sourceTypes = null, ?int $semester = null): Collection
    {
        // Students only ever see their own semester plus college-wide content.
        $scope = fn ($q) => $semester === null ? $q : $q->where(fn ($w) => $w->whereNull('semester')->orWhere('semester', $semester));

        $rows = collect();

        try {
            $q = DB::table('rag_documents')
                ->selectRaw(
                    'id, source_type, source_name, semester, chunk_text, metadata, MATCH(chunk_text) AGAINST(? IN NATURAL LANGUAGE MODE) AS similarity',
                    [$query]
                )
                ->whereRaw('MATCH(chunk_text) AGAINST(? IN NATURAL LANGUAGE MODE)', [$query]);

            if ($sourceTypes) {
                $q->whereIn('source_type', $sourceTypes);
            }
            $scope($q);

            $rows = $q->orderByDesc('similarity')->limit($topK)->get();
        } catch (Throwable $e) {
            report($e);
        }

        // FULLTEXT ignores very short words and stopwords; fall back to LIKE
        // on the longest terms so queries such as "C++" or "OS" still match.
        if ($rows->isEmpty()) {
            $terms = collect(preg_split('/\s+/u', mb_strtolower($query)) ?: [])
                ->map(fn ($t) => trim($t, " \t.,?!:;\"'()"))
                ->filter(fn ($t) => mb_strlen($t) >= 2)
                ->sortByDesc(fn ($t) => mb_strlen($t))
                ->take(4);

            if ($terms->isNotEmpty()) {
                $rows = DB::table('rag_documents')
                    ->select(['id', 'source_type', 'source_name', 'semester', 'chunk_text', 'metadata'])
                    ->where(function ($w) use ($terms) {
                        foreach ($terms as $t) {
                            $w->orWhere('chunk_text', 'like', '%'.addcslashes($t, '%_\\').'%');
                        }
                    })
                    ->when($sourceTypes, fn ($q) => $q->whereIn('source_type', $sourceTypes))
                    ->tap($scope)
                    ->limit($topK)
                    ->get();
            }
        }

        return $rows->map(fn (object $r) => [
            'id' => (int) $r->id,
            'text' => $r->chunk_text,
            'source' => $r->source_name,
            'sourceType' => $r->source_type,
            'semester' => $r->semester !== null ? (int) $r->semester : null,
            'metadata' => is_string($r->metadata) ? json_decode($r->metadata, true) : $r->metadata,
            'similarity' => isset($r->similarity) ? round((float) $r->similarity, 4) : 0.0,
        ])->values();
    }

    /**
     * Chunks and stores text inside one transaction. The job row always ends
     * as `completed` or `failed` (previously a failure left it `processing`).
     *
     * @param  list<string>  $texts
     */
    public function ingest(array $texts, string $sourceType, string $sourceName, array $metadata = [], string $contentType = 'general', bool $replaceExisting = false, ?int $semester = null): int
    {
        $jobId = DB::table('rag_ingestion_jobs')->insertGetId([
            'source_type' => $sourceType,
            'source_name' => $sourceName,
            'status' => 'processing',
            'chunks_created' => 0,
            'started_at' => now(),
            'created_at' => now(),
        ]);

        try {
            $chunks = collect($texts)->flatMap(fn (string $t) => $this->chunker->chunk($t, $contentType))->values();

            DB::transaction(function () use ($chunks, $sourceType, $sourceName, $metadata, $replaceExisting, $semester): void {
                if ($replaceExisting) {
                    DB::table('rag_documents')->where('source_type', $sourceType)->where('source_name', $sourceName)->delete();
                }

                $now = now();
                foreach ($chunks->chunk(200) as $batch) {
                    DB::table('rag_documents')->insert($batch->values()->map(fn (string $chunk, int $i) => [
                        'source_type' => $sourceType,
                        'source_name' => $sourceName,
                        'source_id' => null,
                        'semester' => $semester,
                        'chunk_text' => $chunk,
                        'metadata' => json_encode($metadata + ['chunkIndex' => $i], JSON_UNESCAPED_UNICODE),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all());
                }
            });

            DB::table('rag_ingestion_jobs')->where('id', $jobId)->update([
                'status' => 'completed',
                'chunks_created' => $chunks->count(),
                'completed_at' => now(),
            ]);

            return $chunks->count();
        } catch (Throwable $e) {
            DB::table('rag_ingestion_jobs')->where('id', $jobId)->update([
                'status' => 'failed',
                'error_message' => mb_substr($e->getMessage(), 0, 1000),
                'completed_at' => now(),
            ]);

            throw $e;
        }
    }

    /**
     * Indexes the curriculum from the `courses` table (one document per
     * subject, replacing any previous copy so re-running is safe).
     */
    public function ingestSyllabus(): int
    {
        $total = 0;

        foreach (Course::query()->orderBy('semester')->orderBy('subject_code')->get() as $course) {
            $lines = ["Semester {$course->semester} — {$course->subject_code}: {$course->title} ({$course->type})"];
            foreach ($course->units ?? [] as $unit) {
                $lines[] = '';
                $lines[] = "{$course->title} — {$unit['name']}";
                foreach ($unit['topics'] ?? [] as $topic) {
                    $lines[] = "- {$topic}";
                }
            }

            $total += $this->ingest(
                [implode("\n", $lines)],
                'syllabus',
                "{$course->subject_code} {$course->title}",
                ['subjectCode' => $course->subject_code, 'semester' => $course->semester],
                'notes', // ~400-char overlapping chunks keep each unit together
                replaceExisting: true,
                semester: $course->semester,
            );
        }

        return $total;
    }

    /** Faculty lecture coverage (topics + mandatory notes) becomes searchable. */
    public function indexLectureUpdate(\App\Models\FacultyLectureUpdate $u): int
    {
        $lines = [
            "Lecture update for {$u->title} ({$u->subject_code}), Semester {$u->semester}"
            .($u->lecture_date ? ', '.$u->lecture_date->format('d M Y') : '')
            .($u->faculty_name ? ", taught by {$u->faculty_name}" : '').'.',
            'Topics covered: '.implode('; ', $u->covered_topic ?? []).'.',
        ];
        foreach ((array) ($u->mandatory_note ?? []) as $topic => $note) {
            if (trim((string) $note) !== '') {
                $lines[] = "Faculty note on {$topic}: {$note}";
            }
        }

        return $this->ingest([implode("\n", $lines)], 'lecture', "Lecture {$u->subject_code} #{$u->id}",
            ['subjectCode' => $u->subject_code, 'lectureDate' => $u->lecture_date?->format('Y-m-d')],
            'notes', replaceExisting: true, semester: $u->semester);
    }

    public function indexNotice(\App\Models\Notice $n): int
    {
        $text = "Notice ({$n->priority}) posted ".$n->created_at?->format('d M Y').': '.$n->title."\n".$n->body;

        return $this->ingest([$text], 'notice', "Notice #{$n->id}: {$n->title}", ['noticeId' => $n->id],
            'notes', replaceExisting: true, semester: $n->semester);
    }

    public function indexMaterial(\App\Models\StudyMaterial $m, string $text): int
    {
        return $this->ingest([$text], 'material', "Material #{$m->id}: {$m->title}",
            ['materialId' => $m->id, 'subjectCode' => $m->subject_code], 'pdf',
            replaceExisting: true, semester: $m->semester);
    }

    public function removeSource(string $sourceType, string $sourceName): void
    {
        DB::table('rag_documents')->where('source_type', $sourceType)->where('source_name', $sourceName)->delete();
    }

    public function logQuery(string $query, Collection $chunks, bool $generated, int $latencyMs): void
    {
        try {
            DB::table('rag_query_logs')->insert([
                'query_text' => mb_substr($query, 0, 4000),
                'retrieved_chunks' => json_encode($chunks->pluck('id')->all()),
                'response_generated' => $generated,
                'latency_ms' => $latencyMs,
                'created_at' => now(),
            ]);
        } catch (Throwable $e) {
            report($e); // logging must never break the chat
        }
    }
}
