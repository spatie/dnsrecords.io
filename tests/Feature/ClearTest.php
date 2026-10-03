<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ClearTest extends TestCase
{
    #[Test]
    public function it_clears_the_output(): void
    {
        $this
            ->sendCommand('clear', '/spatie.be')
            ->assertRedirect('/');
    }
}
