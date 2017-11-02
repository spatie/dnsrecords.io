<?php

namespace Tests\Feature;

use Tests\TestCase;

class DoomTest extends TestCase
{
    /** @test */
    public function it_redirects_to_doom()
    {
        $this
            ->sendCommand('doom')
            ->assertRedirect('https://js-dos.com/games/doom.exe.html');
    }
}
