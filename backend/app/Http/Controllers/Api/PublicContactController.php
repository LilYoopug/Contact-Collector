<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StorePublicContactRequest;
use App\Http\Resources\ContactResource;
use App\Services\DuplicateDetectionService;
use Illuminate\Http\JsonResponse;

/**
 * PublicContactController
 * 
 * Story 7.7: Public Contact Submission API
 * Handles contact submissions from external web forms via API key authentication.
 * Story 8-10: Uses DuplicateDetectionService for consistent duplicate checking.
 */
class PublicContactController extends Controller
{
    /**
     * Store a new contact submitted via public API.
     * 
     * This endpoint:
     * - Validates API key via middleware
     * - Checks for duplicate contacts using DuplicateDetectionService (Story 8-10)
     * - Creates contact with source='api' for tracking (FR54)
     * - Updates API key's last_used_at timestamp
     */
    public function store(StorePublicContactRequest $request, DuplicateDetectionService $duplicateService): JsonResponse
    {
        $user = auth()->user();
        $validated = $request->validatedForStorage();

        // Duplicate detection using centralized service (Story 8-10)
        $existing = $duplicateService->findDuplicate(
            $user->id,
            $validated['phone'],
            $validated['email'] ?? null
        );

        if ($existing) {
            return response()->json([
                'message' => 'Duplicate contact detected',
                'existing' => new ContactResource($existing),
            ], 409);
        }

        // INTEGRITY FIX: Use 'api' source for public API submissions (Story 7.9)
        $contact = $user->contacts()->create([
            'full_name' => $validated['full_name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'company' => $validated['company'],
            'job_title' => $validated['job_title'],
            'source' => 'api',
            'consent' => 'unknown',
        ]);

        // Update API key's last_used_at timestamp
        $apiKey = $request->attributes->get('api_key');
        if ($apiKey) {
            $apiKey->update(['last_used_at' => now()]);
        }

        return response()->json([
            'data' => new ContactResource($contact),
            'message' => 'Contact created successfully',
        ], 201);
    }
}
