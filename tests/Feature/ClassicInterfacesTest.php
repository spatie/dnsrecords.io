<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ClassicInterfacesTest extends TestCase
{
    #[Test]
    public function it_shows_each_interface_and_its_lookup_form(): void
    {
        foreach (['matrix', 'system7', 'winxp'] as $interface) {
            $this
                ->get("{$this->baseUrl}/{$interface}")
                ->assertSuccessful()
                ->assertSee("data-interface=\"{$interface}\"", false)
                ->assertSee("action=\"{$this->baseUrl}/{$interface}\"", false)
                ->assertSee('id="entries"', false)
                ->assertSee('name="_token"', false)
                ->assertSee('Interfaces');
        }
    }

    #[Test]
    public function it_keeps_results_in_the_selected_interface(): void
    {
        foreach (['matrix', 'system7', 'winxp'] as $interface) {
            $response = $this
                ->get("{$this->baseUrl}/{$interface}/spatie.be")
                ->assertSuccessful()
                ->assertSee("data-interface=\"{$interface}\"", false)
                ->assertSee('2 records')
                ->assertSee('103.133.1.1');

            if ($interface === 'matrix') {
                $response
                    ->assertSee('class="matrix-signal__canvas"', false)
                    ->assertDontSee('class="record-head"', false);
            } else {
                $response->assertSee('data-raw=', false);
            }

            $this
                ->post("{$this->baseUrl}/{$interface}", ['command' => 'spatie.be'])
                ->assertSuccessful()
                ->assertSee('103.133.1.1');
        }
    }

    #[Test]
    public function it_shows_lookup_errors_and_keeps_clear_local_to_the_theme(): void
    {
        foreach (['matrix', 'system7', 'winxp'] as $interface) {
            $this
                ->get("{$this->baseUrl}/{$interface}/nothing-here.be")
                ->assertNotFound()
                ->assertSee('Could not fetch dns records');

            $this
                ->sendCommand('clear', "/{$interface}/clear")
                ->assertRedirect("/{$interface}");
        }
    }
}
