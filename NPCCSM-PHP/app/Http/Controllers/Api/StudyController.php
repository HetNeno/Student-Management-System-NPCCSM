<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Student revision tracker: a student marks syllabus topics they have
 * revised. Only topics that exist in a course of the student's own semester
 * can be marked.
 */
class StudyController extends Controller
{
    public function revisions(Request $request): JsonResponse
    {
        $rows = DB::table('student_topic_progress')
            ->where('user_id', $request->user()->id)
            ->get(['subject_code', 'topic', 'revised_at']);

        $bySubject = [];
        foreach ($rows as $r) {
            $bySubject[$r->subject_code][] = $r->topic;
        }

        return response()->json(['data' => $bySubject]);
    }

    public function toggleRevision(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'topic' => ['required', 'string', 'max:500'],
            'revised' => ['required', 'boolean'],
        ]);
        $user = $request->user();

        $course = Course::query()
            ->where('subject_code', $data['subject_code'])
            ->where('semester', $user->semesterScope())
            ->first();
        abort_unless($course, 404, 'This subject is not part of your semester.');

        $topics = collect($course->units ?? [])->flatMap(fn ($u) => $u['topics'] ?? []);
        abort_unless($topics->contains($data['topic']), 422, 'This topic is not in the syllabus for that subject.');

        $key = ['user_id' => $user->id, 'subject_code' => $course->subject_code, 'topic_hash' => sha1($data['topic'])];
        if ($data['revised']) {
            DB::table('student_topic_progress')->updateOrInsert($key, ['topic' => $data['topic'], 'revised_at' => now()]);
        } else {
            DB::table('student_topic_progress')->where($key)->delete();
        }

        return $this->revisions($request);
    }
}
