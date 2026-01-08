<?php

namespace App\Services;

/**
 * Story 8.11: Phone Number Normalization Service (ENH-003)
 * 
 * Normalizes phone numbers to consistent format for storage and comparison.
 * Handles Indonesian numbers and international formats.
 */
class PhoneNormalizationService
{
    /**
     * Normalize phone number to consistent format
     * 
     * Examples:
     * - 081234567890 → +6281234567890 (Indonesian local)
     * - 6281234567890 → +6281234567890 (Indonesian without +)
     * - +6281234567890 → +6281234567890 (already normalized)
     * - +1234567890 → +1234567890 (international, keep as-is)
     * 
     * @param string|null $phone
     * @return string|null
     */
    public function normalize(?string $phone): ?string
    {
        if (!$phone) {
            return null;
        }
        
        // Remove all non-numeric characters except +
        $cleaned = preg_replace('/[^0-9+]/', '', $phone);
        
        // Handle empty result
        if (empty($cleaned)) {
            return null;
        }
        
        // Indonesian local format: 08xxx → +628xxx
        if (preg_match('/^0([0-9]{9,12})$/', $cleaned, $matches)) {
            return '+62' . $matches[1];
        }
        
        // Indonesian without +: 628xxx → +628xxx
        if (preg_match('/^62([0-9]{9,12})$/', $cleaned)) {
            return '+' . $cleaned;
        }
        
        // Already has + prefix
        if (str_starts_with($cleaned, '+')) {
            return $cleaned;
        }
        
        // Other international numbers without + (assume needs +)
        return '+' . $cleaned;
    }
    
    /**
     * Normalize for comparison (strip + for matching)
     * 
     * @param string|null $phone
     * @return string|null
     */
    public function normalizeForComparison(?string $phone): ?string
    {
        $normalized = $this->normalize($phone);
        return $normalized ? ltrim($normalized, '+') : null;
    }
}
