@use('App\Enums\Theme')
@use('App\Support\TerminalOutput')

@php
    $theme = Theme::current();
    $slug = strtolower($theme->name);
    $terminalOutput = isset($output) ? new TerminalOutput($output) : null;
    $recordCount = $terminalOutput?->recordCount() ?? 0;
    $flashMessages = collect(session('flash_notification', collect())->toArray());
    $title = match ($theme) {
        Theme::Matrix => 'The Matrix',
        Theme::System7 => 'System 7',
        Theme::WinXp => 'Windows XP',
    };
    $themeColor = match ($theme) {
        Theme::Matrix => '#050d09',
        Theme::System7 => '#bdbdbd',
        Theme::WinXp => '#2456b7',
    };
    $rainGlyphs = ['ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘ', 'ﾌﾊｷﾐﾑﾊﾗﾄｶﾏｻﾜﾂ', '0 1 0 1 1 0 0 1 1', 'ﾕﾗﾁﾇﾘﾓｻﾎﾜﾂﾆｽ'];
    $interfaces = [
        ['Terminal', Theme::Crt],
        ['MU/TH/UR', Theme::Mother],
        ['LCARS', Theme::Lcars],
        ['Matrix', Theme::Matrix],
        ['System 7', Theme::System7],
        ['Windows XP', Theme::WinXp],
    ];
@endphp
<!DOCTYPE html>
<html lang="en" class="no-js" data-interface="{{ $slug }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ isset($domain) ? $domain . ' DNS records' : 'DNS records lookup' }} ~ {{ $title }} ~ dnsrecords.io</title>
    <meta name="description" content="{{ isset($output) ? formatOutput($output) : 'Look up DNS records in a different interface' }}">
    <link rel="preload" href="{{ Vite::asset('resources/fonts/jetbrains-mono-latin.woff2') }}" as="font" type="font/woff2" crossorigin>
    @vite(['resources/css/interfaces.css', 'resources/js/interfaces.js'])
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <meta name="theme-color" content="{{ $themeColor }}">
</head>
<body class="interface interface--{{ $slug }}">
    @include('googletagmanager::script')

    @if($theme === Theme::Matrix)
        <div class="matrix-rain" aria-hidden="true">
            @for($column = 0; $column < 20; $column++)
                <span style="--column: {{ $column }}; --duration: {{ 12 + ($column % 7) * 2 }}s">{{ $rainGlyphs[$column % 4] }}</span>
            @endfor
        </div>
    @endif

    <a class="skip-link" href="#url">Skip to domain lookup</a>

    <div class="desktop">
        <header class="menu-bar">
            @if($theme === Theme::System7)
                <span class="menu-bar__brand system7-apple" aria-hidden="true">&#63743;</span>
                <details class="classic-menu">
                    <summary>File</summary>
                    <nav>
                        <a href="#url">Look Up…</a>
                        <a href="{{ $theme->homeUrl() }}" data-clear>Clear Results</a>
                        <a href="{{ route('home') }}">Close</a>
                    </nav>
                </details>
                <details class="classic-menu">
                    <summary>Edit</summary>
                    <nav><button type="button" data-copy-latest>Copy Records</button></nav>
                </details>
            @else
                <span class="menu-bar__brand" aria-hidden="true">◈</span>
                <span class="menu-bar__app">dnsrecords.io</span>
            @endif
            <details class="theme-menu">
                <summary>{{ $theme === Theme::System7 ? 'View' : 'Interfaces' }}</summary>
                <nav aria-label="Interfaces">
                    @foreach($interfaces as [$label, $interface])
                        <a href="{{ $interface->homeUrl() }}" @if($theme === $interface) aria-current="page" @endif>{{ $label }}</a>
                    @endforeach
                </nav>
            </details>
            @if($theme === Theme::System7)
                <a class="system7-label-menu" href="#entries">Label</a>
                <details class="classic-menu">
                    <summary>Special</summary>
                    <nav>
                        <a href="{{ $theme->commandUrl('help') }}">Help</a>
                        <a href="{{ route('home') }}">Return to Terminal</a>
                    </nav>
                </details>
                <a class="system7-help" href="{{ $theme->commandUrl('help') }}" aria-label="Help">?</a>
                <span class="menu-bar__right system7-application" aria-label="DNS Records application">▣</span>
            @else
                <span class="menu-bar__right" aria-hidden="true">{{ $title }}</span>
            @endif
        </header>

        @if($theme === Theme::System7)
            <div class="system7-desktop-icons" aria-hidden="true">
                <div class="system7-desktop-icon system7-desktop-icon--disk"><div class="system7-disk"></div><span>DNS Disk</span></div>
                <div class="system7-desktop-icon system7-desktop-icon--trash"><div class="system7-trash"></div><span>Trash</span></div>
            </div>
        @endif

        <main class="window" id="screen-content">
            <div class="window__titlebar">
                <span class="window__controls" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="window__title">{{ $theme === Theme::Matrix ? 'DNS :: ACCESS TERMINAL' : 'DNS Records' }}</span>
                @if($theme === Theme::System7)
                    <span class="window__zoom" aria-hidden="true"></span>
                @endif
                <span class="window__title-end" aria-hidden="true">{{ $theme === Theme::Matrix ? 'SYS/01' : ' ' }}</span>
            </div>

            @if($theme === Theme::WinXp)
                <nav class="xp-window-menu" aria-label="Application menu">
                    <details class="classic-menu">
                        <summary>File</summary>
                        <nav><a href="#url">New Lookup</a><a href="{{ $theme->homeUrl() }}" data-clear>Clear Results</a><a href="{{ route('home') }}">Exit</a></nav>
                    </details>
                    <details class="classic-menu">
                        <summary>Edit</summary>
                        <nav><button type="button" data-copy-latest>Copy Records</button></nav>
                    </details>
                    <details class="theme-menu">
                        <summary>View</summary>
                        <nav aria-label="Interfaces">
                            @foreach($interfaces as [$label, $interface])
                                <a href="{{ $interface->homeUrl() }}" @if($theme === $interface) aria-current="page" @endif>{{ $label }}</a>
                            @endforeach
                        </nav>
                    </details>
                    <a href="{{ $theme->commandUrl('help') }}">Help</a>
                </nav>
                <div class="xp-toolbar">
                    <a href="{{ $theme->homeUrl() }}" data-clear><span aria-hidden="true">‹</span> Back</a>
                    <a href="#url"><span aria-hidden="true">⌕</span> Search</a>
                    <a href="{{ route('home') }}">Terminal</a>
                </div>
                <div class="xp-address"><span>Address</span><span class="xp-address__path">dnsrecords.io\DNS Records</span><a href="#url">Go</a></div>
            @endif

            @if($theme === Theme::System7)
                <div class="system7-info"><span id="system7-count">{{ $recordCount }} items</span><span>DNS Records</span><span>Online</span></div>
            @endif

            <div class="window__viewport">
                @if($theme === Theme::WinXp)
                    <aside class="xp-sidebar" aria-label="DNS tasks">
                        <section><h2>DNS Tasks</h2><a href="#url">New lookup</a><a href="{{ $theme->homeUrl() }}" data-clear>Clear results</a></section>
                        <section><h2>Other Places</h2><a href="{{ route('home') }}">Terminal</a><a href="{{ route('matrix.home') }}">Matrix</a><a href="{{ route('system7.home') }}">System 7</a></section>
                    </aside>
                @endif

                <div class="window__body">
                    <header class="app-heading">
                        <span class="app-heading__icon" aria-hidden="true">{{ $theme === Theme::Matrix ? '>' : ($theme === Theme::System7 ? '⌘' : '◈') }}</span>
                        <div>
                            <h1>DNS Records</h1>
                            <p>{{ $theme === Theme::Matrix ? 'Follow the record.' : 'Look up a domain and inspect its records.' }}</p>
                        </div>
                    </header>

                    <form id="form" class="lookup" method="post" action="{{ $theme->homeUrl() }}">
                        @csrf
                        <label for="url">Domain or command</label>
                        <div class="lookup__controls">
                            <input id="url" name="command" placeholder="example.com" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" autofocus>
                            <button type="submit">{{ $theme === Theme::Matrix ? 'DECODE' : 'Look up' }}</button>
                        </div>
                    </form>

                    <div class="action-bar">
                        <p id="status" role="status" aria-live="polite">{{ $terminalOutput ? "{$recordCount} records found" : 'Ready for a domain' }}</p>
                        <a href="{{ $theme->homeUrl() }}" id="clear-results">Clear results</a>
                    </div>

                    <div class="entries" id="entries">
                        @if($terminalOutput)
                            @include('interfaces.partials.result', ['terminalOutput' => $terminalOutput])
                        @endif

                        @if($errors->has('input'))
                            <p class="notice notice--error" role="alert">{{ $errors->first('input') }}</p>
                        @endif

                        @foreach($flashMessages as $message)
                            <div class="notice notice--{{ $message['level'] }}" @if($message['level'] === 'danger') role="alert" @endif>{!! $message['message'] !!}</div>
                        @endforeach
                        {{ session()->forget('flash_notification') }}
                    </div>
                </div>

                @if($theme === Theme::System7)
                    <div class="system7-scrollbar">
                        <button type="button" data-scroll="up" aria-label="Scroll up">▲</button>
                        <div class="system7-scrollbar__track"><span class="system7-scrollbar__thumb" id="system7-scroll-thumb"></span></div>
                        <button type="button" data-scroll="down" aria-label="Scroll down">▼</button>
                    </div>
                @endif
            </div>

            @if($theme === Theme::System7)
                <div class="system7-bottom" aria-hidden="true"><span>◀</span><span class="system7-bottom__track"></span><span>▶</span><span class="system7-bottom__size"></span></div>
            @endif

            <footer class="window__statusbar"><span id="window-status">{{ $terminalOutput ? "{$recordCount} records" : 'Ready' }}</span><span>dnsrecords.io</span></footer>
        </main>

        <footer class="taskbar">
            <a class="taskbar__home" href="{{ route('home') }}">{{ $theme === Theme::WinXp ? 'Start' : 'Terminal' }}</a>
            <details class="theme-menu taskbar__menu">
                <summary>Interfaces</summary>
                <nav aria-label="Interfaces">
                    @foreach($interfaces as [$label, $interface])
                        <a href="{{ $interface->homeUrl() }}" @if($theme === $interface) aria-current="page" @endif>{{ $label }}</a>
                    @endforeach
                </nav>
            </details>
            <span class="taskbar__active">DNS Records</span>
            <span class="taskbar__clock" id="clock" aria-label="Current time"></span>
        </footer>
    </div>
</body>
</html>
