<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CrtInterfaceTest extends TestCase
{
    #[Test]
    public function it_shows_the_crt_monitor_on_the_homepage()
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertSee('class="monitor"', false)
            ->assertSee('<title>DNS records lookup ~ dnsrecords.io</title>', false)
            ->assertSee('<meta name="description" content="DNS record lookups just as you like &#039;em" />', false)
            ->assertSee('action="https://dnsrecords.io.dev"', false)
            ->assertSee('name="_token"', false)
            ->assertSee('data-page="home"', false)
            ->assertSee('id="fx-toggle"', false)
            ->assertSee('prefers-reduced-motion', false)
            ->assertSee('href="https://dnsrecords.io.dev/old"', false);
    }

    #[Test]
    public function it_renders_lookup_results_as_terminal_lines()
    {
        $this
            ->sendCommand('spatie.be')
            ->assertSuccessful()
            ->assertSee('data-page="result"', false)
            ->assertSee('<title>spatie.be DNS records ~ dnsrecords.io</title>', false)
            ->assertSee('<meta name="description" content="A 103.133.1.1 | MX 10 mx.spatie.be." />', false)
            ->assertSee('2 records')
            ->assertSee('<span class="line__type line__type--a">A</span>', false)
            ->assertSee('<span class="line__type line__type--mx">MX</span>', false)
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_keeps_the_raw_dig_output_copyable()
    {
        $content = $this->sendCommand('spatie.be')->getContent();

        preg_match('/<pre class="results__output" id="results">(.*?)<\/pre>/s', $content, $matches);

        $copyableText = html_entity_decode(strip_tags($matches[1]), ENT_QUOTES);

        $this->assertSame(
            "spatie.be.\t\t3600 IN A 103.133.1.1\nspatie.be.\t\t3600 IN MX 10 mx.spatie.be.\n",
            $copyableText,
        );
    }

    #[Test]
    public function it_answers_failed_get_lookups_on_the_crt_screen()
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')
            ->get("{$this->baseUrl}/nothing-here.be")
            ->assertNotFound()
            ->assertSee('class="monitor"', false)
            ->assertSee('<span class="message__label">err</span>', false)
            ->assertSee('Could not fetch dns records', false);
    }

    #[Test]
    public function it_mentions_the_crt_commands_in_the_manual()
    {
        $this
            ->sendCommand('help')
            ->assertRedirect('/');

        $flashMessage = $this->getFlashMessage();

        $this->assertStringContainsString('degauss', $flashMessage);
        $this->assertStringContainsString('fx off', $flashMessage);
        $this->assertStringContainsString('/old', $flashMessage);
    }

    #[Test]
    public function it_shows_the_manual_instead_of_the_banner()
    {
        $this
            ->followingRedirects()
            ->sendCommand('help')
            ->assertSee('Enter a domain name to retrieve all DNS records.')
            ->assertDontSee('banner__art', false);
    }

    #[Test]
    public function it_can_switch_to_the_old_interface_with_a_command()
    {
        $this
            ->sendCommand('old')
            ->assertRedirect('/old');
    }

    #[Test]
    public function it_shows_the_ip_address_on_the_crt_screen()
    {
        $this
            ->sendCommand('ip')
            ->assertSuccessful()
            ->assertSee('class="monitor"', false)
            ->assertSee('Your ip address is');
    }
}
