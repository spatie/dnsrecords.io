<?php

namespace Tests\Feature;

use Tests\TestCase;

class ManualTest extends TestCase
{
    /** @test */
    public function it_shows_the_manual()
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
