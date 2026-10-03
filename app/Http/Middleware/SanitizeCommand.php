<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\Dns\Dns;
use Symfony\Component\HttpFoundation\Response;

class SanitizeCommand
{
    public function handle(Request $request, Closure $next)
    {
        $command = $request->command ?? $request->route('command');

        $sanitizedCommand = $this->sanitizeCommand($command);

        $sanitizedCommand = str_replace('...', '', $sanitizedCommand ?? '');

        if ($command === $sanitizedCommand) {
            return $next($request);
        }

        if ($request->isMethod('GET')) {
            return $this->continueWithSanitizedCommand($request, $next, $sanitizedCommand);
        }

        return $sanitizedCommand
            ? redirect()->route('command', ['command' => $sanitizedCommand])
            : redirect('/');
    }

    /**
     * Crawlers request lots of malformed lookup urls. Answering those directly
     * instead of redirecting halves the number of requests they make.
     */
    protected function continueWithSanitizedCommand(Request $request, Closure $next, string $sanitizedCommand): Response
    {
        if (! $sanitizedCommand) {
            return response()->view('home.index', [], 404);
        }

        $request->merge(['command' => $sanitizedCommand]);

        return $next($request);
    }

    protected function sanitizeCommand(?string $command = ''): ?string
    {
        $cleanCommand = strip_tags($command ?? '');

        if (!$cleanCommand) {
            return null;
        }

        return (new Dns(strip_tags($cleanCommand)))->getDomain();
    }
}
