<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class SwitchTheme implements Command
{
    public function canPerform(string $command): bool
    {
        return in_array($command, ['matrix', 'system7', 'winxp'], true);
    }

    public function perform(string $command): Response
    {
        return match ($command) {
            'matrix' => Theme::Matrix->redirectHome(),
            'system7' => Theme::System7->redirectHome(),
            'winxp' => Theme::WinXp->redirectHome(),
        };
    }
}
