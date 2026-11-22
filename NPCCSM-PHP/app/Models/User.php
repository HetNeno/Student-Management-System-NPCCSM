<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasUuids;

    public const ROLE_STUDENT = 'student';
    public const ROLE_TEACHER = 'teacher';
    public const ROLE_PRINCIPAL = 'principal';
    public const ROLES = [self::ROLE_STUDENT, self::ROLE_TEACHER, self::ROLE_PRINCIPAL];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_PENDING = 'pending';
    public const STATUS_DISABLED = 'disabled';

    protected $table = 'users';

    /**
     * `role` and `status` are deliberately NOT mass-assignable. They are set
     * explicitly by server code so a request payload can never choose them.
     */
    protected $fillable = [
        'username',
        'email',
        'password',
        'name',
        'department',
        'semester',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'semester' => 'integer',
            'last_login_at' => 'datetime',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    /**
     * The only semester whose content this user may see. Students are locked
     * to the semester on their account; staff (null) may see every semester.
     * Every student-facing query filters by this; the SPA cannot override it.
     */
    public function semesterScope(): ?int
    {
        return $this->role === self::ROLE_STUDENT ? (int) ($this->semester ?: 0) : null;
    }

    /** Shape returned to the SPA. Never includes the password hash. */
    public function toPublicArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'username' => $this->username,
            'role' => $this->role,
            'status' => $this->status,
            'department' => $this->department,
            'semester' => $this->semester,
        ];
    }

    public function chatbotNotes(): HasMany
    {
        return $this->hasMany(ChatbotNote::class, 'user_id');
    }

    public function projectEnrollments(): HasMany
    {
        return $this->hasMany(ProjectEnrollment::class, 'user_id');
    }
}
