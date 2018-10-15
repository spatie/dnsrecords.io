<?php

namespace App\Services\Commands\Commands;

use App\Services\Commands\Command;
use App\Services\DnsRecordsRetriever;
use Exception;
use Illuminate\Support\Collection;
use Spatie\Dns\Dns;
use Symfony\Component\HttpFoundation\Response;

class DnsLookup implements Command
{
    const SUPPORTED_RECORD_TYPES = [
        'A',
        'AAAA',
        'CNAME',
        'NS',
        'SOA',
        'MX',
        'SRV',
        'TXT',
        'DNSKEY',
        'CAA',
    ];

    public function canPerform(string $command): bool
    {
        return true;
    }

    public function perform(string $command): Response
    {
        try {
            $commandArguments = collect(explode(' ', $command));

            $host = $commandArguments->first();
            $types = $this->sanitizeTypes($commandArguments->slice(1));

            $dns = new Dns($host);

            $dnsRecords = $dns->getRecords(...$types);

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

    protected function sanitizeTypes(Collection $types): Collection {
        return $types->map(function ($type) {
            return strtoupper($type);
        })->filter(function ($type) {
            return in_array($type, $this->supportedRecordTypes);
        });
    }
}
