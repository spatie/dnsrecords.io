<?php

namespace App\Http\Middleware;

use App\Services\DnsRecordsRetriever;
use Closure;
use Illuminate\Http\Request;

class SanitizeCommand
{
    public function handle(Request $request, Closure $next)
    {
        $command = $request->command ?? $request->route('command');

        $sanitizedCommand = $this->sanitizeCommand($command);

        if ($command !== $sanitizedCommand) {
            return redirect()->action('HomeController@submit', ['command' => $sanitizedCommand]);
        }

        return $next($request);
    }

    protected function sanitizeCommand(string $command = ''): string
    {
        $dnsRecordsRetriever = app(DnsRecordsRetriever::class);

        return $dnsRecordsRetriever->getSanitizedDomain($command);
    }
}
