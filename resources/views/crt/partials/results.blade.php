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
            <span class="results__prefix" aria-hidden="true">;; dig</span>
            <span class="results__domain">{{ $domain ?? 'ip' }}</span>
            @if($recordCount)
                <span class="results__count">{{ $recordCount }} {{ Str::plural('record', $recordCount) }}</span>
            @endif
        </h2>

        <div class="results__actions">
            <button type="button" class="text-action" id="copy-results" hidden><span class="action__label">copy all</span></button>
            <a class="text-action" href="{{ route('home') }}">clear</a>
        </div>
    </div>

    <pre class="results__output" id="results">@foreach($lines as $index => $line)<span class="line{{ $line->isRecord() ? ' line--record' : '' }}" style="--delay: {{ $index * $stagger }}ms">@if($line->isRecord())<span class="line__name">{{ $line->name }}</span><span class="line__gap">{{ $line->nameSpacing }}</span><span class="line__ttl">{{ $line->ttl }}</span><span class="line__gap">{{ $line->ttlSpacing }}</span><span class="line__type line__type--{{ strtolower($line->type) }}">{{ $line->type }}</span><span class="line__value">{{ $line->value }}</span>@else<span class="line__text">{{ $line->text }}</span>@endif</span>
@endforeach</pre>
</section>
