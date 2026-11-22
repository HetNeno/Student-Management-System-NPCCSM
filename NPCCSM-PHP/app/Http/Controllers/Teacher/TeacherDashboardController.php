<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class TeacherDashboardController extends Controller
{
    public function index(): View
    {
        $courses = DB::table('courses')->orderBy('semester')->orderBy('subject_code')->get();
        $recentUpdates = DB::table('faculty_lecture_updates')->orderByDesc('created_at')->limit(20)->get();

        return view('teacher.dashboard', compact('courses', 'recentUpdates'));
    }
}
