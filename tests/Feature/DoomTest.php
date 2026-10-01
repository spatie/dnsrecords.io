<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DoomTest extends TestCase
{
    #[Test]
    public function it_redirects_to_doom()
    {
        $this
            ->sendCommand('doom')
            ->assertRedirect('https://js-dos.com/games/doom.exe.html');
    }
}
