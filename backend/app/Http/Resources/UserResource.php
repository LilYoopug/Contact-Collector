<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Transforms snake_case database fields to camelCase for frontend TypeScript interfaces.
     * Sensitive fields (password, remember_token) are automatically excluded.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role,
            // Story 9-2 FIX: Return relative path for Vite proxy to work
            // In dev: Vite proxies /storage/* to backend
            // In prod: Same-origin or configure web server for CORS
            'avatarUrl' => $this->avatar_url,
            // Story 8.7 FIX: Include contact count for each user (BUG-001)
            'totalContacts' => $this->contacts_count ?? 0,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
            'lastLoginAt' => $this->last_login_at?->toIso8601String(),
        ];
    }
}
