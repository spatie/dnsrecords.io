@php
    $isIdle = ! $terminalOutput && ! $errors->any() && ! session()->has('flash_notification');
@endphp

<div class="screen__content" id="screen-content" data-title="{{ $domain ?? 'dnsrecords.io' }}">
    <div class="terminal" id="terminal">
        @if($isIdle)
            <p class="welcome">Ready. Type a domain to see every record it has.</p>
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
                <span aria-hidden="true"><span class="prompt__path">~</span> <span class="prompt__symbol">&#10095;</span></span>
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


        @unless($terminalOutput)
            <div class="suggestions" aria-label="Try one of these">
                @foreach(['spatie.be', 'github.com', 'ip', 'help'] as $suggestion)
                    <button type="button" class="suggestion" data-command="{{ $suggestion }}">{{ $suggestion }}</button>
                @endforeach
            </div>
        @endunless

        @if($isIdle)
            <dl class="commands">
                <div><dt>&lt;domain&gt;</dt><dd>every record for that domain</dd></div>
                <div><dt>ip</dt><dd>your own IP address</dd></div>
                <div><dt>green, amber, white</dt><dd>change the terminal colour</dd></div>
                <div><dt>degauss</dt><dd>give the window a wiggle</dd></div>
                <div><dt>fx off</dt><dd>calm the glow and motion</dd></div>
            </dl>
        @endif
    </div>
</div>
