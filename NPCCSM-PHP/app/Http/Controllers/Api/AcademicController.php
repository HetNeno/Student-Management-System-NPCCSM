<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\FacultyLectureUpdate;
use App\Models\SyllabusHistory;
use App\Models\SyllabusProgress;
use App\Models\TeacherSubmission;
use App\Services\Rag\RagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Syllabus coverage workflow (previously inline closures in routes/api.php).
 * Eloquent models are used so JSON columns are returned as arrays/objects;
 * the query builder returned them as strings, which the SPA read as "no
 * topics covered".
 */
class AcademicController extends Controller
{
    private const TOPIC_RULES = [
        'covered_topic' => ['array', 'max:200'],
        'covered_topic.*' => ['string', 'max:500'],
        'mandatory_note' => ['array', 'max:200'],
        'mandatory_note.*' => ['nullable', 'string', 'max:5000'],
    ];

    public function courses(Request $request): JsonResponse
    {
        // Students: always their own semester, whatever they ask for.
        $semester = $request->user()->semesterScope() ?? ($request->integer('semester') ?: null);

        return response()->json(
            Course::query()
                ->when($semester, fn ($q) => $q->where('semester', $semester))
                ->orderBy('semester')
                ->orderBy('subject_code')
                ->get()
        );
    }

    public function lectureUpdates(Request $request): JsonResponse
    {
        return response()->json($this->scopedUpdates($request)->get());
    }

    public function lectureHistory(Request $request): JsonResponse
    {
        return response()->json($this->scopedUpdates($request)->limit(50)->get());
    }

    private function scopedUpdates(Request $request)
    {
        $semester = $request->user()->semesterScope();

        return FacultyLectureUpdate::query()
            ->when($semester !== null, fn ($q) => $q->where('semester', $semester))
            ->orderByDesc('created_at');
    }

    public function storeLectureUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'semester' => ['required', 'integer', 'between:1,8'],
            'faculty_name' => ['nullable', 'string', 'max:255'],
            'lecture_date' => ['nullable', 'date'],
        ] + self::TOPIC_RULES);

        $update = new FacultyLectureUpdate();
        $update->forceFill([
            'id' => (string) Str::uuid(),
            'subject_code' => $data['subject_code'],
            'title' => $data['title'],
            'semester' => $data['semester'],
            'faculty_name' => $data['faculty_name'] ?? $request->user()->name,
            'lecture_date' => $data['lecture_date'] ?? now()->toDateString(),
            'covered_topic' => array_values($data['covered_topic'] ?? []),
            'mandatory_note' => (object) ($data['mandatory_note'] ?? []),
            'created_at' => now(),
        ])->save();

        // Make the new coverage and notes searchable by Nova immediately.
        try {
            app(RagService::class)->indexLectureUpdate($update->fresh());
        } catch (\Throwable $e) {
            report($e); // never block publishing on indexing
        }

        return response()->json($update->fresh(), 201);
    }

    public function upsertProgress(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'semester' => ['required', 'integer', 'between:1,8'],
            'covered_topics' => ['array', 'max:200'],
            'covered_topics.*' => ['string', 'max:500'],
            'topic_notes' => ['array', 'max:200'],
            'topic_notes.*' => ['nullable', 'string', 'max:5000'],
            'overall_notes' => ['nullable', 'string', 'max:10000'],
            'faculty_name' => ['nullable', 'string', 'max:255'],
            'last_updated' => ['nullable', 'date'],
        ]);

        $progress = SyllabusProgress::query()->findOrNew($data['subject_code']);
        $progress->forceFill([
            'subject_code' => $data['subject_code'],
            'title' => $data['title'],
            'semester' => $data['semester'],
            'covered_topics' => array_values($data['covered_topics'] ?? []),
            'topic_notes' => (object) ($data['topic_notes'] ?? []),
            'overall_notes' => $data['overall_notes'] ?? null,
            'faculty_name' => $data['faculty_name'] ?? $request->user()->name,
            'last_updated' => $data['last_updated'] ?? now()->toDateString(),
        ])->save();

        return response()->json($progress->fresh());
    }

    public function storeHistory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'semester' => ['required', 'integer', 'between:1,8'],
            'faculty_name' => ['nullable', 'string', 'max:255'],
            'lecture_date' => ['nullable', 'date'],
            'covered_topics' => ['array', 'max:200'],
            'covered_topics.*' => ['string', 'max:500'],
            'topic_notes' => ['array', 'max:200'],
            'topic_notes.*' => ['nullable', 'string', 'max:5000'],
        ]);

        $history = new SyllabusHistory();
        $history->forceFill([
            'subject_code' => $data['subject_code'],
            'title' => $data['title'],
            'semester' => $data['semester'],
            'faculty_name' => $data['faculty_name'] ?? $request->user()->name,
            'lecture_date' => $data['lecture_date'] ?? null,
            'covered_topics' => array_values($data['covered_topics'] ?? []),
            'topic_notes' => (object) ($data['topic_notes'] ?? []),
            'created_at' => now(),
        ])->save();

        return response()->json($history->fresh(), 201);
    }

    public function storeSubmission(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'lecture_date' => ['nullable', 'date'],
        ] + self::TOPIC_RULES);

        $submission = new TeacherSubmission();
        $submission->forceFill([
            'id' => (string) Str::uuid(),
            'subject_code' => $data['subject_code'],
            'lecture_date' => $data['lecture_date'] ?? null,
            'covered_topic' => array_values($data['covered_topic'] ?? []),
            'mandatory_note' => (object) ($data['mandatory_note'] ?? []),
            'created_at' => now(),
        ])->save();

        return response()->json($submission->fresh(), 201);
    }
}
