<?php

namespace Tests\Feature;

use App\Models\Notice;
use App\Models\Project;
use App\Models\StudyMaterial;
use App\Services\Rag\RagService;
use Database\Seeders\CourseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A student registered in Semester 5 must not see or access any other
 * semester's content, whatever the client sends.
 */
class SemesterLockTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CourseSeeder::class);
        Storage::fake('local');
    }

    private function lecture(int $semester, string $code): array
    {
        return ['subject_code' => $code, 'title' => "Subject {$code}", 'semester' => $semester,
            'lecture_date' => '2026-11-20', 'covered_topic' => ['Topic A'], 'mandatory_note' => ['Topic A' => "Note for sem {$semester}"]];
    }

    public function test_courses_are_limited_to_the_students_semester_even_if_another_is_requested(): void
    {
        $this->actingAs($this->makeUser('student', ['semester' => 5]));

        $codes = collect($this->getJson('/api/courses?semester=6')->assertOk()->json())->pluck('semester')->unique()->values()->all();
        $this->assertSame([5], $codes);
    }

    public function test_semester_six_curriculum_is_present(): void
    {
        $this->actingAs($this->makeUser('student', ['semester' => 6]));

        $codes = collect($this->getJson('/api/courses')->json())->pluck('subject_code')->all();
        $this->assertEqualsCanonicalizing(['CAM304-3C', 'CAM305-3C', 'CAM306-3C', 'CAE303-3C', 'AEC301-3C', 'SEC351-3C'], $codes);
    }

    public function test_lecture_updates_are_filtered_by_semester(): void
    {
        $this->actingAs($this->makeUser('teacher'));
        $this->postJson('/api/faculty-lecture-updates', $this->lecture(5, 'CAM301-3C'))->assertCreated();
        $this->postJson('/api/faculty-lecture-updates', $this->lecture(6, 'CAM304-3C'))->assertCreated();

        $this->actingAs($this->makeUser('student', ['semester' => 5]));
        $rows = $this->getJson('/api/faculty-lecture-updates')->json();
        $this->assertCount(1, $rows);
        $this->assertSame('CAM301-3C', $rows[0]['subject_code']);
    }

    public function test_projects_for_other_semesters_are_hidden_and_not_enrollable(): void
    {
        $other = Project::create(['slug' => 'sem6-only', 'title' => 'Sem 6 capstone', 'description' => 'Only for semester six students.',
            'category' => 'Web', 'difficulty' => 'Advanced', 'tech' => [], 'milestones' => ['x'], 'semester' => 6, 'status' => 'published']);
        Project::create(['slug' => 'any-sem', 'title' => 'Open project', 'description' => 'Open to every semester.',
            'category' => 'Web', 'difficulty' => 'Beginner', 'tech' => [], 'milestones' => ['x'], 'semester' => null, 'status' => 'published']);

        $this->actingAs($this->makeUser('student', ['semester' => 5]));
        $this->assertSame(['Open project'], array_column($this->getJson('/api/projects')->json('data'), 'title'));
        $this->getJson("/api/projects/{$other->id}")->assertNotFound();
        $this->postJson("/api/projects/{$other->id}/enrollment")->assertNotFound();
    }

    public function test_materials_and_notices_are_semester_scoped_and_downloads_are_guarded(): void
    {
        $this->actingAs($this->makeUser('teacher'));
        $m5 = $this->post('/api/materials', ['title' => 'Java notes', 'semester' => 5, 'subject_code' => 'CAM301-3C', 'category' => 'notes',
            'file' => UploadedFile::fake()->createWithContent('java.txt', str_repeat('Java JVM bytecode and class loading explained. ', 5))],
            ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        $m6 = $this->post('/api/materials', ['title' => 'DWDM notes', 'semester' => 6, 'category' => 'notes',
            'file' => UploadedFile::fake()->createWithContent('dw.txt', str_repeat('Snowflake schema and fact tables explained. ', 5))],
            ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        $this->postJson('/api/notices', ['title' => 'Sem 6 viva', 'body' => 'Viva on Monday.', 'semester' => 6, 'priority' => 'urgent'])->assertCreated();
        $this->postJson('/api/notices', ['title' => 'College holiday', 'body' => 'Closed on Friday.', 'semester' => null, 'priority' => 'normal'])->assertCreated();

        $this->actingAs($this->makeUser('student', ['semester' => 5]));
        $this->assertSame([$m5], array_column($this->getJson('/api/materials?semester=6')->json('data'), 'id'));
        $this->get("/api/materials/{$m5}/download")->assertOk();
        $this->get("/api/materials/{$m6}/download")->assertNotFound();
        $this->assertSame(['College holiday'], array_column($this->getJson('/api/notices')->json('data'), 'title'));
    }

    public function test_material_subject_must_match_semester_and_students_cannot_upload(): void
    {
        $this->actingAs($this->makeUser('teacher'));
        $this->post('/api/materials', ['title' => 'Wrong', 'semester' => 5, 'subject_code' => 'CAM304-3C', 'category' => 'notes',
            'file' => UploadedFile::fake()->createWithContent('a.txt', 'hello world')], ['Accept' => 'application/json'])->assertStatus(422);

        $this->actingAs($this->makeUser('student', ['semester' => 5]));
        $this->post('/api/materials', ['title' => 'Mine', 'semester' => 5, 'category' => 'notes',
            'file' => UploadedFile::fake()->createWithContent('a.txt', 'hello world')], ['Accept' => 'application/json'])->assertForbidden();
        $this->postJson('/api/notices', ['title' => 'x', 'body' => 'yyy', 'priority' => 'normal'])->assertForbidden();
    }

    public function test_ai_retrieval_never_returns_other_semester_content(): void
    {
        Http::fake(['api.groq.com/*' => Http::response(['choices' => [['message' => ['content' => 'ok']]]])]);
        $rag = app(RagService::class);
        $rag->ingest(['Snowflake schema normalises dimension tables into sub-dimensions.'], 'syllabus', 'CAM304-3C DWDM', [], 'notes', semester: 6);
        $rag->ingest(['Snowflake as a name of a Java project idea for semester five students.'], 'syllabus', 'CAM301-3C Java', [], 'notes', semester: 5);

        $this->actingAs($this->makeUser('student', ['semester' => 5]));
        $chunks = $this->postJson('/api/rag/query', ['query' => 'snowflake', 'semester' => 6])->assertOk()->json('chunks');

        $this->assertNotEmpty($chunks);
        $this->assertSame([5], array_values(array_unique(array_column($chunks, 'semester'))));
        Http::assertSent(fn (Request $r) => str_contains($r['messages'][0]['content'], 'BCA Semester 5')
            && str_contains($r['messages'][0]['content'], 'Correction:'));
    }

    public function test_published_notice_and_lecture_notes_become_searchable(): void
    {
        $this->actingAs($this->makeUser('teacher'));
        $this->postJson('/api/faculty-lecture-updates', $this->lecture(5, 'CAM301-3C'))->assertCreated();
        $this->postJson('/api/notices', ['title' => 'Assignment deadline', 'body' => 'Submit the Java assignment by Friday.', 'semester' => 5, 'priority' => 'important'])->assertCreated();

        $types = \Illuminate\Support\Facades\DB::table('rag_documents')->where('semester', 5)->pluck('source_type')->unique()->sort()->values()->all();
        $this->assertSame(['lecture', 'notice'], $types);
    }

    public function test_principal_can_move_a_student_to_another_semester(): void
    {
        $student = $this->makeUser('student', ['semester' => 5]);
        $this->actingAs($this->makeUser('principal'));
        $this->patchJson("/api/users/{$student->id}/semester", ['semester' => 6])->assertOk()->assertJsonPath('data.semester', 6);

        $this->actingAs($this->makeUser('teacher'));
        $this->patchJson("/api/users/{$student->id}/semester", ['semester' => 1])->assertForbidden();
    }

    public function test_revision_tracker_only_accepts_topics_from_the_students_semester(): void
    {
        $this->actingAs($this->makeUser('student', ['semester' => 5]));

        $this->postJson('/api/study/revisions', ['subject_code' => 'CAM301-3C', 'topic' => 'JDK, JRE, and JVM architecture', 'revised' => true])
            ->assertOk()->assertJsonPath('data.CAM301-3C.0', 'JDK, JRE, and JVM architecture');
        $this->postJson('/api/study/revisions', ['subject_code' => 'CAM304-3C', 'topic' => 'Apriori Algorithm', 'revised' => true])->assertNotFound();
        $this->postJson('/api/study/revisions', ['subject_code' => 'CAM301-3C', 'topic' => 'Made up topic', 'revised' => true])->assertStatus(422);
        $this->postJson('/api/study/revisions', ['subject_code' => 'CAM301-3C', 'topic' => 'JDK, JRE, and JVM architecture', 'revised' => false])
            ->assertOk()->assertJsonPath('data', []);
    }
}
