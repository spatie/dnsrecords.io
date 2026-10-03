<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ThemeCommandsTest extends TestCase
{
    #[Test]
    public function it_opens_mother_and_lcars_from_the_terminal()
    {
        $this
            ->sendCommand('mother')
            ->assertRedirect('/mother');

        $this
            ->sendCommand('lcars')
            ->assertRedirect('/lcars');
    }

    #[Test]
    public function it_opens_mother_and_lcars_from_the_old_interface()
    {
        $this
            ->sendCommand('mother', '/old/mother')
            ->assertRedirect('/mother');

        $this
            ->sendCommand('lcars', '/old/lcars')
            ->assertRedirect('/lcars');
    }

    #[Test]
    public function it_mentions_mother_and_lcars_in_the_terminal_manual()
    {
        $this->sendCommand('help');

        $flashMessage = $this->getFlashMessage();

        $this->assertStringContainsString("Enter 'mother' to talk to <a href=\"https://dnsrecords.io.dev/mother\">MU/TH/UR 6000</a>.", $flashMessage);
        $this->assertStringContainsString("Enter 'lcars' to open the <a href=\"https://dnsrecords.io.dev/lcars\">LCARS console</a>.", $flashMessage);
    }

    #[Test]
    public function it_redirects_the_old_theme_urls_permanently()
    {
        $this
            ->get("{$this->baseUrl}/alien")
            ->assertStatus(301)
            ->assertRedirect('/mother')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

        $this
            ->get("{$this->baseUrl}/startrek")
            ->assertStatus(301)
            ->assertRedirect('/lcars');

        $this
            ->get("{$this->baseUrl}/alien/spatie.be?ref=bookmark")
            ->assertStatus(301)
            ->assertRedirect('/mother/spatie.be?ref=bookmark');

        $this
            ->get("{$this->baseUrl}/startrek/spatie.be%2Fen%2Fvacancies")
            ->assertStatus(301)
            ->assertRedirect('/lcars/spatie.be%2Fen%2Fvacancies');
    }

    #[Test]
    public function it_protects_the_old_theme_lookup_urls_like_lookups()
    {
        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/alien/spatie.be")
            ->assertForbidden();

        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/mother/spatie.be")
            ->assertForbidden();
    }
}
