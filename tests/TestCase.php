<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected $baseUrl = 'https://dnsrecords.io.dev';

    protected function sendCommand(string $command): TestResponse
    {
        return $this->post("{$this->baseUrl}/{$command}", compact('command'));
    }
}
