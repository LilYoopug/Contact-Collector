<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Story 8.1: Avatar Upload API Endpoint
 * 
 * Form request for validating avatar file uploads.
 * AC#2: Invalid file type (not jpg/png) returns 422 with "Invalid file type. Use JPG or PNG."
 * AC#3: File larger than 2MB returns 422 with "File too large. Maximum size is 2MB."
 */
class StoreAvatarRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // User must be authenticated (handled by auth:sanctum middleware)
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:2048'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     * 
     * AC#2: "Invalid file type. Use JPG or PNG."
     * AC#3: "File too large. Maximum size is 2MB."
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avatar.required' => 'An avatar image is required.',
            'avatar.image' => 'The file must be an image.',
            'avatar.mimes' => 'Invalid file type. Use JPG or PNG.',
            'avatar.max' => 'File too large. Maximum size is 2MB.',
        ];
    }
}
