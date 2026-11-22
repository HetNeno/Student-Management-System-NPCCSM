<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class StudentDashboardController extends Controller
{
    public function index(): View
    {
        $progress = DB::table('syllabus_progress')->orderBy('semester')->get();
        $courses = DB::table('courses')->orderBy('semester')->orderBy('subject_code')->get();

        return view('student.dashboard', compact('progress', 'courses'));
    }
}
