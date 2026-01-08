<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Migration to add 'api' to the contacts source enum.
 * 
 * This fixes Story 7.7/7.9 (Public Contact Submission API with source tracking)
 * where the PublicContactController sets source='api' but the original 
 * migration only allowed: ['ocr_list', 'form', 'import', 'manual']
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For SQLite, we need to recreate the table since CHECK constraints can't be altered
        if (DB::getDriverName() === 'sqlite') {
            // Step 1: Create a new table with the updated enum
            Schema::create('contacts_new', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('full_name');
                $table->string('phone');
                $table->string('email')->nullable();
                $table->string('company')->nullable();
                $table->string('job_title')->nullable();
                $table->enum('source', ['ocr_list', 'form', 'import', 'manual', 'api'])->default('manual');
                $table->enum('consent', ['opt_in', 'opt_out', 'unknown'])->default('unknown');
                $table->timestamps();

                // Indexes for duplicate detection (per-user)
                $table->index(['user_id', 'email']);
                $table->index(['user_id', 'phone']);
            });

            // Step 2: Copy data from old table
            DB::statement('INSERT INTO contacts_new SELECT * FROM contacts');

            // Step 3: Drop old table
            Schema::drop('contacts');

            // Step 4: Rename new table
            Schema::rename('contacts_new', 'contacts');
        } else {
            // For MySQL/PostgreSQL, we can modify the column directly
            Schema::table('contacts', function (Blueprint $table) {
                $table->enum('source', ['ocr_list', 'form', 'import', 'manual', 'api'])
                    ->default('manual')
                    ->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // For SQLite, recreate without 'api'
        if (DB::getDriverName() === 'sqlite') {
            Schema::create('contacts_old', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('full_name');
                $table->string('phone');
                $table->string('email')->nullable();
                $table->string('company')->nullable();
                $table->string('job_title')->nullable();
                $table->enum('source', ['ocr_list', 'form', 'import', 'manual'])->default('manual');
                $table->enum('consent', ['opt_in', 'opt_out', 'unknown'])->default('unknown');
                $table->timestamps();

                $table->index(['user_id', 'email']);
                $table->index(['user_id', 'phone']);
            });

            // Copy data, converting 'api' to 'manual'
            DB::statement("INSERT INTO contacts_old SELECT id, user_id, full_name, phone, email, company, job_title, 
                CASE WHEN source = 'api' THEN 'manual' ELSE source END, consent, created_at, updated_at FROM contacts");

            Schema::drop('contacts');
            Schema::rename('contacts_old', 'contacts');
        } else {
            Schema::table('contacts', function (Blueprint $table) {
                $table->enum('source', ['ocr_list', 'form', 'import', 'manual'])
                    ->default('manual')
                    ->change();
            });
        }
    }
};
