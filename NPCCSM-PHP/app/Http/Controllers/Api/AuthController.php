<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterStudentRequest;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** Dashboard path in the SPA for each role. */
    public const DASHBOARDS = [
        User::ROLE_STUDENT => '/student',
        User::ROLE_TEACHER => '/teacher',
        User::ROLE_PRINCIPAL => '/principal',
    ];

    /** Issues the XSRF-TOKEN cookie (added by ValidateCsrfToken on every response). */
    public function csrf(): JsonResponse
    {
        return response()->json(['ok' => true]);
    }

    public function register(RegisterStudentRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            $user = DB::transaction(function () use ($data): User {
                $user = new User([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'username' => $data['email'],
                    'password' => $data['password'], // hashed by the model cast
                    'department' => $data['department'] ?? 'BCA',
                    'semester' => $data['semester'],
                ]);
                // Server-decided, never taken from the request.
                $user->role = User::ROLE_STUDENT;
                $user->status = User::STATUS_ACTIVE;
                $user->save();

                return $user;
            });
        } catch (UniqueConstraintViolationException) {
            // Two simultaneous signups with the same email: the DB unique index wins.
            throw ValidationException::withMessages([
                'email' => 'An account with this email already exists. Try signing in instead.',
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'user' => $user->toPublicArray(),
            'redirect' => self::DASHBOARDS[$user->role],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::query()->where('email', $data['email'])->first();

        // Same message for "no such user" and "wrong password" so the endpoint
        // cannot be used to discover which emails are registered. The hash
        // check still runs for unknown users to keep response timing similar.
        $passwordOk = false;
        try {
            $hash = $user?->getAuthPassword() ?? Hash::make(Str::random(40));
            $passwordOk = Hash::check($data['password'], $hash);
        } catch (\RuntimeException) {
            // Stored value is not a recognised hash (e.g. a legacy plaintext
            // password). Never authenticate against it.
            $passwordOk = false;
        }

        if (! $user || ! $passwordOk) {
            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
        }

        if (! $user->isActive()) {
            $message = $user->status === User::STATUS_PENDING
                ? 'Your account is awaiting activation by the principal.'
                : 'Your account has been disabled. Contact the principal.';

            return response()->json(['message' => $message, 'errors' => ['email' => [$message]]], 403);
        }

        Auth::login($user, (bool) ($data['remember'] ?? false));
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'user' => $user->toPublicArray(),
            'redirect' => self::DASHBOARDS[$user->role],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $user->toPublicArray(),
            'redirect' => self::DASHBOARDS[$user->role],
        ]);
    }
}
