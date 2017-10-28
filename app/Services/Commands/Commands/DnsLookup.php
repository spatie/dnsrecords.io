<?php

namespace App\Services\Commands\Command;

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

            return back();
        }

        request()->session()->flash('output', htmlentities($dnsRecords));

        return back();
    }
}
