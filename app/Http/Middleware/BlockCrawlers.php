<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class BlockCrawlers
{
    /** @var array<int, string> */
    protected array $crawlerUserAgentFragments = [
        'bot',
        'crawl',
        'spider',
        'slurp',
        'anthropic-ai',
        'claude-web',
        'ccbot',
        'bytespider',
        'meta-externalagent',
        'facebookexternalhit',
        'dataforseo',
        'diffbot',
        'scrapy',
        'python-requests',
        'python-urllib',
        'go-http-client',
        'headlesschrome',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->isCrawler($request->userAgent())) {
            return response('Crawling DNS lookups is not allowed, see /robots.txt', Response::HTTP_FORBIDDEN, [
                'Content-Type' => 'text/plain',
                'X-Robots-Tag' => 'noindex, nofollow',
            ]);
        }

        return $next($request);
    }

    protected function isCrawler(?string $userAgent): bool
    {
        if (! $userAgent) {
            return true;
        }

        return Str::contains($userAgent, $this->crawlerUserAgentFragments, ignoreCase: true);
    }
}
