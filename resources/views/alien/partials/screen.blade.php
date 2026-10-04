@use('App\Enums\Theme')
@use('Illuminate\Support\Str')


@php
    $flashMessages = collect(session('flash_notification', collect())->toArray());
    $isIdle = ! $terminalOutput && ! $errors->any() && $flashMessages->isEmpty();
    $inquiry = $flashMessages->contains('level', 'info') ? null : ($domain ?? request()->input('command') ?? request()->route('command'));
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

        <div class="transcript" id="transcript">
            @if($isIdle)
                <div class="exchange exchange--boot">
                    @include('alien.partials.root-matrix')

                    <p class="mother-line mother-hint" data-line>Enter a domain for inquiry. Enter <button type="button" class="mother-action" data-command="help">help</button> for clarification, <a href="{{ Theme::Crt->selectionUrl() }}">exit</a> to return to the terminal.</p>
                </div>
            @else
                <section class="turn">
                    <p class="mother-ready">Interface 2037 ready for inquiry</p>

                    @if($inquiry)
                        <p class="mother-echo">{{ $inquiry }}</p>
                    @endif

                    <div class="exchange" data-announce="{{ $announcement }}">
                        @if($terminalOutput)
                            @if($recordCount)
                                <section class="matrix" data-matrix aria-label="DNS records for {{ $domain }}">
                                    <p class="matrix__title" data-line>{{ $domain }} record matrix</p>

                                    <div class="records">
                                        @foreach($terminalOutput->lines() as $line)
                                            @if($line->isRecord())
                                                <div class="record" data-row data-raw="{{ $line->text }}"><span class="record__name" data-column="0">{{ $line->name }}</span><span class="record__gap">{{ $line->nameSpacing }}</span><span class="record__ttl" data-column="1">{{ $line->ttl }}</span><span class="record__gap">{{ $line->ttlSpacing }}</span><span class="record__type" data-column="2" title="{{ $line->typeDescription() }}">{{ $line->type }}</span><span class="record__value{{ str_contains($line->value, '"') ? ' record__value--exact' : '' }}" data-column="3">{{ $line->value }}</span></div>
                                            @elseif(trim($line->text) !== '')
                                                <div class="record record--continued" data-row data-raw="{{ $line->text }}"><span class="record__value" data-column="3">{{ $line->text }}</span></div>
                                            @endif
                                        @endforeach
                                    </div>
                                </section>

                                <p class="mother-line mother-line--end" data-line>{{ $recordCount }} {{ Str::plural('record', $recordCount) }} located for {{ $domain }} <button type="button" class="mother-action" data-copy hidden>Copy records</button></p>
                            @else
                                @foreach($terminalOutput->lines() as $line)
                                    @if(trim($line->text) !== '')
                                        <p class="mother-line" data-line>{{ $line->text }}</p>
                                    @endif
                                @endforeach
                            @endif
                        @endif

                        @if($errors->has('input'))
                            <p class="mother-line" data-line role="alert">Unable to compute. {{ $errors->first('input') }}</p>
                        @endif

                        @foreach($flashMessages as $message)
                            @if($message['level'] === 'danger')
                                <p class="mother-line" data-line role="alert">Unable to compute. Available data insufficient.</p>
                                <p class="mother-line mother-line--detail" data-line>{!! $message['message'] !!}</p>
                            @else
                                <p class="mother-line" data-line>Clarification follows.</p>
                                <p class="mother-line mother-line--manual" data-line>{!! $message['message'] !!}</p>
                            @endif
                        @endforeach

                        {{ session()->forget('flash_notification') }}
                    </div>
                </section>
            @endif
        </div>

        <form id="form" class="inquiry" method="post" action="{{ route('mother.home') }}">
            @csrf

            <p class="mother-ready">Interface 2037 ready for inquiry</p>

            <label for="url" class="inquiry__hint">Domain or command</label>

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
    </main>

</div>
