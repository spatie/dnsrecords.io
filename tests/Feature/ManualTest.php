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

        $this->assertContains('domain name', $flashMessage);
        $this->assertContains('ip', $flashMessage);
        $this->assertContains('clear', $flashMessage);
        $this->assertContains('doom', $flashMessage);
        $this->assertContains('bookmarklet', $flashMessage);
    }
}
