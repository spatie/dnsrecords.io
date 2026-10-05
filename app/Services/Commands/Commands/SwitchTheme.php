<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use App\Services\Commands\ThemeShortcuts;
use Symfony\Component\HttpFoundation\Response;

class SwitchTheme implements Command
{
    public function canPerform(string $command): bool
    {
        return array_key_exists($command, ThemeShortcuts::for(Theme::current()));
    }

    public function perform(string $command): Response
    {
        $theme = ThemeShortcuts::for(Theme::current())[$command];

        return $theme === Theme::Crt
            ? redirect($theme->selectionUrl())
            : $theme->redirectHome();
    }
}
