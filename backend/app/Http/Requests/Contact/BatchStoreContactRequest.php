<?php

namespace App\Http\Requests\Contact;

use Illuminate\Foundation\Http\FormRequest;

class BatchStoreContactRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Only validate array structure and limit
        // Individual contact validation happens in controller to allow partial success
        return [
            'contacts' => 'required|array|min:1|max:100',
            'contacts.*' => 'array',
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
            'contacts.required' => 'The contacts array is required.',
            'contacts.array' => 'The contacts must be an array.',
            'contacts.min' => 'At least one contact is required.',
            'contacts.max' => 'Maximum 100 contacts per batch.',
            'contacts.*.fullName.required' => 'Full name is required for each contact.',
            'contacts.*.phone.required' => 'Phone is required for each contact.',
            'contacts.*.email.email' => 'Invalid email format.',
        ];
    }
}
