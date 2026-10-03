<?php

namespace App\Services\Commands\Commands;

use App\Enums\Theme;
use App\Services\Commands\Command;
use Symfony\Component\HttpFoundation\Response;

class Lcars implements Command
{
    public function canPerform(string $command): bool
    {
        return $command === 'lcars';
    }

    public function perform(string $command): Response
    {
        return Theme::Lcars->redirectHome();
    }
}
