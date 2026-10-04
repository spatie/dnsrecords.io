<?php

namespace App\Http\Middleware;

use App\Enums\Theme;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * The home pages are cached at the edge, so they can't set or read cookies
 * on the server. They remember the theme with a script instead, which is why
 * the cookie is neither encrypted nor http only.
 */
class RememberTheme
{
    public static string $cookieName = 'dnsrecords_theme';

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('home')) {
            if ($request->query('theme') === 'terminal') {
                return redirect()->route('home')->withCookie($this->themeCookie(Theme::Crt));
            }
        }

        $response = $next($request);

        if ($request->isMethod('GET')) {
            if ($request->routeIs('command', '*.command')) {
                $response->headers->setCookie($this->themeCookie(Theme::fromRequest($request)));
            }
        }

        return $response;
    }

    protected function themeCookie(Theme $theme): Cookie
    {
        return cookie(static::$cookieName, $theme->cookieValue(), 60 * 24 * 365, httpOnly: false);
    }
}
