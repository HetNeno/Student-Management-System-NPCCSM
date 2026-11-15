<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RagIngestionJob extends Model
{
    protected $table = 'rag_ingestion_jobs';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'chunks_created' => 'integer',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
