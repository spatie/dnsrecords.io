<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class IpTest extends TestCase
{
    #[Test]
    public function it_shows_your_ip_address()
    {
        $content = $this->sendCommand('ip')->content();

        $isIpAddress = '/(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])/';

        $this->assertMatchesRegularExpression($isIpAddress, $content);
    }
}
