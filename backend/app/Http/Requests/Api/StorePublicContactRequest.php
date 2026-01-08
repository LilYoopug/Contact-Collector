<?php

namespace App\Http\Requests\Api;

use App\Services\PhoneNormalizationService;
use Illuminate\Foundation\Http\FormRequest;

/**
 * StorePublicContactRequest
 * 
 * Story 7.7: Public Contact Submission API
 * Validates public contact submissions from external web forms.
 * Accepts camelCase input and transforms to snake_case for storage.
 */
class StorePublicContactRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Auth is handled by ApiKeyAuth middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     * Story 8-11: Normalize phone number before validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('phone')) {
            $normalizer = app(PhoneNormalizationService::class);
            $this->merge([
                'phone' => $normalizer->normalize($this->input('phone')),
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'fullName' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'company' => 'nullable|string|max:255',
            'jobTitle' => 'nullable|string|max:255',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'fullName.required' => 'Full name is required',
            'fullName.max' => 'Full name cannot exceed 255 characters',
            'phone.required' => 'Phone number is required',
            'phone.max' => 'Phone number cannot exceed 255 characters',
            'email.email' => 'Email must be a valid email address',
        ];
    }

    /**
     * Get validated data transformed to snake_case for database storage.
     *
     * @return array<string, mixed>
     */
    public function validatedForStorage(): array
    {
        $validated = $this->validated();

        return [
            'full_name' => $validated['fullName'],
            'phone' => $validated['phone'],
            'email' => $validated['email'] ?? null,
            'company' => $validated['company'] ?? null,
            'job_title' => $validated['jobTitle'] ?? null,
        ];
    }
}
