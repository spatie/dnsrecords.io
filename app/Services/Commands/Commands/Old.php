<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Old implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'old';
    }

    public function perform(string $command): Response
    {
        return Theme::Classic->redirectHome();
    }
}
