@use('App\Support\TerminalOutput')

@php
    $terminalOutput = isset($output) ? new TerminalOutput($output) : null;
@endphp
<!DOCTYPE html>
<html lang="en" class="no-js" data-page="{{ $terminalOutput ? 'result' : 'home' }}" data-fx="on" data-phosphor="amber">

<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover">

    <title>{{ isset($domain) ? $domain . ' DNS records' : 'DNS records lookup' }} ~ dnsrecords.io</title>
    <meta name="description" content="{{ isset($output) ? formatOutput($output) : 'DNS record lookups just as you like \'em' }}" />

    @include('crt.partials.preferences')

    @vite(['resources/css/crt.css', 'resources/js/crt.js'])

    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/manifest.json">
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#151d21">
    <meta name="theme-color" content="#1b1713">
</head>

<body class="room">
    @include('googletagmanager::script')

    <div class="monitor" id="monitor">
        <div class="monitor__case">
            <div class="monitor__bezel">
                <div class="screen" id="screen">
                    <div class="screen__picture" id="picture">
                        @include('crt.partials.terminal')

                        @include('crt.partials.boot')
                    </div>

                    <div class="screen__scanlines" aria-hidden="true"></div>
                    <div class="screen__roll" aria-hidden="true"></div>
                    <div class="screen__glass" aria-hidden="true"></div>
                </div>
            </div>

            @include('crt.partials.panel')
        </div>
    </div>

    <p class="visually-hidden" id="announcer" aria-live="polite"></p>
</body>
</html>
