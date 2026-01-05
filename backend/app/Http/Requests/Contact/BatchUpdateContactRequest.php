<?php

namespace App\Http\Requests\Contact;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BatchUpdateContactRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Auth handled by middleware
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'string'],
            'updates' => ['required', 'array', 'min:1'],
            // Only allow specific fields for bulk update
            'updates.company' => ['sometimes', 'nullable', 'string', 'max:255'],
            'updates.job_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'updates.consent' => ['sometimes', Rule::in(['opt_in', 'opt_out', 'unknown'])],
        ];
    }

    /**
     * Get custom error messages.
     */
    public function messages(): array
    {
        return [
            'ids.required' => 'Contact IDs are required.',
            'ids.array' => 'IDs must be an array.',
            'ids.min' => 'At least one contact ID is required.',
            'ids.max' => 'Maximum 100 contacts can be updated at once.',
            'updates.required' => 'Update fields are required.',
            'updates.min' => 'At least one field to update is required.',
            'updates.consent.in' => 'Consent must be opt_in, opt_out, or unknown.',
        ];
    }

    /**
     * Prepare the data for validation.
     * Removes any unexpected fields from updates.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('updates')) {
            $allowedFields = ['company', 'job_title', 'consent'];
            $updates = collect($this->input('updates'))
                ->only($allowedFields)
                ->toArray();

            $this->merge(['updates' => $updates]);
        }
    }
}
