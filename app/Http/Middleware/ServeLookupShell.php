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
        $route = $this->lookupRoute($request);

        if (! $route) {
            return $next($request);
        }

        $command = $route->parameter('command');

        if (preg_match('~^https?://~i', $command)) {
            $host = parse_url($command, PHP_URL_HOST);

            if ($host) {
                return redirect()->route($route->getName(), ['command' => strtolower($host)]);
            }
        }

        if ($request->query->has(static::$lookupParameter)) {
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

    protected function lookupRoute(Request $request): ?\Illuminate\Routing\Route
    {
        if (! $request->isMethodCacheable()) {
            return null;
        }

        try {
            $route = Route::getRoutes()->match($request);
        } catch (HttpExceptionInterface) {
            return null;
        }

        return $route->named('command', '*.command') ? $route : null;
    }
}
