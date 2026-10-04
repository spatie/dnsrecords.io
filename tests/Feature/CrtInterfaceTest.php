<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CrtInterfaceTest extends TestCase
{
    #[Test]
    public function it_shows_the_terminal_on_the_homepage(): void
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertSee('class="screen"', false)
            ->assertSee('<title>DNS records lookup ~ dnsrecords.io</title>', false)
            ->assertSee('<meta name="description" content="DNS record lookups just as you like &#039;em" />', false)
            ->assertSee('action="https://dnsrecords.io.dev"', false)
            ->assertSee('name="_token"', false)
            ->assertSee('data-page="home"', false)
            ->assertSee('data-phosphor="green"', false)
            ->assertDontSee('id="fx-toggle"', false)
            ->assertSee('prefers-reduced-motion', false)
            ->assertSee('href="https://dnsrecords.io.dev/old"', false);
    }

    #[Test]
    public function it_renders_lookup_results_as_terminal_lines(): void
    {
        $this
            ->sendCommand('spatie.be')
            ->assertSuccessful()
            ->assertSee('data-page="result"', false)
            ->assertSee('<title>spatie.be DNS records ~ dnsrecords.io</title>', false)
            ->assertSee('<meta name="description" content="A 103.133.1.1 | MX 10 mx.spatie.be." />', false)
            ->assertSee('2 records')
            ->assertSee('<span class="line__type line__type--a" title="A: IPv4 address">A</span>', false)
            ->assertSee('<span class="line__type line__type--mx" title="MX: mail server">MX</span>', false)
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_keeps_the_raw_dig_output_copyable(): void
    {
        $content = $this->sendCommand('spatie.be')->getContent();

        preg_match('/<pre class="results__output">(.*?)<\/pre>/s', $content, $matches);

        $copyableText = html_entity_decode(strip_tags($matches[1]), ENT_QUOTES);

        $this->assertSame(
            "spatie.be.\t\t3600 IN A 103.133.1.1\nspatie.be.\t\t3600 IN MX 10 mx.spatie.be.\n",
            $copyableText,
        );
    }

    #[Test]
    public function it_answers_failed_get_lookups_on_the_crt_screen(): void
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')
            ->get("{$this->baseUrl}/nothing-here.be")
            ->assertNotFound()
            ->assertSee('class="screen"', false)
            ->assertSee('<span class="message__label">err</span>', false)
            ->assertSee('Could not fetch dns records', false);
    }

    #[Test]
    public function it_mentions_the_crt_commands_in_the_manual(): void
    {
        $this
            ->sendCommand('help')
            ->assertRedirect('/');

        $flashMessage = $this->getFlashMessage();

        $this->assertStringNotContainsString('degauss', $flashMessage);
        $this->assertStringContainsString("'green', 'amber' or 'white'", $flashMessage);
        $this->assertStringNotContainsString('fx off', $flashMessage);
        $this->assertStringContainsString('legend--mx', $flashMessage);
        $this->assertStringContainsString('/old', $flashMessage);
    }

    #[Test]
    public function it_shows_the_manual_instead_of_the_banner(): void
    {
        $this
            ->followingRedirects()
            ->sendCommand('help')
            ->assertSee('Enter a domain name to retrieve all DNS records.')
            ->assertDontSee('banner__art', false);
    }

    #[Test]
    public function it_can_switch_to_the_old_interface_with_a_command(): void
    {
        $this
            ->sendCommand('old')
            ->assertRedirect('/old');
    }

    #[Test]
    public function it_shows_the_ip_address_on_the_crt_screen(): void
    {
        $this
            ->sendCommand('ip')
            ->assertSuccessful()
            ->assertSee('class="screen"', false)
            ->assertSee('Your ip address is');
    }

    #[Test]
    public function it_keeps_the_first_screen_minimal(): void
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertSee('<h1 class="brand">', false)
            ->assertSee('placeholder="Enter a domain"', false)
            ->assertSee('data-motion="full"', false)
            ->assertDontSee('id="phosphor-toggle"', false)
            ->assertDontSee('id="clock"', false)
            ->assertDontSee('class="suggestions"', false);
    }

    #[Test]
    public function it_does_not_link_to_lookup_pages_from_the_homepage(): void
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertSee('data-command="help"', false)
            ->assertDontSee('href="https://dnsrecords.io.dev/help"', false)
            ->assertDontSee('href="https://dnsrecords.io.dev/spatie.be"', false);
    }

    #[Test]
    public function it_shows_the_record_count_and_copy_action_with_results(): void
    {
        $this
            ->sendCommand('spatie.be')
            ->assertSuccessful()
            ->assertSee('<span class="results__count">2 records</span>', false)
            ->assertSee('class="text-action copy-results" aria-label="Copy spatie.be DNS results"', false)
            ->assertSee('<span class="line__gap">', false);
    }
}
