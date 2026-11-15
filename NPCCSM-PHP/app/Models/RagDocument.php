<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RagDocument extends Model
{
    protected $table = 'rag_documents';

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }
}
