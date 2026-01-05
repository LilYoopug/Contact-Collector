<?php

namespace Tests\Feature\Contact;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BatchStoreContactTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $endpoint = '/api/contacts/batch';

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function unauthenticated_user_cannot_batch_create_contacts(): void
    {
        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                ['fullName' => 'John Doe', 'phone' => '+6281234567890'],
            ],
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function authenticated_user_can_batch_create_valid_contacts(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'John Doe',
                    'phone' => '+6281234567890',
                    'email' => 'john@example.com',
                    'company' => 'PT Example',
                    'jobTitle' => 'Manager',
                    'source' => 'import',
                    'consent' => 'opt_in',
                ],
                [
                    'fullName' => 'Jane Smith',
                    'phone' => '+6281234567891',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'created' => [
                    '*' => ['id', 'fullName', 'phone', 'email', 'company', 'jobTitle', 'source', 'consent', 'createdAt', 'updatedAt'],
                ],
                'duplicates',
                'errors',
            ])
            ->assertJsonCount(2, 'created')
            ->assertJsonCount(0, 'duplicates')
            ->assertJsonCount(0, 'errors');

        $this->assertDatabaseCount('contacts', 2);
        $this->assertDatabaseHas('contacts', [
            'user_id' => $this->user->id,
            'full_name' => 'John Doe',
            'phone' => '+6281234567890',
        ]);
    }

    /** @test */
    public function duplicate_by_phone_is_detected_and_returned(): void
    {
        Sanctum::actingAs($this->user);

        // Create existing contact
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Existing Contact',
            'phone' => '+6281234567890',
        ]);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'New Contact',
                    'phone' => '+6281234567890', // Same phone as existing
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(0, 'created')
            ->assertJsonCount(1, 'duplicates')
            ->assertJsonCount(0, 'errors');

        // Verify duplicate structure has input and existing
        $response->assertJsonStructure([
            'duplicates' => [
                '*' => [
                    'input' => ['fullName', 'phone'],
                    'existing' => ['id', 'fullName', 'phone'],
                ],
            ],
        ]);

        // Verify existing contact data is returned
        $duplicateExisting = $response->json('duplicates.0.existing');
        $this->assertEquals('Existing Contact', $duplicateExisting['fullName']);

        // Verify no new contacts created
        $this->assertDatabaseCount('contacts', 1);
    }

    /** @test */
    public function duplicate_by_email_is_detected_and_returned(): void
    {
        Sanctum::actingAs($this->user);

        // Create existing contact with email
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Existing Contact',
            'phone' => '+6281234567890',
            'email' => 'existing@example.com',
        ]);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'New Contact',
                    'phone' => '+6289999999999', // Different phone
                    'email' => 'existing@example.com', // Same email
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(0, 'created')
            ->assertJsonCount(1, 'duplicates')
            ->assertJsonCount(0, 'errors');

        // Verify no new contacts created
        $this->assertDatabaseCount('contacts', 1);
    }

    /** @test */
    public function invalid_contacts_are_returned_in_errors_array(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => '', // Empty fullName - invalid
                    'phone' => '+6281234567890',
                ],
                [
                    'fullName' => 'Valid Contact',
                    'phone' => '', // Empty phone - invalid
                ],
                [
                    'fullName' => 'Valid Contact 2',
                    'phone' => '+6281234567891',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(1, 'created')
            ->assertJsonCount(0, 'duplicates')
            ->assertJsonCount(2, 'errors');

        // Verify error structure
        $response->assertJsonStructure([
            'errors' => [
                '*' => ['input', 'message'],
            ],
        ]);

        // Only the valid contact was created
        $this->assertDatabaseCount('contacts', 1);
        $this->assertDatabaseHas('contacts', ['full_name' => 'Valid Contact 2']);
    }

    /** @test */
    public function max_100_contacts_per_batch_is_enforced(): void
    {
        Sanctum::actingAs($this->user);

        // Create 101 contacts
        $contacts = [];
        for ($i = 1; $i <= 101; $i++) {
            $contacts[] = [
                'fullName' => "Contact $i",
                'phone' => "+628123456" . str_pad($i, 4, '0', STR_PAD_LEFT),
            ];
        }

        $response = $this->postJson($this->endpoint, [
            'contacts' => $contacts,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contacts']);

        // No contacts should be created
        $this->assertDatabaseCount('contacts', 0);
    }

    /** @test */
    public function empty_contacts_array_returns_validation_error(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contacts']);
    }

    /** @test */
    public function contacts_array_is_required(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contacts']);
    }

    /** @test */
    public function mixed_results_with_created_duplicates_and_errors(): void
    {
        Sanctum::actingAs($this->user);

        // Create existing contact
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Existing',
            'phone' => '+6281234567890',
        ]);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                // Valid - should be created
                ['fullName' => 'New Valid', 'phone' => '+6281111111111'],
                // Duplicate - existing phone
                ['fullName' => 'Duplicate', 'phone' => '+6281234567890'],
                // Invalid - missing fullName
                ['fullName' => '', 'phone' => '+6282222222222'],
                // Valid - should be created
                ['fullName' => 'Another Valid', 'phone' => '+6283333333333'],
                // Invalid - missing phone
                ['fullName' => 'No Phone', 'phone' => ''],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(2, 'created')
            ->assertJsonCount(1, 'duplicates')
            ->assertJsonCount(2, 'errors');

        // 1 existing + 2 new = 3 total
        $this->assertDatabaseCount('contacts', 3);
    }

    /** @test */
    public function duplicates_within_same_batch_are_detected(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                ['fullName' => 'First', 'phone' => '+6281234567890'],
                ['fullName' => 'Second (duplicate)', 'phone' => '+6281234567890'], // Same phone as first
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(1, 'created')
            ->assertJsonCount(1, 'duplicates');

        // Only first contact created
        $this->assertDatabaseCount('contacts', 1);
        $this->assertDatabaseHas('contacts', ['full_name' => 'First']);
    }

    /** @test */
    public function user_can_only_detect_duplicates_from_own_contacts(): void
    {
        $otherUser = User::factory()->create();

        // Create contact for other user
        Contact::factory()->create([
            'user_id' => $otherUser->id,
            'full_name' => 'Other User Contact',
            'phone' => '+6281234567890',
        ]);

        Sanctum::actingAs($this->user);

        // Same phone but different user - should NOT be duplicate
        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                ['fullName' => 'My Contact', 'phone' => '+6281234567890'],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(1, 'created')
            ->assertJsonCount(0, 'duplicates');

        // Both contacts exist
        $this->assertDatabaseCount('contacts', 2);
    }

    /** @test */
    public function invalid_email_format_returns_error(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'Test Contact',
                    'phone' => '+6281234567890',
                    'email' => 'invalid-email-format',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(0, 'created')
            ->assertJsonCount(0, 'duplicates')
            ->assertJsonCount(1, 'errors');

        $this->assertDatabaseCount('contacts', 0);
    }

    /** @test */
    public function valid_source_and_consent_values_are_accepted(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'Contact 1',
                    'phone' => '+6281234567891',
                    'source' => 'ocr_list',
                    'consent' => 'opt_in',
                ],
                [
                    'fullName' => 'Contact 2',
                    'phone' => '+6281234567892',
                    'source' => 'import',
                    'consent' => 'opt_out',
                ],
                [
                    'fullName' => 'Contact 3',
                    'phone' => '+6281234567893',
                    'source' => 'form',
                    'consent' => 'unknown',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(3, 'created');

        $this->assertDatabaseHas('contacts', ['source' => 'ocr_list', 'consent' => 'opt_in']);
        $this->assertDatabaseHas('contacts', ['source' => 'import', 'consent' => 'opt_out']);
        $this->assertDatabaseHas('contacts', ['source' => 'form', 'consent' => 'unknown']);
    }

    /** @test */
    public function invalid_source_value_returns_error(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'Test Contact',
                    'phone' => '+6281234567890',
                    'source' => 'invalid_source',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(0, 'created')
            ->assertJsonCount(1, 'errors');
    }

    /** @test */
    public function invalid_consent_value_returns_error(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'Test Contact',
                    'phone' => '+6281234567890',
                    'consent' => 'invalid_consent',
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(0, 'created')
            ->assertJsonCount(1, 'errors');
    }

    /** @test */
    public function created_contacts_are_associated_with_authenticated_user(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                ['fullName' => 'Test Contact', 'phone' => '+6281234567890'],
            ],
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('contacts', [
            'user_id' => $this->user->id,
            'full_name' => 'Test Contact',
        ]);
    }

    /** @test */
    public function default_source_and_consent_values_are_applied(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'Test Contact',
                    'phone' => '+6281234567890',
                    // No source or consent provided
                ],
            ],
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('contacts', [
            'full_name' => 'Test Contact',
            'source' => 'manual',
            'consent' => 'unknown',
        ]);
    }

    /** @test */
    public function response_returns_created_contacts_with_correct_structure(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson($this->endpoint, [
            'contacts' => [
                [
                    'fullName' => 'John Doe',
                    'phone' => '+6281234567890',
                    'email' => 'john@example.com',
                    'company' => 'PT Example',
                    'jobTitle' => 'Manager',
                ],
            ],
        ]);

        $response->assertStatus(201);

        $created = $response->json('created.0');
        $this->assertIsString($created['id']); // ID as string
        $this->assertEquals('John Doe', $created['fullName']);
        $this->assertEquals('+6281234567890', $created['phone']);
        $this->assertEquals('john@example.com', $created['email']);
        $this->assertEquals('PT Example', $created['company']);
        $this->assertEquals('Manager', $created['jobTitle']);
        $this->assertArrayHasKey('createdAt', $created);
        $this->assertArrayHasKey('updatedAt', $created);
    }

    /**
     * NFR2 Performance Test: Batch of 100 contacts must complete in <5 seconds
     * 
     * @test
     * @group performance
     */
    public function batch_of_100_contacts_completes_within_5_seconds(): void
    {
        Sanctum::actingAs($this->user);

        // Generate 100 unique contacts
        $contacts = [];
        for ($i = 1; $i <= 100; $i++) {
            $contacts[] = [
                'fullName' => "Performance Test Contact $i",
                'phone' => '+628' . str_pad($i, 10, '0', STR_PAD_LEFT),
                'email' => "perftest{$i}@example.com",
                'company' => "Company $i",
                'jobTitle' => 'Employee',
                'source' => 'import',
                'consent' => 'unknown',
            ];
        }

        // Measure response time
        $startTime = microtime(true);
        
        $response = $this->postJson($this->endpoint, [
            'contacts' => $contacts,
        ]);
        
        $endTime = microtime(true);
        $duration = $endTime - $startTime;

        // Assert successful response
        $response->assertStatus(201);
        
        // Assert all 100 contacts were created (no duplicates, no errors)
        $response->assertJsonCount(100, 'created');
        $response->assertJsonCount(0, 'duplicates');
        $response->assertJsonCount(0, 'errors');

        // Assert performance requirement: <5 seconds (NFR2)
        $this->assertLessThan(
            5.0, 
            $duration, 
            "Batch create of 100 contacts took {$duration}s, exceeding 5s limit (NFR2)"
        );

        // Verify all contacts were persisted
        $this->assertDatabaseCount('contacts', 100);
    }

    /**
     * Performance test with mixed results (duplicates and errors)
     * 
     * @test
     * @group performance
     */
    public function batch_of_100_mixed_contacts_completes_within_5_seconds(): void
    {
        Sanctum::actingAs($this->user);

        // Create 10 existing contacts for duplicate detection
        for ($i = 1; $i <= 10; $i++) {
            Contact::factory()->create([
                'user_id' => $this->user->id,
                'phone' => '+628' . str_pad($i, 10, '0', STR_PAD_LEFT),
            ]);
        }

        // Generate 100 contacts: 10 duplicates, 10 invalid, 80 valid
        $contacts = [];
        
        // 10 duplicates (phones 1-10 already exist)
        for ($i = 1; $i <= 10; $i++) {
            $contacts[] = [
                'fullName' => "Duplicate Contact $i",
                'phone' => '+628' . str_pad($i, 10, '0', STR_PAD_LEFT),
            ];
        }
        
        // 10 invalid (missing required fields)
        for ($i = 11; $i <= 20; $i++) {
            $contacts[] = [
                'fullName' => '', // Empty - invalid
                'phone' => '+628' . str_pad($i, 10, '0', STR_PAD_LEFT),
            ];
        }
        
        // 80 valid new contacts
        for ($i = 21; $i <= 100; $i++) {
            $contacts[] = [
                'fullName' => "Valid Contact $i",
                'phone' => '+628' . str_pad($i, 10, '0', STR_PAD_LEFT),
                'email' => "valid{$i}@example.com",
            ];
        }

        // Measure response time
        $startTime = microtime(true);
        
        $response = $this->postJson($this->endpoint, [
            'contacts' => $contacts,
        ]);
        
        $endTime = microtime(true);
        $duration = $endTime - $startTime;

        // Assert successful response
        $response->assertStatus(201);
        
        // Assert categorized results
        $response->assertJsonCount(80, 'created');
        $response->assertJsonCount(10, 'duplicates');
        $response->assertJsonCount(10, 'errors');

        // Assert performance requirement: <5 seconds (NFR2)
        $this->assertLessThan(
            5.0, 
            $duration, 
            "Batch create with mixed results took {$duration}s, exceeding 5s limit (NFR2)"
        );

        // Verify correct number in database: 10 existing + 80 new = 90
        $this->assertDatabaseCount('contacts', 90);
    }
}
