<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\User\StoreAvatarRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use Illuminate\Auth\Events\Login;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        // Autentikasi & rate limit sudah dilakukan di LoginRequest
        $request->authenticate();

        $user = $request->user(); // ambil user yang berhasil login

        // Story 8.9 FIX: Track last_login_at for active users metric
        $user->update(['last_login_at' => now()]);

        // Buat token API Laravel Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user->fresh(),
        ]);
    }


    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Buat token dengan nama default
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function logout(Request $request)
    {
        // Menghapus token yang sedang digunakan
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Berhasil logout'
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink($request->only('email'));

        if ($status != Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => __($status)
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', \Illuminate\Validation\Rules\Password::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request) {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                ])->save();
            }
        );

        if ($status != Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['message' => __($status)]);
    }

    /**
     * Upload user avatar.
     * 
     * Story 8.1: Avatar Upload API Endpoint
     * AC#1: Store file in storage/app/public/avatars/, update avatar_url, return updated user
     * AC#4: Delete old avatar before saving new one
     * AC#5: Return full URL accessible from browser
     */
    public function uploadAvatar(StoreAvatarRequest $request)
    {
        $user = $request->user();
        $file = $request->file('avatar');

        // AC#4: Delete old avatar if exists
        if ($user->avatar_url) {
            $oldPath = str_replace('/storage/', '', $user->avatar_url);
            Storage::disk('public')->delete($oldPath);
        }

        // AC#1 & AC#5: Store with unique filename {user_id}_{timestamp}.{ext}
        $extension = $file->getClientOriginalExtension();
        $filename = $user->id . '_' . time() . '.' . $extension;
        
        $path = $file->storeAs('avatars', $filename, 'public');

        // Update user's avatar_url with storage path
        $user->update([
            'avatar_url' => '/storage/' . $path,
        ]);

        // AC#1: Return updated user with new avatarUrl
        return new UserResource($user->fresh());
    }
}
