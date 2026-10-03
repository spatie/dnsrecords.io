@php
    $isIdle = ! $terminalOutput && ! $errors->any() && ! session()->has('flash_notification');
@endphp

<div class="screen__content" id="screen-content">
    <main class="terminal" id="terminal">
        @if($isIdle)
            <div class="welcome">
                <p class="welcome__title">DNS record lookups just as you like 'em.</p>
                <p>Type a domain and press enter. Type <button type="button" class="inline-command" data-command="help">help</button> for commands.</p>
            </div>
        @endif

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
                <span aria-hidden="true">~ $</span>
                <span class="visually-hidden">Domain or command</span>
            </label>

            <input
                id="url"
                name="command"
                class="prompt__input"
                placeholder="spatie.be"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                autofocus="autofocus"
                spellcheck="false"
                enterkeyhint="go"
            />
        </form>

        <p class="resolving" id="resolving" aria-live="polite"></p>

        @if($isIdle)
            <p class="suggestions">
                <span class="suggestions__label">try</span>
                @foreach(['spatie.be', 'github.com', 'ip'] as $suggestion)
                    <button type="button" class="inline-command" data-command="{{ $suggestion }}">{{ $suggestion }}</button>
                @endforeach
            </p>
        @endif
    </main>

    <footer class="terminal-footer">
        <p>(c) <a href="https://spatie.be/open-source">spatie</a> {{ date('Y') }}. Miss the old look? <a href="{{ route('old.home') }}">/old</a></p>
    </footer>
</div>
