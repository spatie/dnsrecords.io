<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OldInterfaceTest extends TestCase
{
    #[Test]
    public function it_shows_the_old_homepage(): void
    {
        $this
            ->get("{$this->baseUrl}/old")
            ->assertSuccessful()
            ->assertSee('<body class="layout">', false)
            ->assertSee('action="https://dnsrecords.io.dev/old"', false)
            ->assertSee('name="_token"', false)
            ->assertDontSee('class="monitor"', false)
            ->assertHeaderMissing('X-Robots-Tag');
    }

    #[Test]
    public function it_can_lookup_a_domain_in_the_old_interface(): void
    {
        $this
            ->sendCommand('spatie.be', '/old/spatie.be')
            ->assertSuccessful()
            ->assertSee('<pre class="main__results">', false)
            ->assertSee('103.133.1.1')
            ->assertSee('<title>spatie.be DNS records ~ dnsrecords.io</title>', false);

        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/old/spatie.be")
            ->assertSuccessful()
            ->assertSee('<pre class="main__results">', false)
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_can_submit_a_lookup_to_the_old_homepage(): void
    {
        $this
            ->post("{$this->baseUrl}/old", ['command' => 'spatie.be'])
            ->assertSuccessful()
            ->assertSee('<pre class="main__results">', false);
    }

    #[Test]
    public function it_keeps_sanitized_lookups_in_the_old_interface(): void
    {
        $this
            ->sendCommand('https://spatie.be/en/vacancies', '/old/https://spatie.be/en/vacancies')
            ->assertRedirect('/old/spatie.be');

        $this
            ->sendCommand('<iframe>', '/old/<iframe>')
            ->assertRedirect('/old');
    }

    #[Test]
    public function it_keeps_commands_in_the_old_interface(): void
    {
        $this
            ->sendCommand('clear', '/old/clear')
            ->assertRedirect('/old');

        $this
            ->sendCommand('help', '/old/help')
            ->assertRedirect('/old');

        $this->assertStringNotContainsString('degauss', $this->getFlashMessage());

        $this
            ->sendCommand('ip', '/old/ip')
            ->assertSee('<pre class="main__results">', false)
            ->assertSee('Your ip address is');
    }

    #[Test]
    public function it_redirects_failed_old_lookups_to_the_old_homepage(): void
    {
        $this
            ->sendCommand('nothing-here.be', '/old/nothing-here.be')
            ->assertRedirect('/old');
    }

    #[Test]
    public function it_answers_failed_old_get_lookups_with_the_old_interface(): void
    {
        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/old/nothing-here.be")
            ->assertNotFound()
            ->assertSee('<body class="layout">', false)
            ->assertSee('Could not fetch dns records', false);

        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/old/<iframe>")
            ->assertNotFound()
            ->assertSee('<body class="layout">', false);
    }

    #[Test]
    public function it_protects_old_lookups_like_the_main_lookups(): void
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
            ->get("{$this->baseUrl}/old/spatie.be")
            ->assertForbidden()
            ->assertDontSee('103.133.1.1');

        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/old/spatie.be")
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_shares_the_lookup_rate_limit_with_the_main_interface(): void
    {
        foreach (range(1, 10) as $attempt) {
            $this
                ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
                ->get("{$this->baseUrl}/spatie.be")
                ->assertSuccessful();

            $this
                ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
                ->get("{$this->baseUrl}/old/spatie.be")
                ->assertSuccessful();
        }

        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/old/spatie.be")
            ->assertTooManyRequests();
    }
}
