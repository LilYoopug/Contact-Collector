<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Migration to merge 'api' source with 'form' source.
 * 
 * This migration updates all contacts that have source='api' to source='form',
 * effectively merging API-submitted contacts with web form contacts.
 * 
 * Rationale: The 'api' source was redundant since API-submitted contacts
 * are essentially web form submissions and should be tracked together.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update all contacts with source='api' to source='form'
        $updated = DB::table('contacts')
            ->where('source', 'api')
            ->update(['source' => 'form']);
        
        if ($updated > 0) {
            echo "Updated {$updated} contact(s) from source='api' to source='form'\n";
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Note: Cannot reliably revert this migration since we don't know
        // which 'form' contacts were originally 'api' contacts.
        // If needed, this would require a backup of the original source values.
        echo "Warning: Cannot revert source='api' to source='form' merge - data has been merged.\n";
    }
};
