<?php

use App\Http\Middleware\AddNoIndexHeader;
use App\Http\Middleware\BlockCrawlers;
use App\Http\Middleware\SanitizeCommand;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Spatie\HttpLogger\Middlewares\HttpLogger;
use Spatie\LaravelFlare\Facades\Flare;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'blockCrawlers' => BlockCrawlers::class,
            'noIndex' => AddNoIndexHeader::class,
            'logRequest' => HttpLogger::class,
            'sanitizeCommand' => SanitizeCommand::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        Flare::handles($exceptions);
    })->create();
