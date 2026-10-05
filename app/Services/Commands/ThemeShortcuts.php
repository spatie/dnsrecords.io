<?php

namespace App\Services\Commands;

use App\Enums\Theme;

/**
 * The commands that open another theme. Pages get this list too, so the
 * browser can open the theme's cached home page without asking the app.
 */
class ThemeShortcuts
{
    /** @var array<int, string> */
    protected static array $exitCommands = ['exit', 'home', 'terminal', 'default'];

    /** @return array<string, Theme> */
    public static function for(Theme $currentTheme): array
    {
        $shortcuts = [
            'old' => Theme::Classic,
            'lcars' => Theme::Lcars,
            'muthur' => Theme::Mother,
            'mu-th-ur' => Theme::Mother,
            'mother' => Theme::Mother,
            'matrix' => Theme::Matrix,
            'system7' => Theme::System7,
            'mac' => Theme::System7,
            'winxp' => Theme::WinXp,
        ];

        if ($currentTheme === Theme::Crt) {
            return $shortcuts;
        }

        return [
            ...$shortcuts,
            ...array_fill_keys(static::$exitCommands, Theme::Crt),
        ];
    }

    /** @return array<string, array{url: string, theme: string}> */
    public static function forBrowser(Theme $currentTheme): array
    {
        return array_map(fn (Theme $theme) => [
            'url' => $theme->homeUrl(),
            'theme' => $theme->cookieValue(),
        ], static::for($currentTheme));
    }
}
