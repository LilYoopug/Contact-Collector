<?php

namespace Tests\Feature\Contact;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SearchContactTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /**
     * Test basic search by full_name.
     */
    public function test_search_contacts_by_name(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'John Doe',
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Jane Smith',
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'John Smith',
        ]);

        $response = $this->getJson('/api/contacts?search=john');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2);
    }

    /**
     * Test case-insensitive search.
     */
    public function test_search_is_case_insensitive(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'John Doe',
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'JOHN UPPERCASE',
        ]);

        // Search with uppercase
        $response = $this->getJson('/api/contacts?search=JOHN');
        $response->assertStatus(200)->assertJsonCount(2, 'data');

        // Search with lowercase
        $response = $this->getJson('/api/contacts?search=john');
        $response->assertStatus(200)->assertJsonCount(2, 'data');

        // Search with mixed case
        $response = $this->getJson('/api/contacts?search=JoHn');
        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    /**
     * Test search across multiple columns (phone, email, company).
     */
    public function test_search_across_multiple_columns(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Random Name',
            'phone' => '+628123456789',
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Another Person',
            'email' => 'test@maju.com',
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Third Person',
            'company' => 'PT Maju Jaya',
        ]);

        // Search by phone (searching for part of the phone number)
        $response = $this->getJson('/api/contacts?search=8123');
        $response->assertStatus(200)->assertJsonCount(1, 'data');

        // Search by email
        $response = $this->getJson('/api/contacts?search=maju');
        $response->assertStatus(200)->assertJsonCount(2, 'data'); // email + company

        // Search by company
        $response = $this->getJson('/api/contacts?search=Jaya');
        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    /**
     * Test search with no results.
     */
    public function test_search_returns_empty_when_no_matches(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'John Doe',
        ]);

        $response = $this->getJson('/api/contacts?search=xyznonexistent');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);
    }

    /**
     * Test empty search returns all contacts.
     */
    public function test_empty_search_returns_all_contacts(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->count(5)->create([
            'user_id' => $this->user->id,
        ]);

        // Empty search parameter
        $response = $this->getJson('/api/contacts?search=');
        $response->assertStatus(200)->assertJsonCount(5, 'data');

        // No search parameter at all
        $response = $this->getJson('/api/contacts');
        $response->assertStatus(200)->assertJsonCount(5, 'data');
    }

    /**
     * Test search results are paginated.
     */
    public function test_search_results_are_paginated(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->count(30)->create([
            'user_id' => $this->user->id,
            'full_name' => 'Test Person',
        ]);

        $response = $this->getJson('/api/contacts?search=test&per_page=10');

        $response->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 30)
            ->assertJsonPath('meta.per_page', 10);
    }

    /**
     * Test search with special characters is sanitized (SQL injection prevention).
     */
    public function test_search_sanitizes_special_characters(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Normal User',
        ]);

        // Test SQL injection attempts - should return no results, no error
        $response = $this->getJson("/api/contacts?search=" . urlencode("' OR '1'='1"));
        $response->assertStatus(200)->assertJsonCount(0, 'data');

        $response = $this->getJson("/api/contacts?search=" . urlencode("1; DROP TABLE contacts;--"));
        $response->assertStatus(200)->assertJsonCount(0, 'data');

        // Test wildcard-only searches
        $response = $this->getJson('/api/contacts?search=%');
        $response->assertStatus(200); // Should not error, may return all

        $response = $this->getJson('/api/contacts?search=_');
        $response->assertStatus(200); // Should not error
    }

    /**
     * Test search respects user isolation.
     */
    public function test_search_only_returns_own_contacts(): void
    {
        $otherUser = User::factory()->create();

        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'My Contact John',
        ]);
        Contact::factory()->create([
            'user_id' => $otherUser->id,
            'full_name' => 'Other User John',
        ]);

        $response = $this->getJson('/api/contacts?search=john');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fullName', 'My Contact John');
    }

    /**
     * Test unauthenticated user cannot search.
     */
    public function test_unauthenticated_user_cannot_search(): void
    {
        $response = $this->getJson('/api/contacts?search=test');

        $response->assertStatus(401);
    }

    /**
     * Test search with pagination parameters.
     */
    public function test_search_with_page_parameter(): void
    {
        Sanctum::actingAs($this->user);

        // Create 15 contacts matching search
        Contact::factory()->count(15)->create([
            'user_id' => $this->user->id,
            'full_name' => 'Test Contact',
        ]);

        // Get page 2 with 10 per page
        $response = $this->getJson('/api/contacts?search=test&per_page=10&page=2');

        $response->assertStatus(200)
            ->assertJsonCount(5, 'data') // 15 total, page 2 = 5 remaining
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.total', 15);
    }
}
