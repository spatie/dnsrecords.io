<?php

namespace Tests\Feature;

use App\Enums\Theme;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AlienInterfaceTest extends TestCase
{
    #[Test]
    public function it_shows_the_mother_terminal()
    {
        $this
            ->get("{$this->baseUrl}/alien")
            ->assertSuccessful()
            ->assertSee('Interface 2037 ready for inquiry')
            ->assertSee('id="exchange"', false)
            ->assertSee('action="https://dnsrecords.io.dev/alien"', false)
            ->assertSee('name="_token"', false)
            ->assertSee('data-page="home"', false)
            ->assertSee('prefers-reduced-motion', false)
            ->assertSee('<meta name="robots" content="noindex, nofollow">', false)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_answers_an_inquiry_with_the_records()
    {
        $this
            ->get("{$this->baseUrl}/alien/spatie.be")
            ->assertSuccessful()
            ->assertSee('data-page="result"', false)
            ->assertSee('<title>spatie.be DNS records ~ Interface 2037 ~ dnsrecords.io</title>', false)
            ->assertSee('<span class="mother-line__echo">spatie.be</span>', false)
            ->assertSee('2 records located for spatie.be')
            ->assertSee('data-announce="Response: 2 records for spatie.be."', false)
            ->assertSee('<span class="record__type" title="MX: mail server">MX</span>', false)
            ->assertSee('103.133.1.1')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_keeps_the_raw_dig_lines_for_copying()
    {
        $content = $this->get("{$this->baseUrl}/alien/spatie.be")->getContent();

        preg_match_all('/data-raw="([^"]*)"/', $content, $matches);

        $this->assertSame(
            ["spatie.be.\t\t3600 IN A 103.133.1.1", "spatie.be.\t\t3600 IN MX 10 mx.spatie.be."],
            array_map(fn (string $raw) => html_entity_decode($raw, ENT_QUOTES), $matches[1]),
        );
    }

    #[Test]
    public function it_keeps_multiline_records_together()
    {
        $this->fakeDnsRecords['spatie.be SOA'] = "spatie.be.\t\t1800 IN SOA ns1.digitalocean.com. hostmaster.spatie.be. (\n\t\t\t\t0 ; serial\n\t\t\t\t)\n";

        $this
            ->get("{$this->baseUrl}/alien/spatie.be")
            ->assertSuccessful()
            ->assertSee("<div class=\"record record--continued\" data-line data-raw=\"\t\t\t\t0 ; serial\">", false);
    }

    #[Test]
    public function it_accepts_inquiries_submitted_to_the_form()
    {
        $this
            ->post("{$this->baseUrl}/alien", ['command' => 'spatie.be'])
            ->assertSuccessful()
            ->assertSee('class="records"', false)
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_keeps_sanitized_inquiries_on_the_mother_terminal()
    {
        $this
            ->sendCommand('https://spatie.be/en/vacancies', '/alien/https://spatie.be/en/vacancies')
            ->assertRedirect('/alien/spatie.be');
    }

    #[Test]
    public function it_cannot_compute_domains_without_records()
    {
        $this
            ->get("{$this->baseUrl}/alien/nothing-here.be")
            ->assertNotFound()
            ->assertSee('<span class="mother-line__echo">nothing-here.be</span>', false)
            ->assertSee('Unable to compute. Available data insufficient.')
            ->assertSee('Could not fetch dns records', false);
    }

    #[Test]
    public function it_clarifies_the_commands_on_the_mother_terminal()
    {
        $this
            ->sendCommand('help', '/alien/help')
            ->assertRedirect('/alien');

        $flashMessage = $this->getFlashMessage();

        $this->assertStringContainsString('special order 937', $flashMessage);
        $this->assertStringNotContainsString('degauss', $flashMessage);

        $this
            ->get("{$this->baseUrl}/alien")
            ->assertSee('Clarification follows.')
            ->assertSee('Enter a domain name to retrieve all DNS records.');
    }

    #[Test]
    public function it_clears_back_to_the_mother_terminal()
    {
        $this
            ->sendCommand('clear', '/alien/clear')
            ->assertRedirect('/alien');
    }

    #[Test]
    public function it_tells_the_ip_address_on_the_mother_terminal()
    {
        $this
            ->get("{$this->baseUrl}/alien/ip")
            ->assertSuccessful()
            ->assertSee('id="exchange"', false)
            ->assertSee('Your ip address is');
    }

    #[Test]
    public function it_protects_mother_lookups_from_crawlers()
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')
            ->get("{$this->baseUrl}/alien/spatie.be")
            ->assertForbidden()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertDontSee('103.133.1.1');

        $this
            ->withHeader('Sec-Fetch-Mode', '')
            ->get("{$this->baseUrl}/alien/spatie.be")
            ->assertForbidden();
    }

    #[Test]
    public function it_keeps_the_mother_terminal_out_of_robots_txt()
    {
        $robots = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString("Disallow: /\n", $robots);
        $this->assertStringNotContainsString('Allow: /alien', $robots);
    }

    #[Test]
    public function it_knows_the_mother_theme_from_the_route()
    {
        $this->get("{$this->baseUrl}/alien");

        $this->assertSame(Theme::Alien, Theme::current());
        $this->assertSame('https://dnsrecords.io.dev/alien/spatie.be', Theme::Alien->commandUrl('spatie.be'));
    }

    #[Test]
    public function it_leaves_the_other_interfaces_alone()
    {
        $this
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertSee('class="screen"', false)
            ->assertDontSee('id="exchange"', false);

        $this
            ->get("{$this->baseUrl}/old")
            ->assertSuccessful()
            ->assertSee('<body class="layout">', false)
            ->assertDontSee('id="exchange"', false);
    }
}
