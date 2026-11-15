<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RagQueryLog extends Model
{
    protected $table = 'rag_query_logs';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'retrieved_chunks' => 'array',
            'response_generated' => 'boolean',
            'latency_ms' => 'integer',
            'created_at' => 'datetime',
        ];
    }
}
