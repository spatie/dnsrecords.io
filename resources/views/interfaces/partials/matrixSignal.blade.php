@use('Illuminate\Support\Js')

@php
    $lines = $terminalOutput->lines();
    $recordCount = $terminalOutput->recordCount();
    $raw = $lines->map->text->implode("\n");
    $signal = [
        'domain' => $domain ?? 'Response',
        'count' => $recordCount,
        'raw' => $raw,
        'lines' => $lines->map(fn ($line) => [
            'text' => $line->text,
            'type' => $line->type,
            'name' => $line->name,
            'ttl' => $line->ttl,
            'value' => trim($line->value),
        ])->all(),
    ];
@endphp
<section class="matrix-signal result" aria-label="{{ $domain ?? 'Command' }} output" data-record-count="{{ $recordCount }}">
    <canvas class="matrix-signal__canvas" aria-hidden="true"></canvas>
    <pre class="matrix-signal__accessible">{{ $raw }}</pre>
    <script type="application/json" class="matrix-signal__data">{!! Js::encode($signal) !!}</script>
    @if($recordCount)
        <button type="button" class="copy-records matrix-signal__copy" hidden>[ COPY RECORDS ]</button>
    @endif
</section>
