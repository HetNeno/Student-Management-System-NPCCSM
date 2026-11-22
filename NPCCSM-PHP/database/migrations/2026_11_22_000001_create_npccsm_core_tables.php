<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('username')->unique();
            $table->string('password');
            $table->enum('role', ['student', 'teacher', 'principal']);
            $table->string('name');
            $table->string('department')->nullable();
            $table->rememberToken();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->nullable();
            $table->index('role');
        });

        Schema::create('courses', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('subject_code')->unique();
            $table->string('title');
            $table->unsignedTinyInteger('semester');
            $table->string('type')->nullable();
            $table->string('icon_class')->nullable();
            $table->json('units');
            $table->timestamp('created_at')->useCurrent();
            $table->index('semester');
        });

        Schema::create('syllabus_progress', function (Blueprint $table): void {
            $table->string('subject_code')->primary();
            $table->string('title');
            $table->unsignedTinyInteger('semester');
            $table->json('covered_topics');
            $table->json('topic_notes');
            $table->text('overall_notes')->nullable();
            $table->string('faculty_name')->nullable();
            $table->date('last_updated')->nullable();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('semester');
        });

        Schema::create('syllabus_history', function (Blueprint $table): void {
            $table->bigIncrements('id');
            $table->string('subject_code');
            $table->string('title');
            $table->unsignedTinyInteger('semester');
            $table->string('faculty_name')->nullable();
            $table->date('lecture_date')->nullable();
            $table->json('covered_topics');
            $table->json('topic_notes');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_code', 'lecture_date']);
        });

        Schema::create('faculty_lecture_updates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('subject_code');
            $table->string('title');
            $table->unsignedTinyInteger('semester');
            $table->string('faculty_name')->nullable();
            $table->date('lecture_date')->nullable();
            $table->json('covered_topic');
            $table->json('mandatory_note');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_code', 'created_at']);
        });

        Schema::create('teacher_submissions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('subject_code');
            $table->date('lecture_date')->nullable();
            $table->json('covered_topic');
            $table->json('mandatory_note');
            $table->timestamp('created_at')->useCurrent();
            $table->index('subject_code');
        });

        Schema::create('chatbot_notes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('subject_code')->nullable();
            $table->json('notes');
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['user_id', 'subject_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_notes');
        Schema::dropIfExists('teacher_submissions');
        Schema::dropIfExists('faculty_lecture_updates');
        Schema::dropIfExists('syllabus_history');
        Schema::dropIfExists('syllabus_progress');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('users');
    }
};
