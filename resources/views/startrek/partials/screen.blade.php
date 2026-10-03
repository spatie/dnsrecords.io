@php
    $isIdle = ! $terminalOutput && ! $errors->any() && ! session()->has('flash_notification');
@endphp

@include('startrek.partials.flash')

@if($errors->has('input'))
    <div class="alert alert--danger" role="alert">
        <span class="alert__label">Alert</span>
        <p class="alert__body">{{ $errors->first('input') }}</p>
    </div>
@endif

@if($terminalOutput)
    @include('startrek.partials.results', ['terminalOutput' => $terminalOutput])
@endif

@if($isIdle)
    <div class="idle">
        <h2 class="heading"><span class="heading__text">Awaiting input</span></h2>

        <p class="idle__text">Enter a domain and press scan to retrieve its DNS records.</p>

        <p class="idle__suggestions">
            <span class="idle__label">Try</span>
            @foreach(['spatie.be', 'github.com', 'freek.dev'] as $suggestion)
                <a class="pill pill--small" href="{{ route('lcars.command', ['command' => $suggestion]) }}" rel="nofollow" data-command="{{ $suggestion }}">{{ $suggestion }}</a>
            @endforeach
        </p>
    </div>
@endif

<footer class="colophon">
    <p>(c) <a href="https://spatie.be/open-source">spatie</a> {{ date('Y') }}. A fan homage to the computer screens of 24th century television. Not affiliated with any studio.</p>
</footer>
