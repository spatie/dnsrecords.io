<?php

namespace App\Providers;

use App\Services\BotProtection\DatacenterIpRanges;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(DatacenterIpRanges::class, fn () => new DatacenterIpRanges(config('bot-protection.datacenter_ip_ranges_path')));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('lookups', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });
    }
}
