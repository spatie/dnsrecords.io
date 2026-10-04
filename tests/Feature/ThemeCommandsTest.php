<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ThemeCommandsTest extends TestCase
{
    #[Test]
    public function it_opens_mother_and_lcars_from_the_terminal(): void
    {
        $this
            ->sendCommand('mother')
            ->assertRedirect('/muthur');

        $this
            ->sendCommand('lcars')
            ->assertRedirect('/lcars');
    }

    #[Test]
    public function it_opens_the_new_interfaces_from_any_theme(): void
    {
        foreach (['matrix', 'system7', 'winxp'] as $interface) {
            $this
                ->sendCommand($interface)
                ->assertRedirect("/{$interface}");

            $this
                ->sendCommand($interface, "/muthur/{$interface}")
                ->assertRedirect("/{$interface}");
        }
    }

    #[Test]
    public function it_opens_mother_and_lcars_from_the_old_interface(): void
    {
        $this
            ->sendCommand('mother', '/old/mother')
            ->assertRedirect('/muthur');

        $this
            ->sendCommand('lcars', '/old/lcars')
            ->assertRedirect('/lcars');
    }

    #[Test]
    public function it_mentions_mother_and_lcars_in_the_terminal_manual(): void
    {
        $this->sendCommand('help');

        $flashMessage = $this->getFlashMessage();

        $this->assertStringContainsString("Enter 'muthur' to talk to <a href=\"https://dnsrecords.io.dev/muthur\">MU/TH/UR 6000</a>.", $flashMessage);
        $this->assertStringContainsString("Enter 'lcars' to open the <a href=\"https://dnsrecords.io.dev/lcars\">LCARS console</a>.", $flashMessage);
    }

    #[Test]
    public function it_redirects_the_old_theme_urls_permanently(): void
    {
        $this
            ->get("{$this->baseUrl}/alien")
            ->assertStatus(301)
            ->assertRedirect('/muthur')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

        $this
            ->get("{$this->baseUrl}/startrek")
            ->assertStatus(301)
            ->assertRedirect('/lcars');

        $this
            ->get("{$this->baseUrl}/alien/spatie.be?ref=bookmark")
            ->assertStatus(301)
            ->assertRedirect('/muthur/spatie.be?ref=bookmark');

        $this
            ->get("{$this->baseUrl}/startrek/spatie.be%2Fen%2Fvacancies")
            ->assertStatus(301)
            ->assertRedirect('/lcars/spatie.be%2Fen%2Fvacancies');
    }

    #[Test]
    public function it_protects_the_old_theme_lookup_urls_like_lookups(): void
    {
        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/alien/spatie.be")
            ->assertForbidden();

        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/muthur/spatie.be")
            ->assertForbidden();
    }

    #[Test]
    public function it_marks_every_interface_so_pages_are_only_swapped_within_one(): void
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSee('data-interface="terminal"', false);

        $this
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSee('data-interface="terminal"', false);

        $this
            ->get("{$this->baseUrl}/muthur")
            ->assertSee('data-interface="mother"', false);

        $this
            ->get("{$this->baseUrl}/muthur/spatie.be")
            ->assertSee('data-interface="mother"', false);

        $this
            ->get("{$this->baseUrl}/lcars")
            ->assertSee('data-interface="lcars"', false);
    }

    #[Test]
    public function it_goes_back_to_the_terminal_from_every_other_interface(): void
    {
        foreach (['/lcars', '/old', '/muthur'] as $interface) {
            foreach (['exit', 'home', 'terminal', 'default'] as $command) {
                $this
                    ->sendCommand($command, "{$interface}/{$command}")
                    ->assertRedirect('/');
            }
        }
    }

    #[Test]
    public function it_returns_to_the_terminal_from_the_new_interfaces(): void
    {
        foreach (['matrix', 'system7', 'winxp'] as $interface) {
            $this
                ->sendCommand('exit', "/{$interface}/exit")
                ->assertRedirect('/');
        }
    }

    #[Test]
    public function it_mentions_the_way_back_in_the_lcars_and_old_manual(): void
    {
        $this->sendCommand('help', '/lcars/help');

        $this->assertStringContainsString("Enter 'exit' to return to the", $this->getFlashMessage());

        $this->sendCommand('help', '/old/help');

        $this->assertStringContainsString("Enter 'exit' to return to the", $this->getFlashMessage());
    }

    #[Test]
    public function it_mentions_the_default_phosphor_in_the_terminal_manual(): void
    {
        $this->sendCommand('help');

        $this->assertStringContainsString("'default' to go back to green", $this->getFlashMessage());
    }

    #[Test]
    public function it_opens_mother_with_every_name_of_hers()
    {
        foreach (['muthur', 'MUTHUR', 'mu-th-ur', 'mother'] as $command) {
            $this
                ->sendCommand($command)
                ->assertRedirect('/muthur');
        }

        $this
            ->sendCommand('mother', '/old/mother')
            ->assertRedirect('/muthur');
    }

    #[Test]
    public function it_moved_mother_to_muthur_permanently()
    {
        $this
            ->get("{$this->baseUrl}/mother")
            ->assertStatus(301)
            ->assertRedirect('/muthur')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

        $this
            ->get("{$this->baseUrl}/mother/spatie.be?ref=bookmark")
            ->assertStatus(301)
            ->assertRedirect('/muthur/spatie.be?ref=bookmark');

        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/mother/spatie.be")
            ->assertForbidden();

        $this
            ->get("{$this->baseUrl}/muthur")
            ->assertSuccessful()
            ->assertSee('data-interface="mother"', false);
    }
}
