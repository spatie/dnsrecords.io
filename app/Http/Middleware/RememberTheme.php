<?php

namespace App\Http\Middleware;

use App\Enums\Theme;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RememberTheme
{
    private const CookieName = 'dnsrecords_theme';

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('GET') && $request->routeIs('home')) {
            if ($request->query('theme') === 'terminal') {
                return redirect()->route('home')->cookie(self::CookieName, 'crt', 60 * 24 * 365);
            }

            $remembered = $request->cookie(self::CookieName);

            foreach (Theme::cases() as $theme) {
                if ($remembered === strtolower($theme->name) && $theme !== Theme::Crt) {
                    return redirect($theme->homeUrl());
                }
            }
        }

        $response = $next($request);

        if ($request->isMethod('GET') && $request->routeIs('home', 'command', 'old.*', 'lcars.*', 'mother.*', 'matrix.*', 'system7.*', 'winxp.*')) {
            $response->headers->setCookie(cookie(self::CookieName, strtolower(Theme::fromRequest($request)->name), 60 * 24 * 365));
        }

        return $response;
    }
}
