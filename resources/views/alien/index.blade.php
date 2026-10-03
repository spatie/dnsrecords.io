@use('App\Support\TerminalOutput')

@php
    $terminalOutput = isset($output) ? new TerminalOutput($output) : null;
@endphp
<!DOCTYPE html>
<html lang="en" class="no-js" data-page="{{ $terminalOutput ? 'result' : 'home' }}" data-motion="full">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="dark">
    <meta name="robots" content="noindex, nofollow">

    <title>{{ isset($domain) ? $domain . ' DNS records' : 'DNS records lookup' }} ~ Interface 2037 ~ dnsrecords.io</title>
    <meta name="description" content="{{ isset($output) ? formatOutput($output) : 'DNS record lookups, as Mother would answer them' }}" />

    <script>
        (function () {
            var root = document.documentElement;
            var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            root.className = root.className.replace('no-js', 'js');
            root.setAttribute('data-motion', prefersReducedMotion ? 'calm' : 'full');

            if (! prefersReducedMotion) {
                root.classList.add('mother-boot');
                setTimeout(function () { root.classList.remove('mother-boot'); }, 3000);
            }
        })();
    </script>

    <link rel="preload" href="{{ Vite::asset('resources/fonts/stint-ultra-expanded-latin.woff2') }}" as="font" type="font/woff2" crossorigin>

    @vite(['resources/css/alien.css', 'resources/js/alien.js'])

    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#060706">
</head>

<body class="mother-page">
    @include('googletagmanager::script')

    <canvas class="room-lights" id="room-lights" aria-hidden="true"></canvas>

    <div class="screen" id="screen">
        <div class="screen__picture" id="picture">
            <header class="mother-bar">
                <a class="mother-bar__name" href="{{ route('alien.home') }}">MU/TH/UR 6000</a>
                <span class="mother-bar__interface" aria-hidden="true">Interface 2037</span>
            </header>

            @include('alien.partials.screen')
        </div>
    </div>

    <p class="visually-hidden" id="announcer" aria-live="polite"></p>
</body>
</html>
