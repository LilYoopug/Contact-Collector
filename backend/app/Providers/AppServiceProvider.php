<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
        
        // Configure rate limiters (NFR13)
        $this->configureRateLimiting();
    }
    
    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        // Batch operations rate limiter: 10 requests per minute per user
        RateLimiter::for('batch', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });
        
        // Public API rate limiter: 100 requests per minute per API key (NFR13)
        // Story 7.7: Must rate limit by API key, not by IP or user
        RateLimiter::for('api-key', function (Request $request) {
            // Get the API key from the request attributes (set by ApiKeyAuth middleware)
            $apiKey = $request->attributes->get('api_key');
            
            if ($apiKey) {
                // Rate limit by API key ID (100 requests per minute per key)
                return Limit::perMinute(100)->by('api_key:' . $apiKey->id);
            }
            
            // Fallback to IP if no API key (shouldn't happen with middleware)
            return Limit::perMinute(100)->by($request->ip());
        });
    }
}
