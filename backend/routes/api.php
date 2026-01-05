<?php

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// Public routes (no authentication required)
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.email');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->name('password.update');

// Protected routes (require authentication via Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    // Contact routes - Full CRUD
    Route::get('/contacts', [ContactController::class, 'index']);
    Route::post('/contacts', [ContactController::class, 'store']);
    
    // Batch operations - Define before parameterized routes to avoid conflicts
    // Rate limited: 10 batch requests per minute per user (NFR13)
    Route::middleware('throttle:batch')->group(function () {
        Route::post('/contacts/batch', [ContactController::class, 'storeBatch']);
        Route::patch('/contacts/batch', [ContactController::class, 'updateBatch']);
        Route::delete('/contacts/batch', [ContactController::class, 'destroyBatch']);
    });
    
    Route::get('/contacts/{id}', [ContactController::class, 'show']);
    Route::put('/contacts/{id}', [ContactController::class, 'update']);
    Route::delete('/contacts/{id}', [ContactController::class, 'destroy']);

    // Admin routes
    Route::middleware('role:admin')->group(function() {
        Route::get('/admin/dashboard', fn() => response()->json(['message' => 'Welcome Admin!']));
        
        // User management routes (admin only)
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        
        // Dashboard statistics
        Route::get('/dashboard/stats', [UserController::class, 'stats']);
    });
});
