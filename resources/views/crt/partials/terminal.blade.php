@use('Illuminate\Support\Str')

<div class="screen__content" id="screen-content">
    <header class="status-bar">
        <h1 class="status-bar__title">
            <a href="{{ route('home') }}" data-glitch>dnsrecords.io</a>
        </h1>
        <p class="status-bar__state">
            @if($terminalOutput?->recordCount())
                <span>{{ $terminalOutput->recordCount() }} {{ Str::plural('record', $terminalOutput->recordCount()) }}</span>
            @else
                <span>resolver ready</span>
            @endif
            <span class="status-bar__clock" id="clock" aria-hidden="true"></span>
        </p>
    </header>

    <main class="terminal" id="terminal">
        @unless($terminalOutput || $errors->any() || session()->has('flash_notification'))
            <div class="banner">
                <pre class="banner__art banner__art--wide" aria-hidden="true">@include('crt.partials.bannerWide')</pre>
                <pre class="banner__art banner__art--narrow" aria-hidden="true">@include('crt.partials.bannerNarrow')</pre>
                <p class="banner__tagline">DNS record lookups just as you like 'em.</p>
            </div>
        @endunless

        @if($terminalOutput)
            @include('crt.partials.results', ['terminalOutput' => $terminalOutput])
        @endif

        @if($errors->has('input'))
            <p class="message message--danger" role="alert">
                <span class="message__label">err</span>
                {{ $errors->first('input') }}
            </p>
        @endif

        @include('crt.partials.flash')

        <form id="form" class="prompt" method="post" action="{{ route('home') }}">
            {{ csrf_field() }}

            <label for="url" class="prompt__label">
                <span aria-hidden="true"><span class="prompt__host">guest@dnsrecords.io:~</span>$</span>
                <span class="visually-hidden">Domain or command</span>
            </label>
            <span class="prompt__field">
                <input
                    id="url"
                    name="command"
                    class="prompt__input"
                    placeholder="enter a domain"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    autofocus="autofocus"
                    spellcheck="false"
                    enterkeyhint="go"
                />
                <span class="prompt__hint" aria-hidden="true">enter a domain</span>
                <span class="prompt__cursor" id="cursor" aria-hidden="true"></span>
            </span>
        </form>

        <p class="resolving" id="resolving" aria-live="polite"></p>
    </main>

    <footer class="terminal-footer">
        <p>Type <kbd>help</kbd> for commands.</p>
        <p>(c) <a href="https://spatie.be/open-source" data-glitch>spatie</a> {{ date('Y') }}. Miss the old look? <a href="{{ route('old.home') }}" data-glitch>/old</a></p>
    </footer>
</div>
