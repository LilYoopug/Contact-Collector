<?php

namespace Tests\Unit\Resources;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class UserResourceTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test single user transformation with camelCase fields.
     * AC: #1, #2 - UserResource transforms snake_case to camelCase
     */
    public function test_user_resource_transforms_to_camel_case(): void
    {
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '+6281234567890',
            'role' => 'admin',
            'avatar_url' => 'https://example.com/avatar.jpg',
            'last_login_at' => now(),
        ]);

        $resource = new UserResource($user);
        $array = $resource->toArray(new Request());

        // AC #1: camelCase field names
        $this->assertArrayHasKey('id', $array);
        $this->assertArrayHasKey('name', $array);
        $this->assertArrayHasKey('email', $array);
        $this->assertArrayHasKey('phone', $array);
        $this->assertArrayHasKey('role', $array);
        $this->assertArrayHasKey('avatarUrl', $array);
        $this->assertArrayHasKey('createdAt', $array);
        $this->assertArrayHasKey('updatedAt', $array);
        $this->assertArrayHasKey('lastLoginAt', $array);

        // Ensure snake_case fields are not present
        $this->assertArrayNotHasKey('avatar_url', $array);
        $this->assertArrayNotHasKey('created_at', $array);
        $this->assertArrayNotHasKey('updated_at', $array);
        $this->assertArrayNotHasKey('last_login_at', $array);
    }

    /**
     * Test id is returned as string.
     * AC: #2 - id is returned as string (not integer)
     */
    public function test_user_resource_returns_id_as_string(): void
    {
        $user = User::factory()->create();

        $resource = new UserResource($user);
        $array = $resource->toArray(new Request());

        $this->assertIsString($array['id']);
        $this->assertEquals((string) $user->id, $array['id']);
    }

    /**
     * Test dates are in ISO 8601 format.
     * AC: #2 - dates are in ISO 8601 format
     */
    public function test_user_resource_formats_dates_as_iso8601(): void
    {
        $user = User::factory()->create([
            'last_login_at' => '2026-01-05 10:00:00',
        ]);

        $resource = new UserResource($user);
        $array = $resource->toArray(new Request());

        // Check ISO 8601 format (contains T and timezone)
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/',
            $array['createdAt']
        );
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/',
            $array['updatedAt']
        );
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/',
            $array['lastLoginAt']
        );
    }

    /**
     * Test sensitive fields are excluded.
     * AC: #2 - sensitive fields (password, remember_token) are excluded
     */
    public function test_user_resource_excludes_sensitive_fields(): void
    {
        $user = User::factory()->create([
            'password' => 'secret123',
            'remember_token' => 'some-token',
        ]);

        $resource = new UserResource($user);
        $array = $resource->toArray(new Request());

        $this->assertArrayNotHasKey('password', $array);
        $this->assertArrayNotHasKey('remember_token', $array);
        $this->assertArrayNotHasKey('rememberToken', $array);
    }

    /**
     * Test nullable fields are handled correctly.
     * AC: #1 - Handle nullable fields (phone, avatarUrl, lastLoginAt)
     */
    public function test_user_resource_handles_nullable_fields(): void
    {
        $user = User::factory()->create([
            'phone' => null,
            'avatar_url' => null,
            'last_login_at' => null,
        ]);

        $resource = new UserResource($user);
        $array = $resource->toArray(new Request());

        $this->assertNull($array['phone']);
        $this->assertNull($array['avatarUrl']);
        $this->assertNull($array['lastLoginAt']);
    }

    /**
     * Test collection transformation.
     * AC: #3 - UserResource::collection returns properly formatted array
     */
    public function test_user_resource_collection_transforms_all_users(): void
    {
        User::factory()->count(3)->create();
        $users = User::all();

        $collection = UserResource::collection($users);
        $array = $collection->toArray(new Request());

        $this->assertCount(3, $array);

        foreach ($array as $userData) {
            // All users should have camelCase keys
            $this->assertArrayHasKey('id', $userData);
            $this->assertArrayHasKey('name', $userData);
            $this->assertArrayHasKey('email', $userData);
            $this->assertArrayHasKey('avatarUrl', $userData);
            $this->assertArrayHasKey('createdAt', $userData);
            $this->assertArrayHasKey('lastLoginAt', $userData);

            // ID should be string
            $this->assertIsString($userData['id']);

            // Sensitive fields excluded
            $this->assertArrayNotHasKey('password', $userData);
            $this->assertArrayNotHasKey('remember_token', $userData);
        }
    }

    /**
     * Test complete user data matches expected structure.
     * AC: #1 - Full response structure verification
     */
    public function test_user_resource_complete_structure(): void
    {
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '+6281234567890',
            'role' => 'admin',
            'avatar_url' => null,
            'last_login_at' => '2026-01-05 11:00:00',
        ]);

        $resource = new UserResource($user);
        $array = $resource->toArray(new Request());

        $this->assertEquals('John Doe', $array['name']);
        $this->assertEquals('john@example.com', $array['email']);
        $this->assertEquals('+6281234567890', $array['phone']);
        $this->assertEquals('admin', $array['role']);
        $this->assertNull($array['avatarUrl']);
        $this->assertNotNull($array['createdAt']);
        $this->assertNotNull($array['lastLoginAt']);
    }
}
