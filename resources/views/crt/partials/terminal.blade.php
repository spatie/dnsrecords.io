<div class="screen__content" id="screen-content">
    <main class="terminal" id="terminal">
        <h1 class="brand">
            <span class="brand__tilde" aria-hidden="true">~</span>
            <a href="{{ route('home') }}">dnsrecords.io</a>
            <span class="visually-hidden">DNS record lookups just as you like 'em</span>
        </h1>

        <div id="terminal-history">
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
        </div>

        <form id="form" class="prompt" method="post" action="{{ route('home') }}">
            {{ csrf_field() }}

            <label for="url" class="prompt__label">
                <span aria-hidden="true">&rarr;</span>
                <span class="visually-hidden">Domain or command</span>
            </label>

            <input
                id="url"
                name="command"
                class="prompt__input"
                placeholder="Enter a domain"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                autofocus="autofocus"
                spellcheck="false"
                enterkeyhint="go"
            />
        </form>

        <p class="resolving" id="resolving" aria-live="polite"></p>
    </main>

    <footer class="terminal-footer">
        <p>(c) <a href="https://spatie.be/open-source">spatie</a> {{ date('Y') }}. type <button type="button" class="inline-command" data-command="help">help</button> <a class="terminal-footer__old" href="{{ route('old.home') }}">/old</a></p>
    </footer>
</div>
