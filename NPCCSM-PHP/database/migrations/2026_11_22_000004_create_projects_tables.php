<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description');
            $table->string('category', 50);
            $table->enum('difficulty', ['Beginner', 'Intermediate', 'Advanced']);
            $table->string('estimated_hours', 50)->nullable();
            $table->json('tech');
            $table->json('milestones');
            $table->unsignedTinyInteger('semester')->nullable();
            $table->enum('status', ['published', 'draft', 'archived'])->default('published');
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['status', 'category']);
        });

        Schema::create('project_enrollments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->uuid('user_id');
            $table->enum('status', ['in_progress', 'completed'])->default('in_progress');
            $table->json('completed_milestones');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['project_id', 'user_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_enrollments');
        Schema::dropIfExists('projects');
    }
};
