<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ManualTest extends TestCase
{
    #[Test]
    public function it_shows_the_manual(): void
    {
        $this->sendCommand('help');

        $flashMessage = $this->getFlashMessage();

        $this->assertStringContainsString('domain name', $flashMessage);
        $this->assertStringContainsString('ip', $flashMessage);
        $this->assertStringContainsString('clear', $flashMessage);
        $this->assertStringContainsString('doom', $flashMessage);
        $this->assertStringContainsString('bookmarklet', $flashMessage);
    }
}
