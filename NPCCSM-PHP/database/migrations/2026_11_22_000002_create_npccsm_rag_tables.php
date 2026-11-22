<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rag_documents', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('source_type', 50);
            $table->string('source_name');
            $table->string('source_id')->nullable();
            $table->longText('chunk_text');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index('source_type');
        });

        DB::statement('ALTER TABLE rag_documents ADD FULLTEXT rag_documents_chunk_fulltext (chunk_text)');

        Schema::create('rag_ingestion_jobs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('source_type', 50);
            $table->string('source_name');
            $table->string('status', 50)->default('pending');
            $table->unsignedInteger('chunks_created')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['status', 'created_at']);
        });

        Schema::create('rag_query_logs', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->text('query_text');
            $table->json('retrieved_chunks')->nullable();
            $table->boolean('response_generated')->default(true);
            $table->unsignedInteger('latency_ms')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rag_query_logs');
        Schema::dropIfExists('rag_ingestion_jobs');
        Schema::dropIfExists('rag_documents');
    }
};
