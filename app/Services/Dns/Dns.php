<?php

namespace App\Services\Dns;

use App\Services\Dns\Exceptions\CouldNotFetchDns;
use App\Services\Dns\Exceptions\InvalidArgument;
use Illuminate\Process\Pool;
use Illuminate\Support\Facades\Process;

class Dns
{
    protected string $domain;

    /** @var array<int, string> */
    protected array $recordTypes = [
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
        'NAPTR',
    ];

    public function __construct(string $domain)
    {
        if (empty($domain)) {
            throw InvalidArgument::domainIsMissing();
        }

        $this->domain = $this->sanitizeDomainName($domain);
    }

    public function getDomain(): string
    {
        return $this->domain;
    }

    /**
     * Queries all record types at the same time, one dig process per type,
     * and returns their answers in the order of the types.
     *
     * @param array<int, string>|string ...$types
     *
     * @throws CouldNotFetchDns
     */
    public function getRecords(array|string ...$types): string
    {
        $types = $this->determineTypes($types);

        $types = count($types)
            ? $types
            : $this->recordTypes;

        $results = Process::pool(function (Pool $pool) use ($types) {
            foreach ($types as $type) {
                $pool->as($type)->command($this->digCommand($type));
            }
        })->start()->wait();

        $dnsRecords = array_map(function (string $type) use ($results) {
            $result = $results[$type];

            if ($result->failed()) {
                throw CouldNotFetchDns::digReturnedWithError(trim($result->errorOutput()));
            }

            return $result->output();
        }, $types);

        return implode('', array_filter($dnsRecords));
    }

    /**
     * @param array<int, array<int, string>|string> $types
     *
     * @return array<int, string>
     */
    protected function determineTypes(array $types): array
    {
        $types = is_array($types[0] ?? null)
            ? $types[0]
            : $types;

        $types = array_map('strtoupper', $types);

        foreach ($types as $type) {
            if (! in_array($type, $this->recordTypes)) {
                throw InvalidArgument::filterIsNotAValidRecordType($type, $this->recordTypes);
            }
        }

        return $types;
    }

    protected function sanitizeDomainName(string $domain): string
    {
        $domain = str_replace(['http://', 'https://'], '', $domain);

        $domain = strtok($domain, '/');

        return strtolower($domain);
    }

    /** @return array<int, string> */
    protected function digCommand(string $type): array
    {
        return array_values(array_filter([
            'dig',
            '+nocmd',
            $this->domain,
            $type,
            '+multiline',
            '+noall',
            '+answer',
        ]));
    }
}
