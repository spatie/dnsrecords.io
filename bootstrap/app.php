<?php

use App\Http\Middleware\AddNoIndexHeader;
use App\Http\Middleware\BlockCrawlers;
use App\Http\Middleware\CacheAtEdge;
use App\Http\Middleware\RememberTheme;
use App\Http\Middleware\SanitizeCommand;
use App\Http\Middleware\ServeLookupShell;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Spatie\HttpLogger\Middlewares\HttpLogger;
use Spatie\LaravelFlare\Facades\Flare;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->append(ServeLookupShell::class);
        $middleware->encryptCookies(except: [RememberTheme::$cookieName, BlockCrawlers::$blockedCookieName]);

        /*
         * Lookups don't change anything, and the forms that submit them are
         * on pages that are cached at the edge, without a session.
         */
        $middleware->web(append: [RememberTheme::class], remove: [PreventRequestForgery::class]);

        $middleware->alias([
            'blockCrawlers' => BlockCrawlers::class,
            'cacheAtEdge' => CacheAtEdge::class,
            'noIndex' => AddNoIndexHeader::class,
            'logRequest' => HttpLogger::class,
            'sanitizeCommand' => SanitizeCommand::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        Flare::handles($exceptions);
    })->create();
