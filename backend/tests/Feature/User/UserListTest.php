<?php

namespace Tests\Feature\User;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserListTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test admin can view list of all users.
     * AC: #1 - Admin can retrieve user list
     */
    public function test_admin_can_view_user_list(): void
    {
        // Create admin user
        $admin = User::factory()->create(['role' => 'admin']);
        
        // Create additional users
        User::factory()->count(3)->create(['role' => 'user']);
        
        Sanctum::actingAs($admin);
        
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'role',
                    'avatarUrl',
                    'createdAt',
                    'updatedAt',
                    'lastLoginAt',
                ]
            ]
        ]);
        
        // Should have 4 users total (1 admin + 3 regular)
        $response->assertJsonCount(4, 'data');
    }

    /**
     * Test user list returns camelCase fields via UserResource.
     * AC: #1 - Response uses UserResource transformation
     */
    public function test_user_list_uses_user_resource_transformation(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'phone' => '+6281234567890',
            'avatar_url' => 'https://example.com/avatar.jpg',
            'last_login_at' => now(),
        ]);
        
        Sanctum::actingAs($admin);
        
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(200);
        
        // Check camelCase fields
        $response->assertJsonFragment([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'phone' => '+6281234567890',
            'role' => 'admin',
        ]);
        
        // Ensure snake_case fields are not present
        $data = $response->json('data.0');
        $this->assertArrayNotHasKey('avatar_url', $data);
        $this->assertArrayNotHasKey('last_login_at', $data);
        $this->assertArrayHasKey('avatarUrl', $data);
        $this->assertArrayHasKey('lastLoginAt', $data);
        
        // ID should be string
        $this->assertIsString($data['id']);
    }

    /**
     * Test regular user cannot view user list (403 Forbidden).
     * AC: #2 - Regular user receives 403
     */
    public function test_regular_user_cannot_view_user_list(): void
    {
        $user = User::factory()->create(['role' => 'user']);
        
        Sanctum::actingAs($user);
        
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(403);
        $response->assertJson(['message' => "Forbidden: You don't have the required role."]);
    }

    /**
     * Test admin with only themselves gets list with one user.
     * AC: #3 - Admin gets list with just their user
     */
    public function test_admin_with_no_other_users_sees_only_themselves(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        
        Sanctum::actingAs($admin);
        
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', (string) $admin->id);
    }

    /**
     * Test unauthenticated user cannot view user list (401 Unauthorized).
     * AC: #4 - Unauthenticated request receives 401
     */
    public function test_unauthenticated_user_cannot_view_user_list(): void
    {
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(401);
    }

    /**
     * Test users are ordered by created_at descending (newest first).
     */
    public function test_users_are_ordered_by_created_at_descending(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'created_at' => now()->subDays(10),
        ]);
        
        $user1 = User::factory()->create([
            'role' => 'user',
            'name' => 'First User',
            'created_at' => now()->subDays(5),
        ]);
        
        $user2 = User::factory()->create([
            'role' => 'user',
            'name' => 'Second User',
            'created_at' => now()->subDays(2),
        ]);
        
        $user3 = User::factory()->create([
            'role' => 'user',
            'name' => 'Third User',
            'created_at' => now(),
        ]);
        
        Sanctum::actingAs($admin);
        
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(200);
        $response->assertJsonCount(4, 'data');
        
        // Verify order: newest first
        $data = $response->json('data');
        $this->assertEquals('Third User', $data[0]['name']);
        $this->assertEquals('Second User', $data[1]['name']);
        $this->assertEquals('First User', $data[2]['name']);
    }

    /**
     * Test sensitive fields are not exposed in response.
     */
    public function test_sensitive_fields_are_not_exposed(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'password' => 'secret123',
            'remember_token' => 'some-token',
        ]);
        
        Sanctum::actingAs($admin);
        
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(200);
        
        $data = $response->json('data.0');
        $this->assertArrayNotHasKey('password', $data);
        $this->assertArrayNotHasKey('remember_token', $data);
        $this->assertArrayNotHasKey('rememberToken', $data);
    }

    /**
     * Test dates are in ISO 8601 format.
     */
    public function test_dates_are_in_iso8601_format(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'last_login_at' => '2026-01-05 10:00:00',
        ]);
        
        Sanctum::actingAs($admin);
        
        $response = $this->getJson('/api/users');
        
        $response->assertStatus(200);
        
        $data = $response->json('data.0');
        
        // Check ISO 8601 format
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/',
            $data['createdAt']
        );
    }
}
