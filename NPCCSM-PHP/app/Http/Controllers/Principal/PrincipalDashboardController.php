<?php

namespace App\Http\Controllers\Principal;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class PrincipalDashboardController extends Controller
{
    public function index(): View
    {
        $semesterProgress = DB::table('syllabus_progress')
            ->selectRaw('semester, COUNT(*) as subject_count')
            ->groupBy('semester')
            ->orderBy('semester')
            ->get();
        $recentUpdates = DB::table('faculty_lecture_updates')->orderByDesc('created_at')->limit(20)->get();

        return view('principal.dashboard', compact('semesterProgress', 'recentUpdates'));
    }
}
