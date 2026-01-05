<?php

namespace Tests\Feature\Contact;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BatchDeleteContactTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test successful batch delete of multiple contacts.
     * AC: #1 - Given I have selected multiple contacts, When I send DELETE /api/contacts/batch,
     * Then all specified contacts are deleted and response returns 204 No Content
     */
    public function test_can_batch_delete_multiple_contacts(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contacts = Contact::factory()->count(3)->create(['user_id' => $user->id]);
        $ids = $contacts->pluck('id')->map(fn($id) => (string) $id)->toArray();

        $response = $this->deleteJson('/api/contacts/batch', [
            'ids' => $ids,
        ]);

        $response->assertNoContent(); // 204

        // Verify all contacts are deleted
        foreach ($contacts as $contact) {
            $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
        }
    }

    /**
     * Test batch delete only affects user's own contacts.
     * AC: #2 - Given I try to delete contacts I don't own, When I include another user's contact ID,
     * Then that contact is not deleted and my owned contacts are still deleted
     */
    public function test_batch_delete_only_affects_owned_contacts(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Sanctum::actingAs($user);

        $myContacts = Contact::factory()->count(2)->create(['user_id' => $user->id]);
        $otherContact = Contact::factory()->create(['user_id' => $otherUser->id]);

        $ids = [
            ...$myContacts->pluck('id')->map(fn($id) => (string) $id)->toArray(),
            (string) $otherContact->id,
        ];

        $response = $this->deleteJson('/api/contacts/batch', [
            'ids' => $ids,
        ]);

        $response->assertNoContent(); // 204

        // My contacts should be deleted
        foreach ($myContacts as $contact) {
            $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
        }

        // Other user's contact should NOT be deleted
        $this->assertDatabaseHas('contacts', ['id' => $otherContact->id]);
    }

    /**
     * Test batch delete ignores invalid IDs.
     * AC: #3 - Given an invalid ID is included, When I send the batch delete,
     * Then valid contacts are deleted and invalid IDs are ignored
     */
    public function test_batch_delete_ignores_invalid_ids(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contacts = Contact::factory()->count(2)->create(['user_id' => $user->id]);
        $ids = [
            ...$contacts->pluck('id')->map(fn($id) => (string) $id)->toArray(),
            '99999999', // Non-existent ID
            'invalid-id', // Invalid format
        ];

        $response = $this->deleteJson('/api/contacts/batch', [
            'ids' => $ids,
        ]);

        $response->assertNoContent(); // 204

        // Valid contacts should be deleted
        foreach ($contacts as $contact) {
            $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
        }
    }

    /**
     * Test batch delete fails with empty ids array.
     * AC: #4 - Given I send an empty ids array, When the request is processed,
     * Then 422 validation error is returned and no contacts are deleted
     */
    public function test_batch_delete_fails_with_empty_ids_array(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contact = Contact::factory()->create(['user_id' => $user->id]);

        $response = $this->deleteJson('/api/contacts/batch', [
            'ids' => [],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ids']);

        // Contact should NOT be deleted
        $this->assertDatabaseHas('contacts', ['id' => $contact->id]);
    }

    /**
     * Test batch delete fails with missing ids field.
     * AC: #4 - Validation error for missing ids
     */
    public function test_batch_delete_fails_with_missing_ids(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->deleteJson('/api/contacts/batch', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ids']);
    }

    /**
     * Test batch delete requires authentication.
     * AC: #5 - Given I am not authenticated, When I send the batch delete request,
     * Then 401 Unauthorized is returned
     */
    public function test_batch_delete_requires_authentication(): void
    {
        $response = $this->deleteJson('/api/contacts/batch', [
            'ids' => ['1', '2', '3'],
        ]);

        $response->assertUnauthorized(); // 401
    }

    /**
     * Test batch delete with maximum 100 contacts.
     */
    public function test_batch_delete_max_100_contacts(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Create 101 IDs (exceeds limit)
        $ids = array_map(fn($i) => (string) $i, range(1, 101));

        $response = $this->deleteJson('/api/contacts/batch', [
            'ids' => $ids,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ids']);
    }

    /**
     * Test batch delete with single contact.
     */
    public function test_batch_delete_single_contact(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $contact = Contact::factory()->create(['user_id' => $user->id]);

        $response = $this->deleteJson('/api/contacts/batch', [
            'ids' => [(string) $contact->id],
        ]);

        $response->assertNoContent(); // 204
        $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
    }
}
