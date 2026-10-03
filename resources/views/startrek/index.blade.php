@use('App\Support\TerminalOutput')

@php
    $terminalOutput = isset($output) ? new TerminalOutput($output) : null;
    $cascadeColumns = 8;
    $cascadeRows = 6;
    $hasAlert = collect(session('flash_notification', []))->contains(fn ($message) => $message->level === 'danger');
    $status = match (true) {
        $terminalOutput !== null => 'Scan complete',
        $hasAlert => 'Unable to comply',
        default => 'Standing by',
    };
@endphp
<!DOCTYPE html>
<html lang="en" class="no-js" data-interface="lcars" data-page="{{ $terminalOutput ? 'result' : 'home' }}" data-motion="full">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="dark">
    <meta name="robots" content="noindex">

    <title>{{ isset($domain) ? $domain . ' DNS records' : 'DNS records lookup' }} ~ dnsrecords.io</title>
    <meta name="description" content="{{ isset($output) ? formatOutput($output) : 'DNS record lookups just as you like \'em' }}" />

    <script>
        (function () {
            var root = document.documentElement;
            var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            root.className = root.className.replace('no-js', 'js');
            root.setAttribute('data-motion', prefersReducedMotion ? 'calm' : 'full');
        })();
    </script>

    <link rel="preload" href="{{ Vite::asset('resources/fonts/antonio-latin.woff2') }}" as="font" type="font/woff2" crossorigin>

    @vite(['resources/css/startrek.css', 'resources/js/startrek.js'])

    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#000000">
</head>

<body class="lcars">
    @include('googletagmanager::script')

    <a class="skip-link" href="#domain">Skip to the domain field</a>

    <div class="frame">
        <section class="deck deck--upper" aria-label="Lookup console">
            <div class="deck__side" aria-hidden="true">
                <span class="block block--peach"><span class="block__code">01-1035</span></span>
                <span class="block block--lilac block--grow"><span class="block__code">02-0053</span></span>
            </div>

            <div class="deck__elbow elbow elbow--down" aria-hidden="true"></div>

            <div class="deck__bars bars" aria-hidden="true">
                <span class="bar bar--lilac bar--wide"></span>
                <span class="bar bar--orange"></span>
                <span class="bar bar--tan bar--grow"></span>
                <span class="bar bar--violet"></span>
                <span class="bar bar--peach bar--cap"></span>
            </div>

            <div class="deck__content console">
                <header class="console__header">
                    <h1 class="console__title"><a href="{{ route('lcars.home') }}">dnsrecords.io</a></h1>
                    <p class="console__subtitle" aria-hidden="true">Domain name archive <span class="console__code">47-3596</span></p>
                </header>

                <form id="scan-form" class="scan" method="post" action="{{ route('lcars.home') }}">
                    {{ csrf_field() }}

                    <label for="domain" class="scan__label">Domain</label>

                    <input
                        id="domain"
                        name="command"
                        class="scan__input"
                        placeholder="spatie.be"
                        value="{{ $domain ?? '' }}"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                        enterkeyhint="go"
                        @unless($terminalOutput) autofocus @endunless
                    />

                    <button type="submit" class="pill pill--action scan__button">Scan</button>
                </form>

                <p class="status" id="status" aria-live="polite">
                    <span class="status__light" aria-hidden="true"></span>
                    <span class="status__text" id="status-text">{{ $status }}</span>
                </p>

                <div class="cascade" aria-hidden="true">
                    @for ($column = 0; $column < $cascadeColumns; $column++)
                        <span class="cascade__column" style="--column: {{ $column }}">
                            @for ($row = 0; $row < $cascadeRows; $row++)
                                <span style="--row: {{ $row }}">{{ str_pad((string) random_int(0, 10 ** random_int(2, 5) - 1), random_int(2, 5), '0', STR_PAD_LEFT) }}</span>
                            @endfor
                        </span>
                    @endfor
                </div>
            </div>
        </section>

        <section class="deck deck--lower" aria-label="Scan results">
            <div class="deck__elbow elbow elbow--up" aria-hidden="true"></div>

            <div class="deck__bars bars" aria-hidden="true">
                <span class="bar bar--orange bar--wide"></span>
                <span class="bar bar--violet"></span>
                <span class="bar bar--tan bar--grow"></span>
                <span class="bar bar--blue"></span>
                <span class="bar bar--lilac bar--cap"></span>
            </div>

            <nav class="deck__side nav" aria-label="Commands">
                <a class="block block--orange nav__item" href="{{ route('lcars.command', ['command' => 'ip']) }}" rel="nofollow" data-command="ip"><span class="block__code" aria-hidden="true">03</span>My ip</a>
                <a class="block block--tan nav__item" href="{{ route('lcars.command', ['command' => 'help']) }}" rel="nofollow" data-command="help"><span class="block__code" aria-hidden="true">04</span>Help</a>
                <a class="block block--blue nav__item" href="{{ route('lcars.home') }}" data-command="clear"><span class="block__code" aria-hidden="true">05</span>Clear</a>
                <a class="block block--violet nav__item" href="{{ route('home') }}"><span class="block__code" aria-hidden="true">06</span>Terminal</a>
                <a class="block block--peach nav__item" href="{{ route('old.home') }}"><span class="block__code" aria-hidden="true">07</span>Classic</a>
                <span class="block block--lilac block--grow" aria-hidden="true"><span class="block__code">08-7208</span></span>
            </nav>

            <div class="deck__content" id="lcars-content">
                @include('startrek.partials.screen')
            </div>
        </section>
    </div>

    <p class="visually-hidden" id="announcer" aria-live="polite"></p>
</body>
</html>
