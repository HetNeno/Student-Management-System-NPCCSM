<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Student\StudentDashboardController;
use App\Http\Controllers\Teacher\TeacherDashboardController;
use App\Http\Controllers\Principal\PrincipalDashboardController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => view('landing'))->name('landing');

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('login.store');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

Route::prefix('student')->name('student.')->middleware(['auth', 'role:student'])->group(function (): void {
    Route::get('/', [StudentDashboardController::class, 'index'])->name('overview');
    Route::view('/syllabus', 'student.syllabus')->name('syllabus');
    Route::view('/career', 'student.career')->name('career');
    Route::view('/projects', 'student.projects')->name('projects');
    Route::view('/resources', 'student.resources')->name('resources');
});

Route::prefix('teacher')->name('teacher.')->middleware(['auth', 'role:teacher'])->group(function (): void {
    Route::get('/', [TeacherDashboardController::class, 'index'])->name('dashboard');
});

Route::prefix('principal')->name('principal.')->middleware(['auth', 'role:principal'])->group(function (): void {
    Route::get('/', [PrincipalDashboardController::class, 'index'])->name('dashboard');
});
