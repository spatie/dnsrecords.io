<?php

namespace App\Http\Middleware;

use App\Services\DnsRecordsRetriever;
use Illuminate\Http\Request;

class SanitizeCommand
{
    public function handle(Request $request, \Closure $next)
    {
        $command = $request->route('command');
dd($command);
        if (!$command) {
            $command = $request['command'];
        }

        if (!$command) {
            return $next($request);
        }

        /** @var DnsRecordsRetriever $dnsRecordsRetriever */
        $dnsRecordsRetriever = app(DnsRecordsRetriever::class);
        $domain = $dnsRecordsRetriever->getSanitizedDomain($command);

        if ($domain !== $command) {
            return redirect()->action('HomeController@submit', ['command' => $domain]);
        }

        return $next($request);
    }
}
