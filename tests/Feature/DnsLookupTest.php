<?php

namespace Tests\Feature;

use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DnsLookupTest extends TestCase
{
    #[Test]
    public function it_can_lookup_a_normal_domain(): void
    {
        $this
            ->sendCommand('spatie.be')
            ->assertSee('<pre class="results__output">', false)
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_doesnt_fail_with_a_dot_as_search_query(): void
    {
        $this
            ->sendCommand('.')
            ->assertSuccessful();

        $this
            ->post('/', ['command' => '.'])
            ->assertSee('root-servers.net');
    }

    #[Test]
    public function it_answers_invalid_domain_lookups_on_the_home_screen(): void
    {
        $this->withoutExceptionHandling();

        $this
            ->sendCommand('..')
            ->assertNotFound()
            ->assertSee('data-page="home"', false);

        $this
            ->sendCommand('?')
            ->assertNotFound()
            ->assertSee('data-page="home"', false);
    }

    #[Test]
    public function it_sanitizes_the_domain_lookup_when_it_has_a_scheme(): void
    {
        $this
            ->sendCommand('http://spatie.be')
            ->assertRedirect('/spatie.be');

        $this
            ->sendCommand('https://spatie.be')
            ->assertRedirect('/spatie.be');
    }

    #[Test]
    public function it_sanitizes_the_domain_lookup_when_it_has_a_path(): void
    {
        $this
            ->sendCommand('https://spatie.be/en/vacancies')
            ->assertRedirect('/spatie.be');
    }

    #[Test]
    public function it_answers_unsanitized_lookup_urls_directly(): void
    {
        $this
            ->get("{$this->baseUrl}/spatie.be%2Fen%2Fvacancies?lookup=1")
            ->assertSuccessful()
            ->assertSee('103.133.1.1');

        $this
            ->get("{$this->baseUrl}/Spatie.be?lookup=1")
            ->assertSuccessful()
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_answers_lookup_urls_without_records_directly(): void
    {
        $this
            ->get("{$this->baseUrl}/unknown-domain.be?lookup=1")
            ->assertNotFound()
            ->assertSee('Could not fetch dns records', false);

        $this
            ->get("{$this->baseUrl}/%3Ciframe%3E?lookup=1")
            ->assertNotFound();
    }

    #[Test]
    public function it_filters_out_html(): void
    {
        $this
            ->sendCommand('<iframe>')
            ->assertRedirect('/');
    }

    #[Test]
    public function it_queries_every_record_type_and_keeps_their_order(): void
    {
        $this->fakeDnsRecords['spatie.be TXT'] = "spatie.be.\t\t3600 IN TXT \"v=spf1 -all\"\n";
        $this->fakeDnsRecords['spatie.be NS'] = "spatie.be.\t\t3600 IN NS ns1.digitalocean.com.\n";

        $this
            ->sendCommand('spatie.be')
            ->assertSeeInOrder(['103.133.1.1', 'ns1.digitalocean.com.', 'mx.spatie.be.', 'v=spf1 -all']);

        foreach (['A', 'AAAA', 'CNAME', 'NS', 'SOA', 'MX', 'SRV', 'TXT', 'DNSKEY', 'CAA', 'NAPTR'] as $type) {
            Process::assertRan(fn (PendingProcess $process) => array_slice($process->command, -5, 2) === ['spatie.be', $type]);
        }
    }
}
