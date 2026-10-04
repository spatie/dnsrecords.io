<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CrawlerProtectionTest extends TestCase
{
    #[Test]
    public function it_allows_browsers_to_lookup_a_domain(): void
    {
        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertSuccessful()
            ->assertSee('103.133.1.1')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_allows_browsers_to_submit_a_lookup(): void
    {
        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->sendCommand('spatie.be')
            ->assertSuccessful()
            ->assertSee('103.133.1.1');
    }

    #[Test]
    #[DataProvider('crawlerUserAgents')]
    public function it_blocks_crawlers_from_lookups(string $userAgent): void
    {
        $this
            ->withHeader('User-Agent', $userAgent)
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertForbidden()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertDontSee('103.133.1.1');
    }

    #[Test]
    public function it_blocks_crawlers_before_redirecting_unsanitized_lookups(): void
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
            ->get("{$this->baseUrl}/spatie.be%2Fen%2Fvacancies?lookup=1")
            ->assertForbidden();
    }

    #[Test]
    public function it_blocks_requests_without_a_user_agent_from_lookups(): void
    {
        $this
            ->withHeader('User-Agent', '')
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertForbidden();
    }

    #[Test]
    public function it_allows_crawlers_on_the_homepage(): void
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertHeaderMissing('X-Robots-Tag');
    }

    #[Test]
    public function it_rate_limits_lookups_per_ip(): void
    {
        foreach (range(1, 20) as $attempt) {
            $this
                ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
                ->get("{$this->baseUrl}/spatie.be?lookup=1")
                ->assertSuccessful();
        }

        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertTooManyRequests();

        $this
            ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
            ->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
            ->get("{$this->baseUrl}/spatie.be?lookup=1")
            ->assertSuccessful();
    }

    #[Test]
    public function it_does_not_rate_limit_the_homepage(): void
    {
        foreach (range(1, 25) as $attempt) {
            $this
                ->withHeader('User-Agent', $this->browserHeaders['User-Agent'])
                ->get("{$this->baseUrl}/")
                ->assertSuccessful();
        }
    }

    #[Test]
    public function it_disallows_crawling_lookups_in_robots_txt(): void
    {
        $robotsTxt = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString("User-agent: *\n", $robotsTxt);
        $this->assertStringContainsString("Allow: /$\n", $robotsTxt);
        $this->assertStringContainsString("Allow: /build/\n", $robotsTxt);
        $this->assertStringContainsString("Disallow: /\n", $robotsTxt);
    }

    /** @return array<string, array{string}> */
    public static function crawlerUserAgents(): array
    {
        return [
            'ClaudeBot' => ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'],
            'Googlebot' => ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
            'GPTBot' => ['Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot'],
            'Reflectionbot' => ['Mozilla/5.0 (compatible; Reflectionbot/1.0; +https://reflection.ai/bot)'],
            'DotBot' => ['Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot; help@moz.com)'],
            'Bytespider' => ['Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)'],
            'python-requests' => ['python-requests/2.32.3'],
        ];
    }
}
