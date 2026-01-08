<?php

namespace App\Services;

use App\Models\Contact;

/**
 * DuplicateDetectionService
 * 
 * Story 8-10: Universal Duplicate Detection
 * Provides centralized duplicate detection logic for contacts.
 * Uses normalized phone comparison for better matching.
 */
class DuplicateDetectionService
{
    protected PhoneNormalizationService $phoneNormalizer;

    public function __construct(PhoneNormalizationService $phoneNormalizer)
    {
        $this->phoneNormalizer = $phoneNormalizer;
    }

    /**
     * Find an existing duplicate contact for a user.
     * 
     * Matches by:
     * - Normalized phone number (primary)
     * - Email address (secondary, if provided)
     * 
     * @param int $userId The user ID to search within
     * @param string $phone The phone number to check
     * @param string|null $email The email to check (optional)
     * @return Contact|null The existing duplicate contact, or null if none found
     */
    public function findDuplicate(int $userId, string $phone, ?string $email = null): ?Contact
    {
        // Normalize phone for comparison
        $normalizedPhone = $this->phoneNormalizer->normalizeForComparison($phone);

        // Query for existing contacts
        $query = Contact::where('user_id', $userId);

        $query->where(function ($q) use ($normalizedPhone, $email) {
            // Check phone - we need to compare normalized versions
            // Since phones are stored normalized, direct comparison works
            $q->where('phone', 'LIKE', '%' . substr($normalizedPhone, -9) . '%');
            
            // Also check email if provided
            if (!empty($email)) {
                $q->orWhere('email', strtolower(trim($email)));
            }
        });

        $candidates = $query->get();

        // For phone matches, verify with proper normalization
        foreach ($candidates as $candidate) {
            $candidateNormalized = $this->phoneNormalizer->normalizeForComparison($candidate->phone);
            
            if ($candidateNormalized === $normalizedPhone) {
                return $candidate;
            }

            // Check email match
            if (!empty($email) && !empty($candidate->email)) {
                if (strtolower(trim($email)) === strtolower(trim($candidate->email))) {
                    return $candidate;
                }
            }
        }

        return null;
    }

    /**
     * Check if a contact would be a duplicate.
     * 
     * @param int $userId The user ID to search within
     * @param string $phone The phone number to check
     * @param string|null $email The email to check (optional)
     * @return bool True if duplicate exists
     */
    public function isDuplicate(int $userId, string $phone, ?string $email = null): bool
    {
        return $this->findDuplicate($userId, $phone, $email) !== null;
    }
}
