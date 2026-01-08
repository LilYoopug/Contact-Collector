<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ApiKey;
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
        // Story 8.7 FIX: Include contact count for each user
        $users = User::withCount('contacts')
            ->orderBy('created_at', 'desc')
            ->get();

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
     * Story 9-3: Wire Admin Dashboard to Real Backend Data
     * Extended to include user growth trends, API key stats, and activity feed.
     *
     * @return JsonResponse
     */
    public function stats(): JsonResponse
    {
        $user = auth()->user();
        
        $now = Carbon::now();
        $startOfWeek = $now->copy()->startOfWeek();

        // CRIT-1/2 FIX: Return useful stats for regular users too
        if ($user->role !== 'admin') {
            $myContacts = $user->contacts();
            $myContactCount = $myContacts->count();
            $newToday = $user->contacts()->whereDate('created_at', $now->toDateString())->count();
            $optInCount = $user->contacts()->where('consent', 'opt_in')->count();
            $optInRate = $myContactCount > 0 ? round(($optInCount / $myContactCount) * 100) : 0;
            
            // User's contact trend (last 7 days)
            $contactTrend = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = $now->copy()->subDays($i);
                $count = $user->contacts()->whereDate('created_at', $date->toDateString())->count();
                $contactTrend[] = [
                    'label' => $date->format('D'),
                    'fullDate' => $date->toDateString(),
                    'value' => $count,
                ];
            }
            
            // Growth rate for user (FIX: Compare last 7 days vs previous 7 days for fair comparison)
            $last7Days = $user->contacts()->where('created_at', '>=', $now->copy()->subDays(7))->count();
            $previous7Days = $user->contacts()->whereBetween('created_at', [
                $now->copy()->subDays(14),
                $now->copy()->subDays(7)
            ])->count();
            $growthRate = $previous7Days > 0 
                ? round((($last7Days - $previous7Days) / $previous7Days) * 100)
                : ($last7Days > 0 ? 100 : 0);
            $newThisWeek = $last7Days;
            
            // Source distribution for user (UI-FIX: Fixes empty donut chart)
            $sourceCounts = $user->contacts()
                ->selectRaw('source, count(*) as count')
                ->groupBy('source')
                ->get()
                ->pluck('count', 'source');

            return response()->json([
                'data' => [
                    'myContactCount' => $myContactCount,
                    'newToday' => $newToday,
                    'optInRate' => $optInRate,
                    'contactTrend' => $contactTrend,
                    'newThisWeek' => $newThisWeek,
                    'growthRate' => $growthRate,
                    'sourceCounts' => $sourceCounts,
                ]
            ]);
        }

        $now = Carbon::now();
        $startOfWeek = $now->copy()->startOfWeek();

        // Basic stats
        $totalUsers = User::count();
        $activeUsersThisMonth = User::where('last_login_at', '>=', $now->copy()->startOfMonth())->count();
        $totalContacts = Contact::count();
        $contactsThisWeek = Contact::where('created_at', '>=', $startOfWeek)->count();

        // PERFORMANCE FIX: Optimized aggregate queries to replace N+1 loops (CRIT-2)
        $daysRange = collect(range(6, 0))->map(fn($i) => $now->copy()->subDays($i)->toDateString());
        
        // User growth trend - optimized
        $dailyUsers = User::where('created_at', '>=', $now->copy()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as date, count(*) as count')
            ->groupBy('date')
            ->get()
            ->pluck('count', 'date');
            
        $userGrowthTrend = [];
        $runningTotal = User::where('created_at', '<', $now->copy()->subDays(6)->startOfDay())->count();
        foreach ($daysRange as $dateStr) {
            $count = $dailyUsers->get($dateStr, 0);
            $runningTotal += $count;
            $userGrowthTrend[] = [
                'label' => Carbon::parse($dateStr)->format('D'),
                'value' => $runningTotal,
            ];
        }

        // Contact trend - optimized
        $dailyContacts = Contact::where('created_at', '>=', $now->copy()->subDays(6)->startOfDay())
            ->selectRaw('DATE(created_at) as date, count(*) as count')
            ->groupBy('date')
            ->get()
            ->pluck('count', 'date');

        $contactTrend = $daysRange->map(fn($dateStr) => [
            'label' => Carbon::parse($dateStr)->format('D'),
            'fullDate' => $dateStr,
            'value' => $dailyContacts->get($dateStr, 0),
        ])->toArray();

        // Story 9-3: API Key stats
        $totalApiKeys = ApiKey::count();
        $activeApiKeys = ApiKey::whereNull('revoked_at')->count();

        // Story 9-3: Recent activity feed
        $recentUsers = User::orderBy('created_at', 'desc')
            ->take(10)
            ->get(['id', 'name', 'created_at'])
            ->map(fn($u) => [
                'id' => $u->id,
                'type' => 'signup',
                'user' => $u->name,
                'timestamp' => $u->created_at->timestamp,
                'time' => $u->created_at->diffForHumans(),
                'desc' => 'User registered',
            ]);

        $recentApiKeys = ApiKey::with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(fn($k) => [
                'id' => 'api_' . $k->id,
                'type' => 'api_key',
                'user' => $k->user->name ?? 'Unknown',
                'timestamp' => $k->created_at->timestamp,
                'time' => $k->created_at->diffForHumans(),
                'desc' => 'New API Key generated',
            ]);

        // Merge and sort by timestamp desc (CRIT-2 FIX: Proper chronological sorting)
        $recentActivity = $recentUsers->concat($recentApiKeys)
            ->sortByDesc('timestamp')
            ->values()
            ->take(5)
            ->toArray();

        // Story 9-3: Growth rate calculation (Total users growth vs last week)
        $totalUsersBeforeThisWeek = User::where('created_at', '<', $startOfWeek)->count();
        $newUsersThisWeek = User::where('created_at', '>=', $startOfWeek)->count();
        
        // Growth rate = (new users this week / total users before this week) * 100
        $growthRate = $totalUsersBeforeThisWeek > 0 
            ? round(($newUsersThisWeek / $totalUsersBeforeThisWeek) * 100, 1)
            : ($newUsersThisWeek > 0 ? 100 : 0);

        // Source distribution (platform-wide)
        $sourceCounts = Contact::selectRaw('source, count(*) as count')
            ->groupBy('source')
            ->get()
            ->pluck('count', 'source');

        return response()->json([
            'data' => [
                // Basic stats
                'totalUsers' => $totalUsers,
                'activeUsersThisMonth' => $activeUsersThisMonth,
                'totalContacts' => $totalContacts,
                'contactsThisWeek' => $contactsThisWeek,
                
                // API stats
                'totalApiKeys' => $totalApiKeys,
                'activeApiKeys' => $activeApiKeys,
                
                // Trends
                'userGrowthTrend' => $userGrowthTrend,
                'contactTrend' => $contactTrend,
                'newUsersThisWeek' => $newUsersThisWeek,
                'growthRate' => $growthRate,
                'sourceCounts' => $sourceCounts,
                
                // Activity feed
                'recentActivity' => $recentActivity,
            ]
        ]);
    }
}
