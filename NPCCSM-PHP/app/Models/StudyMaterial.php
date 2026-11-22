<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudyMaterial extends Model
{
    public const CATEGORIES = ['notes', 'assignment', 'question_bank', 'reference', 'other'];

    protected $fillable = ['title', 'description', 'semester', 'subject_code', 'category'];

    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return [
            'semester' => 'integer',
            'size_bytes' => 'integer',
            'indexed_for_ai' => 'boolean',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
