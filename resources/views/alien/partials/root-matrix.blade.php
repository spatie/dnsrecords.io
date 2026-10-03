@php
    $rootServers = [
        ['a', '198.41.0.4', '2001:503:ba3e::2:30', 'Verisign'],
        ['b', '170.247.170.2', '2801:1b8:10::b', 'USC ISI'],
        ['c', '192.33.4.12', '2001:500:2::c', 'Cogent'],
        ['d', '199.7.91.13', '2001:500:2d::d', 'U Maryland'],
        ['e', '192.203.230.10', '2001:500:a8::e', 'NASA Ames'],
        ['f', '192.5.5.241', '2001:500:2f::f', 'ISC'],
        ['g', '192.112.36.4', '2001:500:12::d0d', 'US DoD'],
        ['h', '198.97.190.53', '2001:500:1::53', 'US Army'],
        ['i', '192.36.148.17', '2001:7fe::53', 'Netnod'],
        ['j', '192.58.128.30', '2001:503:c27::2:30', 'Verisign'],
        ['k', '193.0.14.129', '2001:7fd::1', 'RIPE NCC'],
        ['l', '199.7.83.42', '2001:500:9f::42', 'ICANN'],
        ['m', '202.12.27.33', '2001:dc3::35', 'WIDE'],
    ];
@endphp

<section class="matrix matrix--roots" data-matrix aria-label="Root name servers">
    <p class="matrix__title" data-line>Root server address matrix</p>

    <div class="roots">
        @foreach($rootServers as [$letter, $ipv4, $ipv6, $operator])
            <div class="roots__row" data-row><span data-column="0">{{ $letter }}.root-servers.net</span><span data-column="1">{{ $ipv4 }}</span><span class="roots__ipv6" data-column="2">{{ $ipv6 }}</span><span class="roots__operator" data-column="3">{{ $operator }}</span></div>
        @endforeach
    </div>
</section>
