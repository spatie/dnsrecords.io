<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Every request that reaches the app wakes it up from hibernation. Pages
 * that look the same for every visitor are cached by Cloud's edge, which
 * purges its cache on every deploy.
 */
class CacheAtEdge
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! in_array($response->getStatusCode(), [Response::HTTP_OK, Response::HTTP_MOVED_PERMANENTLY], true)) {
            return $response;
        }

        if (count($response->headers->getCookies())) {
            return $response;
        }

        return static::makeCacheable($response);
    }

    public static function makeCacheable(Response $response): Response
    {
        return $response
            ->setPublic()
            ->setMaxAge(60 * 5)
            ->setSharedMaxAge(60 * 60 * 24 * 7);
    }
}
