@use('App\Enums\Theme')
@use('App\Support\TerminalOutput')

@php
    $theme = Theme::Matrix;
    $terminalOutput = isset($output) ? new TerminalOutput($output) : null;
    $recordCount = $terminalOutput?->recordCount() ?? 0;
    $flashMessages = collect(session('flash_notification', collect())->toArray());
    $interfaces = [
        ['Terminal', Theme::Crt],
        ['MU/TH/UR', Theme::Mother],
        ['LCARS', Theme::Lcars],
        ['System 7', Theme::System7],
        ['Windows XP', Theme::WinXp],
    ];
@endphp
<!DOCTYPE html>
<html lang="en" class="no-js" data-interface="matrix" @if($terminalOutput) data-matrix-booting @endif>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ isset($domain) ? $domain . ' DNS records' : 'DNS records lookup' }} ~ The Matrix ~ dnsrecords.io</title>
    <meta name="description" content="{{ isset($output) ? formatOutput($output) : 'Look up DNS records in a different interface' }}">
    <link rel="preload" href="{{ Vite::asset('resources/fonts/jetbrains-mono-latin.woff2') }}" as="font" type="font/woff2" crossorigin>
    <script>document.documentElement.classList.replace('no-js', 'js');</script>
    @vite(['resources/css/interfaces.css', 'resources/css/matrix.css', 'resources/js/interfaces.js'])
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <meta name="theme-color" content="#020804">
</head>
<body class="interface interface--matrix">
    @include('googletagmanager::script')

    <div class="matrix-atmosphere" aria-hidden="true"><canvas id="matrix-rain"></canvas><div class="matrix-vignette"></div></div>
    <a class="skip-link" href="#url">Skip to domain lookup</a>

    <main class="matrix-stage" id="screen-content">
        <h1 class="matrix-visually-hidden">DNS records lookup</h1>

        <form id="form" class="matrix-query" method="post" action="{{ $theme->homeUrl() }}" data-matrix-construct>
            @csrf
            <label for="url"><span aria-hidden="true">&gt;_</span> <span data-matrix-scramble>DOMAIN OR COMMAND</span></label>
            <div class="matrix-query__line">
                <div class="matrix-query__input"><input id="url" name="command" aria-label="Domain or command" placeholder="example.com" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" autofocus><span class="matrix-query__energy" aria-hidden="true"></span></div>
                <button type="submit" aria-label="Decode"><span aria-hidden="true">[</span> <span data-matrix-button-label aria-hidden="true">DECODE</span> <span aria-hidden="true">]</span></button>
            </div>
        </form>

        <div class="matrix-status" data-matrix-construct @if(! $terminalOutput) hidden @endif>
            <p id="status" role="status" aria-live="polite">{{ $terminalOutput ? "{$recordCount} records found" : 'Ready' }}</p>
            <a href="{{ $theme->homeUrl() }}" id="clear-results" @if(! $terminalOutput) hidden @endif>CLEAR</a>
        </div>

        <div class="entries matrix-feed" id="entries">
            @if($terminalOutput)
                <div class="entry entry--decoded">
                    <p class="entry__command">&gt; {{ $domain ?? request()->route('command') }}</p>
                    @include('interfaces.partials.result', ['terminalOutput' => $terminalOutput])
                </div>
            @endif

            @if($errors->has('input'))
                <p class="notice notice--error" role="alert">{{ $errors->first('input') }}</p>
            @endif

            @foreach($flashMessages as $message)
                <div class="notice notice--{{ $message['level'] }}" @if($message['level'] === 'danger') role="alert" @endif>{!! $message['message'] !!}</div>
            @endforeach
            {{ session()->forget('flash_notification') }}
        </div>
    </main>

    <details class="matrix-switcher">
        <summary aria-label="Switch interface">INTERFACES</summary>
        <nav aria-label="Interfaces">
            @foreach($interfaces as [$label, $interface])
                <a href="{{ $interface->selectionUrl() }}">{{ $label }}</a>
            @endforeach
        </nav>
    </details>
</body>
</html>
