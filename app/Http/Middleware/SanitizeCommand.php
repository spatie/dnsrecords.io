<?php

namespace App\Http\Middleware;

use App\Services\DnsRecordsRetriever;
use Closure;
use Illuminate\Http\Request;
use Spatie\Dns\Dns;

class SanitizeCommand
{
    public function handle(Request $request, Closure $next)
    {
        $command = $request->command ?? $request->route('command');

        $sanitizedCommand = $this->sanitizeCommand($command);

        $sanitizedCommand = str_replace('...', '', $sanitizedCommand);

        if ($command !== $sanitizedCommand) {
            return redirect()->action('HomeController@submit', ['command' => $sanitizedCommand]);
        }

        return $next($request);
    }

    protected function sanitizeCommand(string $command = ''): string
    {
        return (new Dns($command))->getDomain();
    }
}
