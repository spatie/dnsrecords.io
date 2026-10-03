@php
    $lines = $terminalOutput->lines();
    $stagger = min(45, intdiv(1400, max(1, $lines->count())));
@endphp
<section class="results" aria-labelledby="results-title">
    <div class="results__header">
        <h2 class="results__title" id="results-title">
            <span aria-hidden="true">;; &lt;&lt;&gt;&gt; dig &lt;&lt;&gt;&gt;</span>
            <span class="results__domain">{{ $domain ?? 'ip' }}</span>
        </h2>

        <div class="results__actions">
            <button type="button" class="key" id="copy-results" data-glitch hidden>copy records</button>
            <a class="key" href="{{ route('home') }}" data-glitch>clear</a>
        </div>
    </div>

    <pre class="results__output" id="results">@foreach($lines as $index => $line)<span class="line{{ $line->isRecord() ? ' line--record' : '' }}" style="--delay: {{ $index * $stagger }}ms; --steps: {{ min(48, max(1, $line->length())) }}">@if($line->isRecord())<span class="line__name">{{ $line->name }}</span><span class="line__gap">{{ $line->nameSpacing }}</span><span class="line__ttl">{{ $line->ttl }}</span>{{ $line->ttlSpacing }}<span class="line__type line__type--{{ strtolower($line->type) }}">{{ $line->type }}</span><span class="line__value">{{ $line->value }}</span>@else{{ $line->text }}@endif</span>
@endforeach</pre>
</section>
