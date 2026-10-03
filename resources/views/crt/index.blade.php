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
    <meta name="color-scheme" content="light dark">

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
    <meta name="theme-color" content="#f5f5f7" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
</head>

<body class="page">
    @include('googletagmanager::script')

    <div class="ambient" aria-hidden="true">
        <span class="ambient__glow ambient__glow--sky"></span>
        <span class="ambient__glow ambient__glow--violet"></span>
        <span class="ambient__glow ambient__glow--rose"></span>
        <span class="ambient__glow ambient__glow--sun"></span>
    </div>

    <header class="site-header">
        <a class="brand" href="{{ route('home') }}">
            <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                <defs>
                    <linearGradient id="brand-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#5ac8fa"/>
                        <stop offset=".55" stop-color="#7d5cff"/>
                        <stop offset="1" stop-color="#ff4f8b"/>
                    </linearGradient>
                </defs>
                <rect width="32" height="32" rx="8.5" fill="url(#brand-gradient)"/>
                <path d="M9.5 11.5l5 4.5-5 4.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M17 21h6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
            </svg>
            <span class="brand__name">dnsrecords.io</span>
        </a>

        <nav class="site-nav" aria-label="Site">
            <button type="button" class="site-nav__command" data-command="help">Help</button>
            <a href="{{ route('old.home') }}">Classic look</a>
            <a href="https://spatie.be/open-source">By Spatie</a>
        </nav>
    </header>

    <main class="stage" id="stage">
        <section class="hero" aria-labelledby="hero-title">
            <div class="hero__inner">
                <h1 class="hero__title" id="hero-title">Every DNS record.<br><span class="hero__accent">One lookup.</span></h1>
                <p class="hero__lede">Type a domain and see all of its records, just as you like 'em.</p>
            </div>
        </section>

        <div class="window" id="window">
            <div class="window__bar">
                <span class="window__lights" aria-hidden="true"><i></i><i></i><i></i></span>

                <p class="window__title" id="window-title">{{ $domain ?? 'dnsrecords.io' }}</p>

                <div class="window__tools">
                    <div class="swatches" role="radiogroup" aria-label="Terminal colour">
                        @foreach(['white' => 'Graphite', 'green' => 'Phosphor green', 'amber' => 'Amber'] as $phosphor => $label)
                            <button type="button" class="swatch swatch--{{ $phosphor }}" role="radio" aria-checked="false" aria-label="{{ $label }}" data-phosphor-option="{{ $phosphor }}"></button>
                        @endforeach
                    </div>

                    <button type="button" class="tool" id="fx-toggle" aria-pressed="true" aria-label="Glow and motion">
                        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 2.5l1.6 4.7 4.9 1.3-4.9 1.3L10 14.5l-1.6-4.7-4.9-1.3 4.9-1.3z"/><path d="M15.5 13.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg>
                    </button>
                </div>
            </div>

            <div class="screen" id="screen">
                @include('crt.partials.terminal')

                <div class="screen__sleep" aria-hidden="true">
                    <p>Display is asleep.</p>
                    <p class="screen__sleep-hint">Press any key to wake it.</p>
                </div>
            </div>
        </div>

        <p class="shortcuts">
            <span><kbd>/</kbd> focus</span>
            <span><kbd>esc</kbd> clear</span>
            <span><kbd>help</kbd> all commands</span>
        </p>
    </main>

    <footer class="site-footer">
        <p>Made by <a href="https://spatie.be">Spatie</a> in Antwerp. Prefer the original? <a href="{{ route('old.home') }}">Use the classic look</a>.</p>
    </footer>

    <p class="visually-hidden" id="announcer" aria-live="polite"></p>
</body>
</html>
