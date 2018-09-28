<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use App\Services\DnsRecordsRetriever;
use Exception;
use Spatie\Dns\Dns;
use Symfony\Component\HttpFoundation\Response;

class DnsLookup implements Command
{
    public function canPerform(string $command): bool
    {
        return true;
    }

    public function perform(string $command): Response
    {
        $dns = new Dns($command);

        try {
            $dnsRecords = $dns->getRecords();

            $domain = $dns->getDomain($command);
        } catch (Exception $e) {
            $dnsRecords = '';
        }

        if ($dnsRecords === '') {
            $errorText = __('errors.noDnsRecordsFound', compact('domain'));

            flash()->error($errorText);

            return redirect('/');
        }

        return response()->view('home.index', ['output' => $dnsRecords, 'domain' => $domain ]);
    }
}
