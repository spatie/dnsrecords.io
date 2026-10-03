<?php

namespace App\Services\BotProtection;

use Symfony\Component\HttpFoundation\Response;

enum BotSignal: string
{
    case CrawlerUserAgent = 'crawlerUserAgent';
    case MissingSecFetchHeaders = 'missingSecFetchHeaders';
    case MissingAcceptLanguage = 'missingAcceptLanguage';
    case DatacenterIp = 'datacenterIp';
    case TooManyLookupsFromSubnet = 'tooManyLookupsFromSubnet';
    case TooManyLookupsToday = 'tooManyLookupsToday';

    public function isEnforced(): bool
    {
        return in_array($this, config('bot-protection.enforced_signals'), true);
    }

    public function statusCode(): int
    {
        return match ($this) {
            self::TooManyLookupsFromSubnet, self::TooManyLookupsToday => Response::HTTP_TOO_MANY_REQUESTS,
            default => Response::HTTP_FORBIDDEN,
        };
    }

    public function message(): string
    {
        return match ($this) {
            self::CrawlerUserAgent => 'Crawling DNS lookups is not allowed, see /robots.txt',
            self::MissingSecFetchHeaders, self::MissingAcceptLanguage => 'Automated DNS lookups are not allowed. If you are a person, please use an up to date browser.',
            self::DatacenterIp => 'DNS lookups from cloud and hosting networks are not allowed.',
            self::TooManyLookupsFromSubnet, self::TooManyLookupsToday => 'Too many DNS lookups, please try again later.',
        };
    }
}
