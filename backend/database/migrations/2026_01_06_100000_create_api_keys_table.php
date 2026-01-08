<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Story 7.1: API Key Model and Migration
     * Creates the api_keys table for external web form integrations.
     */
    public function up(): void
    {
        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name', 255)->default('Default');
            $table->string('key_hash', 255)->unique();
            $table->string('key_suffix', 4)->nullable(); // Last 4 chars for display
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['user_id', 'revoked_at'], 'idx_api_keys_user_active');
            $table->index('key_hash', 'idx_api_keys_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('api_keys');
    }
};
