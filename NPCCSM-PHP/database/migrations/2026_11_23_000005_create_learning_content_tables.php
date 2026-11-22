<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive: faculty study materials, notices, student revision tracking and
 * semester scoping for the AI knowledge base.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('study_materials', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('semester');
            $table->string('subject_code')->nullable();
            $table->enum('category', ['notes', 'assignment', 'question_bank', 'reference', 'other'])->default('notes');
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type', 150);
            $table->unsignedBigInteger('size_bytes');
            $table->boolean('indexed_for_ai')->default(false);
            $table->uuid('uploaded_by')->nullable();
            $table->timestamps();

            $table->foreign('uploaded_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['semester', 'subject_code']);
        });

        Schema::create('notices', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->unsignedTinyInteger('semester')->nullable(); // null = all semesters
            $table->string('subject_code')->nullable();
            $table->enum('priority', ['normal', 'important', 'urgent'])->default('normal');
            $table->timestamp('expires_at')->nullable();
            $table->uuid('posted_by')->nullable();
            $table->timestamps();

            $table->foreign('posted_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['semester', 'created_at']);
        });

        Schema::create('student_topic_progress', function (Blueprint $table): void {
            $table->id();
            $table->uuid('user_id');
            $table->string('subject_code');
            $table->string('topic', 500);
            $table->char('topic_hash', 40); // sha1(topic) for a compact unique key
            $table->timestamp('revised_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['user_id', 'subject_code', 'topic_hash']);
        });

        Schema::table('rag_documents', function (Blueprint $table): void {
            $table->unsignedTinyInteger('semester')->nullable()->after('source_id');
            $table->index(['semester', 'source_type']);
        });
    }

    public function down(): void
    {
        Schema::table('rag_documents', function (Blueprint $table): void {
            $table->dropIndex(['semester', 'source_type']);
            $table->dropColumn('semester');
        });
        Schema::dropIfExists('student_topic_progress');
        Schema::dropIfExists('notices');
        Schema::dropIfExists('study_materials');
    }
};
