@use('Illuminate\Support\Str')

@php
    $lines = $terminalOutput->lines();
    $stagger = min(40, intdiv(900, max(1, $lines->count())));
    $recordCount = $terminalOutput->recordCount();
    $nameWidth = min(36, (int) $lines->filter->isRecord()->map(fn ($line) => mb_strlen($line->name))->max());
@endphp
<section class="results" aria-labelledby="results-title" style="--name-width: {{ $nameWidth }}ch">
    <div class="results__header">
        <h2 class="results__title" id="results-title">
            <span class="results__domain">{{ $domain ?? 'Your IP address' }}</span>
            @if($recordCount)
                <span class="results__count">{{ $recordCount }} {{ Str::plural('record', $recordCount) }}</span>
            @endif
        </h2>

        <div class="results__actions">
            <button type="button" class="action" id="copy-results" hidden>
                <svg class="action__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path class="action__copy" d="M7 6.5V4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75v6.5A1.75 1.75 0 0 1 15.25 13H13.5M4.75 7h6.5A1.75 1.75 0 0 1 13 8.75v6.5A1.75 1.75 0 0 1 11.25 17h-6.5A1.75 1.75 0 0 1 3 15.25v-6.5A1.75 1.75 0 0 1 4.75 7z"/>
                    <path class="action__check" d="M4.5 10.5l3.5 3.5 7.5-8"/>
                </svg>
                <span class="action__label">Copy all</span>
            </button>
            <a class="action" href="{{ route('home') }}">Clear</a>
        </div>
    </div>

    <pre class="results__output" id="results">@foreach($lines as $index => $line)<span class="line{{ $line->isRecord() ? ' line--record' : '' }}" style="--delay: {{ $index * $stagger }}ms">@if($line->isRecord())<span class="line__name">{{ $line->name }}</span><span class="line__gap">{{ $line->nameSpacing }}</span><span class="line__ttl">{{ $line->ttl }}</span><span class="line__gap">{{ $line->ttlSpacing }}</span><span class="line__type line__type--{{ strtolower($line->type) }}">{{ $line->type }}</span><span class="line__value">{{ $line->value }}</span>@else<span class="line__text">{{ $line->text }}</span>@endif</span>
@endforeach</pre>
</section>
