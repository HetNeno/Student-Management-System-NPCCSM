<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Mockery is not installed; console output mocking is not needed. */
    public $mockConsoleOutput = false;

    /**
     * Runs before RefreshDatabase's migrate:fresh. Hard stop if the test
     * config ever points at anything but the throwaway test database.
     */
    public function createApplication()
    {
        $app = parent::createApplication();

        $config = $app['config'];
        $db = $config->get('database.connections.'.$config->get('database.default').'.database');
        if ($db !== 'npccsm_test') {
            throw new \RuntimeException("Refusing to run tests against database '{$db}'. Tests must use npccsm_test.");
        }

        return $app;
    }

    protected function setUp(): void
    {
        parent::setUp();

        // CSRF is exercised explicitly in AuthTest; other tests focus on behaviour.
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
    }

    protected function makeUser(string $role, array $attributes = []): User
    {
        $user = new User(array_merge([
            'name' => ucfirst($role).' User',
            'email' => $role.'-'.uniqid().'@npccsm.test',
            'password' => 'Secret123',
            'semester' => $role === 'student' ? 5 : null,
        ], $attributes));
        $user->username = $user->email;
        $user->role = $role;
        $user->status = $attributes['status'] ?? User::STATUS_ACTIVE;
        $user->save();

        return $user;
    }
}
