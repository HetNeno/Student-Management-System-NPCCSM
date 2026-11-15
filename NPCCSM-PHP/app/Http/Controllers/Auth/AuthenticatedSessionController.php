<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class AuthenticatedSessionController extends Controller
{
    public function create(): View
    {
        return view('auth.login');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'role' => ['required', Rule::in(['student', 'teacher', 'principal'])],
        ]);

        $user = User::query()
            ->whereRaw('LOWER(username) = LOWER(?)', [$validated['username']])
            ->where('role', $validated['role'])
            ->first();
        $storedPassword = $user?->getAuthPassword();
        $passwordInfo = $storedPassword === null ? null : password_get_info($storedPassword);

        if (
            ! $user
            || $storedPassword === null
            || empty($passwordInfo['algo'])
            || ! Hash::check($validated['password'], $storedPassword)
        ) {
            return back()
                ->withErrors(['username' => 'The provided credentials do not match our records.'])
                ->onlyInput('username', 'role');
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->intended($this->dashboardFor(Auth::user()->role));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    private function dashboardFor(string $role): string
    {
        return match ($role) {
            'student' => route('student.overview'),
            'teacher' => route('teacher.dashboard'),
            'principal' => route('principal.dashboard'),
        };
    }
}
