<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeacherSubmission extends Model
{
    protected $table = 'teacher_submissions';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'covered_topic' => 'array',
            'mandatory_note' => 'array',
            'lecture_date' => 'date',
            'created_at' => 'datetime',
        ];
    }
}
