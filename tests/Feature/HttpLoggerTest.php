<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HttpLoggerTest extends TestCase
{
    #[Test]
    public function it_does_not_log_cookie_headers()
    {
        $logPath = storage_path('logs/http-logger-test.log');

        @unlink($logPath);

        config()->set('logging.channels.http-logger-test', [
            'driver' => 'single',
            'path' => $logPath,
        ]);

        config()->set('http-logger.log_channel', 'http-logger-test');

        $this
            ->withHeader('Cookie', 'some_cookie=secret-session-value')
            ->sendCommand('clear');

        $loggedRequest = file_get_contents($logPath);

        $this->assertStringContainsString('POST /clear', $loggedRequest);
        $this->assertStringContainsString('"cookie":["****"]', $loggedRequest);
        $this->assertStringNotContainsString('secret-session-value', $loggedRequest);

        unlink($logPath);
    }
}
