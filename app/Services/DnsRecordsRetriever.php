<?php

namespace App\Services;

use Exception;
use Symfony\Component\Process\Process;

class DnsRecordsRetriever
{
    public function retrieveDnsRecords(string $domain): string
    {
        $domain = $this->getSanitizedDomain($domain);

        return cache()->remember(md5($domain), 1, function () use ($domain) {
            return $this->retrieveRawDnsRecords($domain);
        });
    }

    public function getSanitizedDomain(string $domain): string
    {
        $domain = str_replace(['http://', 'https://'], '', $domain);

        $domain = parse_url("http://{$domain}", PHP_URL_HOST);

        if (function_exists('idn_to_ascii')) {
            $domain = idn_to_ascii($domain) ?? $domain;
        }

        $domain = str_before($domain, '/');

        return strtolower($domain);
    }

    protected function retrieveRawDnsRecords(string $domain): string
    {
        try {
            return collect([
                'A',
                'AAAA',
                'NS',
                'SOA',
                'MX',
                'TXT',
                'DNSKEY',
            ])
                ->map(function (string $recordType) use ($domain) {
                    $command = 'dig +nocmd ' . escapeshellarg($domain) . " {$recordType} +multiline +noall +answer";

                    $process = new Process($command);

                    $process->run();

                    if (!$process->isSuccessful()) {
                        throw new Exception('Dns records could not be fetched.');
                    }

                    return $process->getOutput();
                })->implode('');
        } catch (Exception $e) {
            return '';
        }
    }
}
