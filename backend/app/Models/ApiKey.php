<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ApiKey Model
 * 
 * Story 7.1: API Key Model and Migration
 * Represents an API key for external web form integrations.
 */
class ApiKey extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'key_hash',
        'key_suffix',
        'last_used_at',
        'revoked_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * 
     * SECURITY: key_hash must never be exposed in API responses.
     *
     * @var list<string>
     */
    protected $hidden = [
        'key_hash',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the API key.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the API key has been revoked.
     */
    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    /**
     * Scope a query to only include active (non-revoked) keys.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('revoked_at');
    }

    /**
     * Generate a new API key.
     * 
     * @return array{plaintext: string, hash: string, suffix: string}
     */
    public static function generateKey(): array
    {
        // Generate 16 random bytes = 32 hex characters
        $randomPart = bin2hex(random_bytes(16));
        $plaintext = 'cc_live_' . $randomPart; // Total: 40 characters
        
        return [
            'plaintext' => $plaintext,
            'hash' => hash('sha256', $plaintext),
            'suffix' => substr($randomPart, -4), // Last 4 chars for display
        ];
    }

    /**
     * Find an API key by its plaintext value.
     * 
     * @param string $plaintext The plaintext API key
     * @return static|null
     */
    public static function findByPlaintext(string $plaintext): ?static
    {
        $hash = hash('sha256', $plaintext);
        
        return static::where('key_hash', $hash)
            ->whereNull('revoked_at')
            ->first();
    }
}
