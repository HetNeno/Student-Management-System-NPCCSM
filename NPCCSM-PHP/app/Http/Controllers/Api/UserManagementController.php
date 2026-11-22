<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Principal-only. This is the authorised path for creating teacher accounts;
 * the public signup endpoint can only ever create students.
 */
class UserManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['nullable', Rule::in([User::ROLE_STUDENT, User::ROLE_TEACHER])],
        ]);

        $users = User::query()
            ->whereIn('role', [User::ROLE_STUDENT, User::ROLE_TEACHER])
            ->when($validated['role'] ?? null, fn ($q, $role) => $q->where('role', $role))
            ->orderBy('role')
            ->orderBy('name')
            ->limit(500)
            ->get()
            ->map(fn (User $u) => $u->toPublicArray() + [
                'created_at' => $u->created_at?->toIso8601String(),
                'last_login_at' => $u->last_login_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $users]);
    }

    public function storeTeacher(Request $request): JsonResponse
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email', 'unique:users,username'],
            'department' => ['nullable', 'string', 'in:BCA,BBA'],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
        ]);

        $teacher = new User([
            'name' => $data['name'],
            'email' => $data['email'],
            'username' => $data['email'],
            'department' => $data['department'] ?? 'BCA',
            'password' => $data['password'],
        ]);
        $teacher->role = User::ROLE_TEACHER;
        $teacher->status = User::STATUS_ACTIVE;
        $teacher->save();

        return response()->json(['data' => $teacher->toPublicArray()], 201);
    }

    /** Principal promotes/moves a student between semesters (students cannot). */
    public function updateSemester(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['semester' => ['required', 'integer', 'between:1,6']]);
        abort_unless($user->role === User::ROLE_STUDENT, 422, 'Only students have a semester.');

        $user->semester = $data['semester'];
        $user->save();

        return response()->json(['data' => $user->toPublicArray()]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([User::STATUS_ACTIVE, User::STATUS_DISABLED])],
        ]);

        abort_if($user->role === User::ROLE_PRINCIPAL, 403, 'Principal accounts are managed from the server console.');

        $user->status = $data['status'];
        $user->save();

        return response()->json(['data' => $user->toPublicArray()]);
    }
}
