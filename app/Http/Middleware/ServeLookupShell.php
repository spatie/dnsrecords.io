<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

/**
 * Crawlers request lots of lookup urls they found on other sites. A plain
 * lookup url gets a page that is the same for every url, so the edge can
 * cache it. That page sends browsers on to the actual lookup, so crawlers
 * that don't run JavaScript never wake the app. The page is answered with a
 * 404, so crawlers treat the urls they found as dead links and stop coming
 * back, while browsers run its script all the same.
 */
class ServeLookupShell
{
    public static string $lookupParameter = 'lookup';

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->isPlainLookup($request)) {
            return $next($request);
        }

        $response = response()
            ->view('lookup.shell', [
                'lookupParameter' => static::$lookupParameter,
                'blockedCookieName' => BlockCrawlers::$blockedCookieName,
            ], Response::HTTP_NOT_FOUND)
            ->header('X-Robots-Tag', 'noindex, nofollow');

        return CacheAtEdge::makeCacheable($response);
    }

    protected function isPlainLookup(Request $request): bool
    {
        if (! $request->isMethodCacheable()) {
            return false;
        }

        if ($request->query->has(static::$lookupParameter)) {
            return false;
        }

        try {
            $route = Route::getRoutes()->match($request);
        } catch (HttpExceptionInterface) {
            return false;
        }

        return $route->named('command', '*.command');
    }
}
