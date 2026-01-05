<?php

namespace Tests\Feature\Contact;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BatchUpdateContactTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test successful batch update of multiple contacts.
     * AC: #1 - Given I have selected multiple contacts, When I send PATCH /api/contacts/batch,
     * Then all specified contacts are updated and response returns the updated contacts
     */
    public function test_can_batch_update_multiple_contacts(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contacts = Contact::factory()->count(3)->create([
            'user_id' => $user->id,
            'company' => 'Old Company',
            'consent' => 'unknown',
        ]);
        $ids = $contacts->pluck('id')->map(fn($id) => (string) $id)->toArray();

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => $ids,
            'updates' => [
                'company' => 'New Company',
                'consent' => 'opt_in',
            ],
        ]);

        $response->assertOk();
        $response->assertJsonCount(3, 'data');

        // Verify all contacts are updated
        foreach ($contacts as $contact) {
            $this->assertDatabaseHas('contacts', [
                'id' => $contact->id,
                'company' => 'New Company',
                'consent' => 'opt_in',
            ]);
        }
    }

    /**
     * Test batch update only affects user's own contacts.
     * AC: #3 - Given I try to update contacts I don't own, When I include another user's contact ID,
     * Then that contact is not updated and my owned contacts are still updated
     */
    public function test_batch_update_only_affects_owned_contacts(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Sanctum::actingAs($user);

        $myContacts = Contact::factory()->count(2)->create([
            'user_id' => $user->id,
            'company' => 'My Company',
        ]);
        $otherContact = Contact::factory()->create([
            'user_id' => $otherUser->id,
            'company' => 'Other Company',
        ]);

        $ids = [
            ...$myContacts->pluck('id')->map(fn($id) => (string) $id)->toArray(),
            (string) $otherContact->id,
        ];

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => $ids,
            'updates' => [
                'company' => 'Updated Company',
            ],
        ]);

        $response->assertOk();
        // Only my contacts should be returned
        $response->assertJsonCount(2, 'data');

        // My contacts should be updated
        foreach ($myContacts as $contact) {
            $this->assertDatabaseHas('contacts', [
                'id' => $contact->id,
                'company' => 'Updated Company',
            ]);
        }

        // Other user's contact should NOT be updated
        $this->assertDatabaseHas('contacts', [
            'id' => $otherContact->id,
            'company' => 'Other Company',
        ]);
    }

    /**
     * Test batch update fails with invalid consent value.
     * AC: #2 - Given I provide an invalid field value, When I send the batch update,
     * Then 422 validation error is returned and no contacts are updated
     */
    public function test_batch_update_fails_with_invalid_consent(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contact = Contact::factory()->create([
            'user_id' => $user->id,
            'consent' => 'unknown',
        ]);

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => [(string) $contact->id],
            'updates' => [
                'consent' => 'invalid_value',
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['updates.consent']);

        // Contact should NOT be updated
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'consent' => 'unknown',
        ]);
    }

    /**
     * Test batch update fails with empty ids array.
     * AC: #4 - Given I send an empty ids array, When the request is processed,
     * Then 422 validation error is returned
     */
    public function test_batch_update_fails_with_empty_ids_array(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => [],
            'updates' => ['company' => 'New Company'],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ids']);
    }

    /**
     * Test batch update fails with empty updates object.
     * AC: #4 - Given I send empty updates, When the request is processed,
     * Then 422 validation error is returned
     */
    public function test_batch_update_fails_with_empty_updates(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contact = Contact::factory()->create(['user_id' => $user->id]);

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => [(string) $contact->id],
            'updates' => [],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['updates']);
    }

    /**
     * Test batch update fails with missing updates field.
     * AC: #4 - Validation error for missing updates
     */
    public function test_batch_update_fails_with_missing_updates(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => ['1', '2'],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['updates']);
    }

    /**
     * Test batch update requires authentication.
     * AC: #5 - Given I am not authenticated, When I send the batch update request,
     * Then 401 Unauthorized is returned
     */
    public function test_batch_update_requires_authentication(): void
    {
        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => ['1', '2'],
            'updates' => ['company' => 'Test'],
        ]);

        $response->assertUnauthorized(); // 401
    }

    /**
     * Test batch update with only company field.
     */
    public function test_batch_update_only_company(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contacts = Contact::factory()->count(2)->create([
            'user_id' => $user->id,
            'company' => 'Old Company',
            'job_title' => 'Original Title',
        ]);
        $ids = $contacts->pluck('id')->map(fn($id) => (string) $id)->toArray();

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => $ids,
            'updates' => [
                'company' => 'Only Company Updated',
            ],
        ]);

        $response->assertOk();

        // Verify only company is updated, job_title unchanged
        foreach ($contacts as $contact) {
            $this->assertDatabaseHas('contacts', [
                'id' => $contact->id,
                'company' => 'Only Company Updated',
                'job_title' => 'Original Title',
            ]);
        }
    }

    /**
     * Test batch update with job_title field.
     */
    public function test_batch_update_job_title(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contact = Contact::factory()->create([
            'user_id' => $user->id,
            'job_title' => 'Old Title',
        ]);

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => [(string) $contact->id],
            'updates' => [
                'job_title' => 'New Title',
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'job_title' => 'New Title',
        ]);
    }

    /**
     * Test batch update ignores non-allowed fields.
     */
    public function test_batch_update_ignores_forbidden_fields(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contact = Contact::factory()->create([
            'user_id' => $user->id,
            'full_name' => 'Original Name',
            'phone' => '+628123456789',
            'company' => 'Old Company',
        ]);

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => [(string) $contact->id],
            'updates' => [
                'full_name' => 'Hacked Name', // Should be ignored
                'phone' => '+6999999999', // Should be ignored
                'company' => 'Allowed Company', // Should be applied
            ],
        ]);

        $response->assertOk();

        // full_name and phone should NOT be updated
        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'full_name' => 'Original Name',
            'phone' => '+628123456789',
            'company' => 'Allowed Company',
        ]);
    }

    /**
     * Test batch update with maximum 100 contacts.
     */
    public function test_batch_update_max_100_contacts(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Create 101 IDs (exceeds limit)
        $ids = array_map(fn($i) => (string) $i, range(1, 101));

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => $ids,
            'updates' => ['company' => 'Test'],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ids']);
    }

    /**
     * Test batch update response format.
     */
    public function test_batch_update_response_format(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contact = Contact::factory()->create([
            'user_id' => $user->id,
            'full_name' => 'John Doe',
            'company' => 'Old Company',
        ]);

        $response = $this->patchJson('/api/contacts/batch', [
            'ids' => [(string) $contact->id],
            'updates' => [
                'company' => 'New Company',
            ],
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'fullName',
                    'phone',
                    'email',
                    'company',
                    'jobTitle',
                    'source',
                    'consent',
                    'createdAt',
                    'updatedAt',
                ],
            ],
        ]);
        $response->assertJsonPath('data.0.company', 'New Company');
    }
}
