<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected $baseUrl = 'https://dnsrecords.io.dev';

    protected function sendCommand(string $command, string $url = null): TestResponse
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
