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
        $this
            ->sendCommand('help')
            ->assertSuccessful()
            ->assertSee('href="https://dnsrecords.io.dev/muthur"', false)
            ->assertSee('href="https://dnsrecords.io.dev/lcars"', false);
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
            ->assertRedirect('/muthur/spatie.be');

        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/muthur/spatie.be?lookup=1")
            ->assertForbidden();
    }

    #[Test]
    public function it_marks_every_interface_so_pages_are_only_swapped_within_one(): void
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSee('data-interface="terminal"', false);

        $this
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertSee('data-interface="terminal"', false);

        $this
            ->get("{$this->baseUrl}/muthur")
            ->assertSee('data-interface="mother"', false);

        $this
            ->get("{$this->baseUrl}/muthur/spatie.be?lookup=1")
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
                    ->assertRedirect('/?theme=terminal');
            }
        }
    }

    #[Test]
    public function it_returns_to_the_terminal_from_the_new_interfaces(): void
    {
        foreach (['matrix', 'system7', 'winxp'] as $interface) {
            $this
                ->sendCommand('exit', "/{$interface}/exit")
                ->assertRedirect('/?theme=terminal');
        }
    }

    #[Test]
    public function it_switches_between_all_interfaces(): void
    {
        $switches = [
            ['/system7', 'system7', '/system7'],
            ['/system7/muthur', 'muthur', '/muthur'],
            ['/muthur/mac', 'mac', '/system7'],
            ['/muthur/matrix', 'matrix', '/matrix'],
            ['/matrix/winxp', 'winxp', '/winxp'],
            ['/winxp/lcars', 'lcars', '/lcars'],
            ['/lcars/old', 'old', '/old'],
            ['/old/default', 'default', '/?theme=terminal'],
        ];

        foreach ($switches as [$path, $command, $destination]) {
            $this
                ->sendCommand($command, $path)
                ->assertRedirect($destination);
        }
    }

    #[Test]
    public function it_mentions_the_way_back_in_the_lcars_and_old_manual(): void
    {
        $this->sendCommand('help', '/lcars/help')->assertSee('return to the');

        $this->sendCommand('help', '/old/help')->assertSee('return to the');
    }

    #[Test]
    public function it_mentions_the_default_phosphor_in_the_terminal_manual(): void
    {
        $this->sendCommand('help')->assertSee('to go back to green');
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
            ->get("{$this->baseUrl}/mother/spatie.be?lookup=1")
            ->assertRedirect('/muthur/spatie.be?lookup=1');

        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/muthur/spatie.be?lookup=1")
            ->assertForbidden();

        $this
            ->get("{$this->baseUrl}/muthur")
            ->assertSuccessful()
            ->assertSee('data-interface="mother"', false);
    }
}
