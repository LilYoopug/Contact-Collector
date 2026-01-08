<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * StoreApiKeyRequest
 * 
 * Story 7.2: API Key Generation Endpoint
 * Validates API key creation requests with 5-key limit.
 */
class StoreApiKeyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
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
            'name' => 'nullable|string|max:255',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $user = $this->user();
            
            if ($user) {
                $activeKeyCount = $user->activeApiKeys()->count();
                
                if ($activeKeyCount >= 5) {
                    $validator->errors()->add(
                        'limit',
                        'Maximum 5 API keys allowed per user'
                    );
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.max' => 'API key name cannot exceed 255 characters',
        ];
    }
}
