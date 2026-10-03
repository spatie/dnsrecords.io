<?php

namespace Tests\Feature;

use App\Enums\Theme;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MotherInterfaceTest extends TestCase
{
    #[Test]
    public function it_shows_the_mother_terminal(): void
    {
        $this
            ->get("{$this->baseUrl}/mother")
            ->assertSuccessful()
            ->assertSee('Interface 2037 ready for inquiry')
            ->assertSee('id="exchange"', false)
            ->assertSee('action="https://dnsrecords.io.dev/mother"', false)
            ->assertSee('name="_token"', false)
            ->assertSee('data-page="home"', false)
            ->assertSee('prefers-reduced-motion', false)
            ->assertSee('<meta name="robots" content="noindex, nofollow">', false)
            ->assertSee('Root server address matrix')
            ->assertSee('198.41.0.4')
            ->assertSee('<a class="mother-exit" href="https://dnsrecords.io.dev">Exit to terminal</a>', false)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_answers_an_inquiry_with_the_records(): void
    {
        $this
            ->get("{$this->baseUrl}/mother/spatie.be")
            ->assertSuccessful()
            ->assertSee('data-page="result"', false)
            ->assertSee('<title>spatie.be DNS records ~ Interface 2037 ~ dnsrecords.io</title>', false)
            ->assertSee('class="inquiry is-entered"', false)
            ->assertSee('value="spatie.be"', false)
            ->assertSee('spatie.be record matrix')
            ->assertSee('2 records located for spatie.be')
            ->assertSee('data-announce="Response: 2 records for spatie.be."', false)
            ->assertSee('<span class="record__type" data-column="2" title="MX: mail server">MX</span>', false)
            ->assertSee('103.133.1.1')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_keeps_the_raw_dig_lines_for_copying(): void
    {
        $content = $this->get("{$this->baseUrl}/mother/spatie.be")->getContent();

        preg_match_all('/data-raw="([^"]*)"/', $content, $matches);

        $this->assertSame(
            ["spatie.be.\t\t3600 IN A 103.133.1.1", "spatie.be.\t\t3600 IN MX 10 mx.spatie.be."],
            array_map(fn (string $raw) => html_entity_decode($raw, ENT_QUOTES), $matches[1]),
        );
    }

    #[Test]
    public function it_keeps_multiline_records_together(): void
    {
        $this->fakeDnsRecords['spatie.be SOA'] = "spatie.be.\t\t1800 IN SOA ns1.digitalocean.com. hostmaster.spatie.be. (\n\t\t\t\t0 ; serial\n\t\t\t\t)\n";

        $this
            ->get("{$this->baseUrl}/mother/spatie.be")
            ->assertSuccessful()
            ->assertSee("<div class=\"record record--continued\" data-row data-raw=\"\t\t\t\t0 ; serial\">", false);
    }

    #[Test]
    public function it_accepts_inquiries_submitted_to_the_form(): void
    {
        $this
            ->post("{$this->baseUrl}/mother", ['command' => 'spatie.be'])
            ->assertSuccessful()
            ->assertSee('class="records"', false)
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_keeps_sanitized_inquiries_on_the_mother_terminal(): void
    {
        $this
            ->sendCommand('https://spatie.be/en/vacancies', '/mother/https://spatie.be/en/vacancies')
            ->assertRedirect('/mother/spatie.be');
    }

    #[Test]
    public function it_cannot_compute_domains_without_records(): void
    {
        $this
            ->get("{$this->baseUrl}/mother/nothing-here.be")
            ->assertNotFound()
            ->assertSee('value="nothing-here.be"', false)
            ->assertSee('Unable to compute. Available data insufficient.')
            ->assertSee('Could not fetch dns records', false);
    }

    #[Test]
    public function it_clarifies_the_commands_on_the_mother_terminal(): void
    {
        $this
            ->sendCommand('help', '/mother/help')
            ->assertRedirect('/mother');

        $flashMessage = $this->getFlashMessage();

        $this->assertStringContainsString('special order 937', $flashMessage);
        $this->assertStringContainsString("Enter 'exit' to return to the", $flashMessage);
        $this->assertStringNotContainsString('degauss', $flashMessage);

        $this
            ->get("{$this->baseUrl}/mother")
            ->assertSee('Clarification follows.')
            ->assertSee('Enter a domain name to retrieve all DNS records.');
    }

    #[Test]
    public function it_clears_back_to_the_mother_terminal(): void
    {
        $this
            ->sendCommand('clear', '/mother/clear')
            ->assertRedirect('/mother');
    }

    #[Test]
    public function it_tells_the_ip_address_on_the_mother_terminal(): void
    {
        $this
            ->get("{$this->baseUrl}/mother/ip")
            ->assertSuccessful()
            ->assertSee('id="exchange"', false)
            ->assertSee('Your ip address is');
    }

    #[Test]
    public function it_protects_mother_lookups_from_crawlers(): void
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')
            ->get("{$this->baseUrl}/mother/spatie.be")
            ->assertForbidden()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertDontSee('103.133.1.1');

        $this
            ->withHeader('Sec-Fetch-Mode', '')
            ->get("{$this->baseUrl}/mother/spatie.be")
            ->assertForbidden();
    }

    #[Test]
    public function it_keeps_the_mother_terminal_out_of_robots_txt(): void
    {
        $robots = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString("Disallow: /\n", $robots);
        $this->assertStringNotContainsString('Allow: /mother', $robots);
    }

    #[Test]
    public function it_knows_the_mother_theme_from_the_route(): void
    {
        $this->get("{$this->baseUrl}/mother");

        $this->assertSame(Theme::Mother, Theme::current());
        $this->assertSame('https://dnsrecords.io.dev/mother/spatie.be', Theme::Mother->commandUrl('spatie.be'));
    }

    #[Test]
    public function it_leaves_the_other_interfaces_alone(): void
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
