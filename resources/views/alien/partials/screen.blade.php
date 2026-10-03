@use('Illuminate\Support\Str')


@php
    $flashMessages = collect(session('flash_notification', collect())->toArray());
    $isIdle = ! $terminalOutput && ! $errors->any() && $flashMessages->isEmpty();
    $inquiry = $domain ?? request()->input('command') ?? request()->route('command');
    $recordCount = $terminalOutput?->recordCount() ?? 0;
    $announcement = match (true) {
        $recordCount > 0 => "Response: {$recordCount} ".Str::plural('record', $recordCount)." for {$domain}.",
        $terminalOutput !== null => 'Response: '.trim($terminalOutput->lines()->map->text->implode(' ')),
        $flashMessages->contains('level', 'danger') => 'Response: unable to compute. '.strip_tags($flashMessages->firstWhere('level', 'danger')['message']),
        default => '',
    };
@endphp

<div class="screen__content" id="screen-content">
    <main class="mother" id="terminal">
        <h1 class="visually-hidden">DNS records lookup, Interface 2037</h1>

        <div class="exchange" id="exchange" data-announce="{{ $announcement }}">
            @if($isIdle)
                <p class="mother-line" data-line><span class="mother-label">Standing order</span> Resolve all names</p>

                <dl class="status-report">
                    <div class="status-report__row" data-line><dt>Resolver uplink</dt><dd>Online</dd></div>
                    <div class="status-report__row" data-line><dt>Root name servers</dt><dd>Responding</dd></div>
                    <div class="status-report__row" data-line><dt>Record types</dt><dd>A AAAA CNAME MX NS SOA TXT</dd></div>
                </dl>
            @elseif($inquiry && ! $flashMessages->contains('level', 'info'))
                <p class="mother-line mother-line--inquiry" data-line data-inquiry><span class="mother-label">Inquiry</span> <span class="mother-line__echo">{{ $inquiry }}</span></p>
            @endif

            @if($terminalOutput)
                @if($recordCount)
                    <p class="mother-line" data-line><span class="mother-label">Response</span> {{ $recordCount }} {{ Str::plural('record', $recordCount) }} located for {{ $domain }}</p>
                @endif

                <div class="records" id="results">
                    @foreach($terminalOutput->lines() as $line)
                        @if($line->isRecord())
                            <div class="record" data-line data-raw="{{ $line->text }}"><span class="record__name">{{ $line->name }}</span><span class="record__gap">{{ $line->nameSpacing }}</span><span class="record__ttl">{{ $line->ttl }}</span><span class="record__gap">{{ $line->ttlSpacing }}</span><span class="record__type" title="{{ $line->typeDescription() }}">{{ $line->type }}</span><span class="record__value{{ str_contains($line->value, '"') ? ' record__value--exact' : '' }}">{{ $line->value }}</span></div>
                        @elseif($recordCount && trim($line->text) !== '')
                            <div class="record record--continued" data-line data-raw="{{ $line->text }}"><span class="record__value">{{ $line->text }}</span></div>
                        @elseif(trim($line->text) !== '')
                            <p class="mother-line" data-line><span class="mother-label">Response</span> {{ $line->text }}</p>
                        @endif
                    @endforeach
                </div>

                @if($recordCount)
                    <p class="mother-line mother-line--end" data-line>End of response <button type="button" class="mother-action" id="copy-results" hidden>Copy records</button></p>
                @endif
            @endif

            @if($errors->has('input'))
                <p class="mother-line" data-line role="alert"><span class="mother-label">Response</span> Unable to compute. {{ $errors->first('input') }}</p>
            @endif

            @foreach($flashMessages as $message)
                @if($message['level'] === 'danger')
                    <p class="mother-line" data-line role="alert"><span class="mother-label">Response</span> Unable to compute. Available data insufficient.</p>
                    <p class="mother-line mother-line--detail" data-line>{!! $message['message'] !!}</p>
                @else
                    <p class="mother-line" data-line><span class="mother-label">Response</span> Clarification follows.</p>
                    <p class="mother-line mother-line--manual" data-line>{!! $message['message'] !!}</p>
                @endif
            @endforeach

            {{ session()->forget('flash_notification') }}

            <p class="mother-line mother-line--ready" data-line>Interface 2037 ready for inquiry</p>
        </div>

        <form id="form" class="inquiry" method="post" action="{{ route('mother.home') }}">
            {{ csrf_field() }}

            <label for="url" class="inquiry__label">
                <span aria-hidden="true">&gt;</span>
                <span class="visually-hidden">Inquiry: a domain name or a command</span>
            </label>

            <span class="inquiry__field">
                <input
                    id="url"
                    name="command"
                    class="inquiry__input"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    autofocus="autofocus"
                    spellcheck="false"
                    enterkeyhint="go"
                />
                <span class="inquiry__mirror" id="inquiry-mirror" aria-hidden="true"><span class="inquiry__before"></span><span class="inquiry__cursor"></span><span class="inquiry__after"></span></span>
            </span>
        </form>

        <p class="mother-status" id="resolving" aria-live="polite"></p>

        @if($isIdle)
            <p class="mother-hint">Enter a domain for inquiry. Enter <button type="button" class="mother-action" data-command="help">help</button> for clarification.</p>
        @endif
    </main>

    <footer class="mother-footer">
        <p>(c) <a href="https://spatie.be/open-source">Spatie</a> {{ date('Y') }} &nbsp; <a href="{{ route('home') }}">Terminal</a> &nbsp; <a href="{{ route('old.home') }}">Old</a></p>
    </footer>
</div>
