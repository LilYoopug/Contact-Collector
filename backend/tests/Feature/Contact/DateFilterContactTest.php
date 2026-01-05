<?php

namespace Tests\Feature\Contact;

use App\Models\Contact;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DateFilterContactTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /**
     * Test date range filter with both date_from and date_to.
     */
    public function test_filter_contacts_by_date_range(): void
    {
        Sanctum::actingAs($this->user);

        // Create contacts on different dates
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'January Contact',
            'created_at' => Carbon::parse('2026-01-15'),
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'February Contact',
            'created_at' => Carbon::parse('2026-02-15'),
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'March Contact',
            'created_at' => Carbon::parse('2026-03-15'),
        ]);

        // Filter for January only
        $response = $this->getJson('/api/contacts?date_from=2026-01-01&date_to=2026-01-31');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fullName', 'January Contact');
    }

    /**
     * Test date_from only (from date to now).
     */
    public function test_filter_with_date_from_only(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Old Contact',
            'created_at' => Carbon::parse('2025-12-15'),
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Recent Contact',
            'created_at' => Carbon::parse('2026-01-15'),
        ]);

        $response = $this->getJson('/api/contacts?date_from=2026-01-01');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fullName', 'Recent Contact');
    }

    /**
     * Test date_to only (all up to date).
     */
    public function test_filter_with_date_to_only(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Old Contact',
            'created_at' => Carbon::parse('2025-12-15'),
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Future Contact',
            'created_at' => Carbon::parse('2026-02-15'),
        ]);

        $response = $this->getJson('/api/contacts?date_to=2025-12-31');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fullName', 'Old Contact');
    }

    /**
     * Test date boundary is inclusive (includes contacts on exact date).
     */
    public function test_date_boundaries_are_inclusive(): void
    {
        Sanctum::actingAs($this->user);

        // Contact at the very end of the day
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'End of Day Contact',
            'created_at' => Carbon::parse('2026-01-15 23:59:59'),
        ]);

        // Contact at the very start of the day
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Start of Day Contact',
            'created_at' => Carbon::parse('2026-01-15 00:00:00'),
        ]);

        $response = $this->getJson('/api/contacts?date_from=2026-01-15&date_to=2026-01-15');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    /**
     * Test invalid date format is ignored gracefully.
     */
    public function test_invalid_date_format_is_ignored(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->count(3)->create([
            'user_id' => $this->user->id,
        ]);

        // Invalid date_from - should be ignored, return all contacts
        $response = $this->getJson('/api/contacts?date_from=invalid-date');
        $response->assertStatus(200)->assertJsonCount(3, 'data');

        // Invalid date_to - should be ignored
        $response = $this->getJson('/api/contacts?date_to=not-a-date');
        $response->assertStatus(200)->assertJsonCount(3, 'data');

        // Both invalid
        $response = $this->getJson('/api/contacts?date_from=abc&date_to=xyz');
        $response->assertStatus(200)->assertJsonCount(3, 'data');
    }

    /**
     * Test date filter combined with search.
     */
    public function test_date_filter_combined_with_search(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'John Old',
            'created_at' => Carbon::parse('2025-12-15'),
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'John New',
            'created_at' => Carbon::parse('2026-01-15'),
        ]);
        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Jane New',
            'created_at' => Carbon::parse('2026-01-20'),
        ]);

        // Search for "John" with date filter
        $response = $this->getJson('/api/contacts?search=john&date_from=2026-01-01');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fullName', 'John New');
    }

    /**
     * Test reversed date range returns empty result.
     */
    public function test_reversed_date_range_returns_empty(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->count(3)->create([
            'user_id' => $this->user->id,
            'created_at' => Carbon::parse('2026-01-15'),
        ]);

        // date_from is after date_to - impossible range
        $response = $this->getJson('/api/contacts?date_from=2026-01-31&date_to=2026-01-01');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);
    }

    /**
     * Test future date returns empty result.
     */
    public function test_future_date_returns_empty(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->count(3)->create([
            'user_id' => $this->user->id,
            'created_at' => Carbon::now(),
        ]);

        $response = $this->getJson('/api/contacts?date_from=2030-01-01');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0);
    }

    /**
     * Test date filter respects user isolation.
     */
    public function test_date_filter_respects_user_isolation(): void
    {
        $otherUser = User::factory()->create();

        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'My Contact',
            'created_at' => Carbon::parse('2026-01-15'),
        ]);
        Contact::factory()->create([
            'user_id' => $otherUser->id,
            'full_name' => 'Other User Contact',
            'created_at' => Carbon::parse('2026-01-15'),
        ]);

        $response = $this->getJson('/api/contacts?date_from=2026-01-01&date_to=2026-01-31');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fullName', 'My Contact');
    }

    /**
     * Test date filter with pagination.
     */
    public function test_date_filter_with_pagination(): void
    {
        Sanctum::actingAs($this->user);

        // Create 15 contacts in January
        Contact::factory()->count(15)->create([
            'user_id' => $this->user->id,
            'created_at' => Carbon::parse('2026-01-15'),
        ]);

        // Create 5 contacts in February (should be excluded)
        Contact::factory()->count(5)->create([
            'user_id' => $this->user->id,
            'created_at' => Carbon::parse('2026-02-15'),
        ]);

        $response = $this->getJson('/api/contacts?date_from=2026-01-01&date_to=2026-01-31&per_page=10');

        $response->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 15)
            ->assertJsonPath('meta.per_page', 10);
    }

    /**
     * Test various date formats are accepted.
     */
    public function test_various_date_formats_accepted(): void
    {
        Sanctum::actingAs($this->user);

        Contact::factory()->create([
            'user_id' => $this->user->id,
            'full_name' => 'Test Contact',
            'created_at' => Carbon::parse('2026-01-15 12:00:00'),
        ]);

        // ISO date format
        $response = $this->getJson('/api/contacts?date_from=2026-01-15');
        $response->assertStatus(200)->assertJsonCount(1, 'data');

        // ISO datetime format
        $response = $this->getJson('/api/contacts?date_from=2026-01-15T00:00:00');
        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    /**
     * Test unauthenticated user cannot use date filter.
     */
    public function test_unauthenticated_user_cannot_use_date_filter(): void
    {
        $response = $this->getJson('/api/contacts?date_from=2026-01-01');

        $response->assertStatus(401);
    }
}
