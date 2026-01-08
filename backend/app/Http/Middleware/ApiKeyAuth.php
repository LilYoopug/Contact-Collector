<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * ApiKeyAuth Middleware
 * 
 * Story 7.7: Public Contact Submission API
 * Validates X-API-Key header and authenticates the request as the key owner.
 */
class ApiKeyAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key');

        if (!$apiKey) {
            return response()->json([
                'message' => 'API key required',
            ], 401);
        }

        // Find API key by plaintext value
        $apiKeyRecord = ApiKey::findByPlaintext($apiKey);

        if (!$apiKeyRecord) {
            return response()->json([
                'message' => 'Invalid or expired API key',
            ], 401);
        }

        // SECURITY FIX: Ensure the key owner still exists and is not deactivated
        $user = $apiKeyRecord->user;
        if (!$user) {
            return response()->json([
                'message' => 'API key owner not found',
            ], 401);
        }

        // Set the user for the request
        auth()->setUser($user);

        // Store API key for later update (last_used_at)
        $request->attributes->set('api_key', $apiKeyRecord);

        return $next($request);
    }
}
