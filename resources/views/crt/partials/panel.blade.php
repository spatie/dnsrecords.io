<div class="panel">
    <div class="panel__badge" aria-hidden="true">
        <span class="panel__brand">spatie</span>
        <span class="panel__model">DR-9000 colour terminal</span>
    </div>

    <div class="panel__controls">
        <div class="phosphor" role="group" aria-label="Phosphor color">
            @foreach(['green', 'amber', 'white'] as $phosphor)
                <button type="button" class="phosphor__option" data-phosphor-option="{{ $phosphor }}" aria-pressed="false">
                    <span class="phosphor__swatch phosphor__swatch--{{ $phosphor }}" aria-hidden="true"></span>
                    <span class="phosphor__name">{{ $phosphor }}</span>
                </button>
            @endforeach
        </div>

        <button type="button" class="panel-button" id="fx-toggle" aria-pressed="true">
            <span class="panel-button__led" aria-hidden="true"></span>
            <span class="panel-button__label">effects</span>
        </button>

        <button type="button" class="panel-button" id="degauss">
            <span class="panel-button__label">degauss</span>
        </button>

        <button type="button" class="power" id="power" aria-pressed="true">
            <span class="power__led" aria-hidden="true"></span>
            <svg class="power__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3v8" />
                <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
            </svg>
            <span class="visually-hidden">Power</span>
        </button>
    </div>
</div>
