<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    private function lecturePayload(): array
    {
        return [
            'subject_code' => 'CAM301-3C',
            'title' => 'Object Oriented Programming using Java',
            'semester' => 5,
            'lecture_date' => '2026-11-20',
            'covered_topic' => ['JDK, JRE, and JVM architecture'],
            'mandatory_note' => ['JDK, JRE, and JVM architecture' => 'Draw the JVM diagram.'],
        ];
    }

    public function test_student_cannot_use_teacher_or_principal_endpoints(): void
    {
        $this->actingAs($this->makeUser('student'));

        $this->postJson('/api/faculty-lecture-updates', $this->lecturePayload())->assertForbidden();
        $this->postJson('/api/syllabus-progress', [])->assertForbidden();
        $this->postJson('/api/projects', [])->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->postJson('/api/users/teachers', [])->assertForbidden();
        $this->getJson('/api/rag/stats')->assertForbidden();
        $this->deleteJson('/api/rag/reset')->assertForbidden();
    }

    public function test_teacher_cannot_use_principal_only_endpoints(): void
    {
        $this->actingAs($this->makeUser('teacher'));

        $this->getJson('/api/users')->assertForbidden();
        $this->postJson('/api/users/teachers', [])->assertForbidden();
        $this->deleteJson('/api/rag/reset')->assertForbidden();
        $this->postJson('/api/rag/ingest/syllabus')->assertForbidden();
    }

    public function test_teacher_publishes_lecture_update_and_json_columns_round_trip_as_arrays(): void
    {
        $this->actingAs($this->makeUser('teacher'));

        $this->postJson('/api/faculty-lecture-updates', $this->lecturePayload())->assertCreated();

        $rows = $this->getJson('/api/faculty-lecture-updates')->assertOk()->json();
        $this->assertCount(1, $rows);
        // Regression: these used to come back as JSON strings, so the SPA showed 0% coverage.
        $this->assertSame(['JDK, JRE, and JVM architecture'], $rows[0]['covered_topic']);
        $this->assertSame('Draw the JVM diagram.', $rows[0]['mandatory_note']['JDK, JRE, and JVM architecture']);
        $this->assertSame('2026-11-20', $rows[0]['lecture_date']);
    }

    public function test_principal_creates_teacher_account_and_can_disable_it(): void
    {
        $this->actingAs($this->makeUser('principal'));

        $id = $this->postJson('/api/users/teachers', [
            'name' => 'Prof. Mehta',
            'email' => 'Mehta@npccsm.test',
            'password' => 'Teach1234',
            'role' => 'principal', // must be ignored
        ])->assertCreated()->assertJsonPath('data.role', 'teacher')->json('data.id');

        $teacher = User::findOrFail($id);
        $this->assertSame('mehta@npccsm.test', $teacher->email);
        $this->assertSame('teacher', $teacher->role);

        $this->patchJson("/api/users/{$id}/status", ['status' => 'disabled'])->assertOk();
        $this->assertSame('disabled', $teacher->fresh()->status);
    }

    public function test_principal_accounts_cannot_be_disabled_via_api(): void
    {
        $principal = $this->makeUser('principal');
        $other = $this->makeUser('principal');
        $this->actingAs($principal);

        $this->patchJson("/api/users/{$other->id}/status", ['status' => 'disabled'])->assertForbidden();
    }

    public function test_disabled_user_with_live_session_is_logged_out(): void
    {
        $student = $this->makeUser('student');
        $this->actingAs($student);
        $student->status = 'disabled';
        $student->save();

        $this->getJson('/api/auth/me')->assertForbidden();
        $this->assertGuest();
    }
}
