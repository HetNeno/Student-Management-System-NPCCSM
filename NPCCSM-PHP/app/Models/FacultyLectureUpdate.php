<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacultyLectureUpdate extends Model
{
    protected $table = 'faculty_lecture_updates';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'covered_topic' => 'array',
            'mandatory_note' => 'array',
            'semester' => 'integer',
            'lecture_date' => 'date:Y-m-d',
            'created_at' => 'datetime',
        ];
    }
}
