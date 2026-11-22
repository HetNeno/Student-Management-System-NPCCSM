<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notice extends Model
{
    public const PRIORITIES = ['normal', 'important', 'urgent'];

    protected $fillable = ['title', 'body', 'semester', 'subject_code', 'priority', 'expires_at'];

    protected function casts(): array
    {
        return [
            'semester' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function poster(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    /** Not expired. */
    public function scopeActive(Builder $q): Builder
    {
        return $q->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }

    /** For a semester: notices for that semester plus college-wide ones. */
    public function scopeForSemester(Builder $q, ?int $semester): Builder
    {
        return $semester === null ? $q : $q->where(fn ($w) => $w->whereNull('semester')->orWhere('semester', $semester));
    }
}
