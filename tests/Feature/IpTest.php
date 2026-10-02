<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class IpTest extends TestCase
{
    #[Test]
    public function it_shows_your_ip_address()
    {
        $this
            ->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
            ->sendCommand('ip')
            ->assertSee('Your ip address is 203.0.113.7.');
    }
}
