<?php

namespace App\Services\BotProtection;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class LookupRequestInspector
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

    public function __construct(
        protected DatacenterIpRanges $datacenterIpRanges,
    ) {}

    /** @return array<int, BotSignal> */
    public function signals(Request $request): array
    {
        $signals = [];

        if ($this->hasCrawlerUserAgent($request)) {
            $signals[] = BotSignal::CrawlerUserAgent;
        }

        if (blank($request->header('Sec-Fetch-Mode'))) {
            $signals[] = BotSignal::MissingSecFetchHeaders;
        }

        if (blank($request->header('Accept-Language'))) {
            $signals[] = BotSignal::MissingAcceptLanguage;
        }

        if ($this->datacenterAsn($request)) {
            $signals[] = BotSignal::DatacenterIp;
        }

        if ($this->exceedsLimit("lookups-per-minute:{$this->subnet($request)}", config('bot-protection.lookups_per_minute_per_subnet'), 60)) {
            $signals[] = BotSignal::TooManyLookupsFromSubnet;
        }

        if ($this->exceedsLimit("lookups-per-day:{$request->ip()}", config('bot-protection.lookups_per_day_per_ip'), 60 * 60 * 24)) {
            $signals[] = BotSignal::TooManyLookupsToday;
        }

        return $signals;
    }

    public function datacenterAsn(Request $request): ?int
    {
        return $this->datacenterIpRanges->asnFor($request->ip() ?? '');
    }

    public function subnet(Request $request): string
    {
        $packedIp = @inet_pton($request->ip() ?? '');

        if ($packedIp === false) {
            return 'unknown';
        }

        $prefixLengthInBytes = strlen($packedIp) === 4 ? 3 : 8;

        return bin2hex(substr($packedIp, 0, $prefixLengthInBytes));
    }

    protected function hasCrawlerUserAgent(Request $request): bool
    {
        $userAgent = $request->userAgent();

        if (! $userAgent) {
            return true;
        }

        return Str::contains($userAgent, $this->crawlerUserAgentFragments, ignoreCase: true);
    }

    protected function exceedsLimit(string $key, int $maxAttempts, int $decaySeconds): bool
    {
        $attempts = RateLimiter::hit("bot-protection:{$key}", $decaySeconds);

        return $attempts > $maxAttempts;
    }
}
