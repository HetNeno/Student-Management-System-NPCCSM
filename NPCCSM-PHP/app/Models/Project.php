<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    public const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
    public const STATUSES = ['published', 'draft', 'archived'];

    protected $fillable = [
        'slug',
        'title',
        'description',
        'category',
        'difficulty',
        'estimated_hours',
        'tech',
        'milestones',
        'semester',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'tech' => 'array',
            'milestones' => 'array',
            'semester' => 'integer',
        ];
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(ProjectEnrollment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
