<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CrawlerProtectionTest extends TestCase
{
    protected string $browserUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

    #[Test]
    public function it_allows_browsers_to_lookup_a_domain()
    {
        $this
            ->withHeader('User-Agent', $this->browserUserAgent)
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful()
            ->assertSee('103.133.1.1')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[Test]
    public function it_allows_browsers_to_submit_a_lookup()
    {
        $this
            ->withHeader('User-Agent', $this->browserUserAgent)
            ->sendCommand('spatie.be')
            ->assertSuccessful()
            ->assertSee('103.133.1.1');
    }

    #[Test]
    #[DataProvider('crawlerUserAgents')]
    public function it_blocks_crawlers_from_lookups(string $userAgent)
    {
        $this
            ->withHeader('User-Agent', $userAgent)
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden()
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertDontSee('103.133.1.1');
    }

    #[Test]
    public function it_blocks_crawlers_before_redirecting_unsanitized_lookups()
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
            ->get("{$this->baseUrl}/spatie.be%2Fen%2Fvacancies")
            ->assertForbidden();
    }

    #[Test]
    public function it_blocks_requests_without_a_user_agent_from_lookups()
    {
        $this
            ->withHeader('User-Agent', '')
            ->get("{$this->baseUrl}/spatie.be")
            ->assertForbidden();
    }

    #[Test]
    public function it_allows_crawlers_on_the_homepage()
    {
        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
            ->get("{$this->baseUrl}/")
            ->assertSuccessful()
            ->assertHeaderMissing('X-Robots-Tag');
    }

    #[Test]
    public function it_rate_limits_lookups_per_ip()
    {
        foreach (range(1, 20) as $attempt) {
            $this
                ->withHeader('User-Agent', $this->browserUserAgent)
                ->get("{$this->baseUrl}/spatie.be")
                ->assertSuccessful();
        }

        $this
            ->withHeader('User-Agent', $this->browserUserAgent)
            ->get("{$this->baseUrl}/spatie.be")
            ->assertTooManyRequests();

        $this
            ->withHeader('User-Agent', $this->browserUserAgent)
            ->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
            ->get("{$this->baseUrl}/spatie.be")
            ->assertSuccessful();
    }

    #[Test]
    public function it_does_not_rate_limit_the_homepage()
    {
        foreach (range(1, 25) as $attempt) {
            $this
                ->withHeader('User-Agent', $this->browserUserAgent)
                ->get("{$this->baseUrl}/")
                ->assertSuccessful();
        }
    }

    #[Test]
    public function it_disallows_crawling_lookups_in_robots_txt()
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
