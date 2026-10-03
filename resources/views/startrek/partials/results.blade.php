@use('App\Support\RecordReadout')
@use('Carbon\CarbonInterval')
@use('Illuminate\Support\Str')

@php
    $readout = new RecordReadout($terminalOutput);
    $recordCount = $readout->recordCount();
    $rowIndex = 0;
@endphp
<section class="readout" aria-labelledby="readout-title">
    <header class="readout__header">
        <h2 class="readout__title" id="readout-title">
            <span class="readout__kicker">Scan results</span>
            <span class="readout__domain">{{ $domain ?? 'ip' }}</span>
        </h2>

        @if($recordCount)
            <p class="readout__count"><span class="readout__number">{{ str_pad((string) $recordCount, 2, '0', STR_PAD_LEFT) }}</span> {{ Str::plural('record', $recordCount) }}</p>
        @endif

        <div class="readout__actions">
            <button type="button" class="pill pill--small pill--blue" id="copy-raw" hidden>Copy raw</button>
            <button type="button" class="pill pill--small pill--lilac" id="toggle-raw" aria-expanded="false" aria-controls="raw-records" hidden>Raw</button>
        </div>
    </header>

    @foreach($readout->messages() as $message)
        <p class="readout__message" style="--row: {{ $rowIndex++ }}">{{ $message }}</p>
    @endforeach

    @foreach($readout->groups() as $type => $records)
        <section class="group group--{{ strtolower($type) }}" style="--group: {{ $loop->index }}" aria-labelledby="group-{{ strtolower($type) }}">
            <h3 class="group__header" id="group-{{ strtolower($type) }}">
                <span class="group__type">{{ $type }}</span>
                <span class="group__label">{{ Str::after($records->first()->typeDescription(), ': ') }}</span>
                <span class="group__count" aria-label="{{ $records->count() }} {{ Str::plural('record', $records->count()) }}">{{ str_pad((string) $records->count(), 2, '0', STR_PAD_LEFT) }}</span>
            </h3>

            <ul class="group__records">
                @foreach($records as $record)
                    <li class="record" style="--row: {{ $rowIndex++ }}">
                        <span class="record__name">{{ $record->name }}</span>
                        <span class="record__ttl" title="TTL {{ $record->ttl }} seconds"><span class="visually-hidden">TTL </span><span class="record__seconds">{{ $record->ttl }}</span> <span class="record__human" aria-hidden="true">{{ CarbonInterval::seconds((int) $record->ttl)->cascade()->forHumans(['short' => true, 'parts' => 2]) }}</span></span>
                        <span class="record__type">{{ $record->type }}</span>
                        <span class="record__value">{{ $record->value }}</span>
                    </li>
                @endforeach
            </ul>
        </section>
    @endforeach

    <pre class="raw" id="raw-records" hidden>{{ rtrim($output) }}</pre>
</section>
