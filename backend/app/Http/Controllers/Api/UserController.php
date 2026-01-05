<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Contact;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Display a listing of all users.
     * 
     * Admin-only endpoint that returns all users in the system
     * using UserResource transformation (camelCase fields).
     *
     * @return AnonymousResourceCollection
     */
    public function index(): AnonymousResourceCollection
    {
        $users = User::orderBy('created_at', 'desc')->get();

        return UserResource::collection($users);
    }

    /**
     * Store a newly created user.
     * 
     * Admin-only endpoint to create a new user account.
     * HIGH-2 FIX: Returns 201 Created status code per REST standards.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', Password::min(8)],
            'role' => ['required', 'string', Rule::in(['admin', 'user'])],
            'phone' => ['nullable', 'string', 'max:20'],
        ], [
            // MED-6 FIX: Custom validation messages
            'email.unique' => 'Email already in use',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
        ]);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * Display the specified user.
     *
     * @param User $user
     * @return UserResource
     */
    public function show(User $user): UserResource
    {
        return new UserResource($user);
    }

    /**
     * Update the specified user.
     * 
     * Admin-only endpoint to update user profile and role.
     * SECURITY: Prevents admin from changing their own role (lockout protection).
     *
     * @param Request $request
     * @param User $user
     * @return UserResource|JsonResponse
     */
    public function update(Request $request, User $user): UserResource|JsonResponse
    {
        // CRIT-2 FIX: Prevent self-role-change to avoid admin lockout
        if ($request->user()->id === $user->id && 
            $request->has('role') && 
            $request->role !== $user->role) {
            return response()->json([
                'message' => 'Cannot change your own role',
                'errors' => ['role' => ['Cannot change your own role']]
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => ['nullable', 'string', Password::min(8)],
            'role' => ['sometimes', 'string', Rule::in(['admin', 'user'])],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        // MED-2 FIX: Only update password if provided and not empty
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return new UserResource($user->fresh());
    }

    /**
     * Remove the specified user (deactivate/delete).
     * 
     * Admin-only endpoint to delete a user account.
     *
     * @param User $user
     * @return JsonResponse
     */
    public function destroy(User $user): JsonResponse
    {
        // Prevent admin from deleting themselves
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'Cannot delete your own account'
            ], 422);
        }

        $user->delete();

        return response()->json(null, 204);
    }

    /**
     * Get dashboard statistics for admin panel.
     * 
     * Returns aggregated statistics including:
     * - Total users in the system
     * - Active users this month (users who logged in this month)
     * - Total contacts across all users
     * - Contacts created this week
     *
     * @return JsonResponse
     */
    public function stats(): JsonResponse
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfWeek = $now->copy()->startOfWeek();

        // Total users
        $totalUsers = User::count();

        // Active users this month (users who logged in this month)
        $activeUsersThisMonth = User::whereNotNull('last_login_at')
            ->where('last_login_at', '>=', $startOfMonth)
            ->count();

        // Total contacts
        $totalContacts = Contact::count();

        // Contacts created this week
        $contactsThisWeek = Contact::where('created_at', '>=', $startOfWeek)->count();

        return response()->json([
            'data' => [
                'totalUsers' => $totalUsers,
                'activeUsersThisMonth' => $activeUsersThisMonth,
                'totalContacts' => $totalContacts,
                'contactsThisWeek' => $contactsThisWeek,
            ]
        ]);
    }
}
