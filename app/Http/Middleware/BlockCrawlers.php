<?php

namespace App\Http\Middleware;

use App\Services\BotProtection\BotSignal;
use App\Services\BotProtection\LookupRequestInspector;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class BlockCrawlers
{
    /**
     * Blocked browsers are remembered with a cookie that the cached lookup
     * page can read, so they stop there next time instead of waking the app.
     */
    public static string $blockedCookieName = 'dnsrecords_blocked';

    public function __construct(
        protected LookupRequestInspector $inspector,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $signals = $this->inspector->signals($request);

        if (! count($signals)) {
            return $next($request);
        }

        $enforcedSignals = array_values(array_filter($signals, fn (BotSignal $signal) => $signal->isEnforced()));

        $this->log($request, $signals, $enforcedSignals);

        if (count($enforcedSignals)) {
            return $this->blockedResponse($enforcedSignals[0]);
        }

        return $next($request);
    }

    protected function blockedResponse(BotSignal $signal): Response
    {
        $response = response($signal->message(), $signal->statusCode(), [
            'Content-Type' => 'text/plain',
            'X-Robots-Tag' => 'noindex, nofollow',
        ]);

        if ($signal->statusCode() === Response::HTTP_FORBIDDEN) {
            $response->withCookie(cookie(static::$blockedCookieName, '1', 60 * 24, httpOnly: false));
        }

        return $response;
    }

    /**
     * @param Request $request
     * @param array<int, BotSignal> $signals
     * @param array<int, BotSignal> $enforcedSignals
     */
    protected function log(Request $request, array $signals, array $enforcedSignals): void
    {
        $signalNames = fn (array $signals) => implode(',', array_map(fn (BotSignal $signal) => $signal->value, $signals)) ?: '-';

        $userAgent = Str::limit($request->userAgent() ?? '', 150);

        Log::info(implode(' ', [
            'bot-protection',
            'blocked='.$signalNames($enforcedSignals),
            'signals='.$signalNames($signals),
            "ip={$request->ip()}",
            'asn='.($this->inspector->datacenterAsn($request) ?? '-'),
            "method={$request->method()}",
            'sfm='.($request->header('Sec-Fetch-Mode') ?? '-'),
            'sfs='.($request->header('Sec-Fetch-Site') ?? '-'),
            'lang='.(filled($request->header('Accept-Language')) ? 1 : 0),
            'cookie='.($request->hasHeader('Cookie') ? 1 : 0),
            "path={$request->path()}",
            "ua=\"{$userAgent}\"",
        ]));
    }
}
