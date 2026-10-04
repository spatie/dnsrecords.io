<?php

namespace App\Providers;

use App\Services\BotProtection\DatacenterIpRanges;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\ViewErrorBag;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(
            DatacenterIpRanges::class,
            fn () => new DatacenterIpRanges(config('bot-protection.datacenter_ip_ranges_path')),
        );
    }

    public function boot(): void
    {
        RateLimiter::for('lookups', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));

        View::share('errors', new ViewErrorBag);
    }
}
