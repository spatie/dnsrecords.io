<?php

namespace Tests\Feature;

use Tests\TestCase;

class ClearTest extends TestCase
{
    /** @test */
    public function it_clears_the_output()
    {
        $this
            ->sendCommand('clear', '/spatie.be')
            ->assertRedirect('/');
    }
}
