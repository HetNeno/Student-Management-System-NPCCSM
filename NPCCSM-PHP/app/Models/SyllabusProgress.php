<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyllabusProgress extends Model
{
    protected $table = 'syllabus_progress';

    protected $primaryKey = 'subject_code';

    protected $keyType = 'string';

    public $incrementing = false;

    public const CREATED_AT = null;

    protected function casts(): array
    {
        return [
            'covered_topics' => 'array',
            'topic_notes' => 'array',
            'semester' => 'integer',
            'last_updated' => 'date:Y-m-d',
            'updated_at' => 'datetime',
        ];
    }
}
