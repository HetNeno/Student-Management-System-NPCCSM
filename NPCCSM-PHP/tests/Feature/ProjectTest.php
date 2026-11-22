<?php

namespace Tests\Feature;

use App\Models\Project;
use Database\Seeders\ProjectCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_sees_only_published_projects_from_the_database(): void
    {
        $this->seed(ProjectCatalogSeeder::class);
        Project::query()->first()->update(['status' => 'draft']);
        $this->actingAs($this->makeUser('student'));

        $res = $this->getJson('/api/projects')->assertOk();

        $this->assertCount(5, $res->json('data'));
        $this->assertNotContains('draft', array_column($res->json('data'), 'status'));
        $this->assertNull($res->json('data.0.enrollment'));
    }

    public function test_empty_catalogue_returns_empty_list(): void
    {
        $this->actingAs($this->makeUser('student'));
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_filters_and_search(): void
    {
        $this->seed(ProjectCatalogSeeder::class);
        $this->actingAs($this->makeUser('student'));

        $this->assertSame(['Backend'], array_unique(array_column($this->getJson('/api/projects?category=Backend')->json('data'), 'category')));
        $this->assertCount(1, $this->getJson('/api/projects?search=Attendance')->json('data'));
    }

    public function test_student_starts_project_tracks_milestones_and_completes_it(): void
    {
        $this->seed(ProjectCatalogSeeder::class);
        $student = $this->makeUser('student');
        $this->actingAs($student);
        $project = Project::query()->first();
        $total = count($project->milestones);

        $this->patchJson("/api/projects/{$project->id}/enrollment", ['completed_milestones' => [0]])->assertStatus(409);

        $this->postJson("/api/projects/{$project->id}/enrollment")->assertCreated()->assertJsonPath('data.enrollment.status', 'in_progress');
        $this->postJson("/api/projects/{$project->id}/enrollment")->assertOk(); // idempotent
        $this->assertDatabaseCount('project_enrollments', 1);

        $this->patchJson("/api/projects/{$project->id}/enrollment", ['completed_milestones' => [0]])
            ->assertOk()->assertJsonPath('data.enrollment.progress', (int) round(100 / $total));

        $this->patchJson("/api/projects/{$project->id}/enrollment", ['completed_milestones' => range(0, $total - 1)])
            ->assertOk()->assertJsonPath('data.enrollment.status', 'completed');

        $this->patchJson("/api/projects/{$project->id}/enrollment", ['completed_milestones' => [$total + 3]])->assertStatus(422);

        $this->assertSame(100, $this->getJson('/api/projects')->json('data.0.enrollment.progress'));
    }

    public function test_teacher_creates_project_and_sees_student_progress(): void
    {
        $teacher = $this->makeUser('teacher');
        $student = $this->makeUser('student', ['name' => 'Ravi']);

        $this->actingAs($teacher);
        $id = $this->postJson('/api/projects', [
            'title' => 'Library Management System',
            'description' => 'A PHP and MySQL library app with issue/return tracking.',
            'category' => 'Web',
            'difficulty' => 'Beginner',
            'milestones' => ['Design schema', 'Build CRUD'],
            'tech' => ['PHP', 'MySQL'],
        ])->assertCreated()->assertJsonPath('data.slug', 'library-management-system')->json('data.id');

        $this->actingAs($student);
        $this->postJson("/api/projects/{$id}/enrollment")->assertCreated();

        $this->actingAs($teacher);
        $this->getJson("/api/projects/{$id}")->assertOk()
            ->assertJsonPath('data.students.0.student.name', 'Ravi')
            ->assertJsonPath('data.students.0.progress', 0);
        $this->getJson('/api/projects')->assertJsonPath('data.0.enrollments_count', 1);
    }

    public function test_only_principal_can_delete_projects(): void
    {
        $this->seed(ProjectCatalogSeeder::class);
        $project = Project::query()->first();

        $this->actingAs($this->makeUser('teacher'));
        $this->deleteJson("/api/projects/{$project->id}")->assertForbidden();

        $this->actingAs($this->makeUser('principal'));
        $this->deleteJson("/api/projects/{$project->id}")->assertOk();
        $this->assertModelMissing($project);
    }

    public function test_student_cannot_view_draft_project_detail(): void
    {
        $this->seed(ProjectCatalogSeeder::class);
        $project = Project::query()->first();
        $project->update(['status' => 'draft']);

        $this->actingAs($this->makeUser('student'));
        $this->getJson("/api/projects/{$project->id}")->assertNotFound();
    }
}
