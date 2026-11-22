<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function signupPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Asha Patel',
            'email' => 'Asha.Patel@Example.com',
            'semester' => 5,
            'password' => 'Secret123',
            'password_confirmation' => 'Secret123',
        ], $overrides);
    }

    public function test_student_can_register_and_record_is_stored_with_hashed_password(): void
    {
        $response = $this->postJson('/api/auth/register', $this->signupPayload());

        $response->assertCreated()
            ->assertJsonPath('user.role', 'student')
            ->assertJsonPath('user.email', 'asha.patel@example.com')
            ->assertJsonPath('redirect', '/student')
            ->assertJsonMissingPath('user.password');

        $row = DB::table('users')->where('email', 'asha.patel@example.com')->first();
        $this->assertNotNull($row);
        $this->assertSame('student', $row->role);
        $this->assertSame('active', $row->status);
        $this->assertSame(5, (int) $row->semester);
        $this->assertNotSame('Secret123', $row->password);
        $this->assertTrue(Hash::check('Secret123', $row->password));
        $this->assertStringStartsWith('$2y$', $row->password);
        $this->assertAuthenticated();
    }

    public function test_signup_ignores_a_privileged_role_sent_by_the_client(): void
    {
        $this->postJson('/api/auth/register', $this->signupPayload(['role' => 'principal', 'status' => 'active']))
            ->assertCreated()
            ->assertJsonPath('user.role', 'student');

        $this->assertSame(0, User::where('role', 'principal')->count());
    }

    public function test_duplicate_email_is_rejected_case_insensitively(): void
    {
        $this->postJson('/api/auth/register', $this->signupPayload())->assertCreated();
        $this->postJson('/api/auth/logout');

        $this->postJson('/api/auth/register', $this->signupPayload(['email' => 'ASHA.PATEL@example.com']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertSame(1, User::count());
    }

    public function test_invalid_signup_data_is_rejected(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'semester' => 9,
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertStatus(422)->assertJsonValidationErrors(['name', 'email', 'semester', 'password']);

        $this->assertSame(0, User::count());
    }

    public function test_login_with_valid_credentials_returns_role_dashboard(): void
    {
        $student = $this->makeUser('student', ['email' => 'stu@npccsm.test']);

        $this->postJson('/api/auth/login', ['email' => 'STU@npccsm.test', 'password' => 'Secret123'])
            ->assertOk()
            ->assertJsonPath('user.id', $student->id)
            ->assertJsonPath('redirect', '/student');

        $this->assertAuthenticatedAs($student);
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.role', 'student');
    }

    public function test_teacher_and_principal_are_redirected_to_their_dashboards(): void
    {
        $this->makeUser('teacher', ['email' => 't@npccsm.test']);
        $this->makeUser('principal', ['email' => 'p@npccsm.test']);

        $this->postJson('/api/auth/login', ['email' => 't@npccsm.test', 'password' => 'Secret123'])->assertJsonPath('redirect', '/teacher');
        $this->postJson('/api/auth/logout');
        $this->postJson('/api/auth/login', ['email' => 'p@npccsm.test', 'password' => 'Secret123'])->assertJsonPath('redirect', '/principal');
    }

    public function test_login_with_invalid_credentials_fails_with_generic_message(): void
    {
        $this->makeUser('student', ['email' => 'stu@npccsm.test']);

        $wrongPassword = $this->postJson('/api/auth/login', ['email' => 'stu@npccsm.test', 'password' => 'Wrong1234']);
        $unknownUser = $this->postJson('/api/auth/login', ['email' => 'nobody@npccsm.test', 'password' => 'Wrong1234']);

        $wrongPassword->assertStatus(422)->assertJsonValidationErrors(['email']);
        $unknownUser->assertStatus(422);
        $this->assertSame($wrongPassword->json('errors.email'), $unknownUser->json('errors.email'));
        $this->assertGuest();
    }

    public function test_disabled_account_cannot_log_in(): void
    {
        $this->makeUser('teacher', ['email' => 'off@npccsm.test', 'status' => 'disabled']);

        $this->postJson('/api/auth/login', ['email' => 'off@npccsm.test', 'password' => 'Secret123'])->assertForbidden();
        $this->assertGuest();
    }

    public function test_legacy_plaintext_password_never_authenticates(): void
    {
        $user = $this->makeUser('student', ['email' => 'legacy@npccsm.test']);
        DB::table('users')->where('id', $user->id)->update(['password' => 'plaintext123']);

        $this->postJson('/api/auth/login', ['email' => 'legacy@npccsm.test', 'password' => 'plaintext123'])->assertStatus(422);
        $this->assertGuest();
    }

    public function test_logout_ends_the_session(): void
    {
        $this->makeUser('student', ['email' => 'stu@npccsm.test']);
        $this->postJson('/api/auth/login', ['email' => 'stu@npccsm.test', 'password' => 'Secret123'])->assertOk();

        $this->postJson('/api/auth/logout')->assertOk();

        $this->assertGuest();
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }

    public function test_guests_get_json_401_not_redirects(): void
    {
        $this->get('/api/auth/me')->assertUnauthorized()->assertJson(['message' => 'Unauthenticated.']);
        $this->get('/api/projects')->assertUnauthorized();
    }

    public function test_login_is_rate_limited(): void
    {
        $this->makeUser('student', ['email' => 'stu@npccsm.test']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'stu@npccsm.test', 'password' => 'Wrong1234'])->assertStatus(422);
        }

        $this->postJson('/api/auth/login', ['email' => 'stu@npccsm.test', 'password' => 'Secret123'])->assertStatus(429);
    }

    /**
     * ValidateCsrfToken is skipped by Laravel when running unit tests, so we
     * assert it is wired into the API stack here; enforcement itself (419
     * without a token) is verified over real HTTP in the smoke test
     * (docs/testing.md).
     */
    public function test_api_routes_run_with_session_and_csrf_middleware(): void
    {
        $route = app('router')->getRoutes()->match(request()->create('/api/auth/register', 'POST'));
        $this->assertContains('api', $route->gatherMiddleware());
        $middleware = app(\Illuminate\Contracts\Http\Kernel::class)->getMiddlewareGroups()['api'];

        $this->assertContains(\Illuminate\Session\Middleware\StartSession::class, $middleware);
        $this->assertContains(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class, $middleware);
    }
}
