<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ApiKeyResource
 * 
 * Story 7.2: API Key Generation Endpoint
 * Story 7.3: API Key List and View
 * 
 * Transforms API key model data for frontend consumption.
 * NEVER exposes the key_hash field.
 */
class ApiKeyResource extends JsonResource
{
    /**
     * The plaintext key (only set during creation).
     */
    protected ?string $plaintextKey = null;

    /**
     * Set the plaintext key for one-time display.
     */
    public function withPlaintextKey(string $key): self
    {
        $this->plaintextKey = $key;
        return $this;
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => (string) $this->id,
            'name' => $this->name,
            'maskedKey' => $this->getMaskedKey(),
            'lastUsedAt' => $this->last_used_at?->toIso8601String(),
            'createdAt' => $this->created_at->toIso8601String(),
        ];

        // Only include plaintext key when explicitly set (during creation)
        if ($this->plaintextKey !== null) {
            $data['key'] = $this->plaintextKey;
        }

        return $data;
    }

    /**
     * Get the masked key for display.
     * Format: cc_live_****...XXXX (last 4 chars visible)
     */
    protected function getMaskedKey(): string
    {
        if ($this->key_suffix) {
            return 'cc_live_****...' . $this->key_suffix;
        }
        
        return 'cc_live_****...****';
    }
}
