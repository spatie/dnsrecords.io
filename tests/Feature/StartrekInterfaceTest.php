<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class StartrekInterfaceTest extends TestCase
{
    #[Test]
    public function it_shows_the_lcars_console()
    {
        $this
            ->get("{$this->baseUrl}/startrek")
            ->assertSuccessful()
            ->assertSee('<body class="lcars">', false)
            ->assertSee('action="https://dnsrecords.io.dev/startrek"', false)
            ->assertSee('name="_token"', false)
            ->assertSee('<meta name="robots" content="noindex">', false)
            ->assertSee('data-page="home"', false)
            ->assertSee('Standing by')
            ->assertSee('prefers-reduced-motion', false)
            ->assertDontSee('class="screen"', false)
            ->assertHeaderMissing('X-Robots-Tag');
    }

    #[Test]
    public function it_groups_lookup_results_by_record_type()
    {
        $this
            ->sendCommand('spatie.be', '/startrek/spatie.be')
            ->assertSuccessful()
            ->assertSee('data-page="result"', false)
            ->assertSee('<title>spatie.be DNS records ~ dnsrecords.io</title>', false)
            ->assertSee('Scan complete')
            ->assertSee('<span class="readout__number">02</span> records', false)
            ->assertSee('<section class="group group--a"', false)
            ->assertSee('<span class="group__label">IPv4 address</span>', false)
            ->assertSee('<section class="group group--mx"', false)
            ->assertSee('<span class="record__seconds">3600</span>', false)
            ->assertSee('<span class="record__value">103.133.1.1</span>', false)
            ->assertSee('<span class="record__value">10 mx.spatie.be.</span>', false);
    }

    #[Test]
    public function it_keeps_the_raw_dig_output_copyable()
    {
        $content = $this->sendCommand('spatie.be', '/startrek/spatie.be')->getContent();

        preg_match('/<pre class="raw" id="raw-records" hidden>(.*?)<\/pre>/s', $content, $matches);

        $this->assertSame(
            "spatie.be.\t\t3600 IN A 103.133.1.1\nspatie.be.\t\t3600 IN MX 10 mx.spatie.be.",
            html_entity_decode($matches[1], ENT_QUOTES),
        );
    }

    #[Test]
    public function it_folds_multiline_records_into_one_readout()
    {
        $this->fakeDnsRecords['spatie.be SOA'] = implode("\n", [
            "spatie.be.\t\t1800 IN SOA ns1.digitalocean.com. hostmaster.spatie.be. (",
            "\t\t\t\t0          ; serial",
            "\t\t\t\t10800      ; refresh (3 hours)",
            "\t\t\t\t)",
        ])."\n";

        $this
            ->sendCommand('spatie.be', '/startrek/spatie.be')
            ->assertSuccessful()
            ->assertSee('<span class="readout__number">03</span> records', false)
            ->assertSee('<section class="group group--soa"', false)
            ->assertSee("<span class=\"record__value\">ns1.digitalocean.com. hostmaster.spatie.be. (\n0          ; serial\n10800      ; refresh (3 hours)\n)</span>", false)
            ->assertDontSee('readout__message', false);
    }

    #[Test]
    public function it_shows_failed_lookups_as_an_alert()
    {
        $this
            ->get("{$this->baseUrl}/startrek/nothing-here.be")
            ->assertNotFound()
            ->assertSee('<body class="lcars">', false)
            ->assertSee('alert--danger', false)
            ->assertSee('Unable to comply')
            ->assertSee('Could not fetch dns records', false);

        $this
            ->sendCommand('nothing-here.be', '/startrek/nothing-here.be')
            ->assertRedirect('/startrek');
    }

    #[Test]
    public function it_keeps_commands_on_the_lcars_console()
    {
        $this
            ->sendCommand('clear', '/startrek/clear')
            ->assertRedirect('/startrek');

        $this
            ->sendCommand('help', '/startrek/help')
            ->assertRedirect('/startrek');

        $this->assertStringNotContainsString('degauss', $this->getFlashMessage());

        $this
            ->sendCommand('ip', '/startrek/ip')
            ->assertSuccessful()
            ->assertSee('<body class="lcars">', false)
            ->assertSee('Your ip address is');

        $this
            ->post("{$this->baseUrl}/startrek", ['command' => 'spatie.be'])
            ->assertSuccessful()
            ->assertSee('group--a', false);
    }

    #[Test]
    public function it_sanitizes_lcars_lookups()
    {
        $this
            ->sendCommand('https://spatie.be/en/vacancies', '/startrek/https://spatie.be/en/vacancies')
            ->assertRedirect('/startrek/spatie.be');

        $this
            ->sendCommand('<iframe>', '/startrek/<iframe>')
            ->assertRedirect('/startrek');
    }

    #[Test]
    public function it_protects_lcars_lookups_like_the_main_lookups()
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')
            ->get("{$this->baseUrl}/startrek/spatie.be")
            ->assertForbidden()
            ->assertDontSee('103.133.1.1');

        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/startrek/spatie.be")
            ->assertSuccessful()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_shares_the_lookup_rate_limit_with_the_main_interface()
    {
        foreach (range(1, 10) as $attempt) {
            $this->get("{$this->baseUrl}/spatie.be")->assertSuccessful();

            $this->get("{$this->baseUrl}/startrek/spatie.be")->assertSuccessful();
        }

        $this
            ->get("{$this->baseUrl}/startrek/spatie.be")
            ->assertTooManyRequests();
    }
}
