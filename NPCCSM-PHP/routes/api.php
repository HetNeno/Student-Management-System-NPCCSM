<?php

use App\Http\Controllers\Api\AcademicController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\LearningContentController;
use App\Http\Controllers\Api\RagController;
use App\Http\Controllers\Api\StudyController;
use App\Http\Controllers\Api\UserManagementController;
use Illuminate\Support\Facades\Route;

/*
| All routes here run with session + CSRF (see bootstrap/app.php) and always
| return JSON. Authorisation is enforced here, not in React.
*/

Route::get('/health', fn () => response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]));

// ── Authentication ──────────────────────────────────────────────────────────
Route::prefix('auth')->group(function (): void {
    Route::get('/csrf', [AuthController::class, 'csrf']);
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth', 'active']);
});

Route::middleware(['auth', 'active'])->group(function (): void {
    // ── Curriculum & coverage (all roles read, staff write) ────────────────
    Route::get('/courses', [AcademicController::class, 'courses']);
    Route::get('/faculty-lecture-updates', [AcademicController::class, 'lectureUpdates']);
    Route::get('/faculty-lecture-updates/history', [AcademicController::class, 'lectureHistory']);

    Route::middleware('role:teacher,principal')->group(function (): void {
        Route::post('/faculty-lecture-updates', [AcademicController::class, 'storeLectureUpdate']);
        Route::post('/syllabus-progress', [AcademicController::class, 'upsertProgress']);
        Route::post('/syllabus-history', [AcademicController::class, 'storeHistory']);
        Route::post('/teacher-submissions', [AcademicController::class, 'storeSubmission']);
    });

    // ── Projects ────────────────────────────────────────────────────────────
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);

    Route::middleware('role:student')->group(function (): void {
        Route::post('/projects/{project}/enrollment', [ProjectController::class, 'enroll']);
        Route::delete('/projects/{project}/enrollment', [ProjectController::class, 'unenroll']);
        Route::patch('/projects/{project}/enrollment', [ProjectController::class, 'updateProgress']);
    });

    Route::middleware('role:teacher,principal')->group(function (): void {
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    });
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->middleware('role:principal');

    // ── Study materials & notices (students: own semester only) ────────────
    Route::get('/materials', [LearningContentController::class, 'materials']);
    Route::get('/materials/{material}/download', [LearningContentController::class, 'downloadMaterial']);
    Route::get('/notices', [LearningContentController::class, 'notices']);

    Route::middleware('role:teacher,principal')->group(function (): void {
        Route::post('/materials', [LearningContentController::class, 'storeMaterial']);
        Route::delete('/materials/{material}', [LearningContentController::class, 'destroyMaterial']);
        Route::post('/notices', [LearningContentController::class, 'storeNotice']);
        Route::delete('/notices/{notice}', [LearningContentController::class, 'destroyNotice']);
    });

    // ── Student revision tracker ────────────────────────────────────────────
    Route::middleware('role:student')->group(function (): void {
        Route::get('/study/revisions', [StudyController::class, 'revisions']);
        Route::post('/study/revisions', [StudyController::class, 'toggleRevision']);
    });

    // ── AI assistant (Groq + MySQL retrieval) ──────────────────────────────
    Route::post('/rag/query', [RagController::class, 'query'])->middleware('throttle:ai');

    Route::middleware('role:principal')->group(function (): void {
        Route::get('/rag/stats', [RagController::class, 'stats']);
        Route::get('/rag/jobs', [RagController::class, 'jobs']);
        Route::post('/rag/ingest/text', [RagController::class, 'ingestText']);
        Route::post('/rag/ingest/pdf', [RagController::class, 'ingestPdf']);
        Route::post('/rag/ingest/syllabus', [RagController::class, 'ingestSyllabus']);
        Route::delete('/rag/reset', [RagController::class, 'reset']);

        // ── Account management ─────────────────────────────────────────────
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users/teachers', [UserManagementController::class, 'storeTeacher']);
        Route::patch('/users/{user}/status', [UserManagementController::class, 'updateStatus']);
        Route::patch('/users/{user}/semester', [UserManagementController::class, 'updateSemester']);
    });
});
