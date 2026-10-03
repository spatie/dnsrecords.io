<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Mother implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'mother';
    }

    public function perform(string $command): Response
    {
        return Theme::Mother->redirectHome();
    }
}
