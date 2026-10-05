@use('App\Enums\Theme')
@use('App\Http\Middleware\RememberTheme')
@use('App\Services\Commands\ThemeShortcuts')

@php
    $rememberableHomeUrls = collect(Theme::cases())
        ->reject(fn (Theme $theme) => $theme === Theme::Crt)
        ->mapWithKeys(fn (Theme $theme) => [$theme->cookieValue() => $theme->homeUrl()]);
@endphp
<script>
    (function () {
        @if(request()->routeIs('home'))
            const rememberedTheme = (document.cookie.match(/(?:^|; ){{ RememberTheme::$cookieName }}=([^;]*)/) || [])[1];
            const homeUrls = @json($rememberableHomeUrls);

            if (rememberedTheme && homeUrls[rememberedTheme]) {
                window.location.replace(homeUrls[rememberedTheme]);

                return;
            }
        @endif

        document.cookie = '{{ RememberTheme::$cookieName }}={{ Theme::current()->cookieValue() }}; path=/; max-age={{ 60 * 60 * 24 * 365 }}; samesite=lax';
    })();
</script>
<script type="application/json" id="theme-shortcuts">@json(ThemeShortcuts::forBrowser(Theme::current()))</script>
