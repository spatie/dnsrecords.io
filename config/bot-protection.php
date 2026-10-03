<?php

use App\Services\BotProtection\BotSignal;

return [
    /*
     * Lookup requests matching one of these signals get blocked. Requests
     * matching any other signal are only logged, so new signals can be
     * evaluated against real traffic before they are enforced.
     */
    'enforced_signals' => [
        BotSignal::CrawlerUserAgent,
    ],

    'lookups_per_minute_per_subnet' => 30,

    'lookups_per_day_per_ip' => 300,

    /*
     * Lookups from these networks are almost never made by humans. Run
     * `php artisan bot-protection:update-datacenter-ip-ranges` after
     * changing this list to store their announced prefixes.
     */
    'datacenter_ip_ranges_path' => resource_path('data/datacenter-ip-ranges.php'),

    'datacenter_asns' => [
        16509 => 'Amazon',
        14618 => 'Amazon',
        396982 => 'Google Cloud',
        8075 => 'Microsoft',
        31898 => 'Oracle Cloud',
        14061 => 'DigitalOcean',
        24940 => 'Hetzner',
        213230 => 'Hetzner Cloud',
        212317 => 'Hetzner Cloud',
        16276 => 'OVH',
        45102 => 'Alibaba Cloud',
        37963 => 'Alibaba Cloud',
        132203 => 'Tencent Cloud',
        45090 => 'Tencent Cloud',
        136907 => 'Huawei Cloud',
        55990 => 'Huawei Cloud',
        63949 => 'Linode',
        20473 => 'Vultr',
        51167 => 'Contabo',
        12876 => 'Scaleway',
        61317 => 'Hivelocity',
        29802 => 'Hivelocity',
        11878 => 'tzulo',
        215599 => 'Zkillu',
        64267 => 'Sprious',
        54252 => 'Sprious',
        48090 => 'Techoff',
        207994 => 'Blockchain Creek',
        58065 => 'Packet Exchange',
        26548 => 'PureVoltage',
        200373 => '3xK Tech',
        36352 => 'ColoCrossing',
        55286 => 'ServerMania',
        46475 => 'Limestone Networks',
        203020 => 'HostRoyale',
        57858 => 'Angelnet',
        400463 => 'DynaNode',
        208137 => 'Feo Prest',
        394474 => 'WhiteLabelColo',
        216071 => 'VDSina',
        27176 => 'DataWagon',
        213954 => 'Global Transit Systems',
        29066 => 'velia.net',
        43444 => 'Fast Servers',
        35830 => 'Fast Servers',
        150820 => 'LienVPS',
        212238 => 'Datacamp',
        9009 => 'M247',
    ],
];
