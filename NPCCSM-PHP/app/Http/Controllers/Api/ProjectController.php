<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\ProjectRequest;
use App\Models\Project;
use App\Models\ProjectEnrollment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    /**
     * Students see published projects with their own progress.
     * Teachers/principal see every project with enrolment counts.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isStaff = $user->hasRole(User::ROLE_TEACHER, User::ROLE_PRINCIPAL);

        $filters = $request->validate([
            'category' => ['nullable', 'string', 'max:50'],
            'difficulty' => ['nullable', Rule::in(Project::DIFFICULTIES)],
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(Project::STATUSES)],
        ]);

        $semester = $user->semesterScope();
        $projects = Project::query()
            ->when(! $isStaff, fn ($q) => $q->where('status', 'published'))
            ->when($semester !== null, fn ($q) => $q->where(fn ($w) => $w->whereNull('semester')->orWhere('semester', $semester)))
            ->when($isStaff && ($filters['status'] ?? null), fn ($q) => $q->where('status', $filters['status']))
            ->when($filters['category'] ?? null, fn ($q, $v) => $q->where('category', $v))
            ->when($filters['difficulty'] ?? null, fn ($q, $v) => $q->where('difficulty', $v))
            ->when($filters['search'] ?? null, function ($q, $v) {
                $like = '%'.addcslashes($v, '%_\\').'%';
                $q->where(fn ($w) => $w->where('title', 'like', $like)->orWhere('description', 'like', $like));
            })
            ->when($isStaff, fn ($q) => $q->withCount([
                'enrollments',
                'enrollments as completed_count' => fn ($e) => $e->where('status', 'completed'),
            ]))
            ->when(! $isStaff, fn ($q) => $q->with(['enrollments' => fn ($e) => $e->where('user_id', $user->id)]))
            ->orderBy('id')
            ->get();

        $categories = Project::query()
            ->when(! $isStaff, fn ($q) => $q->where('status', 'published'))
            ->distinct()->orderBy('category')->pluck('category');

        return response()->json([
            'data' => $projects->map(fn (Project $p) => $this->present($p, $isStaff ? null : $p->enrollments->first())),
            'categories' => $categories,
        ]);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $user = $request->user();
        $isStaff = $user->hasRole(User::ROLE_TEACHER, User::ROLE_PRINCIPAL);

        abort_if(! $isStaff && $project->status !== 'published', 404);
        abort_if(! $isStaff && $project->semester !== null && $project->semester !== $user->semesterScope(), 404);

        if (! $isStaff) {
            $enrollment = $project->enrollments()->where('user_id', $user->id)->first();

            return response()->json(['data' => $this->present($project, $enrollment)]);
        }

        $total = count($project->milestones);
        $students = $project->enrollments()->with('user:id,name,email,semester')->latest('updated_at')->get()
            ->map(fn (ProjectEnrollment $e) => [
                'student' => $e->user?->only(['id', 'name', 'email', 'semester']),
                'status' => $e->status,
                'progress' => $total ? (int) round(count($e->completed_milestones ?? []) / $total * 100) : 0,
                'started_at' => $e->started_at?->toIso8601String(),
                'completed_at' => $e->completed_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $this->present($project) + ['students' => $students]]);
    }

    public function store(ProjectRequest $request): JsonResponse
    {
        $data = $request->validated();

        $project = new Project($data + ['tech' => [], 'status' => 'published']);
        $project->slug = $this->uniqueSlug($data['title']);
        $project->created_by = $request->user()->id;
        $project->save();

        return response()->json(['data' => $this->present($project)], 201);
    }

    public function update(ProjectRequest $request, Project $project): JsonResponse
    {
        $project->fill($request->validated())->save();

        return response()->json(['data' => $this->present($project)]);
    }

    public function destroy(Project $project): JsonResponse
    {
        // Removing a project also removes student progress (FK cascade), so
        // this is principal-only; teachers archive instead.
        $project->delete();

        return response()->json(['ok' => true]);
    }

    /** Student starts a project. Idempotent. */
    public function enroll(Request $request, Project $project): JsonResponse
    {
        abort_if($project->status !== 'published', 422, 'This project is not open for enrolment.');
        abort_if($project->semester !== null && $project->semester !== $request->user()->semesterScope(), 404);

        $enrollment = ProjectEnrollment::query()->firstOrCreate(
            ['project_id' => $project->id, 'user_id' => $request->user()->id],
            ['status' => 'in_progress', 'completed_milestones' => [], 'started_at' => now()]
        );

        return response()->json(['data' => $this->present($project, $enrollment)], $enrollment->wasRecentlyCreated ? 201 : 200);
    }

    public function unenroll(Request $request, Project $project): JsonResponse
    {
        $project->enrollments()->where('user_id', $request->user()->id)->delete();

        return response()->json(['data' => $this->present($project)]);
    }

    public function updateProgress(Request $request, Project $project): JsonResponse
    {
        $total = count($project->milestones);
        $data = $request->validate([
            'completed_milestones' => ['present', 'array', 'max:'.$total],
            'completed_milestones.*' => ['integer', 'distinct', 'min:0', 'max:'.max($total - 1, 0)],
        ]);

        $enrollment = $project->enrollments()->where('user_id', $request->user()->id)->first();
        abort_unless($enrollment, 409, 'Start the project before tracking milestones.');

        $done = collect($data['completed_milestones'])->map(fn ($i) => (int) $i)->unique()->sort()->values()->all();
        $complete = $total > 0 && count($done) === $total;

        $enrollment->fill([
            'completed_milestones' => $done,
            'status' => $complete ? 'completed' : 'in_progress',
            'completed_at' => $complete ? ($enrollment->completed_at ?? now()) : null,
        ])->save();

        return response()->json(['data' => $this->present($project, $enrollment)]);
    }

    private function present(Project $project, ?ProjectEnrollment $enrollment = null): array
    {
        $total = count($project->milestones ?? []);
        $done = $enrollment?->completed_milestones ?? [];

        return [
            'id' => $project->id,
            'slug' => $project->slug,
            'title' => $project->title,
            'description' => $project->description,
            'category' => $project->category,
            'difficulty' => $project->difficulty,
            'estimated_hours' => $project->estimated_hours,
            'tech' => $project->tech ?? [],
            'milestones' => $project->milestones ?? [],
            'semester' => $project->semester,
            'status' => $project->status,
            'enrollments_count' => $project->enrollments_count ?? null,
            'completed_count' => $project->completed_count ?? null,
            'enrollment' => $enrollment ? [
                'status' => $enrollment->status,
                'completed_milestones' => $done,
                'progress' => $total ? (int) round(count($done) / $total * 100) : 0,
                'started_at' => $enrollment->started_at?->toIso8601String(),
            ] : null,
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'project';
        $slug = $base;
        $i = 2;
        while (Project::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
