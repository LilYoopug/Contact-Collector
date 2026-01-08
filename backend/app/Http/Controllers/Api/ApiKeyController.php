<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreApiKeyRequest;
use App\Http\Resources\ApiKeyResource;
use App\Models\ApiKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * ApiKeyController
 * 
 * Story 7.2: API Key Generation Endpoint
 * Story 7.3: API Key List and View
 * Story 7.5: Regenerate API Key
 * Story 7.6: Revoke API Key
 * 
 * Handles all API key management operations.
 */
class ApiKeyController extends Controller
{
    /**
     * Display a listing of the user's active API keys.
     * 
     * Story 7.3: API Key List and View
     * Returns only non-revoked keys, ordered by created_at DESC.
     */
    public function index(): AnonymousResourceCollection
    {
        $apiKeys = auth()->user()
            ->activeApiKeys()
            ->orderBy('created_at', 'desc')
            ->get();

        return ApiKeyResource::collection($apiKeys);
    }

    /**
     * Store a newly created API key.
     * 
     * Story 7.2: API Key Generation Endpoint
     * Generates a new API key with SHA-256 hash storage.
     * The plaintext key is returned ONCE in this response only.
     */
    public function store(StoreApiKeyRequest $request): JsonResponse
    {
        // Generate new key
        $keyData = ApiKey::generateKey();

        // Create API key record
        $apiKey = auth()->user()->apiKeys()->create([
            'name' => $request->input('name', 'Default'),
            'key_hash' => $keyData['hash'],
            'key_suffix' => $keyData['suffix'],
        ]);

        // Return with plaintext key (one-time only)
        $resource = (new ApiKeyResource($apiKey))->withPlaintextKey($keyData['plaintext']);

        return response()->json([
            'data' => $resource,
            'message' => 'API key created. Save this key now - it won\'t be shown again.',
        ], 201);
    }

    /**
     * Regenerate an existing API key.
     * 
     * Story 7.5: Regenerate API Key
     * Revokes the old key and creates a new one with the same name.
     * Uses transaction to ensure atomicity - if new key creation fails, old key is not revoked.
     */
    public function regenerate(string $id): JsonResponse
    {
        // Find existing key (must belong to user and not be revoked)
        $oldKey = auth()->user()
            ->apiKeys()
            ->whereNull('revoked_at')
            ->findOrFail($id);

        // Use transaction to ensure atomicity
        $result = DB::transaction(function () use ($oldKey) {
            // Revoke old key
            $oldKey->update(['revoked_at' => now()]);

            // Generate new key with same name
            $keyData = ApiKey::generateKey();

            $newKey = auth()->user()->apiKeys()->create([
                'name' => $oldKey->name,
                'key_hash' => $keyData['hash'],
                'key_suffix' => $keyData['suffix'],
            ]);

            return [
                'newKey' => $newKey,
                'plaintext' => $keyData['plaintext'],
            ];
        });

        // Return with plaintext key (one-time only)
        $resource = (new ApiKeyResource($result['newKey']))->withPlaintextKey($result['plaintext']);

        return response()->json([
            'data' => $resource,
            'message' => 'API key regenerated. The old key is now invalid.',
        ], 201);
    }

    /**
     * Revoke (soft delete) the specified API key.
     * 
     * Story 7.6: Revoke API Key
     * Sets revoked_at timestamp - key remains for audit trail.
     * Returns 404 JSON on not found, 204 No Content on success.
     */
    public function destroy(string $id): JsonResponse|Response
    {
        // Find existing key (must belong to user and not be revoked)
        $apiKey = auth()->user()
            ->apiKeys()
            ->whereNull('revoked_at')
            ->find($id);

        if (!$apiKey) {
            return response()->json([
                'message' => 'API key not found or already revoked',
            ], 404);
        }

        // Soft revoke - set revoked_at timestamp
        $apiKey->update(['revoked_at' => now()]);

        return response()->noContent(); // 204 No Content
    }
}
