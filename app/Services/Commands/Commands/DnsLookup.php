<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use App\Services\DnsRecordsRetriever;
use Symfony\Component\HttpFoundation\Response;

class DnsLookup implements Command
{
    public function canPerform(string $command): bool
    {
        return true;
    }

    public function perform(string $command): Response
    {
        $dnsRecordsRetriever = new DnsRecordsRetriever();

        $dnsRecords = $dnsRecordsRetriever->retrieveDnsRecords($command);

        if ($dnsRecords === '') {
            $domain = $dnsRecordsRetriever->getSanitizedDomain($command);

            $errorText = __('errors.noDnsRecordsFound', compact('domain'));

            flash()->error($errorText);

            return redirect('/');
        }

        return response()->view('home.index', ['output' => htmlentities($dnsRecords)]);
    }
}
