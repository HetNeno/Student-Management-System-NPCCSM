<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive: email login, account lifecycle and student profile fields.
 * Email is nullable so that any pre-existing rows survive; every account
 * created through the application always has one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('email')->nullable()->unique()->after('username');
            $table->enum('status', ['active', 'pending', 'disabled'])->default('active')->after('role');
            $table->unsignedTinyInteger('semester')->nullable()->after('department');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['status']);
            $table->dropUnique(['email']);
            $table->dropColumn(['email', 'status', 'semester', 'last_login_at']);
        });
    }
};
