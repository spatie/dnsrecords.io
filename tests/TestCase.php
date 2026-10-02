<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    protected $baseUrl = 'https://dnsrecords.io.dev';

    /**
     * Fake dig answers, keyed by "<domain> <record type>".
     *
     * @var array<string, string>
     */
    protected array $fakeDnsRecords = [
        'spatie.be A' => "spatie.be.\t\t3600 IN A 103.133.1.1\n",
        'spatie.be MX' => "spatie.be.\t\t3600 IN MX 10 mx.spatie.be.\n",
        '. NS' => ".\t\t\t518400 IN NS a.root-servers.net.\n",
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMix();

        $this->fakeDnsLookups();
    }

    protected function fakeDnsLookups(): void
    {
        Process::fake(function (PendingProcess $process) {
            [$domain, $type] = array_slice(array_values($process->command), -5, 2);

            return $this->fakeDnsRecords["{$domain} {$type}"] ?? '';
        });
    }

    protected function sendCommand(string $command, ?string $url = null): TestResponse
    {
        $url = $url ? $this->baseUrl . $url : "{$this->baseUrl}/{$command}";

        return $this->post($url, compact('command'));
    }

    protected function getFlashMessage(): ?string
    {
        $flash = app('session.store')
            ->get('flash_notification');

        return $flash ? $flash->first()->message : null;
    }
}
