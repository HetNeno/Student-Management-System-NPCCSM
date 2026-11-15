<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyllabusHistory extends Model
{
    protected $table = 'syllabus_history';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'covered_topics' => 'array',
            'topic_notes' => 'array',
            'semester' => 'integer',
            'lecture_date' => 'date',
            'created_at' => 'datetime',
        ];
    }
}
