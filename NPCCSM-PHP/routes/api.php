<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RagController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'timestamp' => now()->toIso8601String(),
]));

Route::post('/auth/login', function (Request $request) {
    $validated = $request->validate([
        'username' => ['required', 'string', 'max:255'],
        'password' => ['required', 'string'],
        'role' => ['required', Rule::in(['student', 'teacher', 'principal'])],
    ]);

    $user = App\Models\User::query()
        ->whereRaw('LOWER(username) = LOWER(?)', [$validated['username']])
        ->where('role', $validated['role'])
        ->first();

    if (! $user || ! Hash::check($validated['password'], $user->password)) {
        return response()->json(['error' => 'Invalid username or password.'], 401);
    }

    Auth::login($user);
    $request->session()->regenerate();

    return response()->json([
        'id' => $user->id,
        'username' => $user->username,
        'role' => $user->role,
        'name' => $user->name,
        'department' => $user->department,
    ]);
});

Route::post('/auth/logout', function (Request $request) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['status' => 'ok']);
});

Route::get('/auth/me', function (Request $request) {
    $user = $request->user();

    if (! $user) {
        return response()->json(['error' => 'Unauthenticated.'], 401);
    }

    return response()->json([
        'user' => [
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
            'name' => $user->name,
            'department' => $user->department,
        ],
    ]);
})->middleware('auth');

Route::middleware(['auth', 'role:student,teacher,principal'])->group(function (): void {
    Route::get('/faculty-lecture-updates', fn () => response()->json(
        DB::table('faculty_lecture_updates')->orderByDesc('created_at')->get()
    ));

    Route::get('/faculty-lecture-updates/history', fn () => response()->json(
        DB::table('faculty_lecture_updates')->orderByDesc('created_at')->limit(50)->get()
    ));

    Route::post('/faculty-lecture-updates', function (Request $request) {
        $validated = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'semester' => ['required', 'integer', 'between:1,8'],
            'faculty_name' => ['nullable', 'string', 'max:255'],
            'lecture_date' => ['nullable', 'date'],
            'covered_topic' => ['array'],
            'mandatory_note' => ['array'],
        ]);

        abort_unless($request->user()->role !== 'student', 403);

        $id = (string) Str::uuid();
        DB::table('faculty_lecture_updates')->insert([
            'id' => $id,
            'subject_code' => $validated['subject_code'],
            'title' => $validated['title'],
            'semester' => $validated['semester'],
            'faculty_name' => $validated['faculty_name'] ?? $request->user()->name,
            'lecture_date' => $validated['lecture_date'] ?? now()->toDateString(),
            'covered_topic' => json_encode($validated['covered_topic'] ?? [], JSON_UNESCAPED_UNICODE),
            'mandatory_note' => json_encode($validated['mandatory_note'] ?? [], JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
        ]);

        return response()->json(
            DB::table('faculty_lecture_updates')->where('id', $id)->first(),
            201
        );
    })->middleware('role:teacher,principal');

    Route::post('/syllabus-progress', function (Request $request) {
        $validated = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'semester' => ['required', 'integer', 'between:1,8'],
            'covered_topics' => ['array'],
            'topic_notes' => ['array'],
            'overall_notes' => ['nullable', 'string'],
            'faculty_name' => ['nullable', 'string', 'max:255'],
            'last_updated' => ['nullable', 'date'],
        ]);
        abort_unless($request->user()->role !== 'student', 403);

        DB::table('syllabus_progress')->updateOrInsert(
            ['subject_code' => $validated['subject_code']],
            [
                'title' => $validated['title'],
                'semester' => $validated['semester'],
                'covered_topics' => json_encode($validated['covered_topics'] ?? [], JSON_UNESCAPED_UNICODE),
                'topic_notes' => json_encode($validated['topic_notes'] ?? [], JSON_UNESCAPED_UNICODE),
                'overall_notes' => $validated['overall_notes'] ?? null,
                'faculty_name' => $validated['faculty_name'] ?? null,
                'last_updated' => $validated['last_updated'] ?? null,
                'updated_at' => now(),
            ]
        );

        return response()->json(
            DB::table('syllabus_progress')->where('subject_code', $validated['subject_code'])->first()
        );
    })->middleware('role:teacher,principal');

    Route::post('/syllabus-history', function (Request $request) {
        $validated = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'semester' => ['required', 'integer', 'between:1,8'],
            'faculty_name' => ['nullable', 'string', 'max:255'],
            'lecture_date' => ['nullable', 'date'],
            'covered_topics' => ['array'],
            'topic_notes' => ['array'],
        ]);
        abort_unless($request->user()->role !== 'student', 403);

        $id = DB::table('syllabus_history')->insertGetId([
            'subject_code' => $validated['subject_code'],
            'title' => $validated['title'],
            'semester' => $validated['semester'],
            'faculty_name' => $validated['faculty_name'] ?? null,
            'lecture_date' => $validated['lecture_date'] ?? null,
            'covered_topics' => json_encode($validated['covered_topics'] ?? [], JSON_UNESCAPED_UNICODE),
            'topic_notes' => json_encode($validated['topic_notes'] ?? [], JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
        ]);

        return response()->json(DB::table('syllabus_history')->where('id', $id)->first(), 201);
    })->middleware('role:teacher,principal');

    Route::post('/teacher-submissions', function (Request $request) {
        $validated = $request->validate([
            'subject_code' => ['required', 'string', 'max:255'],
            'lecture_date' => ['nullable', 'date'],
            'covered_topic' => ['array'],
            'mandatory_note' => ['array'],
        ]);
        $id = (string) Str::uuid();
        DB::table('teacher_submissions')->insert([
            'id' => $id,
            'subject_code' => $validated['subject_code'],
            'lecture_date' => $validated['lecture_date'] ?? null,
            'covered_topic' => json_encode($validated['covered_topic'] ?? [], JSON_UNESCAPED_UNICODE),
            'mandatory_note' => json_encode($validated['mandatory_note'] ?? [], JSON_UNESCAPED_UNICODE),
            'created_at' => now(),
        ]);
        return response()->json(DB::table('teacher_submissions')->where('id', $id)->first(), 201);
    })->middleware('role:teacher,principal');

    Route::post('/rag/query', [RagController::class, 'query']);
    Route::get('/rag/stats', [RagController::class, 'stats']);
    Route::get('/rag/jobs', [RagController::class, 'jobs']);
    Route::post('/rag/ingest/text', [RagController::class, 'ingestText'])
        ->middleware('role:principal');
    Route::post('/rag/ingest/pdf', [RagController::class, 'ingestPdf'])
        ->middleware('role:principal');
    Route::delete('/rag/reset', [RagController::class, 'reset'])
        ->middleware('role:principal');
});
