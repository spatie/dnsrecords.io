@use('Illuminate\Support\Str')

@php
    $recordCount = $terminalOutput->recordCount();
@endphp
<section class="result" aria-label="{{ $domain ?? 'Command' }} output">
    <div class="result__heading">
        <div>
            <span class="result__eyebrow">{{ $recordCount ? 'Lookup complete' : 'Command output' }}</span>
            <h2>{{ $domain ?? 'Response' }}</h2>
        </div>
        <div class="result__actions">
            @if($recordCount)
                <span>{{ $recordCount }} {{ Str::plural('record', $recordCount) }}</span>
                <button type="button" class="copy-records" hidden>Copy records</button>
            @endif
        </div>
    </div>

    @if($recordCount)
        <div class="record-head" aria-hidden="true"><span>Type</span><span>Name</span><span>TTL</span><span>Value</span></div>
        <div class="record-list">
            @foreach($terminalOutput->lines() as $line)
                @if($line->isRecord())
                    <div class="record" data-raw="{{ $line->text }}">
                        <span class="record__type" data-label="Type" data-type="{{ $line->type }}">{{ $line->type }}</span>
                        <span class="record__name" data-label="Name">{{ $line->name }}</span>
                        <span class="record__ttl" data-label="TTL">{{ $line->ttl }}</span>
                        <span class="record__value" data-label="Value">{{ $line->value }}</span>
                    </div>
                @elseif(trim($line->text) !== '')
                    <div class="record record--continued" data-raw="{{ $line->text }}"><span class="record__value">{{ $line->text }}</span></div>
                @endif
            @endforeach
        </div>
    @else
        <pre class="plain-output">{{ $terminalOutput->lines()->map->text->implode("\n") }}</pre>
    @endif
</section>
