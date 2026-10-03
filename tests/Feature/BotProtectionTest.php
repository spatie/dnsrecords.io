<?php

namespace Tests\Feature;

use App\Services\BotProtection\BotSignal;
use App\Services\BotProtection\DatacenterIpRanges;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BotProtectionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('bot-protection.datacenter_ip_ranges_path', __DIR__.'/../fixtures/datacenter-ip-ranges.php');

        $this->app->forgetInstance(DatacenterIpRanges::class);
    }

    #[Test]
    public function it_does_not_log_lookups_by_browsers()
    {
        Log::spy();

        $this
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful();

        Log::shouldNotHaveReceived('info');
    }

    #[Test]
    public function it_only_logs_signals_that_are_not_enforced()
    {
        Log::spy();

        $this->enforce(BotSignal::CrawlerUserAgent);

        $this
            ->withoutHeader('Sec-Fetch-Mode')
            ->withServerVariables(['REMOTE_ADDR' => '10.0.1.20'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful()
            ->assertSee('103.133.1.1');

        Log::shouldHaveReceived('info')->withArgs(fn (string $message) => str_starts_with($message, 'bot-protection blocked=- signals=missingSecFetchHeaders,datacenterIp ip=10.0.1.20 asn=16509 method=GET'));
    }

    #[Test]
    public function it_logs_enforced_signals()
    {
        Log::spy();

        $this->enforce(BotSignal::MissingSecFetchHeaders);

        $this
            ->withoutHeader('Sec-Fetch-Mode')
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden();

        Log::shouldHaveReceived('info')->withArgs(fn (string $message) => str_starts_with($message, 'bot-protection blocked=missingSecFetchHeaders signals=missingSecFetchHeaders ip=127.0.0.1'));
    }

    #[Test]
    public function it_blocks_lookups_without_sec_fetch_headers_when_enforced()
    {
        $this->enforce(BotSignal::MissingSecFetchHeaders);

        $this
            ->withoutHeader('Sec-Fetch-Mode')
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden()
            ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->assertSee('Automated DNS lookups are not allowed')
            ->assertDontSee('103.133.1.1');
    }

    #[Test]
    public function it_blocks_lookups_without_accept_language_when_enforced()
    {
        $this->enforce(BotSignal::MissingAcceptLanguage);

        $this
            ->withHeader('Accept-Language', '')
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden();
    }

    #[Test]
    public function it_blocks_lookups_from_datacenters_when_enforced()
    {
        $this->enforce(BotSignal::DatacenterIp);

        $this
            ->withServerVariables(['REMOTE_ADDR' => '10.0.3.7'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden()
            ->assertSee('cloud and hosting networks');

        $this
            ->withServerVariables(['REMOTE_ADDR' => '2a01:4f8:c17:1::1'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden();

        $this
            ->withServerVariables(['REMOTE_ADDR' => '10.0.2.7'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful();
    }

    #[Test]
    public function it_limits_lookups_per_subnet_when_enforced()
    {
        $this->enforce(BotSignal::TooManyLookupsFromSubnet);

        config()->set('bot-protection.lookups_per_minute_per_subnet', 2);

        foreach (['10.0.5.1', '10.0.5.2'] as $ip) {
            $this
                ->withServerVariables(['REMOTE_ADDR' => $ip])
                ->get("{$this->baseUrl}/spatie.be")
                ->assertSuccessful();
        }

        $this
            ->withServerVariables(['REMOTE_ADDR' => '10.0.5.3'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertTooManyRequests();

        $this
            ->withServerVariables(['REMOTE_ADDR' => '10.0.6.1'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful();
    }

    #[Test]
    public function it_limits_lookups_per_ip_per_day_when_enforced()
    {
        $this->enforce(BotSignal::TooManyLookupsToday);

        config()->set('bot-protection.lookups_per_day_per_ip', 2);

        $this->get("{$this->baseUrl}/spatie.be")->assertSuccessful();
        $this->get("{$this->baseUrl}/spatie.be")->assertSuccessful();

        $this->travel(23)->hours();

        $this->get("{$this->baseUrl}/spatie.be")->assertTooManyRequests();

        $this->travel(2)->hours();

        $this->get("{$this->baseUrl}/spatie.be")->assertSuccessful();
    }

    #[Test]
    public function it_lets_browsers_use_the_lookup_form_when_all_signals_are_enforced()
    {
        $this->enforce(...BotSignal::cases());

        $this
            ->get("{$this->baseUrl}/")
            ->assertSuccessful();

        $this
            ->post("{$this->baseUrl}/spatie.be", ['command' => 'spatie.be'])
            ->assertSuccessful()
            ->assertSee('103.133.1.1');

        $this
            ->post("{$this->baseUrl}/https://spatie.be/en", ['command' => 'https://spatie.be/en'])
            ->assertRedirect('/spatie.be');

        $this
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful()
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_blocks_command_line_clients_and_datacenters_by_default()
    {
        $this
            ->withHeaders(['User-Agent' => 'curl/8.7.1'])
            ->withoutHeader('Sec-Fetch-Mode')
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden();

        $this
            ->withServerVariables(['REMOTE_ADDR' => '10.0.3.7'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden();

        $this
            ->withHeaders($this->browserHeaders)
            ->withHeader('Accept-Language', '')
            ->withServerVariables(['REMOTE_ADDR' => '10.0.2.7'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful();
    }

    #[Test]
    public function it_finds_the_asn_of_datacenter_ips()
    {
        $datacenterIpRanges = new DatacenterIpRanges(__DIR__.'/../fixtures/datacenter-ip-ranges.php');

        $this->assertSame(16509, $datacenterIpRanges->asnFor('10.0.1.0'));
        $this->assertSame(16509, $datacenterIpRanges->asnFor('10.0.1.255'));
        $this->assertSame(24940, $datacenterIpRanges->asnFor('10.0.3.128'));
        $this->assertSame(24940, $datacenterIpRanges->asnFor('2a01:4f8::1'));
        $this->assertNull($datacenterIpRanges->asnFor('10.0.0.255'));
        $this->assertNull($datacenterIpRanges->asnFor('10.0.2.1'));
        $this->assertNull($datacenterIpRanges->asnFor('10.0.4.0'));
        $this->assertNull($datacenterIpRanges->asnFor('2a01:4f9::1'));
        $this->assertNull($datacenterIpRanges->asnFor('not-an-ip'));
    }

    #[Test]
    public function it_can_update_the_datacenter_ip_ranges()
    {
        $path = tempnam(sys_get_temp_dir(), 'datacenter-ip-ranges');

        config()->set('bot-protection.datacenter_ip_ranges_path', $path);
        config()->set('bot-protection.datacenter_asns', [16509 => 'Amazon', 24940 => 'Hetzner']);

        Http::fake([
            'stat.ripe.net/*AS16509*' => Http::response(['data' => ['prefixes' => [
                ['prefix' => '10.0.0.0/24'],
                ['prefix' => '10.0.1.0/24'],
                ['prefix' => '10.0.0.128/25'],
            ]]]),
            'stat.ripe.net/*AS24940*' => Http::response(['data' => ['prefixes' => [
                ['prefix' => '10.0.2.0/23'],
                ['prefix' => '2a01:4f8::/32'],
            ]]]),
        ]);

        $this
            ->artisan('bot-protection:update-datacenter-ip-ranges')
            ->assertSuccessful();

        $this->assertSame([
            4 => [
                ['0a000000', '0a0001ff', 16509],
                ['0a000200', '0a0003ff', 24940],
            ],
            6 => [
                ['2a0104f8000000000000000000000000', '2a0104f8ffffffffffffffffffffffff', 24940],
            ],
        ], require $path);

        unlink($path);
    }

    protected function enforce(BotSignal ...$signals): void
    {
        config()->set('bot-protection.enforced_signals', $signals);
    }
}
