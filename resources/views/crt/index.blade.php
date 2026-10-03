@use('App\Support\TerminalOutput')

@php
    $terminalOutput = isset($output) ? new TerminalOutput($output) : null;
@endphp
<!DOCTYPE html>
<html lang="en" class="no-js" data-page="{{ $terminalOutput ? 'result' : 'home' }}" data-fx="on" data-phosphor="white">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="dark">

    <title>{{ isset($domain) ? $domain . ' DNS records' : 'DNS records lookup' }} ~ dnsrecords.io</title>
    <meta name="description" content="{{ isset($output) ? formatOutput($output) : 'DNS record lookups just as you like \'em' }}" />

    @include('crt.partials.preferences')

    <link rel="preload" href="{{ Vite::asset('resources/fonts/jetbrains-mono-latin.woff2') }}" as="font" type="font/woff2" crossorigin>

    @vite(['resources/css/crt.css', 'resources/js/crt.js'])

    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/manifest.json">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#151d21">
    <meta name="theme-color" content="#0b0b0c">
</head>

<body class="terminal-page">
    @include('googletagmanager::script')

    <div class="screen" id="screen">
        <div class="screen__picture" id="picture">
            <header class="status-bar">
                <a class="status-bar__title" href="{{ route('home') }}">dnsrecords.io</a>

                <p class="status-bar__state">
                    <button type="button" class="status-bar__toggle" id="phosphor-toggle" aria-label="Phosphor colour">white</button>
                    <button type="button" class="status-bar__toggle" id="fx-toggle" aria-pressed="true" aria-label="Effects">fx on</button>
                    <span class="status-bar__clock" id="clock" aria-hidden="true"></span>
                </p>
            </header>

            @include('crt.partials.terminal')
        </div>

        <div class="screen__beam" aria-hidden="true"></div>

        <div class="screen__sleep" aria-hidden="true">
            <p>power off</p>
            <p class="screen__sleep-hint">press any key</p>
        </div>
    </div>

    <p class="visually-hidden" id="announcer" aria-live="polite"></p>
</body>
</html>
