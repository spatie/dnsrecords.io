<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ManualTest extends TestCase
{
    #[Test]
    public function it_shows_the_manual(): void
    {
        $this
            ->sendCommand('help')
            ->assertSuccessful()
            ->assertSee('domain name')
            ->assertSee('ip')
            ->assertSee('clear')
            ->assertSee('doom')
            ->assertSee('bookmarklet');
    }
}
