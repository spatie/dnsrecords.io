<?php

namespace Tests\Feature;

use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Process;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DnsLookupTest extends TestCase
{
    #[Test]
    public function it_can_lookup_a_normal_domain()
    {
        $this
            ->sendCommand('spatie.be')
            ->assertSee('<pre class="results__output" id="results">', false)
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_doesnt_fail_with_a_dot_as_search_query()
    {
        $this
            ->sendCommand('.')
            ->assertSuccessful();

        $this
            ->post('/', ['command' => '.'])
            ->assertSee('root-servers.net');
    }

    #[Test]
    public function it_redirects_to_home_when_the_domain_lookup_is_invalid()
    {
        $this->withoutExceptionHandling();

        $this
            ->sendCommand('..')
            ->assertRedirect('/');

        $this
            ->sendCommand('?')
            ->assertRedirect('/');
    }

    #[Test]
    public function it_sanitizes_the_domain_lookup_when_it_has_a_scheme()
    {
        $this
            ->sendCommand('http://spatie.be')
            ->assertRedirect('/spatie.be');

        $this
            ->sendCommand('https://spatie.be')
            ->assertRedirect('/spatie.be');
    }

    #[Test]
    public function it_sanitizes_the_domain_lookup_when_it_has_a_path()
    {
        $this
            ->sendCommand('https://spatie.be/en/vacancies')
            ->assertRedirect('/spatie.be');
    }

    #[Test]
    public function it_answers_unsanitized_lookup_urls_directly()
    {
        $this
            ->get("{$this->baseUrl}/spatie.be%2Fen%2Fvacancies")
            ->assertSuccessful()
            ->assertSee('103.133.1.1');

        $this
            ->get("{$this->baseUrl}/Spatie.be")
            ->assertSuccessful()
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_answers_lookup_urls_without_records_directly()
    {
        $this
            ->get("{$this->baseUrl}/unknown-domain.be")
            ->assertNotFound()
            ->assertSee('Could not fetch dns records', false);

        $this
            ->get("{$this->baseUrl}/%3Ciframe%3E")
            ->assertNotFound();
    }

    #[Test]
    public function it_filters_out_html()
    {
        $this
            ->sendCommand('<iframe>')
            ->assertRedirect('/');
    }

    #[Test]
    public function it_queries_every_record_type_and_keeps_their_order()
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
