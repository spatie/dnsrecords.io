<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Process;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

class EdgeCachingTest extends TestCase
{
    #[Test]
    public function it_caches_the_home_pages_at_the_edge(): void
    {
        foreach (['/', '/old', '/lcars', '/muthur', '/matrix', '/system7', '/winxp'] as $path) {
            $response = $this
                ->get("{$this->baseUrl}{$path}")
                ->assertSuccessful();

            $this->assertEmpty($response->headers->getCookies());
            $this->assertStringContainsString('public', $response->headers->get('Cache-Control'));
            $this->assertStringContainsString('s-maxage=604800', $response->headers->get('Cache-Control'));
        }
    }

    #[Test]
    public function it_caches_the_home_pages_for_crawlers_too(): void
    {
        $response = $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
            ->withoutHeader('Sec-Fetch-Mode')
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertSee('data-interface="terminal"', false);

        $this->assertStringContainsString('public', $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function it_does_not_cache_the_home_page_when_it_selects_a_theme(): void
    {
        $response = $this
            ->get("{$this->baseUrl}/?theme=terminal")
            ->assertRedirect('/');

        $this->assertStringNotContainsString('public', $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function it_answers_plain_lookup_urls_with_a_page_that_can_be_cached_at_the_edge(): void
    {
        $paths = [
            '/spatie.be',
            '/kilcadiri.com.tr',
            '/ip',
            '/old/spatie.be',
            '/lcars/spatie.be',
            '/muthur/spatie.be',
            '/matrix/spatie.be',
            '/system7/spatie.be',
            '/winxp/spatie.be',
            '/spatie.be%2Fen%2Fvacancies',
        ];

        foreach ($paths as $path) {
            $response = $this
                ->get("{$this->baseUrl}{$path}")
                ->assertNotFound()
                ->assertSee("url.searchParams.set('lookup', '1')", false)
                ->assertDontSee('href="?lookup=1"', false)
                ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

            $this->assertEmpty($response->headers->getCookies());
            $this->assertStringContainsString('public', $response->headers->get('Cache-Control'));
            $this->assertStringContainsString('s-maxage=604800', $response->headers->get('Cache-Control'));
        }

        Process::assertNothingRan();
    }

    #[Test]
    public function it_answers_plain_lookup_urls_with_the_same_page_for_every_url(): void
    {
        $shell = $this->get("{$this->baseUrl}/spatie.be")->getContent();

        $this->assertSame($shell, $this->get("{$this->baseUrl}/ip")->getContent());
        $this->assertSame($shell, $this->get("{$this->baseUrl}/lcars/kilcadiri.com.tr")->getContent());
    }

    #[Test]
    public function it_answers_plain_lookup_urls_from_crawlers_without_waking_the_lookup(): void
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/4.0 (compatible; Win32; WinHttp.WinHttpRequest.5)')
            ->withoutHeader('Sec-Fetch-Mode')
            ->withoutHeader('Accept-Language')
            ->get("{$this->baseUrl}/kilcadiri.com.tr")
            ->assertNotFound()
            ->assertSee("url.searchParams.set('lookup', '1')", false);

        Process::assertNothingRan();
    }

    #[Test]
    public function it_does_not_send_automated_or_blocked_browsers_on_to_the_lookup(): void
    {
        $this
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSee('navigator.webdriver', false)
            ->assertSee('(?:^|; )dnsrecords_blocked=', false)
            ->assertSee('Automated DNS lookups are not allowed.');
    }

    #[Test]
    public function it_remembers_blocked_browsers_with_a_cookie_that_scripts_can_read(): void
    {
        $response = $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertForbidden();

        $cookie = collect($response->headers->getCookies())
            ->first(fn (Cookie $cookie) => $cookie->getName() === 'dnsrecords_blocked');

        $this->assertNotNull($cookie);
        $this->assertSame('1', $cookie->getValue());
        $this->assertFalse($cookie->isHttpOnly());
    }

    #[Test]
    public function it_does_not_remember_browsers_that_are_only_rate_limited(): void
    {
        config()->set('bot-protection.lookups_per_minute_per_subnet', 1);

        $this->get("{$this->baseUrl}/spatie.be?lookup=1")->assertSuccessful();

        $response = $this
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertTooManyRequests();

        $cookieNames = collect($response->headers->getCookies())->map->getName()->all();

        $this->assertNotContains('dnsrecords_blocked', $cookieNames);
    }

    #[Test]
    public function it_looks_up_domains_when_the_lookup_parameter_is_present(): void
    {
        $response = $this
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertSuccessful()
            ->assertSee('103.133.1.1');

        $this->assertStringNotContainsString('public', $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function it_still_blocks_crawlers_that_follow_the_lookup_parameter(): void
    {
        $this
            ->withHeader('User-Agent', 'ClaudeBot/1.0')
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertForbidden();

        $this
            ->withoutHeader('Sec-Fetch-Mode')
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertForbidden();
    }

    #[Test]
    public function it_never_caches_the_ip_address(): void
    {
        $response = $this
            ->withServerVariables(['REMOTE_ADDR' => '81.82.83.84'])
            ->get("{$this->baseUrl}/ip?lookup=1")
            ->assertSee('81.82.83.84');

        $this->assertStringNotContainsString('public', $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function it_submits_lookups_without_a_session(): void
    {
        $this
            ->sendCommand('spatie.be', '/')
            ->assertSuccessful()
            ->assertSee('103.133.1.1');
    }

    #[Test]
    public function it_caches_the_redirects_of_renamed_themes_at_the_edge(): void
    {
        $response = $this
            ->get("{$this->baseUrl}/alien/spatie.be")
            ->assertRedirect('/muthur/spatie.be');

        $this->assertEmpty($response->headers->getCookies());
        $this->assertStringContainsString('public', $response->headers->get('Cache-Control'));
    }

    #[Test]
    public function it_strips_the_lookup_parameter_from_the_address_bar(): void
    {
        $this
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertSee("url.searchParams.delete('lookup')", false);
    }
}
